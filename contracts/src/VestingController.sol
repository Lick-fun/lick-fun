// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "@openzeppelin/contracts/finance/VestingWallet.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VestingController
 * @notice Manages dev allocation vesting using OZ VestingWallet with three-tier lock system
 * @dev Controller is the beneficiary of pre-DEX VestingWallet (730d linear).
 *      On graduation, sweeps remaining tokens and redeploys with post-DEX schedule.
 *
 *      Phase 2: All duration constants are 0 — tokens are liquid immediately.
 *      Tier differentiation is via FeeRouter fee splits only, not locks.
 *      LP tokens are burned to 0xdead at graduation (GraduationRouter).
 *      lockLPTokens() and withdrawLP() are kept for ABI compatibility only.
 */
contract VestingController is ReentrancyGuard {
    // ─── Types ────────────────────────────────────────────────────────────────
    enum Tier { LIGHT, STANDARD, DIAMOND }

    struct DevAllocation {
        address vestingWallet;     // deployed OZ VestingWallet (pre-DEX or post-DEX)
        address beneficiary;       // actual dev wallet
        Tier tier;
        uint256 totalAmount;
        uint256 startTime;         // when vesting begins (= token commit tx timestamp)
        uint256 liquidityLockDays; // 90, 180, or 365
        uint256 devVestingDays;    // 365, 180, or 90 (post-DEX)
        bool graduated;            // has token graduated?
        bool initialized;
    }

    /// @notice LP token lock tracking per token (set by GraduationRouter after migration).
    struct LockedLP {
        address pair;
        uint256 amount;
        uint256 lockEnd;
        Tier tier;
        address creator;  // token creator who receives LP after lock ends
    }

    // ─── Constants ────────────────────────────────────────────────────────────
    uint256 public constant PRE_DEX_DURATION = 0;
    uint256 public constant LIGHT_LOCK_DAYS = 0;
    uint256 public constant LIGHT_VEST_DAYS = 0;
    uint256 public constant STANDARD_LOCK_DAYS = 0;
    uint256 public constant STANDARD_VEST_DAYS = 0;
    uint256 public constant DIAMOND_LOCK_DAYS = 0;
    uint256 public constant DIAMOND_VEST_DAYS = 0;

    // ─── State ────────────────────────────────────────────────────────────────
    mapping(address => DevAllocation) public allocations;
    mapping(address => LockedLP) public tokenLPLocks;
    address public immutable owner;

    // ─── Events ───────────────────────────────────────────────────────────────
    event AllocationCreated(
        address indexed token,
        address indexed beneficiary,
        address vestingWallet,
        Tier tier,
        uint256 totalAmount,
        uint256 startTime
    );
    event GraduationProcessed(
        address indexed token,
        address oldVestingWallet,
        address newVestingWallet,
        uint256 migratedAmount,
        uint256 newDuration
    );
    event LPTokensLocked(
        address indexed token,
        address indexed pair,
        uint256 lpAmount,
        uint256 lockDuration
    );
    event LPTokensWithdrawn(
        address indexed token,
        address indexed pair,
        uint256 amount,
        address indexed recipient
    );

    // ─── Errors ────────────────────────────────────────────────────────────────
    error NotOwner();
    error AlreadyInitialized();
    error ZeroAddress();
    error NotGraduated();
    error AlreadyGraduated();
    error AllocationNotFound();
    error NoLP();

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ─── Tier Helpers ─────────────────────────────────────────────────────────

    /**
     * @notice Returns lock and vest days for a given tier
     * @param tier The tier enum value
     * @return lockDays Liquidity lock days
     * @return vestDays Post-DEX dev vesting days
     */
    function getTierParams(Tier tier) public pure returns (uint256 lockDays, uint256 vestDays) {
        if (tier == Tier.LIGHT) {
            return (LIGHT_LOCK_DAYS, LIGHT_VEST_DAYS);
        } else if (tier == Tier.STANDARD) {
            return (STANDARD_LOCK_DAYS, STANDARD_VEST_DAYS);
        } else {
            return (DIAMOND_LOCK_DAYS, DIAMOND_VEST_DAYS);
        }
    }

    // ─── Allocation Creation ──────────────────────────────────────────────────

    /**
     * @notice Called by Factory with tokens already transferred to this contract (C4 fix).
     * @param token The LickToken address
     * @param beneficiary The actual developer wallet (will receive tokens post-DEX)
     * @param totalAmount Amount of tokens allocated
     * @param tier The lock tier (LIGHT, STANDARD, DIAMOND)
     * @param startTime The vesting start timestamp
     * @dev Tokens are assumed already held by this contract (Factory transfers them first).
     *      This function deploys a VestingWallet and transfers tokens from itself into it.
     */
    function initVesting(
        address token,
        address beneficiary,
        uint256 totalAmount,
        Tier tier,
        uint256 startTime
    ) external nonReentrant returns (address vestingWallet) {
        if (allocations[token].initialized) revert AlreadyInitialized();
        if (token == address(0) || beneficiary == address(0)) revert ZeroAddress();
        if (totalAmount == 0) revert ZeroAddress();

        (uint256 lockDays, uint256 vestDays) = getTierParams(tier);

        // Deploy VestingWallet with controller as beneficiary (pre-DEX)
        // duration = 730 days, start = startTime
        VestingWallet wallet = new VestingWallet(
            address(this),       // beneficiary = controller (we'll sweep on graduation)
            uint64(startTime),
            uint64(PRE_DEX_DURATION)
        );
        vestingWallet = address(wallet);

        allocations[token] = DevAllocation({
            vestingWallet: vestingWallet,
            beneficiary: beneficiary,
            tier: tier,
            totalAmount: totalAmount,
            startTime: startTime,
            liquidityLockDays: lockDays,
            devVestingDays: vestDays,
            graduated: false,
            initialized: true
        });

        // Transfer tokens from this contract to the VestingWallet (C4 fix: self-transfer)
        IERC20(token).transfer(vestingWallet, totalAmount);

        emit AllocationCreated(token, beneficiary, vestingWallet, tier, totalAmount, startTime);
    }

    /**
     * @notice Creates a vesting allocation for a token's dev allocation (legacy API).
     * @param token The LickToken address
     * @param beneficiary The actual developer wallet (will receive tokens post-DEX)
     * @param totalAmount Amount of tokens to allocate
     * @param tier The lock tier (LIGHT, STANDARD, DIAMOND)
     * @param startTime The vesting start timestamp
     * @dev Deploys an OZ VestingWallet with controller as beneficiary (pre-DEX).
     *      Tokens must be approved to this contract before calling.
     */
    function createAllocation(
        address token,
        address beneficiary,
        uint256 totalAmount,
        Tier tier,
        uint256 startTime
    ) external onlyOwner nonReentrant returns (address vestingWallet) {
        if (allocations[token].initialized) revert AlreadyInitialized();
        if (token == address(0) || beneficiary == address(0)) revert ZeroAddress();
        if (totalAmount == 0) revert ZeroAddress();

        (uint256 lockDays, uint256 vestDays) = getTierParams(tier);

        // Deploy VestingWallet with controller as beneficiary (pre-DEX)
        // duration = 730 days, start = startTime
        VestingWallet wallet = new VestingWallet(
            address(this),       // beneficiary = controller (we'll sweep on graduation)
            uint64(startTime),
            uint64(PRE_DEX_DURATION)
        );
        vestingWallet = address(wallet);

        allocations[token] = DevAllocation({
            vestingWallet: vestingWallet,
            beneficiary: beneficiary,
            tier: tier,
            totalAmount: totalAmount,
            startTime: startTime,
            liquidityLockDays: lockDays,
            devVestingDays: vestDays,
            graduated: false,
            initialized: true
        });

        // Transfer tokens from caller to the VestingWallet
        IERC20(token).transferFrom(msg.sender, vestingWallet, totalAmount);

        emit AllocationCreated(token, beneficiary, vestingWallet, tier, totalAmount, startTime);
    }

    // ─── Graduation ───────────────────────────────────────────────────────────

    /**
     * @notice Called when a token graduates. Sweeps remaining pre-DEX tokens and
     *         deploys a new VestingWallet with post-DEX schedule pointed at the actual dev.
     * @param token The token address that graduated
     * @dev The controller calls release() on the old VestingWallet (tokens come to controller),
     *      then deploys a new VestingWallet with beneficiary = actual dev and duration = tier-specific.
     */
    function onGraduation(address token) external onlyOwner {
        // vestigial — all vest durations are 0, no sweep needed
    }

    // ─── LP Token Locking ─────────────────────────────────────────────────────

    /**
     * @notice Called by GraduationRouter after liquidity migration to lock LP tokens.
     * @dev    Pulls LP tokens from msg.sender (GraduationRouter) and records the lock.
     *         Lock duration is derived from the token's tier (LIGHT=90d, STANDARD=180d, DIAMOND=365d).
     *         If no allocation exists for the token, defaults to LIGHT tier (90 days).
     * @param token The LickToken address
     * @param pair The DEX pair address (LP token)
     * @param lpAmount Amount of LP tokens to lock
     * @param lockDuration Lock duration in seconds
     */
    function lockLPTokens(
        address token,
        address pair,
        uint256 lpAmount,
        uint256 lockDuration,
        address _creator
    ) external onlyOwner nonReentrant {
        if (token == address(0) || pair == address(0)) revert ZeroAddress();
        if (lpAmount == 0) revert ZeroAddress();
        // Prevent overwriting an existing lock for this token
        require(tokenLPLocks[token].amount == 0, "LOCK_EXISTS");

        // Pull LP tokens from caller (GraduationRouter)
        IERC20(pair).transferFrom(msg.sender, address(this), lpAmount);

        // Determine tier for the lock record (default to LIGHT if no allocation)
        Tier lockTier = Tier.LIGHT;
        if (allocations[token].initialized) {
            lockTier = allocations[token].tier;
        }

        tokenLPLocks[token] = LockedLP({
            pair: pair,
            amount: lpAmount,
            lockEnd: block.timestamp + lockDuration,
            tier: lockTier,
            creator: _creator
        });

        emit LPTokensLocked(token, pair, lpAmount, lockDuration);
    }

    /**
     * @notice Withdraw LP tokens after the lock period ends.
     * @dev Anyone can call this after lockEnd. LP tokens are sent to the stored creator.
     *      If creator is address(0), LP tokens are sent to msg.sender.
     * @param token The LickToken address whose LP lock to withdraw
     */
    function withdrawLP(address token) external nonReentrant {
        LockedLP storage lock = tokenLPLocks[token];
        if (lock.amount == 0) revert NoLP();
        if (block.timestamp < lock.lockEnd) revert NoLP(); // "LOCKED"

        uint256 amount = lock.amount;
        address pair = lock.pair;
        address recipient = lock.creator != address(0) ? lock.creator : msg.sender;

        // CEI: zero out state before transfer
        lock.amount = 0;

        IERC20(pair).transfer(recipient, amount);

        emit LPTokensWithdrawn(token, pair, amount, recipient);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    /**
     * @notice Returns the currently claimable amount from the active VestingWallet
     * @param token The token address
     * @return claimable The amount of tokens currently claimable
     */
    function getClaimable(address token) external view returns (uint256) {
        DevAllocation storage alloc = allocations[token];
        if (!alloc.initialized) return 0;
        return VestingWallet(payable(alloc.vestingWallet)).releasable(token);
    }

    /**
     * @notice Returns the active vesting wallet address for a token
     * @param token The token address
     * @return wallet The current VestingWallet address
     */
    function getVestingWallet(address token) external view returns (address) {
        return allocations[token].vestingWallet;
    }
}