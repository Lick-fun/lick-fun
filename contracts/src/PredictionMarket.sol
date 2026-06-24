// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Minimal interface for BondingCurve — only `graduated()` is needed.
interface IBondingCurve {
    function graduated() external view returns (bool);
}

/// @title PredictionMarket
/// @notice Binary prediction market: "Will token X graduate?"
/// @dev    Purely monetary — no reputation at stake. On-chain settlement via BondingCurve.graduated().
///         Protocol takes 2% of the losing pool as fee.
contract PredictionMarket is ReentrancyGuard {
    /* ═══════════════════════════════ CONSTANTS ══════════════════════════════ */

    /// @notice Protocol fee in basis points (2% = 200 bps).
    uint256 public constant PROTOCOL_FEE_BPS = 200;

    /// @notice Basis-point denominator.
    uint256 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Delay before a one-sided market can be refunded.
    uint256 public constant REFUND_DELAY = 7 days;

    /* ═══════════════════════════════ IMMUTABLES ══════════════════════════════ */

    /// @notice Address that receives the 2% protocol fee from losing pools.
    address public immutable protocolFeeReceiver;

    /// @notice The Lick.fun Factory address — only it may create markets.
    address public immutable factory;

    /* ════════════════════════════════ STRUCTS ═══════════════════════════════ */

    /// @notice Tracks the aggregated state for a single prediction market.
    struct Market {
        address token;       // The LickToken being bet on
        address curve;       // The BondingCurve for this token (used as oracle) — C1 fix
        uint256 totalYesMON; // Total MON bet on YES
        uint256 totalNoMON;  // Total MON bet on NO
        bool resolved;       // Whether the market has been resolved
        bool outcome;        // True if the token graduated (YES wins)
        bool cancelled;      // True if the market was cancelled (one-sided) — M5
        uint256 closeTime;   // Timestamp after which no more bets are accepted — M5
    }

    /* ════════════════════════════════ STATE ═════════════════════════════════ */

    /// @notice token => Market
    mapping(address => Market) public markets;

    /// @notice token => bettor => MON bet on YES
    mapping(address => mapping(address => uint256)) public yesBets;

    /// @notice token => bettor => MON bet on NO
    mapping(address => mapping(address => uint256)) public noBets;

    /// @notice token => bettor => whether winnings have been claimed
    mapping(address => mapping(address => bool)) public winningsClaimed;

    /// @notice token => whether protocol fee has been swept — H4 fix
    mapping(address => bool) public feeSwept;

    /* ════════════════════════════════ EVENTS ════════════════════════════════ */

    event MarketCreated(address indexed token);
    event BetPlaced(address indexed token, address indexed bettor, bool indexed isYes, uint256 amount);
    event MarketResolved(address indexed token, bool outcome);
    event WinningsClaimed(address indexed token, address indexed claimant, uint256 amount);

    /* ═════════════════════════════ CONSTRUCTOR ═══════════════════════════════ */

    /// @param _protocolFeeReceiver Address that receives the 2% protocol fee.
    /// @param _factory           The Lick.fun Factory address — only it may create markets.
    constructor(address _protocolFeeReceiver, address _factory) {
        require(_protocolFeeReceiver != address(0), "ZERO_FEE_RECEIVER");
        require(_factory != address(0), "ZERO_FACTORY");
        protocolFeeReceiver = _protocolFeeReceiver;
        factory = _factory;
    }

    /* ════════════════════════════════ CREATE ════════════════════════════════ */

    /// @notice Create a prediction market for a token. One market per token.
    /// @param token The LickToken address to create a market for.
    /// @param curve The BondingCurve address used as the oracle for this market.
    function createMarket(address token, address curve) external {
        require(msg.sender == factory, "ONLY_FACTORY");
        require(token != address(0), "ZERO_TOKEN");
        require(curve != address(0), "ZERO_CURVE");
        require(markets[token].token == address(0), "MARKET_EXISTS");

        markets[token] = Market({
            token: token,
            curve: curve,
            totalYesMON: 0,
            totalNoMON: 0,
            resolved: false,
            outcome: false,
            cancelled: false,
            closeTime: block.timestamp
        });

        emit MarketCreated(token);
    }

    /* ═════════════════════════════════ BET ══════════════════════════════════ */

    /// @notice Bet MON on YES for a given token.
    /// @param token The token address of the market.
    function betYes(address token) external payable nonReentrant {
        require(msg.value > 0, "ZERO_BET");
        _requireMarketExists(token);
        require(!markets[token].resolved, "ALREADY_RESOLVED");

        markets[token].totalYesMON += msg.value;
        yesBets[token][msg.sender] += msg.value;

        emit BetPlaced(token, msg.sender, true, msg.value);
    }

    /// @notice Bet MON on NO for a given token.
    /// @param token The token address of the market.
    function betNo(address token) external payable nonReentrant {
        require(msg.value > 0, "ZERO_BET");
        _requireMarketExists(token);
        require(!markets[token].resolved, "ALREADY_RESOLVED");

        markets[token].totalNoMON += msg.value;
        noBets[token][msg.sender] += msg.value;

        emit BetPlaced(token, msg.sender, false, msg.value);
    }

    /* ═══════════════════════════════ RESOLVE ════════════════════════════════ */

    /// @notice Resolve the market for a token. Anyone can call after graduation.
    /// @dev    Uses BondingCurve.graduated() as the oracle. Checks CEI.
    /// @param token The token address of the market.
    function resolveMarket(address token) external nonReentrant {
        _requireMarketExists(token);
        require(!markets[token].resolved, "ALREADY_RESOLVED");
        // Must have at least one bet on each side to resolve
        require(markets[token].totalYesMON > 0 && markets[token].totalNoMON > 0, "NO_LIQUIDITY");

        // CEI: query the oracle (external call) before effects
        // Use stored curve address instead of token address (C1 fix)
        bool _graduated = IBondingCurve(markets[token].curve).graduated();

        // Effects
        markets[token].resolved = true;
        markets[token].outcome = _graduated;

        emit MarketResolved(token, _graduated);
    }

    /* ══════════════════════════════ CLAIM ═══════════════════════════════════ */

    /// @notice Claim winnings after a market has been resolved.
    /// @dev    CEI pattern: effects before interactions.
    /// @param token The token address of the market.
    function claimWinnings(address token) external nonReentrant {
        _requireMarketExists(token);
        Market storage market = markets[token];
        require(market.resolved, "NOT_RESOLVED");
        require(!winningsClaimed[token][msg.sender], "ALREADY_CLAIMED");

        uint256 payout;
        if (market.outcome) {
            // YES wins — YES bettors split the losing NO pool (minus protocol fee)
            // NOTE: payout is winner's share of losing pool only.
            // Original stake remains in the contract and is NOT returned.
            // This is intentional parimutuel market design.
            uint256 yesBet = yesBets[token][msg.sender];
            require(yesBet > 0, "NO_WINNINGS");
            uint256 losingPool = market.totalNoMON;
            uint256 protocolFee = (losingPool * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
            uint256 distributablePool = losingPool - protocolFee;
            payout = (yesBet * distributablePool) / market.totalYesMON;
        } else {
            // NO wins — NO bettors split the losing YES pool (minus protocol fee)
            // NOTE: payout is winner's share of losing pool only.
            // Original stake remains in the contract and is NOT returned.
            // This is intentional parimutuel market design.
            uint256 noBet = noBets[token][msg.sender];
            require(noBet > 0, "NO_WINNINGS");
            uint256 losingPool = market.totalYesMON;
            uint256 protocolFee = (losingPool * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
            uint256 distributablePool = losingPool - protocolFee;
            payout = (noBet * distributablePool) / market.totalNoMON;
        }

        // Effects before interactions (CEI)
        winningsClaimed[token][msg.sender] = true;

        // Return the bettor's original stake + winnings from the contract balance
        emit WinningsClaimed(token, msg.sender, payout);

        // Interactions
        (bool ok,) = payable(msg.sender).call{value: payout}("");
        require(ok, "TRANSFER_FAILED");
    }

    /// @notice After all winners have claimed, anyone can sweep the protocol fee.
    /// @param token The token address of the market.
    function sweepProtocolFee(address token) external nonReentrant {
        _requireMarketExists(token);
        Market storage market = markets[token];
        require(market.resolved, "NOT_RESOLVED");
        require(!feeSwept[token], "ALREADY_SWEPT"); // H4 fix

        feeSwept[token] = true; // H4 fix: mark as swept before interaction

        uint256 losingPool = market.outcome ? market.totalNoMON : market.totalYesMON;
        uint256 protocolFee = (losingPool * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;

        require(protocolFee > 0, "ZERO_FEE");
        require(address(this).balance >= protocolFee, "INSUFFICIENT_BALANCE");

        (bool ok,) = payable(protocolFeeReceiver).call{value: protocolFee}("");
        require(ok, "TRANSFER_FAILED");
    }

    /* ═══════════════════════════ ONE-SIDED MARKET REFUND (M5) ════════════════ */

    /// @notice Allows a bettor to close a one-sided market and trigger refund mode.
    /// @param token The token address of the market.
    /// @dev After REFUND_DELAY from closeTime, if only one side has bets, anyone can
    ///      mark the market as cancelled so bettors can withdraw their stake.
    function refundOneSidedMarket(address token) external {
        _requireMarketExists(token);
        Market storage m = markets[token];
        require(!m.resolved, "ALREADY_RESOLVED");
        require(!m.cancelled, "ALREADY_CANCELLED");
        require(m.totalYesMON == 0 || m.totalNoMON == 0, "MARKET_HAD_BOTH_SIDES");

        // Record close time so we can check REFUND_DELAY
        if (m.closeTime == 0) {
            m.closeTime = block.timestamp;
            // Allow bettors to withdraw immediately when market is one-sided
            m.cancelled = true;
        } else {
            require(block.timestamp >= m.closeTime + REFUND_DELAY, "TOO_EARLY");
            m.cancelled = true;
        }
    }

    /// @notice Withdraw your original bet from a cancelled (one-sided) market.
    /// @param token The token address of the market.
    function withdrawRefund(address token) external nonReentrant {
        _requireMarketExists(token);
        Market storage m = markets[token];
        require(m.cancelled, "NOT_CANCELLED");

        uint256 refund;
        uint256 yesBet = yesBets[token][msg.sender];
        uint256 noBet = noBets[token][msg.sender];
        require(yesBet > 0 || noBet > 0, "NO_BET");

        // Clear bet before sending ETH (CEI)
        if (yesBet > 0) {
            refund += yesBet;
            yesBets[token][msg.sender] = 0;
        }
        if (noBet > 0) {
            refund += noBet;
            noBets[token][msg.sender] = 0;
        }

        (bool ok,) = payable(msg.sender).call{value: refund}("");
        require(ok, "TRANSFER_FAILED");
    }

    /* ════════════════════════════════ VIEWS ═════════════════════════════════ */

    /// @notice Get the current odds for a market as basis points.
    /// @param token The token address of the market.
    /// @return yesOdds Odds for YES in basis points (0–10000).
    /// @return noOdds  Odds for NO in basis points (0–10000).
    function getOdds(address token) external view returns (uint256 yesOdds, uint256 noOdds) {
        Market storage market = markets[token];
        uint256 total = market.totalYesMON + market.totalNoMON;
        if (total == 0) {
            return (5000, 5000); // Even odds when no bets
        }
        yesOdds = (market.totalYesMON * BPS_DENOMINATOR) / total;
        noOdds = (market.totalNoMON * BPS_DENOMINATOR) / total;
    }

    /* ══════════════════════════════ INTERNAL ═════════════════════════════════ */

    function _requireMarketExists(address token) internal view {
        require(markets[token].token != address(0), "MARKET_NOT_FOUND");
    }

    /* ══════════════════════════════ RECEIVE ══════════════════════════════════ */

    /// @notice Accept native MON (from bets).
    receive() external payable {}
}