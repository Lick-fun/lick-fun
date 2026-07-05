// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.8.27 >=0.4.16 >=0.6.2 >=0.8.4 ^0.8.20;

// lib/openzeppelin-contracts/contracts/utils/Context.sol

// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}

// lib/openzeppelin-contracts/contracts/utils/introspection/IERC165.sol

// OpenZeppelin Contracts (last updated v5.4.0) (utils/introspection/IERC165.sol)

/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol

// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC20/IERC20.sol)

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

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

// lib/openzeppelin-contracts/contracts/interfaces/draft-IERC6093.sol

// OpenZeppelin Contracts (last updated v5.5.0) (interfaces/draft-IERC6093.sol)

/**
 * @dev Standard ERC-20 Errors
 * Interface of the https://eips.ethereum.org/EIPS/eip-6093[ERC-6093] custom errors for ERC-20 tokens.
 */
interface IERC20Errors {
    /**
     * @dev Indicates an error related to the current `balance` of a `sender`. Used in transfers.
     * @param sender Address whose tokens are being transferred.
     * @param balance Current balance for the interacting account.
     * @param needed Minimum amount required to perform a transfer.
     */
    error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed);

    /**
     * @dev Indicates a failure with the token `sender`. Used in transfers.
     * @param sender Address whose tokens are being transferred.
     */
    error ERC20InvalidSender(address sender);

    /**
     * @dev Indicates a failure with the token `receiver`. Used in transfers.
     * @param receiver Address to which tokens are being transferred.
     */
    error ERC20InvalidReceiver(address receiver);

    /**
     * @dev Indicates a failure with the `spender`ÔÇÖs `allowance`. Used in transfers.
     * @param spender Address that may be allowed to operate on tokens without being their owner.
     * @param allowance Amount of tokens a `spender` is allowed to operate with.
     * @param needed Minimum amount required to perform a transfer.
     */
    error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed);

    /**
     * @dev Indicates a failure with the `approver` of a token to be approved. Used in approvals.
     * @param approver Address initiating an approval operation.
     */
    error ERC20InvalidApprover(address approver);

    /**
     * @dev Indicates a failure with the `spender` to be approved. Used in approvals.
     * @param spender Address that may be allowed to operate on tokens without being their owner.
     */
    error ERC20InvalidSpender(address spender);
}

/**
 * @dev Standard ERC-721 Errors
 * Interface of the https://eips.ethereum.org/EIPS/eip-6093[ERC-6093] custom errors for ERC-721 tokens.
 */
interface IERC721Errors {
    /**
     * @dev Indicates that an address can't be an owner. For example, `address(0)` is a forbidden owner in ERC-721.
     * Used in balance queries.
     * @param owner Address of the current owner of a token.
     */
    error ERC721InvalidOwner(address owner);

    /**
     * @dev Indicates a `tokenId` whose `owner` is the zero address.
     * @param tokenId Identifier number of a token.
     */
    error ERC721NonexistentToken(uint256 tokenId);

    /**
     * @dev Indicates an error related to the ownership over a particular token. Used in transfers.
     * @param sender Address whose tokens are being transferred.
     * @param tokenId Identifier number of a token.
     * @param owner Address of the current owner of a token.
     */
    error ERC721IncorrectOwner(address sender, uint256 tokenId, address owner);

    /**
     * @dev Indicates a failure with the token `sender`. Used in transfers.
     * @param sender Address whose tokens are being transferred.
     */
    error ERC721InvalidSender(address sender);

    /**
     * @dev Indicates a failure with the token `receiver`. Used in transfers.
     * @param receiver Address to which tokens are being transferred.
     */
    error ERC721InvalidReceiver(address receiver);

    /**
     * @dev Indicates a failure with the `operator`ÔÇÖs approval. Used in transfers.
     * @param operator Address that may be allowed to operate on tokens without being their owner.
     * @param tokenId Identifier number of a token.
     */
    error ERC721InsufficientApproval(address operator, uint256 tokenId);

    /**
     * @dev Indicates a failure with the `approver` of a token to be approved. Used in approvals.
     * @param approver Address initiating an approval operation.
     */
    error ERC721InvalidApprover(address approver);

    /**
     * @dev Indicates a failure with the `operator` to be approved. Used in approvals.
     * @param operator Address that may be allowed to operate on tokens without being their owner.
     */
    error ERC721InvalidOperator(address operator);
}

/**
 * @dev Standard ERC-1155 Errors
 * Interface of the https://eips.ethereum.org/EIPS/eip-6093[ERC-6093] custom errors for ERC-1155 tokens.
 */
interface IERC1155Errors {
    /**
     * @dev Indicates an error related to the current `balance` of a `sender`. Used in transfers.
     * @param sender Address whose tokens are being transferred.
     * @param balance Current balance for the interacting account.
     * @param needed Minimum amount required to perform a transfer.
     * @param tokenId Identifier number of a token.
     */
    error ERC1155InsufficientBalance(address sender, uint256 balance, uint256 needed, uint256 tokenId);

    /**
     * @dev Indicates a failure with the token `sender`. Used in transfers.
     * @param sender Address whose tokens are being transferred.
     */
    error ERC1155InvalidSender(address sender);

