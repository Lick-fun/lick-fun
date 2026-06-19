// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "./BondingCurve.sol";
import "./LickFactory.sol";
import "./LickPair.sol";
import "./VestingController.sol";

/**
 * @notice Minimal WETH9 interface for wrapping/unwrapping native MON.
 */
interface IWETH {
    function deposit() external payable;
    function withdraw(uint256 wad) external;
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 value) external returns (bool);
}

/**
 * @notice Minimal interface for the main Lick.fun Factory (tokenToCurve lookup).
 */
interface ILaunchFactory {
    function tokenToCurve(address token) external view returns (address);
}

/**
 * @title GraduationRouter
 * @notice When a BondingCurve graduates, this contract deploys a Uniswap V2-style
 *         pair and migrates liquidity from the curve to the DEX.
 * @dev Permissionless: anyone can call migrateLiquidity() after graduation.
 *      Uses CEI pattern throughout. LP tokens are locked in VestingController.
 */
contract GraduationRouter is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Immutables ───────────────────────────────────────────────────────────
    /// @notice Lick.fun's own V2 factory for deploying DEX pairs.
    address public immutable dexFactory;

    /// @notice Wrapped MON (WMON) address.
    address public immutable weth;

    /// @notice VestingController — receives LP tokens for tier-based locking.
    address public immutable vestingController;

    /// @notice Protocol fee receiver (receives MON from migration if any).
    address public immutable protocolFeeReceiver;

    /// @notice The main Lick.fun launch Factory (for tokenToCurve lookup).
    address public immutable launchFactory;

    // ─── State ────────────────────────────────────────────────────────────────
    /// @notice token → DEX pair address (set after migration).
    mapping(address => address) public tokenToPair;

    /// @notice Whether a token has been migrated (prevents double-migration).
    mapping(address => bool) public tokenToGraduated;

    // ─── Events ────────────────────────────────────────────────────────────────
    event LiquidityMigrated(
        address indexed token,
        address indexed pair,
        uint256 tokenLiquidity,
        uint256 monLiquidity
    );

    // ─── Errors ────────────────────────────────────────────────────────────────
    error NotGraduated();
    error AlreadyMigrated();
    error ZeroAddress();

    /// @notice Accept native MON (from BondingCurve.approveMigration).
    receive() external payable {}

    constructor(
        address _dexFactory,
        address _weth,
        address _vestingController,
        address _protocolFeeReceiver,
        address _launchFactory
    ) {
        if (_dexFactory == address(0) || _weth == address(0) ||
            _vestingController == address(0) || _protocolFeeReceiver == address(0) ||
            _launchFactory == address(0)) revert ZeroAddress();
        dexFactory = _dexFactory;
        weth = _weth;
        vestingController = _vestingController;
        protocolFeeReceiver = _protocolFeeReceiver;
        launchFactory = _launchFactory;
    }

    /**
     * @notice Migrate liquidity from a graduated BondingCurve to a new DEX pair.
     * @dev Permissionless: anyone can trigger after the curve has graduated.
     *      Steps:
     *      1. Verify curve is graduated and not already migrated.
     *      2. Call BondingCurve.approveMigration() — curve sends MON here, approves tokens.
     *      3. Pull remaining tokens from curve via safeTransferFrom.
     *      4. Wrap MON → WETH.
     *      5. Deploy LickPair via dexFactory.createPair().
     *      6. Transfer token + WETH to pair, call pair.mint().
     *      7. Lock LP tokens in VestingController.
     * @param token The LickToken address
     * @return pair The deployed DEX pair address
     */
    function migrateLiquidity(address token) external nonReentrant returns (address pair) {
        // ── 1. Look up curve ──
        address curve = ILaunchFactory(launchFactory).tokenToCurve(token);
        if (curve == address(0)) revert ZeroAddress();

        // ── 2. Verify graduation state ──
        BondingCurve bc = BondingCurve(payable(curve));
        if (!bc.graduated()) revert NotGraduated();
        if (tokenToPair[token] != address(0)) revert AlreadyMigrated();

        // ── 3. Effects: mark as migrating (CEI — prevent reentrancy) ──
        tokenToGraduated[token] = true;
        tokenToPair[token] = address(1); // sentinel to block re-entry

        // ── 4. Snapshot curve state before migration ──
        uint256 monAmount = bc.realMon();
        uint256 tokenBalance = IERC20(token).balanceOf(curve);

        // ── 5. Interactions: trigger curve migration ──
        // approveMigration() sends MON to this contract and approves token transfer
        bc.approveMigration();

        // ── 6. Pull tokens from curve ──
        IERC20(token).safeTransferFrom(curve, address(this), tokenBalance);

        // ── 7. Wrap MON → WETH ──
        if (monAmount > 0) {
            IWETH(weth).deposit{value: monAmount}();
        }

        // ── 8. Deploy DEX pair (or reuse existing) ──
        address existingPair = LickFactory(dexFactory).getPair(token, weth);
        if (existingPair == address(0)) {
            pair = LickFactory(dexFactory).createPair(token, weth);
        } else {
            pair = existingPair;
        }

        // ── 9. Transfer liquidity to pair ──
        IERC20(token).safeTransfer(pair, tokenBalance);
        uint256 wethBalance = IERC20(weth).balanceOf(address(this));
        IERC20(weth).safeTransfer(pair, wethBalance);

        // ── 10. Mint LP tokens ──
        uint256 lpAmount = LickPair(pair).mint(address(this));

        // ── 11. Update final state ──
        tokenToPair[token] = pair;

        // ── 12. Lock LP tokens in VestingController ──
        // Read the allocation to get liquidityLockDays and beneficiary (creator)
        // allocations[token] returns DevAllocation tuple:
        //   0:vestingWallet, 1:beneficiary, 2:tier, 3:totalAmount, 4:startTime,
        //   5:liquidityLockDays, 6:devVestingDays, 7:graduated, 8:initialized
        (
            ,
            address beneficiary,
            ,
            ,
            ,
            uint256 liquidityLockDays,
            ,
            ,
        ) = VestingController(vestingController).allocations(token);

        uint256 lockDuration = 90 days;
        if (liquidityLockDays > 0) {
            lockDuration = liquidityLockDays * 1 days;
        }

        // Creator = beneficiary from allocation; if no allocation, use address(0)
        // (withdrawLP will send to msg.sender when creator is address(0))

        // Approve LP tokens for VestingController
        IERC20(pair).forceApprove(vestingController, lpAmount);

        // Lock LP tokens
        VestingController(vestingController).lockLPTokens(token, pair, lpAmount, lockDuration, beneficiary);

        emit LiquidityMigrated(token, pair, tokenBalance, monAmount);
    }
}