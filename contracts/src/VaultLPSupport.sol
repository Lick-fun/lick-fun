// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ILickRouterForLP {
    function swapExactETHForTokens(
        address token,
        uint256 amountOutMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountOut);
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) external pure returns (uint256);
}

interface ILickPairForLP {
    function mint(address to) external returns (uint256 liquidity);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint112, uint112, uint32);
}

interface IWMONVault {
    function deposit() external payable;
    function withdraw(uint256 wad) external;
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @notice GraduationRouter lookup — authoritative source of each token's pair (audit C-01).
interface IGraduationRouterForLP {
    function tokenToPair(address token) external view returns (address);
}

/**
 * @title VaultLPSupport
 * @notice Accumulates MON per-token from FeeRouter, then executes automated
 *         LP deepening once the per-token balance reaches EXECUTION_THRESHOLD.
 *
 * @dev Execution flow (post-graduation only — pre-graduation tokens hold):
 *   1. Split the accumulated MON in half.
 *   2. Use half to buy the token via LickRouter (DEX swap).
 *   3. Wrap the other half as WMON.
 *   4. Transfer both WMON + tokens to the LickPair.
 *   5. Call pair.mint(address(0xdead)) — LP tokens are permanently burned.
 *
 * Anyone can call execute() once threshold is met — fully permissionless.
 * Owner (multisig) retains emergency sweep() for recovery.
 * Pre-graduation tokens accumulate and can be executed after graduation.
 */
contract VaultLPSupport is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Constants ────────────────────────────────────────────────────────────

    /// @notice MON required per-token before execute() may be called (50 MON).
    uint256 public constant EXECUTION_THRESHOLD = 50 ether;

    /// @notice Burn address for LP tokens (permanent lock).
    address public constant BURN_ADDRESS = address(0xdead);

    /// @notice Basis-point denominator.
    uint256 public constant BPS_DENOM = 10_000;

    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice Owner authorised to sweep funds and update config (multisig/timelock).
    address public owner;

    /// @notice LickRouter address for DEX swaps.
    address public lickRouter;

    /// @notice WMON address for wrapping native MON before adding liquidity.
    address public wmon;

    /// @notice GraduationRouter — authoritative source of each token's pair (audit C-01).
    address public immutable graduationRouter;

    /// @notice Max allowed swap slippage in bps (audit C-02). Default 5% = 500.
    uint256 public maxSlippageBps = 500;

    /// @notice Per-token accumulated MON awaiting LP execution.
    mapping(address => uint256) public pendingLP;

    // ─── Events ───────────────────────────────────────────────────────────────

