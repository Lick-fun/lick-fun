// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IBondingCurveForBurnV2 {
    function buy(uint256 minTokensOut) external payable returns (uint256 tokensOut);
    function realMon() external view returns (uint256);
    function graduated() external view returns (bool);
    function GRADUATION_THRESHOLD() external view returns (uint256);
    function getAmountOut(uint256 amountIn, bool isBuy) external view returns (uint256);
}

interface ILickRouterForBurnV2 {
    function swapExactETHForTokens(
        address token,
        uint256 amountOutMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountOut);
    function getPair(address token) external view returns (address pair);
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) external pure returns (uint256);
}

interface ILickPairForBurnV2 {
    function getReserves() external view returns (uint112, uint112, uint32);
    function token0() external view returns (address);
}

/// @notice Factory lookup — resolve the canonical curve for a token (audit C-01).
interface IFactoryForBurnV2 {
    function tokenToCurve(address token) external view returns (address);
}

/// @notice GraduationRouter lookup — resolve the canonical DEX pair for a token (audit C-01).
interface IGraduationRouterForBurnV2 {
    function tokenToPair(address token) external view returns (address);
}

/**
 * @title VaultBuybackBurnV2
 * @notice Accumulates MON per-token from FeeRouter, then executes automated
 *         buyback-and-burn once the per-token balance reaches EXECUTION_THRESHOLD.
 *
 * @dev V2 differs from V1 in ONE way: instead of calling `token.burn(amount)` (which
 *      requires the token to expose a `burn(uint256)` function), it transfers the
 *      bought tokens to a well-known dead address (`0x...dEaD`). This achieves the
 *      same economic effect (tokens permanently removed from circulating supply)
 *      while working with ANY standard ERC20 — including the 3 currently-launched
 *      tokens on mainnet that were deployed before the audit added `burn()`.
 *
 *      Two execution paths:
 *        - Pre-graduation: buy on the BondingCurve (direct call), then transfer to dead.
 *          Guard: skips if buying would push realMon within 1% of graduation threshold.
 *        - Post-graduation: swap via LickRouter (DEX), then transfer to dead.
 *
 *      Anyone can call execute() once threshold is met — fully permissionless.
 *      Owner (multisig) retains emergency sweep() for recovery.
 */
