// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title BondingCurve
/// @notice Constant-product bonding curve (CPMM) for Lick.fun token launches.
/// @dev    Pricing follows: (VIRTUAL_MON + realMon) × (VIRTUAL_TOKENS - soldTokens) = k
///         Fees: 2% total (1% protocol + 1% creator), deducted from MON side on both buy and sell.
///         Stage 2: delayed-mint (30s) + symmetric anti-sniping penalty (7 blocks).
///         Graduation fires when realMon >= 100,000 MON.
contract BondingCurve {
    using SafeERC20 for IERC20;

    /* ═══════════════════════════ IMMUTABLES / CONSTANTS ═══════════════════════════ */

    /// @notice The LickToken this curve governs.
    address public immutable token;

    /// @notice Receiver of the 1% protocol fee (and anti-sniping penalties).
    address public immutable protocolFeeReceiver;

    /// @notice Creator of the token; receives the 1% creator fee.
    address public immutable creator;

    /// @notice FeeRouter contract address (for preset fee splitting). Set by Factory.
    address public feeRouter;

    /// @notice Deployer address (Factory). Authorized to call setFeeRouter.
    address public immutable deployer;

    /// @notice GraduationRouter address. Set by Factory at deploy time.
    /// @dev    If address(0), approveMigration is disabled (backward-compatible).
    address public immutable graduationRouter;

    /// @notice Virtual MON reserve: 80,000 MON (in wei).
    uint256 public constant VIRTUAL_MON = 80_000 ether;

    /// @notice Virtual token reserve: 477,000,000 tokens (in wei).
    uint256 public constant VIRTUAL_TOKENS = 477_000_000 ether;

    /// @notice Graduation threshold: 100,000 MON (in wei).
    uint256 public constant GRADUATION_THRESHOLD = 100_000 ether;

    /// @notice Fixed total supply: 1,000,000,000 tokens (in wei).
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 ether;

    /// @notice Protocol fee in basis points (1% = 100 bps).
    uint256 public constant PROTOCOL_FEE_BPS = 100;

    /// @notice Creator fee in basis points (1% = 100 bps).
    uint256 public constant CREATOR_FEE_BPS = 100;

    /// @notice Basis-point denominator.
    uint256 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Constant-product k = VIRTUAL_MON × VIRTUAL_TOKENS.
    /// @dev   Computed once in the constructor. ≈ 3.8 × 10^49 — fits in uint256.
    uint256 public immutable k;

    /* ═══════════════════════════ STAGE 2: DELAYED-MINT ═══════════════════════════ */

    /// @notice Timestamp after which trading becomes active. 0 = active immediately.
    uint256 public immutable startTime;

    /// @notice Block number at deployment; reference for anti-sniping penalty.
    uint256 public immutable startBlock;

    /* ══════════════════════════════════ STATE ══════════════════════════════════ */

    /// @notice Total real MON deposited into the curve (excluding fees and penalties).
    uint256 public realMon;

    /// @notice Total tokens sold to buyers from the curve.
    uint256 public soldTokens;

    /// @notice Whether the curve has graduated (realMon >= threshold).
    bool public graduated;

    /// @notice Whether the first (exempt) buy has been executed.
    /// @dev   The creator's pre-buy in the commit tx is exempt from anti-sniping.
    bool public initialBuyExecuted;

    /* ════════════════════════════════ EVENTS ══════════════════════════════════ */

    event CurveLaunch(address indexed token, uint256 startTime, uint256 startBlock);
    event CurveBuy(address indexed buyer, address indexed token, uint256 amountIn, uint256 amountOut);
    event CurveSell(address indexed seller, address indexed token, uint256 amountIn, uint256 amountOut);
    event CurveGraduate(address indexed token, address indexed pool);
    event FeeRouterSet(address indexed feeRouter);
    event MigrationApproved(address indexed token, uint256 monTransferred, uint256 tokensApproved);

    /* ══════════════════════════════ REENTRANCY GUARD ════════════════════════════ */

    uint256 private locked = 1;

    modifier nonReentrant() {
        require(locked == 1, "REENTRANT");
        locked = 2;
        _;
        locked = 1;
    }

    /// @dev Reverts if trading has not yet started (startTime not reached).
    modifier tradingActive() {
        require(block.timestamp >= startTime, "Trading not yet active");
        _;
    }

    /* ══════════════════════════════ CONSTRUCTOR ═══════════════════════════════ */

    /// @param _token               The ERC-20 token address this curve governs
    /// @param _protocolFeeReceiver Address that receives the 1% protocol fee and penalties
    /// @param _creator             Token creator; receives the 1% creator fee
    /// @param _startTime           Timestamp after which trading is active (0 = immediate)
    /// @param _graduationRouter    Address of the GraduationRouter (0 = disabled)
    constructor(
        address _token,
        address _protocolFeeReceiver,
        address _creator,
        uint256 _startTime,
        address _graduationRouter
    ) {
        // audit L-06: validate critical addresses (graduationRouter == 0 is allowed = migration disabled)
        require(_token != address(0), "ZERO_TOKEN");
        require(_protocolFeeReceiver != address(0), "ZERO_PROTOCOL");
        require(_creator != address(0), "ZERO_CREATOR");
        token = _token;
        protocolFeeReceiver = _protocolFeeReceiver;
        creator = _creator;
        startTime = _startTime;
        startBlock = block.number;
        deployer = msg.sender;
        graduationRouter = _graduationRouter;
        k = VIRTUAL_MON * VIRTUAL_TOKENS; // ≈ 3.8e49, safe within uint256

        emit CurveLaunch(_token, _startTime, block.number);
    }

    /* ═════════════════════════════════ BUY ════════════════════════════════════ */

    /// @notice Buy tokens with native MON.
    /// @dev    Order of deductions on input:
    ///         1. Anti-sniping penalty (if within 7 blocks and not the first buy)
    ///         2. Protocol fee 1% + creator fee 1% (from post-penalty amount)
    ///         The net amount after both deductions is added to realMon for pricing.
    /// @param  minTokensOut Minimum tokens to receive; reverts on slippage.
    /// @return tokensOut    The number of tokens received.
    function buy(uint256 minTokensOut)
        external
        payable
        nonReentrant
        tradingActive
        returns (uint256 tokensOut)
    {
        require(!graduated, "GRADUATED");
        require(msg.value > 0, "ZERO_INPUT");

        // ── Anti-sniping penalty (on MON input, exempt for first buy) ──
        uint256 penaltyBps = (!initialBuyExecuted) ? 0 : getAntiSnipingPenaltyBps();
        uint256 penalty = (msg.value * penaltyBps) / BPS_DENOMINATOR;
        uint256 afterPenalty = msg.value - penalty;

        // ── Regular fee calculation (from post-penalty amount) ──
        uint256 protocolFee = (afterPenalty * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
        uint256 creatorFee = (afterPenalty * CREATOR_FEE_BPS) / BPS_DENOMINATOR;
        uint256 netAmountIn = afterPenalty - protocolFee - creatorFee;

        // ── CPMM: tokensOut = remainingSupply - k / (VIRTUAL_MON + realMon + netAmountIn) ──
        uint256 denominator = VIRTUAL_MON + realMon + netAmountIn;
        uint256 newSold = k / denominator;
        uint256 remainingSupply = VIRTUAL_TOKENS - soldTokens;
        tokensOut = remainingSupply - newSold;

        require(tokensOut >= minTokensOut, "SLIPPAGE");

        // ── Effects: update state (CEI pattern) ──
        realMon += netAmountIn;
        soldTokens += tokensOut;
        initialBuyExecuted = true;

        _checkGraduation();

        emit CurveBuy(msg.sender, token, netAmountIn, tokensOut);

        // ── Interactions ──
        // Penalty + protocol fee both go to protocolFeeReceiver.
        _sendNative(protocolFeeReceiver, penalty + protocolFee);
        _sendCreatorFee(token, creatorFee);
        IERC20(token).safeTransfer(msg.sender, tokensOut);
    }

    /* ════════════════════════════════ SELL ════════════════════════════════════ */

    /// @notice Sell tokens back to the curve for native MON.
    /// @dev    Order of deductions on output:
    ///         1. CPMM computes grossMonOut
    ///         2. Anti-sniping penalty (if within 7 blocks) on grossMonOut
    ///         3. Protocol fee 1% + creator fee 1% (from post-penalty amount)
    ///         realMon decreases by the full grossMonOut (penalty leaves the curve).
    /// @param  tokensIn   Number of tokens to sell (will be pulled via approve).
    /// @param  minMonOut  Minimum MON to receive; reverts on slippage.
    /// @return monOut    The net MON received by the seller (after penalty + fees).
    function sell(uint256 tokensIn, uint256 minMonOut)
        external
        nonReentrant
        tradingActive
        returns (uint256 monOut)
    {
        require(!graduated, "GRADUATED");
        require(tokensIn > 0, "ZERO_INPUT");

        // ── Pull tokens from seller ──
        IERC20(token).safeTransferFrom(msg.sender, address(this), tokensIn);

        // ── CPMM: grossMonOut = (VIRTUAL_MON + realMon) - k / (VIRTUAL_TOKENS - soldTokens + tokensIn) ──
        uint256 denominator = VIRTUAL_TOKENS - soldTokens + tokensIn;
        uint256 grossMonOut = (VIRTUAL_MON + realMon) - (k / denominator);

        // ── Anti-sniping penalty (on gross MON output) ──
        uint256 penaltyBps = getAntiSnipingPenaltyBps();
        uint256 penalty = (grossMonOut * penaltyBps) / BPS_DENOMINATOR;
        uint256 afterPenalty = grossMonOut - penalty;

        // ── Regular fee calculation (from post-penalty amount) ──
        uint256 protocolFee = (afterPenalty * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
        uint256 creatorFee = (afterPenalty * CREATOR_FEE_BPS) / BPS_DENOMINATOR;
        monOut = afterPenalty - protocolFee - creatorFee;

        require(monOut >= minMonOut, "SLIPPAGE");

        // ── Effects: update state (CEI pattern) ──
        // realMon decreases by full grossMonOut; penalty leaves the curve.
        // Cap payout to actual held MON to prevent virtual reserve drain.
        require(grossMonOut <= realMon, "INSUFFICIENT_RESERVE");
        realMon -= grossMonOut;
        soldTokens -= tokensIn;

        emit CurveSell(msg.sender, token, tokensIn, monOut);

        // ── Interactions ──
        _sendNative(protocolFeeReceiver, penalty + protocolFee);
        _sendCreatorFee(token, creatorFee);
        _sendNative(msg.sender, monOut);
    }

    /* ══════════════════════════════ VIEW HELPERS ═══════════════════════════════ */

    /// @notice Get the expected output amount for a given input (without fees or penalties).
    /// @param  amountIn  Input amount (MON for buy, tokens for sell).
    /// @param  isBuy    True for buy (MON→tokens), false for sell (tokens→MON).
    /// @return amountOut Output amount before fees and penalties.
    function getAmountOut(uint256 amountIn, bool isBuy) public view returns (uint256 amountOut) {
        if (isBuy) {
            // Buy: MON in → tokens out
            uint256 denominator = VIRTUAL_MON + realMon + amountIn;
            uint256 newSold = k / denominator;
            amountOut = (VIRTUAL_TOKENS - soldTokens) - newSold;
        } else {
            // Sell: tokens in → MON out
            uint256 denominator = VIRTUAL_TOKENS - soldTokens + amountIn;
            amountOut = (VIRTUAL_MON + realMon) - (k / denominator);
        }
    }

    /// @notice Returns the current bonding curve progress in basis points (0–10,000).
    /// @return progressInBps Progress toward graduation (10000 = 100%).
    function getProgress() public view returns (uint256 progressInBps) {
        progressInBps = (realMon * BPS_DENOMINATOR) / GRADUATION_THRESHOLD;
    }

    /// @notice Computes the anti-sniping penalty in basis points based on blocks elapsed since startBlock.
    /// @dev    Decay table: 80/40/20/15/10/10/5/0% over 7 blocks. Returns 0 after block 7+.
    /// @return penaltyBps Penalty rate in basis points (0–8000).
    function getAntiSnipingPenaltyBps() public view returns (uint256 penaltyBps) {
        uint256 elapsed = block.number - startBlock;
        if (elapsed >= 7) {
            penaltyBps = 0;
        } else if (elapsed == 0) {
            penaltyBps = 8000; // 80%
        } else if (elapsed == 1) {
            penaltyBps = 4000; // 40%
        } else if (elapsed == 2) {
            penaltyBps = 2000; // 20%
        } else if (elapsed == 3) {
            penaltyBps = 1500; // 15%
        } else if (elapsed == 4) {
            penaltyBps = 1000; // 10%
        } else if (elapsed == 5) {
            penaltyBps = 1000; // 10%
        } else {
            penaltyBps = 500; // 5% (elapsed == 6)
        }
    }

    /* ══════════════════════════════ INTERNAL ══════════════════════════════════ */

    /// @dev Check if the curve has reached the graduation threshold.
    ///      Sets graduated=true and emits CurveGraduate. The actual liquidity
    ///      migration to a DEX pair happens in Stage 2 (GraduationRouter).
    function _checkGraduation() internal {
        if (realMon >= GRADUATION_THRESHOLD && !graduated) {
            graduated = true;
            emit CurveGraduate(token, address(this));
        }
    }

    /// @dev Send native MON with a balance check.
    function _sendNative(address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok,) = payable(to).call{value: amount}("");
        require(ok, "TRANSFER_FAILED");
    }

    /// @dev Send creator fee. If feeRouter is set, route through it with token context.
    ///      Otherwise send directly to creator address.
    function _sendCreatorFee(address _token, uint256 amount) internal {
        if (amount == 0) return;
        if (feeRouter != address(0)) {
            // Call FeeRouter.receiveCreatorFee with token context (H1 fix)
            (bool ok,) = feeRouter.call{value: amount}(abi.encodeWithSignature("receiveCreatorFee(address)", _token));
            require(ok, "FEE_ROUTER_FAILED");
        } else {
            (bool ok,) = payable(creator).call{value: amount}("");
            require(ok, "CREATOR_FEE_FAILED");
        }
    }

    /// @notice Sets the FeeRouter address. Can only be called once by the deployer (Factory).
    function setFeeRouter(address _feeRouter) external {
        require(msg.sender == deployer, "NOT_AUTHORIZED");
        require(feeRouter == address(0), "ALREADY_SET");
        require(_feeRouter != address(0), "ZERO_ADDRESS");
        feeRouter = _feeRouter;
        emit FeeRouterSet(_feeRouter);
    }

    /// @notice Called by GraduationRouter to approve token transfer and send native MON.
    /// @dev    Only callable by the configured graduationRouter. Transfers all remaining
    ///         tokens and realMon to the router for DEX liquidity migration.
    function approveMigration() external nonReentrant {
        // audit G-02: msg.sender == graduationRouter already implies graduationRouter != 0
        require(msg.sender == graduationRouter, "NOT_ROUTER");
        require(graduated, "NOT_GRADUATED");

        // ── Effects: snapshot state (CEI pattern) ──
        uint256 monToTransfer = realMon;
        realMon = 0;

        // ── Interactions ──
        // Approve GraduationRouter to pull all remaining tokens
        uint256 tokenBalance = IERC20(token).balanceOf(address(this));
        if (tokenBalance > 0) {
            IERC20(token).safeIncreaseAllowance(graduationRouter, tokenBalance);
        }

        // Send native MON to GraduationRouter
        if (monToTransfer > 0) {
            _sendNative(graduationRouter, monToTransfer);
        }

        emit MigrationApproved(token, monToTransfer, tokenBalance);
    }

    /* ══════════════════════════════ RECEIVE ═══════════════════════════════════ */

    /// @notice Accept native MON (from buys and refunds).
    receive() external payable {}
}