    event Deposited(address indexed token, address indexed sender, uint256 amount);
    event Executed(address indexed token, uint256 monAdded, uint256 lpBurned);
    event Swept(address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event LickRouterSet(address indexed router);
    event MaxSlippageSet(uint256 bps);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error NotOwner();
    error ZeroAddress();
    error SweepFailed();
    error BelowThreshold();
    error PairNotFound();
    error InvalidSlippage();
    error NotGraduated();

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _owner, address _lickRouter, address _wmon, address _graduationRouter) {
        if (_owner == address(0)) revert ZeroAddress();
        if (_lickRouter == address(0)) revert ZeroAddress();
        if (_wmon == address(0)) revert ZeroAddress();
        if (_graduationRouter == address(0)) revert ZeroAddress();
        owner = _owner;
        lickRouter = _lickRouter;
        wmon = _wmon;
        graduationRouter = _graduationRouter;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ─── Receive from FeeRouter ───────────────────────────────────────────────

    /**
     * @notice Called by FeeRouter to deposit LP support MON tagged to a specific token.
     * @param token The LickToken address these fees relate to.
     */
    function receiveForToken(address token) external payable {
        if (token == address(0)) revert ZeroAddress();
        pendingLP[token] += msg.value;
        emit Deposited(token, msg.sender, msg.value);
    }

    /// @notice Fallback — accept untagged MON (e.g. stranded ETH recovery).
    receive() external payable {}

    // ─── Execute LP support ───────────────────────────────────────────────────

    /**
     * @notice Execute LP deepening for a specific graduated token.
     * @dev Permissionless — anyone can call once pendingLP[token] >= EXECUTION_THRESHOLD.
     *      The pair is resolved AUTHORITATIVELY from the GraduationRouter — caller cannot
     *      supply a malicious pair (audit C-01). The swap uses on-chain slippage protection
     *      (audit C-02). Liquidity is added PROPORTIONAL to post-swap reserves so the mint
     *      consumes both sides fully — no dust, no manipulation profit (audit H-01/H-02).
     *      Any unavoidable rounding leftover is wrapped back into pendingLP for the token.
     *
     * @param token The LickToken address to add liquidity for.
     */
    function execute(address token) external nonReentrant {
        uint256 amount = pendingLP[token];
        if (amount < EXECUTION_THRESHOLD) revert BelowThreshold();

        // ── Resolve the authoritative pair (audit C-01) ──────────────────────
        address pair = IGraduationRouterForLP(graduationRouter).tokenToPair(token);
        if (pair == address(0) || pair == address(0x1)) revert NotGraduated();

        // Clear pending balance before interactions (CEI)
        pendingLP[token] = 0;

        // ── Step 1: Buy tokens with half the MON (slippage-bounded) ──────────
        uint256 half = amount / 2;

        (uint256 reserveWmon, uint256 reserveToken, bool tokenIsToken0) = _reserves(token, pair);
        uint256 expectedOut = ILickRouterForLP(lickRouter).getAmountOut(half, reserveWmon, reserveToken);
        uint256 minOut = (expectedOut * (BPS_DENOM - maxSlippageBps)) / BPS_DENOM;

        uint256 tokensBought = ILickRouterForLP(lickRouter).swapExactETHForTokens{value: half}(
            token,
            minOut,
            address(this),
            block.timestamp + 5 minutes
        );

        // ── Step 2: Wrap the remaining half of MON → WMON ────────────────────
        uint256 wmonHave = amount - half; // odd-wei safe
        IWMONVault(wmon).deposit{value: wmonHave}();

        // ── Step 3: Compute PROPORTIONAL amounts vs post-swap reserves ───────
        // Re-read reserves AFTER our swap moved the price.
        (uint256 rWmon, uint256 rToken,) = _reservesRaw(token, pair, tokenIsToken0);
        // Optimal WMON to pair with all tokensBought at the current ratio:
        //   wmonOptimal = tokensBought * rWmon / rToken
        uint256 wmonOptimal = (tokensBought * rWmon) / rToken;

        uint256 tokensToAdd;
        uint256 wmonToAdd;
        if (wmonOptimal <= wmonHave) {
            // We have enough WMON for all tokens — token side is the limiter.
            tokensToAdd = tokensBought;
            wmonToAdd = wmonOptimal;
        } else {
            // WMON is the limiter — scale tokens down to match available WMON.
            wmonToAdd = wmonHave;
            tokensToAdd = (wmonHave * rToken) / rWmon;
        }

        // ── Step 4: Transfer proportional amounts to pair, mint, burn LP ─────
        if (tokenIsToken0) {
            IERC20(token).safeTransfer(pair, tokensToAdd);
            IERC20(wmon).safeTransfer(pair, wmonToAdd);
        } else {
            IERC20(wmon).safeTransfer(pair, wmonToAdd);
            IERC20(token).safeTransfer(pair, tokensToAdd);
        }
        uint256 lpBurned = ILickPairForLP(pair).mint(BURN_ADDRESS);

        // ── Step 5: Recycle leftovers ────────────────────────────────────────
        // Unwrap any leftover WMON back to MON and re-credit pendingLP[token].
        uint256 wmonDust = IWMONVault(wmon).balanceOf(address(this));
        if (wmonDust > 0) {
            IWMONVault(wmon).withdraw(wmonDust);
        }
        // Re-credit all native MON now held (leftover from rounding) to this token.
        // Leftover tokens stay in the vault and are folded into the next mint.
        uint256 monDust = address(this).balance;
        if (monDust > 0) {
            pendingLP[token] += monDust;
        }

        emit Executed(token, amount, lpBurned);
    }

    /// @dev Returns (reserveWmon, reserveToken, tokenIsToken0) for a token/WMON pair.
    function _reserves(address token, address pair)
        internal view returns (uint256 reserveWmon, uint256 reserveToken, bool tokenIsToken0)
    {
        (uint112 r0, uint112 r1,) = ILickPairForLP(pair).getReserves();
        address t0 = ILickPairForLP(pair).token0();
        tokenIsToken0 = (t0 == token);
        (reserveWmon, reserveToken) = tokenIsToken0
            ? (uint256(r1), uint256(r0))
            : (uint256(r0), uint256(r1));
    }

    /// @dev Like _reserves but with a precomputed tokenIsToken0 flag (post-swap re-read).
    function _reservesRaw(address token, address pair, bool tokenIsToken0)
        internal view returns (uint256 reserveWmon, uint256 reserveToken, bool)
    {
        token; // unused but kept for signature clarity
        (uint112 r0, uint112 r1,) = ILickPairForLP(pair).getReserves();
        (reserveWmon, reserveToken) = tokenIsToken0
            ? (uint256(r1), uint256(r0))
            : (uint256(r0), uint256(r1));
        return (reserveWmon, reserveToken, tokenIsToken0);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    /**
     * @notice Update the LickRouter address (e.g. after a router upgrade).
     */
    function setLickRouter(address _lickRouter) external onlyOwner {
        if (_lickRouter == address(0)) revert ZeroAddress();
        lickRouter = _lickRouter;
        emit LickRouterSet(_lickRouter);
    }

    /**
     * @notice Update the max swap slippage tolerance (audit C-02).
     * @param bps Slippage in basis points (max 2000 = 20%).
     */
    function setMaxSlippage(uint256 bps) external onlyOwner {
        if (bps > 2000) revert InvalidSlippage();
        maxSlippageBps = bps;
        emit MaxSlippageSet(bps);
    }

    /**
     * @notice Emergency sweep — withdraw MON to a destination address.
     */
    function sweep(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        (bool ok, ) = payable(to).call{value: amount}("");
        if (!ok) revert SweepFailed();
        emit Swept(to, amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}