contract VaultBuybackBurnV2 is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Constants ────────────────────────────────────────────────────────────

    /// @notice MON required per-token before execute() may be called (50 MON).
    uint256 public constant EXECUTION_THRESHOLD = 50 ether;

    /// @notice Safety margin — skip curve buy if it would push realMon within
    ///         this fraction of GRADUATION_THRESHOLD (1% = 100 bps of 10000).
    uint256 public constant GRAD_SAFETY_BPS = 100; // 1%

    /// @notice Basis-point denominator.
    uint256 public constant BPS_DENOM = 10_000;

    /// @notice Burn address — tokens transferred here are permanently unrecoverable.
    /// @dev    0x000000000000000000000000000000000000dEaD is the de-facto standard
    ///         burn address used across DeFi (Uniswap, OpenZeppelin, etc.). No
    ///         private key exists for it; any tokens sent there are provably lost.
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice Owner authorised to sweep funds and update config (multisig/timelock).
    address public owner;

    /// @notice LickRouter address for post-graduation DEX swaps.
    address public lickRouter;

    /// @notice Factory — authoritative source of each token's BondingCurve (audit C-01).
    address public immutable factory;

    /// @notice GraduationRouter — authoritative source of each token's DEX pair (audit C-01).
    address public immutable graduationRouter;

    /// @notice Max allowed slippage on swaps, in bps (audit C-02). Default 5% = 500.
    uint256 public maxSlippageBps = 500;

    /// @notice Per-token accumulated MON awaiting buyback execution.
    mapping(address => uint256) public pendingBurn;

    // ─── Events ────────────────────────────────────────────────────────────────

    event Deposited(address indexed token, address indexed sender, uint256 amount);
    event Executed(address indexed token, uint256 monSpent, uint256 tokensBurned);
    event Swept(address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event LickRouterSet(address indexed router);
    event MaxSlippageSet(uint256 bps);

    // ─── Errors ────────────────────────────────────────────────────────────────

    error NotOwner();
    error ZeroAddress();
    error SweepFailed();
    error BelowThreshold();
    error NearGraduation();
    error ExecutionFailed();
    error UnknownToken();
    error InvalidSlippage();
    error BurnTransferFailed();

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _owner, address _lickRouter, address _factory, address _graduationRouter) {
        if (_owner == address(0)) revert ZeroAddress();
        if (_lickRouter == address(0)) revert ZeroAddress();
        if (_factory == address(0)) revert ZeroAddress();
        if (_graduationRouter == address(0)) revert ZeroAddress();
        owner = _owner;
        lickRouter = _lickRouter;
        factory = _factory;
        graduationRouter = _graduationRouter;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ─── Receive from FeeRouter ───────────────────────────────────────────────

    /**
     * @notice Called by FeeRouter to deposit buyback MON tagged to a specific token.
     * @param token The LickToken address these fees relate to.
     */
    function receiveForToken(address token) external payable {
        if (token == address(0)) revert ZeroAddress();
        pendingBurn[token] += msg.value;
        emit Deposited(token, msg.sender, msg.value);
    }

    /// @notice Fallback — accept untagged MON (e.g. stranded ETH recovery).
    receive() external payable {}

    // ─── Execute buyback & burn ───────────────────────────────────────────────

    /**
     * @notice Execute a buyback-and-burn for a specific token.
     * @dev Permissionless — anyone can call once pendingBurn[token] >= EXECUTION_THRESHOLD.
     *      The curve / pair / graduation state are resolved AUTHORITATIVELY from the
     *      Factory and GraduationRouter — caller-supplied addresses are NOT trusted
     *      (audit C-01). Slippage is bounded on-chain via maxSlippageBps (audit C-02).
     *
     *      V2: instead of calling `token.burn(amount)`, transfers the bought tokens
     *      to the dead address. Works with any standard ERC20.
     *
     * @param token The LickToken address to buy back and burn.
     */
    function execute(address token) external nonReentrant {
        uint256 amount = pendingBurn[token];
        if (amount < EXECUTION_THRESHOLD) revert BelowThreshold();

        // ── Resolve the canonical curve for this token (audit C-01) ──────────
        address curve = IFactoryForBurnV2(factory).tokenToCurve(token);
        if (curve == address(0)) revert UnknownToken();

        // Read graduation state from the curve itself — never from the caller.
        bool graduated = IBondingCurveForBurnV2(curve).graduated();

        // Clear pending balance before interactions (CEI)
        pendingBurn[token] = 0;

        uint256 tokensBought;

        if (!graduated) {
            // ── Pre-graduation: buy on the BondingCurve ──────────────────────
            // Safety guard: skip if buying would push realMon too close to
            // the graduation threshold (within 1%) to avoid accidentally graduating.
            uint256 realMon = IBondingCurveForBurnV2(curve).realMon();
            uint256 gradThreshold = IBondingCurveForBurnV2(curve).GRADUATION_THRESHOLD();
            uint256 safetyMargin = (gradThreshold * GRAD_SAFETY_BPS) / BPS_DENOM;
            if (realMon + amount > gradThreshold - safetyMargin) {
                // Too close to graduation — leave funds pending, do not execute.
                revert NearGraduation();
            }

            // Compute on-chain expected output and enforce slippage cap (audit C-02).
            uint256 expectedOut = IBondingCurveForBurnV2(curve).getAmountOut(amount, true);
            uint256 minOut = (expectedOut * (BPS_DENOM - maxSlippageBps)) / BPS_DENOM;

            tokensBought = IBondingCurveForBurnV2(curve).buy{value: amount}(minOut);
        } else {
            // ── Post-graduation: swap via LickRouter (DEX) ───────────────────
            // Resolve the authoritative pair and compute minOut from live reserves.
            address pair = IGraduationRouterForBurnV2(graduationRouter).tokenToPair(token);
            // pair could be address(1) sentinel mid-migration — treat as not ready.
            if (pair == address(0) || pair == address(0x1)) revert UnknownToken();

            uint256 minOut = _quoteSwap(token, pair, amount);

            tokensBought = ILickRouterForBurnV2(lickRouter).swapExactETHForTokens{value: amount}(
                token,
                minOut,
                address(this),
                block.timestamp + 5 minutes
            );
        }

        // V2: transfer all received tokens to the dead address (permanent burn).
        // Works with any standard ERC20 — no `burn()` function required on the token.
        if (tokensBought > 0) {
            IERC20(token).safeTransfer(BURN_ADDRESS, tokensBought);
        }

        emit Executed(token, amount, tokensBought);
    }

    /// @dev Computes the slippage-bounded minimum token output for a MON→token DEX swap.
    function _quoteSwap(address token, address pair, uint256 monIn) internal view returns (uint256 minOut) {
        (uint112 r0, uint112 r1,) = ILickPairForBurnV2(pair).getReserves();
        address t0 = ILickPairForBurnV2(pair).token0();
        // wmon is the "in" reserve; token is the "out" reserve.
        (uint256 reserveWmon, uint256 reserveToken) = (token == t0)
            ? (uint256(r1), uint256(r0))
            : (uint256(r0), uint256(r1));
        uint256 expectedOut = ILickRouterForBurnV2(lickRouter).getAmountOut(monIn, reserveWmon, reserveToken);
        minOut = (expectedOut * (BPS_DENOM - maxSlippageBps)) / BPS_DENOM;
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
     * @dev Only callable by owner (multisig). Use if funds need recovery.
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
