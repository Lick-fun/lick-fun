// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title GraduationPool
 * @notice Sponsorship pool that receives creator fees from the first token
 *         (via FeeRouter ECOSYSTEM_PRESET) and pays deploy/graduation fees for
 *         high-reputation creators.
 * @dev Reputation feed uses a simple mapping (set by authorized reporter) and
 *      Merkle proof verification against a daily anchor root for gas-efficient
 *      trust-minimized subsidy claims.
 */
contract GraduationPool is ReentrancyGuard {
    // ─── Constants ────────────────────────────────────────────────────────────
    uint256 public constant DEPLOY_FEE = 10 ether;       // 10 MON
    uint256 public constant GRADUATION_FEE = 10 ether;   // 10 MON
    uint256 public constant MIN_REPUTATION = 30;         // Established tier minimum

    // ─── State ────────────────────────────────────────────────────────────────
    uint256 public totalPool;
    address public immutable reporter;

    // Simple reputation mapping (set by reporter)
    mapping(address => uint256) public reputationScores;

    // Merkle root for trust-minimized verification (daily anchor)
    bytes32 public merkleRoot;

    // Per-creator tracking of claimed subsidies
    mapping(address => uint256) public deploySubsidiesClaimed;
    mapping(address => uint256) public graduationSubsidiesClaimed;

    // ─── Events ───────────────────────────────────────────────────────────────
    event PoolFunded(address indexed funder, uint256 amount);
    event SubsidyClaimed(address indexed creator, string subsidyType, uint256 amount);
    event ReputationSet(address indexed creator, uint256 score);
    event MerkleRootUpdated(bytes32 indexed root);

    // ─── Errors ────────────────────────────────────────────────────────────────
    error InsufficientPool();
    error InsufficientReputation();
    error AlreadyClaimed();
    error InvalidProof();
    error NotReporter();
    error ZeroAddress();

    constructor(address _reporter) {
        if (_reporter == address(0)) revert ZeroAddress();
        reporter = _reporter;
    }

    modifier onlyReporter() {
        if (msg.sender != reporter) revert NotReporter();
        _;
    }

    // ─── Funding ──────────────────────────────────────────────────────────────

    /**
     * @notice Add MON to the sponsorship pool. Anyone can call, including FeeRouter.
     */
    function fund() external payable {
        if (msg.value == 0) return;
        totalPool += msg.value;
        emit PoolFunded(msg.sender, msg.value);
    }

    // ─── Reputation Feed ──────────────────────────────────────────────────────

    /**
     * @notice Sets reputation score for a creator. Called by the authorized reporter.
     * @param creator The creator address
     * @param score The reputation score
     * @dev The off-chain reputation engine computes scores; the reporter
     *      (trust-minimized anchor) posts verified scores.
     */
    function setReputation(address creator, uint256 score) external onlyReporter {
        reputationScores[creator] = score;
        emit ReputationSet(creator, score);
    }

    /**
     * @notice Updates the Merkle root for trust-minimized verification.
     * @param root The new Merkle root (from daily anchor)
     * @dev The off-chain engine computes a Merkle tree of all reputation scores
     *      and posts the root once per day. Users can claim subsidies by providing
     *      a Merkle proof of their score.
     */
    function setMerkleRoot(bytes32 root) external onlyReporter {
        merkleRoot = root;
        emit MerkleRootUpdated(root);
    }

    // ─── Subsidy Claims (Simple Mapping) ──────────────────────────────────────

    /**
     * @notice Claim deploy fee reimbursement using the simple reputation mapping
     * @dev Creator must have reputation >= MIN_REPUTATION set by the reporter
     */
    function claimDeploySubsidy() external nonReentrant {
        if (reputationScores[msg.sender] < MIN_REPUTATION) revert InsufficientReputation();
        if (deploySubsidiesClaimed[msg.sender] > 0) revert AlreadyClaimed();
        if (totalPool < DEPLOY_FEE) revert InsufficientPool();

        totalPool -= DEPLOY_FEE;
        deploySubsidiesClaimed[msg.sender] = DEPLOY_FEE;

        (bool ok, ) = msg.sender.call{value: DEPLOY_FEE}("");
        require(ok, "Transfer failed");

        emit SubsidyClaimed(msg.sender, "deploy", DEPLOY_FEE);
    }

    /**
     * @notice Claim graduation fee reimbursement using the simple reputation mapping
     * @dev Creator must have reputation >= MIN_REPUTATION set by the reporter
     */
    function claimGraduationSubsidy() external nonReentrant {
        if (reputationScores[msg.sender] < MIN_REPUTATION) revert InsufficientReputation();
        if (graduationSubsidiesClaimed[msg.sender] > 0) revert AlreadyClaimed();
        if (totalPool < GRADUATION_FEE) revert InsufficientPool();

        totalPool -= GRADUATION_FEE;
        graduationSubsidiesClaimed[msg.sender] = GRADUATION_FEE;

        (bool ok, ) = msg.sender.call{value: GRADUATION_FEE}("");
        require(ok, "Transfer failed");

        emit SubsidyClaimed(msg.sender, "graduation", GRADUATION_FEE);
    }

    // ─── Subsidy Claims (Merkle Proof) ────────────────────────────────────────

    /**
     * @notice Claim deploy fee reimbursement using a Merkle proof
     * @param proof Merkle proof that msg.sender has score >= MIN_REPUTATION
     * @param score The reputation score to verify
     * @dev The leaf is keccak256(abi.encodePacked(creator, score))
     */
    function claimDeploySubsidyWithProof(bytes32[] calldata proof, uint256 score) external nonReentrant {
        if (score < MIN_REPUTATION) revert InsufficientReputation();
        if (deploySubsidiesClaimed[msg.sender] > 0) revert AlreadyClaimed();
        if (totalPool < DEPLOY_FEE) revert InsufficientPool();

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, score));
        if (!MerkleProof.verify(proof, merkleRoot, leaf)) revert InvalidProof();

        totalPool -= DEPLOY_FEE;
        deploySubsidiesClaimed[msg.sender] = DEPLOY_FEE;

        (bool ok, ) = msg.sender.call{value: DEPLOY_FEE}("");
        require(ok, "Transfer failed");

        emit SubsidyClaimed(msg.sender, "deploy", DEPLOY_FEE);
    }

    /**
     * @notice Claim graduation fee reimbursement using a Merkle proof
     * @param proof Merkle proof that msg.sender has score >= MIN_REPUTATION
     * @param score The reputation score to verify
     * @dev The leaf is keccak256(abi.encodePacked(creator, score))
     */
    function claimGraduationSubsidyWithProof(bytes32[] calldata proof, uint256 score) external nonReentrant {
        if (score < MIN_REPUTATION) revert InsufficientReputation();
        if (graduationSubsidiesClaimed[msg.sender] > 0) revert AlreadyClaimed();
        if (totalPool < GRADUATION_FEE) revert InsufficientPool();

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, score));
        if (!MerkleProof.verify(proof, merkleRoot, leaf)) revert InvalidProof();

        totalPool -= GRADUATION_FEE;
        graduationSubsidiesClaimed[msg.sender] = GRADUATION_FEE;

        (bool ok, ) = msg.sender.call{value: GRADUATION_FEE}("");
        require(ok, "Transfer failed");

        emit SubsidyClaimed(msg.sender, "graduation", GRADUATION_FEE);
    }

    // ─── Receive ──────────────────────────────────────────────────────────────

    /**
     * @notice Accept ETH directly (e.g. from FeeRouter)
     */
    receive() external payable {
        totalPool += msg.value;
        emit PoolFunded(msg.sender, msg.value);
    }
}