    /**
     * @dev Indicates a failure with the token `receiver`. Used in transfers.
     * @param receiver Address to which tokens are being transferred.
     */
    error ERC1155InvalidReceiver(address receiver);

    /**
     * @dev Indicates a failure with the `operator`ÔÇÖs approval. Used in transfers.
     * @param operator Address that may be allowed to operate on tokens without being their owner.
     * @param owner Address of the current owner of a token.
     */
    error ERC1155MissingApprovalForAll(address operator, address owner);

    /**
     * @dev Indicates a failure with the `approver` of a token to be approved. Used in approvals.
     * @param approver Address initiating an approval operation.
     */
    error ERC1155InvalidApprover(address approver);

    /**
     * @dev Indicates a failure with the `operator` to be approved. Used in approvals.
     * @param operator Address that may be allowed to operate on tokens without being their owner.
     */
    error ERC1155InvalidOperator(address operator);

    /**
     * @dev Indicates an array length mismatch between ids and values in a safeBatchTransferFrom operation.
     * Used in batch transfers.
     * @param idsLength Length of the array of token identifiers
     * @param valuesLength Length of the array of token amounts
     */
    error ERC1155InvalidArrayLength(uint256 idsLength, uint256 valuesLength);
}

// lib/openzeppelin-contracts/contracts/interfaces/IERC165.sol

// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC165.sol)

// lib/openzeppelin-contracts/contracts/interfaces/IERC20.sol

// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC20.sol)

// lib/openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol

// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC20/extensions/IERC20Metadata.sol)

/**
 * @dev Interface for the optional metadata functions from the ERC-20 standard.
 */
interface IERC20Metadata is IERC20 {
    /**
     * @dev Returns the name of the token.
     */
    function name() external view returns (string memory);

    /**
     * @dev Returns the symbol of the token.
     */
    function symbol() external view returns (string memory);

    /**
     * @dev Returns the decimals places of the token.
     */
    function decimals() external view returns (uint8);
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

// lib/openzeppelin-contracts/contracts/interfaces/IERC20Metadata.sol

// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC20Metadata.sol)

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

// lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol

// OpenZeppelin Contracts (last updated v5.5.0) (token/ERC20/ERC20.sol)

/**
 * @dev Implementation of the {IERC20} interface.
 *
 * This implementation is agnostic to the way tokens are created. This means
 * that a supply mechanism has to be added in a derived contract using {_mint}.
 *
 * TIP: For a detailed writeup see our guide
 * https://forum.openzeppelin.com/t/how-to-implement-erc20-supply-mechanisms/226[How
 * to implement supply mechanisms].
 *
 * The default value of {decimals} is 18. To change this, you should override
 * this function so it returns a different value.
 *
 * We have followed general OpenZeppelin Contracts guidelines: functions revert
 * instead returning `false` on failure. This behavior is nonetheless
 * conventional and does not conflict with the expectations of ERC-20
 * applications.
 */
abstract contract ERC20 is Context, IERC20, IERC20Metadata, IERC20Errors {
    mapping(address account => uint256) private _balances;

    mapping(address account => mapping(address spender => uint256)) private _allowances;

    uint256 private _totalSupply;

    string private _name;
    string private _symbol;

    /**
     * @dev Sets the values for {name} and {symbol}.
     *
     * Both values are immutable: they can only be set once during construction.
     */
    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }

