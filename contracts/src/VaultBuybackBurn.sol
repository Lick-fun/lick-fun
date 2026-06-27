// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IBondingCurveForBurn {
    function buy(uint256 minTokensOut) external payable returns (uint256 tokensOut);
    function realMon() external view returns (uint256);
    function graduated() external view returns (bool);
    function GRADUATION_THRESHOLD() external view returns (uint256);
    function getAmountOut(uint256 amountIn, bool isBuy) external view returns (uint256);
}

interface ILickToken {
    function burn(uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}

interface ILickRouterForBurn {
    function swapExactETHForTokens(
        address token,
        uint256 amountOutMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountOut);
    function getPair(address token) external view returns (address pair);
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) external pure returns (uint256);
}

interface ILickPairForBurn {
    function getReserves() external view returns (uint112, uint112, uint32);
    function token0() external view returns (address);
}

/// @notice Factory lookup — resolve the canonical curve for a token (audit C-01).
interface IFactoryForBurn {
    function tokenToCurve(address token) external view returns (address);
}

/// @notice GraduationRouter lookup — resolve the canonical DEX pair for a token (audit C-01).
interface IGraduationRouterForBurn {
    function tokenToPair(address token) external view returns (address);
}

/**
 * @title VaultBuybackBurn
 * @notice Accumulates MON per-token from FeeRouter, then executes automated
 *         buyback-and-burn once the per-token balance reaches EXECUTION_THRESHOLD.
 *
 * @dev Two execution paths:
 *   - Pre-graduation: buy on the BondingCurve (direct call), then burn tokens.
 *     Guard: skips if buying would push realMon within 1% of graduation threshold
 *     (to avoid accidentally triggering graduation via vault execution).
 *   - Post-graduation: swap via LickRouter (DEX), then burn tokens.
 *
 * Anyone can call execute() once threshold is met — fully permissionless.
 * Owner (multisig) retains emergency sweep() for recovery.
 */
contract VaultBuybackBurn is ReentrancyGuard {
    // ─── Constants ────────────────────────────────────────────────────────────

    /// @notice MON required per-token before execute() may be called (50 MON).
    uint256 public constant EXECUTION_THRESHOLD = 50 ether;

    /// @notice Safety margin — skip curve buy if it would push realMon within
    ///         this fraction of GRADUATION_THRESHOLD (1% = 100 bps of 10000).
    uint256 public constant GRAD_SAFETY_BPS = 100; // 1%

    /// @notice Basis-point denominator.
    uint256 public constant BPS_DENOM = 10_000;

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

    // ─── Events ───────────────────────────────────────────────────────────────

    event Deposited(address indexed token, address indexed sender, uint256 amount);
    event Executed(address indexed token, uint256 monSpent, uint256 tokensBurned);
    event Swept(address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event LickRouterSet(address indexed router);
    event MaxSlippageSet(uint256 bps);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error NotOwner();
    error ZeroAddress();
    error SweepFailed();
    error BelowThreshold();
    error NearGraduation();
    error ExecutionFailed();
    error UnknownToken();
    error InvalidSlippage();

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
     * @param token The LickToken address to buy back and burn.
     */
    function execute(address token) external nonReentrant {
        uint256 amount = pendingBurn[token];
        if (amount < EXECUTION_THRESHOLD) revert BelowThreshold();

        // ── Resolve the canonical curve for this token (audit C-01) ──────────
        address curve = IFactoryForBurn(factory).tokenToCurve(token);
        if (curve == address(0)) revert UnknownToken();

        // Read graduation state from the curve itself — never from the caller.
        bool graduated = IBondingCurveForBurn(curve).graduated();

        // Clear pending balance before interactions (CEI)
        pendingBurn[token] = 0;

        uint256 tokensBurned;

        if (!graduated) {
            // ── Pre-graduation: buy on the BondingCurve ──────────────────────
            // Safety guard: skip if buying would push realMon too close to
            // the graduation threshold (within 1%) to avoid accidentally graduating.
            uint256 realMon = IBondingCurveForBurn(curve).realMon();
            uint256 gradThreshold = IBondingCurveForBurn(curve).GRADUATION_THRESHOLD();
            uint256 safetyMargin = (gradThreshold * GRAD_SAFETY_BPS) / BPS_DENOM;
            if (realMon + amount > gradThreshold - safetyMargin) {
                // Too close to graduation — leave funds pending, do not execute.
                revert NearGraduation();
            }

            // Compute on-chain expected output and enforce slippage cap (audit C-02).
            uint256 expectedOut = IBondingCurveForBurn(curve).getAmountOut(amount, true);
            uint256 minOut = (expectedOut * (BPS_DENOM - maxSlippageBps)) / BPS_DENOM;

            tokensBurned = IBondingCurveForBurn(curve).buy{value: amount}(minOut);
        } else {
            // ── Post-graduation: swap via LickRouter (DEX) ───────────────────
            // Resolve the authoritative pair and compute minOut from live reserves.
            address pair = IGraduationRouterForBurn(graduationRouter).tokenToPair(token);
            // pair could be address(1) sentinel mid-migration — treat as not ready.
            if (pair == address(0) || pair == address(0x1)) revert UnknownToken();

            uint256 minOut = _quoteSwap(token, pair, amount);

            tokensBurned = ILickRouterForBurn(lickRouter).swapExactETHForTokens{value: amount}(
                token,
                minOut,
                address(this),
                block.timestamp + 5 minutes
            );
        }

        // Burn all received tokens
        if (tokensBurned > 0) {
            ILickToken(token).burn(tokensBurned);
        }

        emit Executed(token, amount, tokensBurned);
    }

    /// @dev Computes the slippage-bounded minimum token output for a MON→token DEX swap.
    function _quoteSwap(address token, address pair, uint256 monIn) internal view returns (uint256 minOut) {
        (uint112 r0, uint112 r1,) = ILickPairForBurn(pair).getReserves();
        address t0 = ILickPairForBurn(pair).token0();
        // wmon is the "in" reserve; token is the "out" reserve.
        (uint256 reserveWmon, uint256 reserveToken) = (token == t0)
            ? (uint256(r1), uint256(r0))
            : (uint256(r0), uint256(r1));
        uint256 expectedOut = ILickRouterForBurn(lickRouter).getAmountOut(monIn, reserveWmon, reserveToken);
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