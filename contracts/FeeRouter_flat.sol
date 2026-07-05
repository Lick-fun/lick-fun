// SPDX-License-Identifier: MIT
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

// src/FeeRouter.sol

/**
 * @title FeeRouter
 * @notice Routes the 1% creator fee from BondingCurve trades to Fee Vaults
 * @dev Splits incoming MON according to per-token FeeConfig with preset support
 */
contract FeeRouter is ReentrancyGuard {
    // ├ö├Â├ç├ö├Â├ç├ö├Â├ç Constants ├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç
    uint256 public constant BPS_DENOM = 10_000;

    // ├ö├Â├ç├ö├Â├ç├ö├Â├ç Enums ├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç
    enum Preset { DEFAULT, ECOSYSTEM, LIGHT, STANDARD_A, STANDARD_B, DIAMOND }

    // ├ö├Â├ç├ö├Â├ç├ö├Â├ç Structs ├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç
    struct FeeConfig {
        uint256 creatorShareBps; // to creator wallet
        uint256 lpSupportBps;    // to LP support vault
        uint256 buybackBurnBps;  // to buyback & burn vault
        uint256 giftBps;         // to gift vault
        address giftRecipient;   // recipient for gift vault
        address creator;         // actual creator wallet
        bool initialized;
    }

    // ├ö├Â├ç├ö├Â├ç├ö├Â├ç State ├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç
    mapping(address => FeeConfig) public tokenFeeConfigs;
    address public immutable graduationPool;
    address public owner;

    /// @notice The launch Factory authorised to apply per-token fee configs (audit M-04).
    address public factory;

    address public lpSupportVault;
    address public buybackBurnVault;

    /// @notice Pull-payment fallback: accrued fees for recipients whose push failed.
    mapping(address => uint256) public pendingWithdrawals;

    // ├ö├Â├ç├ö├Â├ç├ö├Â├ç Events ├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç
    event FeeConfigSet(address indexed token, FeeConfig config);
    event FeeRouted(address indexed token, uint256 totalAmount, uint256 creatorShare, uint256 lpShare, uint256 buybackShare, uint256 giftShare);
    event FeePending(address indexed recipient, uint256 amount);
    event FactorySet(address indexed factory);
    event StrandedSwept(address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ├ö├Â├ç├ö├Â├ç├ö├Â├ç Errors ├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç
    error AlreadyInitialized();
    error InvalidBps();
    error NotOwner();
    error ZeroAddress();
    error UseCustomConfig();
    error NotAuthorized();
    error AlreadySet();
    error SweepFailed();

    constructor(address _graduationPool, address _lpSupportVault, address _buybackBurnVault) {
        if (_graduationPool == address(0)) revert ZeroAddress();
        if (_lpSupportVault == address(0)) revert ZeroAddress();
        if (_buybackBurnVault == address(0)) revert ZeroAddress();
        graduationPool = _graduationPool;
        lpSupportVault = _lpSupportVault;
        buybackBurnVault = _buybackBurnVault;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @notice Restricts config setters to the launch Factory or owner (audit M-04).
    modifier onlyFactoryOrOwner() {
        if (msg.sender != factory && msg.sender != owner) revert NotAuthorized();
        _;
    }

    /**
     * @notice Set the authorised launch Factory. Can only be set once (audit M-04).
     * @dev FeeRouter is deployed before Factory, so the owner wires this during deploy.
     */
    function setFactory(address _factory) external onlyOwner {
        if (factory != address(0)) revert AlreadySet();
        if (_factory == address(0)) revert ZeroAddress();
        factory = _factory;
        emit FactorySet(_factory);
    }

    /**
     * @notice Transfer ownership (admin role) to a new address, e.g. a multisig/timelock.
     * @dev Used post-deploy to move admin off the deployer EOA (audit M-06).
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ├ö├Â├ç├ö├Â├ç├ö├Â├ç Preset Helpers ├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç

    /**
     * @notice Returns the fee split config for a given preset
     * @param preset The preset enum value
     * @param creatorAddress The actual creator wallet address
     * @return config The FeeConfig struct
     * @dev LIGHT:      Creator 10% / LP 80% / Buyback&Burn 10%
     *      STANDARD_A: Creator 30% / LP 60% / Buyback&Burn 10%
     *      STANDARD_B: Creator 20% / LP 70% / Buyback&Burn 10%
     *      DIAMOND:    reverts ├ö├ç├Â Diamond configs must go through setCustomConfig()
     *      ECOSYSTEM:  Creator 20% / LP 40% / Buyback&Burn 40%
     *      DEFAULT:    Creator 80% / LP 10% / Buyback&Burn 10%
     */
    function getPresetConfig(Preset preset, address creatorAddress) public view returns (FeeConfig memory) {
        if (preset == Preset.LIGHT) {
            return FeeConfig({
                creatorShareBps: 1000,  // 10%
                lpSupportBps: 8000,       // 80%
                buybackBurnBps: 1000,     // 10%
                giftBps: 0,
                giftRecipient: address(0),
                creator: creatorAddress,
                initialized: true
            });
        }
        if (preset == Preset.STANDARD_A) {
            return FeeConfig({
                creatorShareBps: 3000,  // 30%
                lpSupportBps: 6000,       // 60%
                buybackBurnBps: 1000,     // 10%
                giftBps: 0,
                giftRecipient: address(0),
                creator: creatorAddress,
                initialized: true
            });
        }
        if (preset == Preset.STANDARD_B) {
            return FeeConfig({
                creatorShareBps: 2000,  // 20%
                lpSupportBps: 7000,       // 70%
                buybackBurnBps: 1000,     // 10%
                giftBps: 0,
                giftRecipient: address(0),
                creator: creatorAddress,
                initialized: true
            });
        }
        if (preset == Preset.DIAMOND) {
            // DIAMOND has no fixed preset ├ö├ç├Â callers must use setCustomConfig() instead.
            revert UseCustomConfig();
        }
        if (preset == Preset.ECOSYSTEM) {
            return FeeConfig({
                creatorShareBps: 2000,  // 20%
                lpSupportBps: 4000,       // 40%
                buybackBurnBps: 4000,     // 40%
                giftBps: 0,
                giftRecipient: address(0),
                creator: creatorAddress,
                initialized: true
            });
        }
        // DEFAULT
        return FeeConfig({
            creatorShareBps: 8000,   // 80%
            lpSupportBps: 1000,        // 10%
            buybackBurnBps: 1000,      // 10%
            giftBps: 0,
            giftRecipient: address(0),
            creator: creatorAddress,
            initialized: true
        });
    }

    // ├ö├Â├ç├ö├Â├ç├ö├Â├ç Configuration ├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç

    /**
     * @notice Sets fee config for a token. Can only be called once per token.
     * @param token The token address
     * @param config The fee split configuration
     */
    function setFeeConfig(address token, FeeConfig calldata config) public onlyOwner {
        _setFeeConfig(token, config);
    }

    /**
     * @notice Sets a custom fee config for DIAMOND tier tokens.
     * @param token The token address (must not already have a config initialized)
     * @param config The FeeConfig struct ├ö├ç├Â fully customisable, any split summing to 100% is valid
     */
    function setCustomConfig(address token, FeeConfig calldata config) external onlyOwner {
        _setFeeConfig(token, config);
    }

    function _setFeeConfig(address token, FeeConfig memory config) internal {
        if (tokenFeeConfigs[token].initialized) revert AlreadyInitialized();
        if (config.creatorShareBps + config.lpSupportBps + config.buybackBurnBps + config.giftBps != BPS_DENOM) {
            revert InvalidBps();
        }
        if (config.giftBps > 0 && config.giftRecipient == address(0)) revert ZeroAddress();
        tokenFeeConfigs[token] = config;
        emit FeeConfigSet(token, config);
    }

    /**
     * @notice Applies a preset fee config for a token. Convenience for Factory.
     * @param token The token address
     * @param creatorAddress The actual creator wallet
     * @param preset The preset enum value
     */
    function applyPreset(address token, address creatorAddress, Preset preset) external onlyFactoryOrOwner {
        FeeConfig memory config = getPresetConfig(preset, creatorAddress);
        _setFeeConfig(token, config);
    }

    /**
     * @notice Applies a fully custom fee config for a token. Callable by anyone (e.g. Factory).
     * @dev Uses the same _setFeeConfig validation: bps must sum to 10000, AlreadyInitialized guard.
     * @param token The token address
     * @param creatorAddress The actual creator wallet
     * @param creatorShareBps Creator's cut in bps
     * @param lpSupportBps LP support vault cut in bps
     * @param buybackBurnBps Buyback & burn vault cut in bps
     * @param giftBps Gift recipient cut in bps (0 if no gift)
     * @param giftRecipient Gift recipient address (address(0) if giftBps == 0)
     */
    function applyCustomConfig(
        address token,
        address creatorAddress,
        uint256 creatorShareBps,
        uint256 lpSupportBps,
        uint256 buybackBurnBps,
        uint256 giftBps,
        address giftRecipient
    ) external onlyFactoryOrOwner {
        FeeConfig memory config = FeeConfig({
            creatorShareBps: creatorShareBps,
            lpSupportBps: lpSupportBps,
            buybackBurnBps: buybackBurnBps,
            giftBps: giftBps,
            giftRecipient: giftRecipient,
            creator: creatorAddress,
            initialized: true
        });
        _setFeeConfig(token, config);
    }

    // ├ö├Â├ç├ö├Â├ç├ö├Â├ç Fee Collection ├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç

    /**
     * @notice Receives the creator fee from BondingCurve and routes to vaults
     * @param token The token address this fee is for
     * @dev Called by BondingCurve when it sends creator fees (BondingCurve sends ETH to
     *      its `creator` address, which is set to this FeeRouter when using presets).
     *      This function can be called by anyone to sweep fees that were sent directly.
     */
    function receiveCreatorFee(address token) external payable nonReentrant {
        FeeConfig memory config = tokenFeeConfigs[token];
        if (!config.initialized) revert InvalidBps();

        uint256 amount = msg.value;
        if (amount == 0) return;

        uint256 creatorShare   = (amount * config.creatorShareBps) / BPS_DENOM;
        uint256 lpShare        = (amount * config.lpSupportBps) / BPS_DENOM;
        uint256 buybackShare   = (amount * config.buybackBurnBps) / BPS_DENOM;
        uint256 giftShare      = (amount * config.giftBps) / BPS_DENOM;

        // Sweep rounding dust to LP vault (M-01)
        uint256 dust = amount - creatorShare - lpShare - buybackShare - giftShare;
        if (dust > 0) lpShare += dust;

        // Route creator share to actual creator (failure-tolerant)
        if (creatorShare > 0) {
            (bool ok, ) = config.creator.call{value: creatorShare}("");
            if (!ok) {
                pendingWithdrawals[config.creator] += creatorShare;
                emit FeePending(config.creator, creatorShare);
            }
        }

        // Route LP support share (failure-tolerant)
        if (lpShare > 0) {
            (bool ok, ) = lpSupportVault.call{value: lpShare}("");
            if (!ok) {
                pendingWithdrawals[lpSupportVault] += lpShare;
                emit FeePending(lpSupportVault, lpShare);
            }
        }

        // Route buyback & burn share (failure-tolerant)
        if (buybackShare > 0) {
            (bool ok, ) = buybackBurnVault.call{value: buybackShare}("");
            if (!ok) {
                pendingWithdrawals[buybackBurnVault] += buybackShare;
                emit FeePending(buybackBurnVault, buybackShare);
            }
        }

        // Route gift share (failure-tolerant)
        if (giftShare > 0 && config.giftRecipient != address(0)) {
            (bool ok, ) = config.giftRecipient.call{value: giftShare}("");
            if (!ok) {
                pendingWithdrawals[config.giftRecipient] += giftShare;
                emit FeePending(config.giftRecipient, giftShare);
            }
        }

        emit FeeRouted(token, amount, creatorShare, lpShare, buybackShare, giftShare);
    }

    /// @notice Withdraw accrued fees that failed to be pushed (pull-payment fallback).
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "NOTHING_TO_WITHDRAW");
        pendingWithdrawals[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "WITHDRAW_FAILED");
    }

    /**
     * @notice Fallback receive function to accept ETH sent directly from BondingCurve
     * @dev BondingCurve sends creator fees to its `creator` address (this contract).
     *      ETH accumulates here; it must be swept via receiveCreatorFee with the token param.
     *      However, BondingCurve sends ETH directly without specifying the token, so we
     *      cannot route fees automatically. Instead, we use a different approach:
     *      BondingCurve sends to this contract, and the Factory calls receiveCreatorFee
     *      with the token address after the trade. The ETH balance here is swept.
     */
    receive() external payable {}

    // ├ö├Â├ç├ö├Â├ç├ö├Â├ç Admin ├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç├ö├Â├ç

    /**
     * @notice Updates the vault addresses
     * @param _lpSupportVault New LP support vault address
     * @param _buybackBurnVault New buyback & burn vault address
     */
    function setVaults(address _lpSupportVault, address _buybackBurnVault) external onlyOwner {
        if (_lpSupportVault == address(0)) revert ZeroAddress();
        if (_buybackBurnVault == address(0)) revert ZeroAddress();
        lpSupportVault = _lpSupportVault;
        buybackBurnVault = _buybackBurnVault;
    }

    /**
     * @notice Sweep MON that arrived outside of {receiveCreatorFee} and is otherwise stranded.
     * @dev The bare {receive} accepts untagged MON which cannot be routed; this owner-only
     *      sweep recovers it instead of leaving it locked (audit L-05). It does not touch
     *      pull-payment balances, which are tracked separately and withdrawn via {withdraw}.
     * @param to Recipient of the swept MON.
     * @param amount Amount of MON (wei) to sweep.
     */
    function sweepStranded(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        (bool ok, ) = payable(to).call{value: amount}("");
        if (!ok) revert SweepFailed();
        emit StrandedSwept(to, amount);
    }
}