    /**
     * @dev Returns the name of the token.
     */
    function name() public view virtual returns (string memory) {
        return _name;
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    function symbol() public view virtual returns (string memory) {
        return _symbol;
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * For example, if `decimals` equals `2`, a balance of `505` tokens should
     * be displayed to a user as `5.05` (`505 / 10 ** 2`).
     *
     * Tokens usually opt for a value of 18, imitating the relationship between
     * Ether and Wei. This is the default value returned by this function, unless
     * it's overridden.
     *
     * NOTE: This information is only used for _display_ purposes: it in
     * no way affects any of the arithmetic of the contract, including
     * {IERC20-balanceOf} and {IERC20-transfer}.
     */
    function decimals() public view virtual returns (uint8) {
        return 18;
    }

    /// @inheritdoc IERC20
    function totalSupply() public view virtual returns (uint256) {
        return _totalSupply;
    }

    /// @inheritdoc IERC20
    function balanceOf(address account) public view virtual returns (uint256) {
        return _balances[account];
    }

    /**
     * @dev See {IERC20-transfer}.
     *
     * Requirements:
     *
     * - `to` cannot be the zero address.
     * - the caller must have a balance of at least `value`.
     */
    function transfer(address to, uint256 value) public virtual returns (bool) {
        address owner = _msgSender();
        _transfer(owner, to, value);
        return true;
    }

    /// @inheritdoc IERC20
    function allowance(address owner, address spender) public view virtual returns (uint256) {
        return _allowances[owner][spender];
    }

    /**
     * @dev See {IERC20-approve}.
     *
     * NOTE: If `value` is the maximum `uint256`, the allowance is not updated on
     * `transferFrom`. This is semantically equivalent to an infinite approval.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function approve(address spender, uint256 value) public virtual returns (bool) {
        address owner = _msgSender();
        _approve(owner, spender, value);
        return true;
    }

    /**
     * @dev See {IERC20-transferFrom}.
     *
     * Skips emitting an {Approval} event indicating an allowance update. This is not
     * required by the ERC. See {xref-ERC20-_approve-address-address-uint256-bool-}[_approve].
     *
     * NOTE: Does not update the allowance if the current allowance
     * is the maximum `uint256`.
     *
     * Requirements:
     *
     * - `from` and `to` cannot be the zero address.
     * - `from` must have a balance of at least `value`.
     * - the caller must have allowance for ``from``'s tokens of at least
     * `value`.
     */
    function transferFrom(address from, address to, uint256 value) public virtual returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, value);
        _transfer(from, to, value);
        return true;
    }

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to`.
     *
     * This internal function is equivalent to {transfer}, and can be used to
     * e.g. implement automatic token fees, slashing mechanisms, etc.
     *
     * Emits a {Transfer} event.
     *
     * NOTE: This function is not virtual, {_update} should be overridden instead.
     */
    function _transfer(address from, address to, uint256 value) internal {
        if (from == address(0)) {
            revert ERC20InvalidSender(address(0));
        }
        if (to == address(0)) {
            revert ERC20InvalidReceiver(address(0));
        }
        _update(from, to, value);
    }

    /**
     * @dev Transfers a `value` amount of tokens from `from` to `to`, or alternatively mints (or burns) if `from`
     * (or `to`) is the zero address. All customizations to transfers, mints, and burns should be done by overriding
     * this function.
     *
     * Emits a {Transfer} event.
     */
    function _update(address from, address to, uint256 value) internal virtual {
        if (from == address(0)) {
            // Overflow check required: The rest of the code assumes that totalSupply never overflows
            _totalSupply += value;
        } else {
            uint256 fromBalance = _balances[from];
            if (fromBalance < value) {
                revert ERC20InsufficientBalance(from, fromBalance, value);
            }
            unchecked {
                // Overflow not possible: value <= fromBalance <= totalSupply.
                _balances[from] = fromBalance - value;
            }
        }

        if (to == address(0)) {
            unchecked {
                // Overflow not possible: value <= totalSupply or value <= fromBalance <= totalSupply.
                _totalSupply -= value;
            }
        } else {
            unchecked {
                // Overflow not possible: balance + value is at most totalSupply, which we know fits into a uint256.
                _balances[to] += value;
            }
        }

        emit Transfer(from, to, value);
    }

    /**
     * @dev Creates a `value` amount of tokens and assigns them to `account`, by transferring it from address(0).
     * Relies on the `_update` mechanism
     *
     * Emits a {Transfer} event with `from` set to the zero address.
     *
     * NOTE: This function is not virtual, {_update} should be overridden instead.
     */
    function _mint(address account, uint256 value) internal {
        if (account == address(0)) {
            revert ERC20InvalidReceiver(address(0));
        }
        _update(address(0), account, value);
    }

    /**
     * @dev Destroys a `value` amount of tokens from `account`, lowering the total supply.
     * Relies on the `_update` mechanism.
     *
     * Emits a {Transfer} event with `to` set to the zero address.
     *
     * NOTE: This function is not virtual, {_update} should be overridden instead
     */
    function _burn(address account, uint256 value) internal {
        if (account == address(0)) {
            revert ERC20InvalidSender(address(0));
        }
        _update(account, address(0), value);
    }

    /**
     * @dev Sets `value` as the allowance of `spender` over the `owner`'s tokens.
     *
     * This internal function is equivalent to `approve`, and can be used to
     * e.g. set automatic allowances for certain subsystems, etc.
     *
     * Emits an {Approval} event.
     *
     * Requirements:
     *
     * - `owner` cannot be the zero address.
     * - `spender` cannot be the zero address.
     *
     * Overrides to this logic should be done to the variant with an additional `bool emitEvent` argument.
     */
    function _approve(address owner, address spender, uint256 value) internal {
        _approve(owner, spender, value, true);
    }

    /**
     * @dev Variant of {_approve} with an optional flag to enable or disable the {Approval} event.
     *
     * By default (when calling {_approve}) the flag is set to true. On the other hand, approval changes made by
     * `_spendAllowance` during the `transferFrom` operation sets the flag to false. This saves gas by not emitting any
     * `Approval` event during `transferFrom` operations.
     *
     * Anyone who wishes to continue emitting `Approval` events on the `transferFrom` operation can force the flag to
     * true using the following override:
     *
     * ```solidity
     * function _approve(address owner, address spender, uint256 value, bool) internal virtual override {
     *     super._approve(owner, spender, value, true);
     * }
     * ```
     *
     * Requirements are the same as {_approve}.
     */
    function _approve(address owner, address spender, uint256 value, bool emitEvent) internal virtual {
        if (owner == address(0)) {
            revert ERC20InvalidApprover(address(0));
        }
        if (spender == address(0)) {
            revert ERC20InvalidSpender(address(0));
        }
        _allowances[owner][spender] = value;
        if (emitEvent) {
            emit Approval(owner, spender, value);
        }
    }

    /**
     * @dev Updates `owner`'s allowance for `spender` based on spent `value`.
     *
     * Does not update the allowance value in case of infinite allowance.
     * Revert if not enough allowance is available.
     *
     * Does not emit an {Approval} event.
     */
    function _spendAllowance(address owner, address spender, uint256 value) internal virtual {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance < type(uint256).max) {
            if (currentAllowance < value) {
                revert ERC20InsufficientAllowance(spender, currentAllowance, value);
            }
            unchecked {
                _approve(owner, spender, currentAllowance - value, false);
            }
        }
    }
}

// lib/openzeppelin-contracts/contracts/interfaces/IERC1363.sol

// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC1363.sol)

/**
 * @title IERC1363
 * @dev Interface of the ERC-1363 standard as defined in the https://eips.ethereum.org/EIPS/eip-1363[ERC-1363].
 *
 * Defines an extension interface for ERC-20 tokens that supports executing code on a recipient contract
 * after `transfer` or `transferFrom`, or code on a spender contract after `approve`, in a single transaction.
 */
interface IERC1363 is IERC20, IERC165 {
    /*
     * Note: the ERC-165 identifier for this interface is 0xb0202a11.
     * 0xb0202a11 ===
     *   bytes4(keccak256('transferAndCall(address,uint256)')) ^
     *   bytes4(keccak256('transferAndCall(address,uint256,bytes)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256,bytes)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256,bytes)'))
     */

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @param data Additional data with no specified format, sent in call to `spender`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value, bytes calldata data) external returns (bool);
}

// src/LickToken.sol

/// @title LickToken
/// @notice Standard ERC-20 with 18 decimals. Minted in full to the deployer (Factory)
///         at construction. No extra logic ├ö├ç├Â pure OpenZeppelin ERC-20.
/// @dev   Total supply is fixed at 1,000,000,000e18 and minted to msg.sender.
contract LickToken is ERC20 {
    /// @notice Fixed total supply: 1,000,000,000 tokens with 18 decimals.
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 ether;

    /// @param name   ERC-20 token name
    /// @param symbol ERC-20 token symbol
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        // Mint the entire supply to the deployer (Factory), which then transfers
        // the balance to the BondingCurve that governs this token.
        _mint(msg.sender, TOTAL_SUPPLY);
    }
}

// lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol

// OpenZeppelin Contracts (last updated v5.5.0) (token/ERC20/utils/SafeERC20.sol)

/**
 * @title SafeERC20
 * @dev Wrappers around ERC-20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    /**
     * @dev An operation with an ERC-20 token failed.
     */
    error SafeERC20FailedOperation(address token);

    /**
     * @dev Indicates a failed `decreaseAllowance` request.
     */
    error SafeERC20FailedDecreaseAllowance(address spender, uint256 currentAllowance, uint256 requestedDecrease);

    /**
     * @dev Transfer `value` amount of `token` from the calling contract to `to`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     */
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        if (!_safeTransfer(token, to, value, true)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Transfer `value` amount of `token` from `from` to `to`, spending the approval given by `from` to the
     * calling contract. If `token` returns no value, non-reverting calls are assumed to be successful.
     */
    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        if (!_safeTransferFrom(token, from, to, value, true)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Variant of {safeTransfer} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransfer(IERC20 token, address to, uint256 value) internal returns (bool) {
        return _safeTransfer(token, to, value, false);
    }

    /**
     * @dev Variant of {safeTransferFrom} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransferFrom(IERC20 token, address from, address to, uint256 value) internal returns (bool) {
        return _safeTransferFrom(token, from, to, value, false);
    }

    /**
     * @dev Increase the calling contract's allowance toward `spender` by `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 oldAllowance = token.allowance(address(this), spender);
        forceApprove(token, spender, oldAllowance + value);
    }

    /**
     * @dev Decrease the calling contract's allowance toward `spender` by `requestedDecrease`. If `token` returns no
     * value, non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeDecreaseAllowance(IERC20 token, address spender, uint256 requestedDecrease) internal {
        unchecked {
            uint256 currentAllowance = token.allowance(address(this), spender);
            if (currentAllowance < requestedDecrease) {
                revert SafeERC20FailedDecreaseAllowance(spender, currentAllowance, requestedDecrease);
            }
            forceApprove(token, spender, currentAllowance - requestedDecrease);
        }
    }

    /**
     * @dev Set the calling contract's allowance toward `spender` to `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful. Meant to be used with tokens that require the approval
     * to be set to zero before setting it to a non-zero value, such as USDT.
     *
     * NOTE: If the token implements ERC-7674, this function will not modify any temporary allowance. This function
     * only sets the "standard" allowance. Any temporary allowance will remain active, in addition to the value being
     * set here.
     */
    function forceApprove(IERC20 token, address spender, uint256 value) internal {
        if (!_safeApprove(token, spender, value, false)) {
            if (!_safeApprove(token, spender, 0, true)) revert SafeERC20FailedOperation(address(token));
            if (!_safeApprove(token, spender, value, true)) revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferAndCall, with a fallback to the simple {ERC20} transfer if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that relies on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            safeTransfer(token, to, value);
        } else if (!token.transferAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferFromAndCall, with a fallback to the simple {ERC20} transferFrom if the target
     * has no code. This can be used to implement an {ERC721}-like safe transfer that relies on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferFromAndCallRelaxed(
        IERC1363 token,
        address from,
        address to,
        uint256 value,
        bytes memory data
    ) internal {
        if (to.code.length == 0) {
            safeTransferFrom(token, from, to, value);
        } else if (!token.transferFromAndCall(from, to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} approveAndCall, with a fallback to the simple {ERC20} approve if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * NOTE: When the recipient address (`to`) has no code (i.e. is an EOA), this function behaves as {forceApprove}.
     * Oppositely, when the recipient address (`to`) has code, this function only attempts to call {ERC1363-approveAndCall}
     * once without retrying, and relies on the returned value to be true.
     *
     * Reverts if the returned value is other than `true`.
     */
    function approveAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            forceApprove(token, to, value);
        } else if (!token.approveAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /// @dev Attempts to fetch the token decimals. A return value of false indicates that the attempt failed in some way.
    function tryGetDecimals(IERC20 token) internal view returns (bool success, uint8 decimals) {
        bytes4 selector = IERC20Metadata.decimals.selector;
        assembly ("memory-safe") {
            mstore(0x00, selector)
            success := staticcall(gas(), token, 0x00, 4, 0x00, 0x20)
            success := and(and(success, gt(returndatasize(), 0x1f)), lt(mload(0x00), 0x100))
            decimals := mul(success, mload(0x00))
        }
    }

    /**
     * @dev Imitates a Solidity `token.transfer(to, value)` call, relaxing the requirement on the return value: the
     * return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param to The recipient of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeTransfer(IERC20 token, address to, uint256 value, bool bubble) private returns (bool success) {
        bytes4 selector = IERC20.transfer.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(to, shr(96, not(0))))
            mstore(0x24, value)
            success := call(gas(), token, 0, 0x00, 0x44, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
        }
    }

    /**
     * @dev Imitates a Solidity `token.transferFrom(from, to, value)` call, relaxing the requirement on the return
     * value: the return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param from The sender of the tokens
     * @param to The recipient of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeTransferFrom(
        IERC20 token,
        address from,
        address to,
        uint256 value,
        bool bubble
    ) private returns (bool success) {
        bytes4 selector = IERC20.transferFrom.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(from, shr(96, not(0))))
            mstore(0x24, and(to, shr(96, not(0))))
            mstore(0x44, value)
            success := call(gas(), token, 0, 0x00, 0x64, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
            mstore(0x60, 0)
        }
    }

    /**
     * @dev Imitates a Solidity `token.approve(spender, value)` call, relaxing the requirement on the return value:
     * the return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param spender The spender of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeApprove(IERC20 token, address spender, uint256 value, bool bubble) private returns (bool success) {
        bytes4 selector = IERC20.approve.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(spender, shr(96, not(0))))
            mstore(0x24, value)
            success := call(gas(), token, 0, 0x00, 0x44, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
        }
    }
}

// src/BondingCurve.sol

/// @title BondingCurve
/// @notice Constant-product bonding curve (CPMM) for Lick.fun token launches.
/// @dev    Pricing follows: (VIRTUAL_MON + realMon) ├ù (VIRTUAL_TOKENS - soldTokens) = k
///         Fees: 2% total (1% protocol + 1% creator), deducted from MON side on both buy and sell.
///         Stage 2: delayed-mint (30s) + symmetric anti-sniping penalty (7 blocks).
///         Graduation fires when realMon >= 100,000 MON.
contract BondingCurve {
    using SafeERC20 for IERC20;

    /* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ IMMUTABLES / CONSTANTS ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */

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

    /// @notice Constant-product k = VIRTUAL_MON ├ù VIRTUAL_TOKENS.
    /// @dev   Computed once in the constructor. Ôëê 3.8 ├ù 10^49 ÔÇö fits in uint256.
    uint256 public immutable k;

    /* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ STAGE 2: DELAYED-MINT ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */

    /// @notice Timestamp after which trading becomes active. 0 = active immediately.
    uint256 public immutable startTime;

    /// @notice Block number at deployment; reference for anti-sniping penalty.
    uint256 public immutable startBlock;

    /* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ STATE ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */

    /// @notice Total real MON deposited into the curve (excluding fees and penalties).
    uint256 public realMon;

    /// @notice Total tokens sold to buyers from the curve.
    uint256 public soldTokens;

    /// @notice Whether the curve has graduated (realMon >= threshold).
    bool public graduated;

    /// @notice Whether the first (exempt) buy has been executed.
    /// @dev   The creator's pre-buy in the commit tx is exempt from anti-sniping.
    bool public initialBuyExecuted;

    /* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ EVENTS ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */

    event CurveLaunch(address indexed token, uint256 startTime, uint256 startBlock);
    event CurveBuy(address indexed buyer, address indexed token, uint256 amountIn, uint256 amountOut);
    event CurveSell(address indexed seller, address indexed token, uint256 amountIn, uint256 amountOut);
    event CurveGraduate(address indexed token, address indexed pool);
    event FeeRouterSet(address indexed feeRouter);
    event MigrationApproved(address indexed token, uint256 monTransferred, uint256 tokensApproved);

    /* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ REENTRANCY GUARD ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */

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

    /* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ CONSTRUCTOR ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */

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
        k = VIRTUAL_MON * VIRTUAL_TOKENS; // Ôëê 3.8e49, safe within uint256

        emit CurveLaunch(_token, _startTime, block.number);
    }

    /* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ BUY ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */

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

        // ÔöÇÔöÇ Anti-sniping penalty (on MON input, exempt for first buy) ÔöÇÔöÇ
        uint256 penaltyBps = (!initialBuyExecuted) ? 0 : getAntiSnipingPenaltyBps();
        uint256 penalty = (msg.value * penaltyBps) / BPS_DENOMINATOR;
        uint256 afterPenalty = msg.value - penalty;

        // ÔöÇÔöÇ Regular fee calculation (from post-penalty amount) ÔöÇÔöÇ
        uint256 protocolFee = (afterPenalty * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
        uint256 creatorFee = (afterPenalty * CREATOR_FEE_BPS) / BPS_DENOMINATOR;
        uint256 netAmountIn = afterPenalty - protocolFee - creatorFee;

        // ÔöÇÔöÇ CPMM: tokensOut = remainingSupply - k / (VIRTUAL_MON + realMon + netAmountIn) ÔöÇÔöÇ
        uint256 denominator = VIRTUAL_MON + realMon + netAmountIn;
        uint256 newSold = k / denominator;
        uint256 remainingSupply = VIRTUAL_TOKENS - soldTokens;
        tokensOut = remainingSupply - newSold;

        require(tokensOut >= minTokensOut, "SLIPPAGE");

        // ÔöÇÔöÇ Effects: update state (CEI pattern) ÔöÇÔöÇ
        realMon += netAmountIn;
        soldTokens += tokensOut;
        initialBuyExecuted = true;

        _checkGraduation();

        emit CurveBuy(msg.sender, token, netAmountIn, tokensOut);

        // ÔöÇÔöÇ Interactions ÔöÇÔöÇ
        // Penalty + protocol fee both go to protocolFeeReceiver.
        _sendNative(protocolFeeReceiver, penalty + protocolFee);
        _sendCreatorFee(token, creatorFee);
        IERC20(token).safeTransfer(msg.sender, tokensOut);
    }

    /* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ SELL ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */

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

        // ÔöÇÔöÇ Pull tokens from seller ÔöÇÔöÇ
        IERC20(token).safeTransferFrom(msg.sender, address(this), tokensIn);

        // ÔöÇÔöÇ CPMM: grossMonOut = (VIRTUAL_MON + realMon) - k / (VIRTUAL_TOKENS - soldTokens + tokensIn) ÔöÇÔöÇ
        uint256 denominator = VIRTUAL_TOKENS - soldTokens + tokensIn;
        uint256 grossMonOut = (VIRTUAL_MON + realMon) - (k / denominator);

        // ÔöÇÔöÇ Anti-sniping penalty (on gross MON output) ÔöÇÔöÇ
        uint256 penaltyBps = getAntiSnipingPenaltyBps();
        uint256 penalty = (grossMonOut * penaltyBps) / BPS_DENOMINATOR;
        uint256 afterPenalty = grossMonOut - penalty;

        // ÔöÇÔöÇ Regular fee calculation (from post-penalty amount) ÔöÇÔöÇ
        uint256 protocolFee = (afterPenalty * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
        uint256 creatorFee = (afterPenalty * CREATOR_FEE_BPS) / BPS_DENOMINATOR;
        monOut = afterPenalty - protocolFee - creatorFee;

        require(monOut >= minMonOut, "SLIPPAGE");

        // ÔöÇÔöÇ Effects: update state (CEI pattern) ÔöÇÔöÇ
        // realMon decreases by full grossMonOut; penalty leaves the curve.
        // Cap payout to actual held MON to prevent virtual reserve drain.
        require(grossMonOut <= realMon, "INSUFFICIENT_RESERVE");
        realMon -= grossMonOut;
        soldTokens -= tokensIn;

        emit CurveSell(msg.sender, token, tokensIn, monOut);

        // ÔöÇÔöÇ Interactions ÔöÇÔöÇ
        _sendNative(protocolFeeReceiver, penalty + protocolFee);
        _sendCreatorFee(token, creatorFee);
        _sendNative(msg.sender, monOut);
    }

    /* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ VIEW HELPERS ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */

    /// @notice Get the expected output amount for a given input (without fees or penalties).
    /// @param  amountIn  Input amount (MON for buy, tokens for sell).
    /// @param  isBuy    True for buy (MONÔåÆtokens), false for sell (tokensÔåÆMON).
    /// @return amountOut Output amount before fees and penalties.
    function getAmountOut(uint256 amountIn, bool isBuy) public view returns (uint256 amountOut) {
        if (isBuy) {
            // Buy: MON in ÔåÆ tokens out
            uint256 denominator = VIRTUAL_MON + realMon + amountIn;
            uint256 newSold = k / denominator;
            amountOut = (VIRTUAL_TOKENS - soldTokens) - newSold;
        } else {
            // Sell: tokens in ÔåÆ MON out
            uint256 denominator = VIRTUAL_TOKENS - soldTokens + amountIn;
            amountOut = (VIRTUAL_MON + realMon) - (k / denominator);
        }
    }

    /// @notice Returns the current bonding curve progress in basis points (0ÔÇô10,000).
    /// @return progressInBps Progress toward graduation (10000 = 100%).
    function getProgress() public view returns (uint256 progressInBps) {
        progressInBps = (realMon * BPS_DENOMINATOR) / GRADUATION_THRESHOLD;
    }

    /// @notice Computes the anti-sniping penalty in basis points based on blocks elapsed since startBlock.
    /// @dev    Decay table: 80/40/20/15/10/10/5/0% over 7 blocks. Returns 0 after block 7+.
    /// @return penaltyBps Penalty rate in basis points (0ÔÇô8000).
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

    /* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ INTERNAL ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */

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

        // ÔöÇÔöÇ Effects: snapshot state (CEI pattern) ÔöÇÔöÇ
        uint256 monToTransfer = realMon;
        realMon = 0;

        // ÔöÇÔöÇ Interactions ÔöÇÔöÇ
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

    /* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ RECEIVE ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */

    /// @notice Accept native MON (from buys and refunds).
    receive() external payable {}
}

// src/Factory.sol

/**
 * @title Factory
 * @notice Deploys LickToken + BondingCurve pairs for the Lick.fun launchpad
 * @dev Supports optional FeeRouter integration for fee splitting presets.
 *      Backward-compatible: existing createToken continues to work unchanged.
 *      100% of token supply goes to the BondingCurve ÔÇö no auto dev allocation.
 *      Creators buy their own tokens via BondingCurve.buy() (dev pre-buy).
 */
contract Factory {
    // ÔöÇÔöÇÔöÇ State ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    address public owner;
    address public immutable protocolTreasury;
    address payable public feeRouter;
    address payable public predictionMarket;
    address public graduationRouter;

    struct TokenInfo {
        address token;
        address curve;
        address creator;
        uint256 createdAt;
    }

    /// @dev NOTE (audit G-01): `tokens` grows unbounded with every createToken.
    ///      It must NEVER be iterated on-chain ÔÇö enumeration is for off-chain indexers only.
    TokenInfo[] public tokens;
    mapping(address => address) public tokenToCurve;

    // ÔöÇÔöÇÔöÇ Events ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    event TokenCreated(address indexed token, address indexed curve, address indexed creator);
    event FeeRouterSet(address indexed feeRouter);
    event PredictionMarketSet(address indexed predictionMarket);
    event GraduationRouterSet(address indexed graduationRouter);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ÔöÇÔöÇÔöÇ Errors ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    error ZeroAddress();
    error NotOwner();
    error AlreadySet();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address _protocolTreasury) {
        if (_protocolTreasury == address(0)) revert ZeroAddress();
        protocolTreasury = _protocolTreasury;
        owner = msg.sender;
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

    /**
     * @notice Sets the FeeRouter address. Can only be called once.
     * @param _feeRouter The FeeRouter contract address
     */
    function setFeeRouter(address _feeRouter) external onlyOwner {
        if (feeRouter != address(0)) revert AlreadySet();
        if (_feeRouter == address(0)) revert ZeroAddress();
        feeRouter = payable(_feeRouter);
        emit FeeRouterSet(_feeRouter);
    }

    /**
     * @notice Sets the PredictionMarket address. Can only be called once.
     * @param _predictionMarket The PredictionMarket contract address
     */
    function setPredictionMarket(address _predictionMarket) external onlyOwner {
        if (predictionMarket != address(0)) revert AlreadySet();
        if (_predictionMarket == address(0)) revert ZeroAddress();
        predictionMarket = payable(_predictionMarket);
        emit PredictionMarketSet(_predictionMarket);
    }

    /**
     * @notice Sets the GraduationRouter address. Can only be called once.
     * @param _graduationRouter The GraduationRouter contract address
     */
    function setGraduationRouter(address _graduationRouter) external onlyOwner {
        if (graduationRouter != address(0)) revert AlreadySet();
        if (_graduationRouter == address(0)) revert ZeroAddress();
        graduationRouter = _graduationRouter;
        emit GraduationRouterSet(_graduationRouter);
    }

    /**
     * @notice Creates a new LickToken + BondingCurve pair (standard mode)
     * @param name Token name
     * @param symbol Token symbol
     * @param creatorAddress Creator wallet (receives 1% creator fee)
     * @param startTime Anti-snipe start time (0 = now)
     * @return tokenAddr The new LickToken address
     * @return curveAddr The new BondingCurve address
     * @dev Creator fees go directly to creatorAddress. Backward-compatible.
     */
    function createToken(
        string calldata name,
        string calldata symbol,
        address creatorAddress,
        uint256 startTime
    ) external returns (address tokenAddr, address curveAddr) {
        if (creatorAddress == address(0)) revert ZeroAddress(); // audit H-03
        uint256 st = startTime == 0 ? block.timestamp : startTime;

        // Deploy token
        LickToken tok = new LickToken(name, symbol);
        tokenAddr = address(tok);

        // Deploy curve: (token, protocolFeeReceiver, creator, startTime, graduationRouter)
        BondingCurve curve = new BondingCurve(
            tokenAddr,
            protocolTreasury,
            creatorAddress,
            st,
            graduationRouter
        );
        curveAddr = address(curve);

        // Transfer 100% of supply to the curve ÔÇö no auto dev allocation.
        // Creator buys their own tokens via BondingCurve.buy() (dev pre-buy).
        tok.transfer(curveAddr, tok.totalSupply());

        // Create prediction market if predictionMarket is configured (C1 fix)
        if (predictionMarket != address(0)) {
            PredictionMarket(predictionMarket).createMarket(tokenAddr, curveAddr);
        }

        tokenToCurve[tokenAddr] = curveAddr;
        tokens.push(TokenInfo({
            token: tokenAddr,
            curve: curveAddr,
            creator: creatorAddress,
            createdAt: block.timestamp
        }));

        emit TokenCreated(tokenAddr, curveAddr, creatorAddress);
    }

    /**
     * @notice Creates a new LickToken + BondingCurve pair with a fee preset
     * @param name Token name
     * @param symbol Token symbol
     * @param creatorAddress Creator wallet
     * @param startTime Anti-snipe start time (0 = now)
     * @param preset FeeRouter preset (DEFAULT or ECOSYSTEM)
     * @return tokenAddr The new LickToken address
     * @return curveAddr The new BondingCurve address
     * @dev Routes creator fees through FeeRouter with the specified preset.
     *      Requires feeRouter to be set first.
     */
    function createTokenWithPreset(
        string calldata name,
        string calldata symbol,
        address creatorAddress,
        uint256 startTime,
        FeeRouter.Preset preset
    ) external returns (address tokenAddr, address curveAddr) {
        if (feeRouter == address(0)) revert ZeroAddress();
        if (creatorAddress == address(0)) revert ZeroAddress(); // audit H-03
        uint256 st = startTime == 0 ? block.timestamp : startTime;

        // Deploy token
        LickToken tok = new LickToken(name, symbol);
        tokenAddr = address(tok);

        // Deploy curve with creator = feeRouter (fees flow through FeeRouter)
        BondingCurve curve = new BondingCurve(
            tokenAddr,
            protocolTreasury,
            feeRouter,
            st,
            graduationRouter
        );
        curveAddr = address(curve);

        // Transfer 100% of supply to the curve ÔÇö no auto dev allocation.
        tok.transfer(curveAddr, tok.totalSupply());

        // Set feeRouter on BondingCurve so creator fees route through FeeRouter (H1 fix)
        curve.setFeeRouter(feeRouter);

        // Create prediction market if predictionMarket is configured (C1 fix)
        if (predictionMarket != address(0)) {
            PredictionMarket(predictionMarket).createMarket(tokenAddr, curveAddr);
        }

        tokenToCurve[tokenAddr] = curveAddr;
        tokens.push(TokenInfo({
            token: tokenAddr,
            curve: curveAddr,
            creator: creatorAddress,
            createdAt: block.timestamp
        }));

        // Apply the preset fee config
        FeeRouter(feeRouter).applyPreset(tokenAddr, creatorAddress, preset);

        emit TokenCreated(tokenAddr, curveAddr, creatorAddress);
    }

    /**
     * @notice Creates a new LickToken + BondingCurve pair with a fully custom fee config.
     * @param name Token name
     * @param symbol Token symbol
     * @param creatorAddress Creator wallet
     * @param startTime Anti-snipe start time (0 = now)
     * @param creatorShareBps Creator's cut of the 1% creator fee (in bps, e.g. 1000 = 10%)
     * @param lpSupportBps LP support vault cut (bps)
     * @param buybackBurnBps Buyback & burn vault cut (bps)
     * @param giftBps Gift recipient cut (bps, 0 if unused)
     * @param giftRecipient Gift recipient address (address(0) if giftBps == 0)
     * @return tokenAddr The new LickToken address
     * @return curveAddr The new BondingCurve address
     * @dev All four bps values must sum to 10000. Reverts if feeRouter is not set.
     */
    function createTokenWithCustomConfig(
        string calldata name,
        string calldata symbol,
        address creatorAddress,
        uint256 startTime,
        uint256 creatorShareBps,
        uint256 lpSupportBps,
        uint256 buybackBurnBps,
        uint256 giftBps,
        address giftRecipient
    ) external returns (address tokenAddr, address curveAddr) {
        if (feeRouter == address(0)) revert ZeroAddress();
        if (creatorAddress == address(0)) revert ZeroAddress(); // audit H-03
        uint256 st = startTime == 0 ? block.timestamp : startTime;

        // Deploy token
        LickToken tok = new LickToken(name, symbol);
        tokenAddr = address(tok);

        // Deploy curve with creator = feeRouter (fees flow through FeeRouter)
        BondingCurve curve = new BondingCurve(
            tokenAddr,
            protocolTreasury,
            feeRouter,
            st,
            graduationRouter
        );
        curveAddr = address(curve);

        // Transfer 100% of supply to the curve
        tok.transfer(curveAddr, tok.totalSupply());

        // Set feeRouter on BondingCurve so creator fees route through FeeRouter
        curve.setFeeRouter(feeRouter);

        // Create prediction market if configured
        if (predictionMarket != address(0)) {
            PredictionMarket(predictionMarket).createMarket(tokenAddr, curveAddr);
        }

        tokenToCurve[tokenAddr] = curveAddr;
        tokens.push(TokenInfo({
            token: tokenAddr,
            curve: curveAddr,
            creator: creatorAddress,
            createdAt: block.timestamp
        }));

        // Apply the custom fee config
        FeeRouter(feeRouter).applyCustomConfig(
            tokenAddr,
            creatorAddress,
            creatorShareBps,
            lpSupportBps,
            buybackBurnBps,
            giftBps,
            giftRecipient
        );

        emit TokenCreated(tokenAddr, curveAddr, creatorAddress);
    }
}

