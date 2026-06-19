// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "forge-std/Test.sol";
import "../src/LickToken.sol";
import "../src/VestingController.sol";
import "@openzeppelin/contracts/finance/VestingWallet.sol";
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

        assertNotEq(wallet, address(0));
        assertEq(token.balanceOf(wallet), totalAmount);

        (
            address storedWallet,
            address beneficiary,
            VestingController.Tier tier,
            uint256 storedAmount,
            uint256 storedStart,
            ,,,
        ) = controller.allocations(address(token));

        assertEq(storedWallet, wallet);
        assertEq(beneficiary, dev);
        assertEq(uint256(tier), uint256(VestingController.Tier.LIGHT));
        assertEq(storedAmount, totalAmount);
        assertEq(storedStart, startTime);
    }

    // ─── testPreDEXVesting730Days ─────────────────────────────────────────────

    function testPreDEXVesting730Days() public {
        token.approve(address(controller), totalAmount);
        address wallet = controller.createAllocation(
            address(token),
            dev,
            totalAmount,
            VestingController.Tier.LIGHT,
            startTime
        );

        // Halfway through 730 days — some tokens should be releasable
        vm.warp(startTime + 365 days);
        uint256 halfReleasable = VestingWallet(payable(wallet)).releasable(address(token));
        assertApproxEqRel(halfReleasable, totalAmount / 2, 0.01e18); // ~50% vested

        // After full 730 days — all tokens should be releasable
        vm.warp(startTime + 730 days);
        uint256 fullReleasable = VestingWallet(payable(wallet)).releasable(address(token));
        assertApproxEqRel(fullReleasable, totalAmount, 0.01e18);

        // Release — tokens go to controller (the pre-DEX beneficiary)
        uint256 beforeBalance = token.balanceOf(address(controller));
        VestingWallet(payable(wallet)).release(address(token));
        assertApproxEqRel(token.balanceOf(address(controller)) - beforeBalance, totalAmount, 0.01e18);
    }

    // ─── testGraduationSwitchesToPostDEXSchedule ──────────────────────────────

    function testGraduationSwitchesToPostDEXSchedule() public {
        token.approve(address(controller), totalAmount);
        address preWallet = controller.createAllocation(
            address(token),
            dev,
            totalAmount,
            VestingController.Tier.LIGHT,
            startTime
        );

        // Warp to halfway: 365 days into 730-day schedule
        vm.warp(startTime + 365 days);

        // Graduate
        controller.onGraduation(address(token));

        (
            address postWallet,
            address storedBeneficiary,
            VestingController.Tier tier,
            uint256 storedAmount,
            uint256 storedStart,
            ,,,
        ) = controller.allocations(address(token));

        assertNotEq(postWallet, preWallet); // new wallet deployed
        assertEq(storedBeneficiary, dev);

        // Post-DEX wallet should use graduation timestamp as start
        uint256 newStart = VestingWallet(payable(postWallet)).start();
        assertEq(newStart, block.timestamp);

        // Light tier = 365 days post-DEX
        uint256 newDuration = VestingWallet(payable(postWallet)).duration();
        assertEq(newDuration, 365 days);

        // The tokens that were vested (half) should have been released to controller
        // and then migrated to the new wallet
        uint256 migratedBalance = token.balanceOf(postWallet);
        assertApproxEqRel(migratedBalance, totalAmount / 2, 0.02e18);
    }

    // ─── testLightTierVesting365Days ──────────────────────────────────────────

    function testLightTierVesting365Days() public {
        token.approve(address(controller), totalAmount);
        controller.createAllocation(
            address(token),
            dev,
            totalAmount,
            VestingController.Tier.LIGHT,
            startTime
        );

        vm.warp(startTime + 365 days);
        controller.onGraduation(address(token));

        (, , , , , uint256 lockDays, uint256 vestDays, , ) = controller.allocations(address(token));
        assertEq(lockDays, 90);
        assertEq(vestDays, 365);

        address newWallet = controller.getVestingWallet(address(token));
        assertEq(VestingWallet(payable(newWallet)).duration(), 365 days);
    }

    // ─── testStandardTierVesting180Days ───────────────────────────────────────

    function testStandardTierVesting180Days() public {
        token.approve(address(controller), totalAmount);
        controller.createAllocation(
            address(token),
            dev,
            totalAmount,
            VestingController.Tier.STANDARD,
            startTime
        );

        vm.warp(startTime + 365 days);
        controller.onGraduation(address(token));

        (, , , , , uint256 lockDays, uint256 vestDays, , ) = controller.allocations(address(token));
        assertEq(lockDays, 180);
        assertEq(vestDays, 180);

        address newWallet = controller.getVestingWallet(address(token));
        assertEq(VestingWallet(payable(newWallet)).duration(), 180 days);
    }

    // ─── testDiamondTierVesting90Days ─────────────────────────────────────────

    function testDiamondTierVesting90Days() public {
        token.approve(address(controller), totalAmount);
        controller.createAllocation(
            address(token),
            dev,
            totalAmount,
            VestingController.Tier.DIAMOND,
            startTime
        );

        vm.warp(startTime + 365 days);
        controller.onGraduation(address(token));

        (, , , , , uint256 lockDays, uint256 vestDays, , ) = controller.allocations(address(token));
        assertEq(lockDays, 365);
        assertEq(vestDays, 90);

        address newWallet = controller.getVestingWallet(address(token));
        assertEq(VestingWallet(payable(newWallet)).duration(), 90 days);
    }

    // ─── testTokensLockedIfNoGraduation ───────────────────────────────────────

    function testTokensLockedIfNoGraduation() public {
        token.approve(address(controller), totalAmount);
        address wallet = controller.createAllocation(
            address(token),
            dev,
            totalAmount,
            VestingController.Tier.LIGHT,
            startTime
        );

        // Before any vesting time, nothing should be releasable
        assertEq(VestingWallet(payable(wallet)).releasable(address(token)), 0);

        // At 100 days, some vested (but only released to controller, not dev)
        vm.warp(startTime + 100 days);
        uint256 releasable = VestingWallet(payable(wallet)).releasable(address(token));
        assertGt(releasable, 0);

        // Dev has no tokens because old wallet beneficiary is controller
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
        address wallet = controller.createAllocation(
            address(token),
            dev,
            totalAmount,
            VestingController.Tier.LIGHT,
            startTime
        );

        vm.warp(startTime + 365 days);
        uint256 claimable = controller.getClaimable(address(token));
        assertGt(claimable, 0);
        assertEq(claimable, VestingWallet(payable(wallet)).releasable(address(token)));
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
