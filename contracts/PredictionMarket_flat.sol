// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.8.27 ^0.8.20;

// lib/openzeppelin-contracts/contracts/utils/StorageSlot.sol

// OpenZeppelin Contracts (last updated v5.1.0) (utils/StorageSlot.sol)
// This file was procedurally generated from scripts/generate/templates/StorageSlot.js.

/**
 * @dev Library for reading and writing primitive types to specific storage slots.
 *
 * Storage slots are often used to avoid storage conflict when dealing with upgradeable contracts.
 * This library helps with reading and writing to such slots without the need for inline assembly.
 *
 * The functions in this library return Slot structs that contain a `value` member that can be used to read or write.
 *
 * Example usage to set ERC-1967 implementation slot:
 * ```solidity
 * contract ERC1967 {
 *     // Define the slot. Alternatively, use the SlotDerivation library to derive the slot.
 *     bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
 *
 *     function _getImplementation() internal view returns (address) {
 *         return StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value;
 *     }
 *
 *     function _setImplementation(address newImplementation) internal {
 *         require(newImplementation.code.length > 0);
 *         StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value = newImplementation;
 *     }
 * }
 * ```
 *
 * TIP: Consider using this library along with {SlotDerivation}.
 */
library StorageSlot {
    struct AddressSlot {
        address value;
    }

    struct BooleanSlot {
        bool value;
    }

    struct Bytes32Slot {
        bytes32 value;
    }

    struct Uint256Slot {
        uint256 value;
    }

    struct Int256Slot {
        int256 value;
    }

    struct StringSlot {
        string value;
    }

    struct BytesSlot {
        bytes value;
    }

    /**
     * @dev Returns an `AddressSlot` with member `value` located at `slot`.
     */
    function getAddressSlot(bytes32 slot) internal pure returns (AddressSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `BooleanSlot` with member `value` located at `slot`.
     */
    function getBooleanSlot(bytes32 slot) internal pure returns (BooleanSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Bytes32Slot` with member `value` located at `slot`.
     */
    function getBytes32Slot(bytes32 slot) internal pure returns (Bytes32Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Uint256Slot` with member `value` located at `slot`.
     */
    function getUint256Slot(bytes32 slot) internal pure returns (Uint256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Int256Slot` with member `value` located at `slot`.
     */
    function getInt256Slot(bytes32 slot) internal pure returns (Int256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `StringSlot` with member `value` located at `slot`.
     */
    function getStringSlot(bytes32 slot) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `StringSlot` representation of the string storage pointer `store`.
     */
    function getStringSlot(string storage store) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }

    /**
     * @dev Returns a `BytesSlot` with member `value` located at `slot`.
     */
    function getBytesSlot(bytes32 slot) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `BytesSlot` representation of the bytes storage pointer `store`.
     */
    function getBytesSlot(bytes storage store) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }
}

// lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol

// OpenZeppelin Contracts (last updated v5.5.0) (utils/ReentrancyGuard.sol)

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 *
 * IMPORTANT: Deprecated. This storage-based reentrancy guard will be removed and replaced
 * by the {ReentrancyGuardTransient} variant in v6.0.
 *
 * @custom:stateless
 */
abstract contract ReentrancyGuard {
    using StorageSlot for bytes32;

    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.ReentrancyGuard")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant REENTRANCY_GUARD_STORAGE =
        0x9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f00;

    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _reentrancyGuardStorageSlot().getUint256Slot().value = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    /**
     * @dev A `view` only version of {nonReentrant}. Use to block view functions
     * from being called, preventing reading from inconsistent contract state.
     *
     * CAUTION: This is a "view" modifier and does not change the reentrancy
     * status. Use it only on view functions. For payable or non-payable functions,
     * use the standard {nonReentrant} modifier instead.
     */
    modifier nonReentrantView() {
        _nonReentrantBeforeView();
        _;
    }

    function _nonReentrantBeforeView() private view {
        if (_reentrancyGuardEntered()) {
            revert ReentrancyGuardReentrantCall();
        }
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        _nonReentrantBeforeView();

        // Any calls to nonReentrant after this point will fail
        _reentrancyGuardStorageSlot().getUint256Slot().value = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _reentrancyGuardStorageSlot().getUint256Slot().value = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _reentrancyGuardStorageSlot().getUint256Slot().value == ENTERED;
    }

    function _reentrancyGuardStorageSlot() internal pure virtual returns (bytes32) {
        return REENTRANCY_GUARD_STORAGE;
    }
}

// src/PredictionMarket.sol

/// @notice Minimal interface for BondingCurve ÔÇö only `graduated()` is needed.
interface IBondingCurve {
    function graduated() external view returns (bool);
}

/// @title PredictionMarket
/// @notice Binary prediction market: "Will token X graduate?"
/// @dev    Purely monetary ÔÇö no reputation at stake. On-chain settlement via BondingCurve.graduated().
///         Protocol takes 2% of the losing pool as fee.
contract PredictionMarket is ReentrancyGuard {
    /* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ CONSTANTS ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */

    /// @notice Protocol fee in basis points (2% = 200 bps).
    uint256 public constant PROTOCOL_FEE_BPS = 200;

    /// @notice Basis-point denominator.
    uint256 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Delay before a one-sided market can be refunded.
    uint256 public constant REFUND_DELAY = 7 days;

    /// @notice How long bets are accepted after market creation (48 hours).
    uint256 public constant BETTING_WINDOW = 48 hours;

    /* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ IMMUTABLES ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */

    /// @notice Address that receives the 2% protocol fee from losing pools.
    address public immutable protocolFeeReceiver;

    /// @notice The Lick.fun Factory address ÔÇö only it may create markets.
    address public immutable factory;

    /* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ STRUCTS ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */

    /// @notice Tracks the aggregated state for a single prediction market.
    struct Market {
        address token;       // The LickToken being bet on
        address curve;       // The BondingCurve for this token (used as oracle) ÔÇö C1 fix
        uint256 totalYesMON; // Total MON bet on YES
        uint256 totalNoMON;  // Total MON bet on NO
        bool resolved;       // Whether the market has been resolved
        bool outcome;        // True if the token graduated (YES wins)
        bool cancelled;      // True if the market was cancelled (one-sided) ÔÇö M5
        uint256 closeTime;   // Timestamp after which no more bets are accepted ÔÇö M5
    }

    /* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ STATE ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */

    /// @notice token => Market
    mapping(address => Market) public markets;

    /// @notice token => bettor => MON bet on YES
    mapping(address => mapping(address => uint256)) public yesBets;

    /// @notice token => bettor => MON bet on NO
    mapping(address => mapping(address => uint256)) public noBets;

    /// @notice token => bettor => whether winnings have been claimed
    mapping(address => mapping(address => bool)) public winningsClaimed;

    /// @notice token => whether protocol fee has been swept ÔÇö H4 fix
    mapping(address => bool) public feeSwept;

    /* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ EVENTS ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */

    event MarketCreated(address indexed token);
    event BetPlaced(address indexed token, address indexed bettor, bool indexed isYes, uint256 amount);
    event MarketResolved(address indexed token, bool outcome);
    event WinningsClaimed(address indexed token, address indexed claimant, uint256 amount);

    /* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ CONSTRUCTOR ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */

    /// @param _protocolFeeReceiver Address that receives the 2% protocol fee.
    /// @param _factory           The Lick.fun Factory address ÔÇö only it may create markets.
    constructor(address _protocolFeeReceiver, address _factory) {
        require(_protocolFeeReceiver != address(0), "ZERO_FEE_RECEIVER");
        require(_factory != address(0), "ZERO_FACTORY");
        protocolFeeReceiver = _protocolFeeReceiver;
        factory = _factory;
    }

    /* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ CREATE ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */

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
            closeTime: block.timestamp + BETTING_WINDOW
        });

        emit MarketCreated(token);
    }

    /* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ BET ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */

    /// @notice Bet MON on YES for a given token.
    /// @param token The token address of the market.
    function betYes(address token) external payable nonReentrant {
        require(msg.value > 0, "ZERO_BET");
        _requireMarketExists(token);
        require(!markets[token].resolved, "ALREADY_RESOLVED");
        require(block.timestamp < markets[token].closeTime, "BETTING_CLOSED");

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
        require(block.timestamp < markets[token].closeTime, "BETTING_CLOSED");

        markets[token].totalNoMON += msg.value;
        noBets[token][msg.sender] += msg.value;

        emit BetPlaced(token, msg.sender, false, msg.value);
    }

    /* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ RESOLVE ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */

    /// @notice Resolve the market for a token. Anyone can call after graduation.
    /// @dev    Resolution can only happen after betting closes (closeTime passed)
    ///      OR when the token has graduated ÔÇö no artificial delay needed because
    ///      betYes/betNo already enforce the closeTime window.
    ///      Uses BondingCurve.graduated() as the oracle. Checks CEI.
    /// @param token The token address of the market.
    function resolveMarket(address token) external nonReentrant {
        _requireMarketExists(token);
        require(!markets[token].resolved, "ALREADY_RESOLVED");
        // Must have at least one bet on each side to resolve
        require(markets[token].totalYesMON > 0 && markets[token].totalNoMON > 0, "NO_LIQUIDITY");

        // CEI: query the oracle (external call) before effects
        // Use stored curve address instead of token address (C1 fix)
        bool _graduated = IBondingCurve(markets[token].curve).graduated();

        // Time gate (audit H-04): resolution may only happen once the betting window has
        // closed, OR early if the token has already graduated (graduation is a terminal,
        // irreversible YES outcome so resolving early cannot be gamed). This prevents
        // resolving a still-open market to lock odds mid-window.
        require(
            block.timestamp >= markets[token].closeTime || _graduated,
            "WINDOW_OPEN"
        );

        // Effects
        markets[token].resolved = true;
        markets[token].outcome = _graduated;

        emit MarketResolved(token, _graduated);
    }

    /* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ CLAIM ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */

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
            // YES wins ÔÇö YES bettors split the losing NO pool (minus protocol fee)
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
            // NO wins ÔÇö NO bettors split the losing YES pool (minus protocol fee)
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

        // Pay the winner's share of the losing pool only (audit I-03). The original
        // stake is intentionally retained by the contract (parimutuel design).
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

    /* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ ONE-SIDED MARKET REFUND (M5) ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */

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
        // Allow refund only after the betting window + refund delay has passed
        require(block.timestamp >= m.closeTime + REFUND_DELAY, "TOO_EARLY");
        m.cancelled = true;
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

    /* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ VIEWS ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */

    /// @notice Get the current odds for a market as basis points.
    /// @param token The token address of the market.
    /// @return yesOdds Odds for YES in basis points (0ÔÇô10000).
    /// @return noOdds  Odds for NO in basis points (0ÔÇô10000).
    function getOdds(address token) external view returns (uint256 yesOdds, uint256 noOdds) {
        Market storage market = markets[token];
        uint256 total = market.totalYesMON + market.totalNoMON;
        if (total == 0) {
            return (5000, 5000); // Even odds when no bets
        }
        yesOdds = (market.totalYesMON * BPS_DENOMINATOR) / total;
        noOdds = (market.totalNoMON * BPS_DENOMINATOR) / total;
    }

    /* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ INTERNAL ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */

    function _requireMarketExists(address token) internal view {
        require(markets[token].token != address(0), "MARKET_NOT_FOUND");
    }

    /* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ RECEIVE ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */

    /// @notice Accept native MON (from bets).
    receive() external payable {}
}

