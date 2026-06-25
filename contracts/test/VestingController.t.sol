// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "forge-std/Test.sol";
import "../src/LickToken.sol";
import "../src/VestingController.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract VestingControllerTest is Test {
    VestingController controller;
    LickToken token;
    address dev = address(0xD1);
    uint256 startTime;
    uint256 totalAmount = 100_000 ether;

    function setUp() public {
        controller = new VestingController();
        token = new LickToken("Test", "TST");
        startTime = block.timestamp;
    }

    // ─── testCreateAllocation ─────────────────────────────────────────────────

    function testCreateAllocation() public {
        token.approve(address(controller), totalAmount);
        address wallet = controller.createAllocation(
            address(token),
            dev,
            totalAmount,
            VestingController.Tier.LIGHT,
            startTime
        );

        // Phase 2: no VestingWallet deployed — wallet is address(0)
        assertEq(wallet, address(0));
        // Tokens held by controller directly
        assertEq(token.balanceOf(address(controller)), totalAmount);

        (
            address storedWallet,
            address beneficiary,
            VestingController.Tier tier,
            uint256 storedAmount,
            uint256 storedStart,
            ,,,
        ) = controller.allocations(address(token));

        assertEq(storedWallet, address(0));
        assertEq(beneficiary, dev);
        assertEq(uint256(tier), uint256(VestingController.Tier.LIGHT));
        assertEq(storedAmount, totalAmount);
        assertEq(storedStart, startTime);
    }

    // ─── testPreDEXVestingImmediate (Phase 2: PRE_DEX_DURATION = 0) ────────────

    function testPreDEXVesting730Days() public {
        token.approve(address(controller), totalAmount);
        controller.createAllocation(
            address(token),
            dev,
            totalAmount,
            VestingController.Tier.LIGHT,
            startTime
        );

        // Phase 2: tokens sit in controller, immediately claimable by beneficiary
        assertEq(token.balanceOf(address(controller)), totalAmount);
        assertEq(controller.getClaimable(address(token)), totalAmount);

        // Beneficiary claims
        vm.prank(dev);
        controller.claim(address(token));
        assertEq(token.balanceOf(dev), totalAmount);
        assertEq(token.balanceOf(address(controller)), 0);
    }

    // ─── testGraduationSwitchesToPostDEXSchedule (Phase 2: stub onGraduation) ──

    function testGraduationSwitchesToPostDEXSchedule() public {
        token.approve(address(controller), totalAmount);
        controller.createAllocation(
            address(token),
            dev,
            totalAmount,
            VestingController.Tier.LIGHT,
            startTime
        );

        // Phase 2: onGraduation is a stub — no change
        controller.onGraduation(address(token));

        (
            address postWallet,
            address storedBeneficiary,
            VestingController.Tier tier,
            uint256 storedAmount,
            uint256 storedStart,
            ,,,
        ) = controller.allocations(address(token));

        // Phase 2: vestingWallet stays address(0)
        assertEq(postWallet, address(0));
        assertEq(storedBeneficiary, dev);
    }

    // ─── testLightTierVesting365Days (Phase 2: all durations = 0) ──────────────

    function testLightTierVesting365Days() public {
        token.approve(address(controller), totalAmount);
        controller.createAllocation(
            address(token),
            dev,
            totalAmount,
            VestingController.Tier.LIGHT,
            startTime
        );

        controller.onGraduation(address(token));

        (, , , , , uint256 lockDays, uint256 vestDays, , ) = controller.allocations(address(token));
        assertEq(lockDays, 0);
        assertEq(vestDays, 0);
        assertEq(controller.getVestingWallet(address(token)), address(0));
    }

    // ─── testStandardTierVesting180Days (Phase 2: all durations = 0) ──────────

    function testStandardTierVesting180Days() public {
        token.approve(address(controller), totalAmount);
        controller.createAllocation(
            address(token),
            dev,
            totalAmount,
            VestingController.Tier.STANDARD,
            startTime
        );

        controller.onGraduation(address(token));

        (, , , , , uint256 lockDays, uint256 vestDays, , ) = controller.allocations(address(token));
        assertEq(lockDays, 0);
        assertEq(vestDays, 0);
        assertEq(controller.getVestingWallet(address(token)), address(0));
    }

    // ─── testDiamondTierVesting90Days (Phase 2: all durations = 0) ────────────

    function testDiamondTierVesting90Days() public {
        token.approve(address(controller), totalAmount);
        controller.createAllocation(
            address(token),
            dev,
            totalAmount,
            VestingController.Tier.DIAMOND,
            startTime
        );

        controller.onGraduation(address(token));

        (, , , , , uint256 lockDays, uint256 vestDays, , ) = controller.allocations(address(token));
        assertEq(lockDays, 0);
        assertEq(vestDays, 0);
        assertEq(controller.getVestingWallet(address(token)), address(0));
    }

    // ─── testTokensLockedIfNoGraduation (Phase 2: PRE_DEX_DURATION = 0) ───────

    function testTokensLockedIfNoGraduation() public {
        token.approve(address(controller), totalAmount);
        controller.createAllocation(
            address(token),
            dev,
            totalAmount,
            VestingController.Tier.LIGHT,
            startTime
        );

        // Phase 2: tokens sit in controller, immediately claimable
        assertEq(controller.getClaimable(address(token)), totalAmount);

        // Dev has no tokens until they call claim()
        assertEq(token.balanceOf(dev), 0);

        // No graduation — check graduated flag
        (, , , , , , , bool graduated, ) = controller.allocations(address(token));
        assertFalse(graduated);
    }

    // ─── testCannotDoubleCreate ───────────────────────────────────────────────

    function testCannotDoubleCreate() public {
        token.approve(address(controller), totalAmount);
        controller.createAllocation(
            address(token),
            dev,
            totalAmount,
            VestingController.Tier.LIGHT,
            startTime
        );

        // Deal more tokens and approve
        token.transfer(address(this), totalAmount);
        token.approve(address(controller), totalAmount);

        vm.expectRevert(VestingController.AlreadyInitialized.selector);
        controller.createAllocation(
            address(token),
            dev,
            totalAmount,
            VestingController.Tier.LIGHT,
            startTime
        );
    }

    // ─── testGetClaimable ─────────────────────────────────────────────────────

    function testGetClaimable() public {
        token.approve(address(controller), totalAmount);
        controller.createAllocation(
            address(token),
            dev,
            totalAmount,
            VestingController.Tier.LIGHT,
            startTime
        );

        // Phase 2: immediately claimable, no warp needed
        uint256 claimable = controller.getClaimable(address(token));
        assertEq(claimable, totalAmount);
    }

    // ─── testLPWithdrawnAfterLockEnd ───────────────────────────────────────────

    function testLPWithdrawnAfterLockEnd() public {
        // Deploy a mock LP token (pair)
        MockERC20Pair lpToken = new MockERC20Pair("LP Token", "LP");
        address pair = address(lpToken);
        uint256 lpAmount = 10_000 ether;
        address creatorAddr = address(0xA110C);

        // Mint LP tokens to this test contract and approve VestingController
        lpToken.mint(address(this), lpAmount);
        lpToken.approve(address(controller), lpAmount);

        // Lock LP tokens with a 90-day lock
        uint256 lockDuration = 90 days;
        controller.lockLPTokens(address(token), pair, lpAmount, lockDuration, creatorAddr);

        // Verify lock is recorded
        (address lockedPair, uint256 lockedAmount, uint256 lockEnd, , address lockedCreator) = controller.tokenLPLocks(address(token));
        assertEq(lockedPair, pair, "locked pair should match");
        assertEq(lockedAmount, lpAmount, "locked amount should match");
        assertEq(lockedCreator, creatorAddr, "locked creator should match");
        assertTrue(lockEnd > block.timestamp, "lock end should be in the future");

        // LP tokens should be held by the controller
        assertEq(lpToken.balanceOf(address(controller)), lpAmount, "controller should hold LP tokens");

        // Try withdrawing before lockEnd — should revert
        vm.expectRevert(VestingController.NoLP.selector);
        controller.withdrawLP(address(token));

        // Warp past lockEnd
        vm.warp(block.timestamp + lockDuration + 1);

        // Withdraw LP tokens
        uint256 creatorBalanceBefore = lpToken.balanceOf(creatorAddr);
        controller.withdrawLP(address(token));
        uint256 creatorBalanceAfter = lpToken.balanceOf(creatorAddr);

        // Verify creator received LP tokens
        assertEq(creatorBalanceAfter - creatorBalanceBefore, lpAmount, "creator should receive LP tokens");
        assertEq(lpToken.balanceOf(address(controller)), 0, "controller should have zero LP tokens after withdrawal");

        // Verify lock amount is zeroed
        (, uint256 lockedAmountAfter, , , ) = controller.tokenLPLocks(address(token));
        assertEq(lockedAmountAfter, 0, "locked amount should be zero after withdrawal");
    }

    // ─── FIX 6: lockLPTokens requires owner ───────────────────────────────────

    function test_lockLPTokens_requiresOwner() public {
        // Non-owner cannot call lockLPTokens
        address rando = makeAddr("rando");
        vm.prank(rando);
        // Should revert with NotOwner (because onlyOwner is now on lockLPTokens)
        vm.expectRevert(VestingController.NotOwner.selector);
        controller.lockLPTokens(address(0x1), address(0x2), 100, 90 days, rando);
    }
}

/**
 * @notice Minimal mock ERC20 to act as an LP pair token for withdrawal tests.
 */
contract MockERC20Pair is IERC20 {
    string public name;
    string public symbol;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}
