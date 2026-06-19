// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

/// @title ProfileRegistry
/// @notice On-chain anchor for the off-chain reputation system.
///         Handles wallet linking, Merkle root anchoring, and profile queries.
contract ProfileRegistry {
    /// @notice Bond required to link a wallet to a profile (0.1 MON)
    uint256 public constant LINK_BOND = 0.1 ether;

    /// @notice Wallet => actual bond paid (M1 fix: store per-wallet)
    mapping(address => uint256) public walletBond;

    /// @notice Profile ID => whether the profile exists
    mapping(uint256 => bool) public profileExists;

    /// @notice Wallet address => profile ID (0 means no profile)
    mapping(address => uint256) public walletToProfileId;

    /// @notice Profile ID => array of linked wallet addresses
    mapping(uint256 => address[]) public profileWallets;

    /// @notice Profile ID => total MON staked via wallet linking
    mapping(uint256 => uint256) public profileMonStaked;

    /// @notice Auto-incrementing profile ID counter
    uint256 public nextProfileId;

    /// @notice Address authorized to post the daily Merkle root
    address public merkleAnchor;

    /// @notice The latest Merkle root committed by the off-chain reputation engine
    bytes32 public dailyMerkleRoot;

    /// @notice Timestamp of the last Merkle root update
    uint256 public lastAnchorTimestamp;

    // ═══════════════════════════════════════════════════════════
    // Events
    // ═══════════════════════════════════════════════════════════

    event ProfileCreated(uint256 indexed profileId, address indexed wallet);
    event WalletLinked(uint256 indexed profileId, address indexed wallet, uint256 bond);
    event WalletUnlinked(uint256 indexed profileId, address indexed wallet);
    event MerkleRootAnchored(bytes32 indexed root, uint256 timestamp);

    // ═══════════════════════════════════════════════════════════
    // Constructor
    // ═══════════════════════════════════════════════════════════

    constructor() {
        merkleAnchor = msg.sender;
    }

    // ═══════════════════════════════════════════════════════════
    // Profile Management
    // ═══════════════════════════════════════════════════════════

    /// @notice Create a new profile for the caller
    /// @return profileId The newly created profile ID
    function registerProfile() external returns (uint256 profileId) {
        require(walletToProfileId[msg.sender] == 0, "Already has a profile");

        profileId = ++nextProfileId;

        profileExists[profileId] = true;
        walletToProfileId[msg.sender] = profileId;
        profileWallets[profileId].push(msg.sender);

        emit ProfileCreated(profileId, msg.sender);
    }

    /// @notice Link the caller's wallet to an existing profile by paying the bond
    /// @param profileId The profile to link to
    function linkWallet(uint256 profileId) external payable {
        require(profileExists[profileId], "Profile does not exist");
        require(walletToProfileId[msg.sender] == 0, "Already linked to a profile");
        require(msg.value >= LINK_BOND, "Insufficient bond");

        // CEI: update state before any external calls
        walletToProfileId[msg.sender] = profileId;
        profileWallets[profileId].push(msg.sender);
        profileMonStaked[profileId] += msg.value;
        walletBond[msg.sender] = msg.value; // M1 fix: store actual bond

        emit WalletLinked(profileId, msg.sender, msg.value);
    }

    /// @notice Unlink the caller's wallet from their current profile and refund the bond
    /// @param profileId The profile to unlink from (must match caller's current profile)
    function unlinkWallet(uint256 profileId) external {
        require(walletToProfileId[msg.sender] == profileId, "Not linked to this profile");

        // CEI: update state before external call (transfer)
        uint256 refundAmount = walletBond[msg.sender]; // M1 fix: use actual bond
        walletToProfileId[msg.sender] = 0;
        walletBond[msg.sender] = 0;
        profileMonStaked[profileId] -= refundAmount;

        // Remove from profileWallets array via swap-and-pop
        address[] storage wallets = profileWallets[profileId];
        uint256 length = wallets.length;
        for (uint256 i = 0; i < length; i++) {
            if (wallets[i] == msg.sender) {
                wallets[i] = wallets[length - 1];
                wallets.pop();
                break;
            }
        }

        emit WalletUnlinked(profileId, msg.sender);

        // External call last (CEI)
        if (refundAmount > 0) {
            payable(msg.sender).transfer(refundAmount);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // Merkle Root Anchoring
    // ═══════════════════════════════════════════════════════════

    /// @notice Post the daily Merkle root from the off-chain reputation engine
    /// @param root The new Merkle root
    function setMerkleRoot(bytes32 root) external {
        require(msg.sender == merkleAnchor, "Only merkle anchor");

        dailyMerkleRoot = root;
        lastAnchorTimestamp = block.timestamp;

        emit MerkleRootAnchored(root, block.timestamp);
    }

    // ═══════════════════════════════════════════════════════════
    // Queries
    // ═══════════════════════════════════════════════════════════

    /// @notice Get all wallet addresses linked to a profile
    /// @param profileId The profile ID to query
    /// @return Array of linked wallet addresses
    function getLinkedWallets(uint256 profileId) external view returns (address[] memory) {
        return profileWallets[profileId];
    }

    /// @notice Get the profile ID for a wallet address
    /// @param wallet The wallet address to query
    /// @return The profile ID (0 if not linked to any profile)
    function getProfileId(address wallet) external view returns (uint256) {
        return walletToProfileId[wallet];
    }
}