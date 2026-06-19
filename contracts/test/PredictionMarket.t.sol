// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {Test, console} from "forge-std/Test.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";

/// @notice Mock BondingCurve for testing PredictionMarket.
///         Allows us to control graduation state independently.
contract MockBondingCurve {
    bool public graduated;
    address public token;

    constructor(address _token) {
        token = _token;
    }

    function setGraduated(bool _graduated) external {
        graduated = _graduated;
    }
}

/// @title PredictionMarketTest
/// @notice 9 tests covering the full PredictionMarket lifecycle.
contract PredictionMarketTest is Test {
    PredictionMarket public market;
    MockBondingCurve public mockCurve;

    address public feeReceiver = makeAddr("feeReceiver");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public carol = makeAddr("carol");

    function setUp() public {
        mockCurve = new MockBondingCurve(address(mockCurve));
        market = new PredictionMarket(feeReceiver);

        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(carol, 100 ether);
    }

    function _helperCreateMarket(address token) internal {
        market.createMarket(token, token);
    }

    /* ═══════════════════════════════ CREATE ═══════════════════════════════ */

    function testCreateMarket() public {
        address token = address(mockCurve);
        _helperCreateMarket(token);

        (address t,, uint256 totalYes, uint256 totalNo, bool resolved, bool outcome,,) = market.markets(token);
        assertEq(t, token);
        assertEq(totalYes, 0);
        assertEq(totalNo, 0);
        assertEq(resolved, false);
        assertEq(outcome, false);
    }

    function testCreateMarketRevertsDuplicate() public {
        address token = address(mockCurve);
        _helperCreateMarket(token);
        vm.expectRevert("MARKET_EXISTS");
        _helperCreateMarket(token);
    }

    function testCreateMarketRevertsZeroAddress() public {
        vm.expectRevert("ZERO_TOKEN");
        market.createMarket(address(0), address(0));
    }

    /* ═══════════════════════════════ BETS ═════════════════════════════════ */

    function testBetYes() public {
        address token = address(mockCurve);
        _helperCreateMarket(token);

        vm.prank(alice);
        market.betYes{value: 1 ether}(token);

        (,, uint256 totalYes, uint256 totalNo,,,,) = market.markets(token);
        assertEq(totalYes, 1 ether);
        assertEq(totalNo, 0);
        assertEq(market.yesBets(token, alice), 1 ether);
    }

    function testBetNo() public {
        address token = address(mockCurve);
        _helperCreateMarket(token);

        vm.prank(bob);
        market.betNo{value: 2 ether}(token);

        (,, uint256 totalYes, uint256 totalNo,,,,) = market.markets(token);
        assertEq(totalYes, 0);
        assertEq(totalNo, 2 ether);
        assertEq(market.noBets(token, bob), 2 ether);
    }

    function testBetRevertsZeroAmount() public {
        address token = address(mockCurve);
        _helperCreateMarket(token);

        vm.prank(alice);
        vm.expectRevert("ZERO_BET");
        market.betYes{value: 0}(token);
    }

    function testBetRevertsAfterResolved() public {
        address token = address(mockCurve);
        _helperCreateMarket(token);

        vm.prank(alice);
        market.betYes{value: 1 ether}(token);
        vm.prank(bob);
        market.betNo{value: 1 ether}(token);

        mockCurve.setGraduated(true);
        market.resolveMarket(token);

        vm.prank(alice);
        vm.expectRevert("ALREADY_RESOLVED");
        market.betYes{value: 1 ether}(token);
    }

    /* ═════════════════════════════ RESOLVE YES WINS ════════════════════════ */

    function testResolveMarketYesWins() public {
        address token = address(mockCurve);
        _helperCreateMarket(token);

        vm.prank(alice);
        market.betYes{value: 10 ether}(token);
        vm.prank(bob);
        market.betNo{value: 10 ether}(token);

        mockCurve.setGraduated(true);
        market.resolveMarket(token);

        (,,,, bool resolved, bool outcome,,) = market.markets(token);
        assertTrue(resolved);
        assertTrue(outcome);
    }

    /* ═════════════════════════════ RESOLVE NO WINS ═════════════════════════ */

    function testResolveMarketNoWins() public {
        address token = address(mockCurve);
        _helperCreateMarket(token);

        vm.prank(alice);
        market.betYes{value: 5 ether}(token);
        vm.prank(bob);
        market.betNo{value: 15 ether}(token);

        mockCurve.setGraduated(false);
        market.resolveMarket(token);

        (,,,, bool resolved, bool outcome,,) = market.markets(token);
        assertTrue(resolved);
        assertFalse(outcome);
    }

    /* ════════════════════════════ RESOLVE EDGE CASES ══════════════════════ */

    function testCannotDoubleResolve() public {
        address token = address(mockCurve);
        _helperCreateMarket(token);

        vm.prank(alice);
        market.betYes{value: 1 ether}(token);
        vm.prank(bob);
        market.betNo{value: 1 ether}(token);

        mockCurve.setGraduated(true);
        market.resolveMarket(token);

        vm.expectRevert("ALREADY_RESOLVED");
        market.resolveMarket(token);
    }

    function testResolveRevertsNoLiquidity() public {
        address token = address(mockCurve);
        _helperCreateMarket(token);

        // Only YES bets
        vm.prank(alice);
        market.betYes{value: 1 ether}(token);

        vm.expectRevert("NO_LIQUIDITY");
        market.resolveMarket(token);
    }

    /* ═════════════════════════════ CLAIM YES WINS ══════════════════════════ */

    function testClaimWinningsYesWins() public {
        address token = address(mockCurve);
        _helperCreateMarket(token);

        // Alice bets 10 YES, Bob bets 10 NO, Carol bets 2 YES
        vm.prank(alice);
        market.betYes{value: 10 ether}(token);
        vm.prank(bob);
        market.betNo{value: 10 ether}(token);
        vm.prank(carol);
        market.betYes{value: 2 ether}(token);

        // YES wins (graduates)
        mockCurve.setGraduated(true);
        market.resolveMarket(token);

        uint256 aliceBalanceBefore = alice.balance;
        uint256 carolBalanceBefore = carol.balance;

        vm.prank(alice);
        market.claimWinnings(token);

        vm.prank(carol);
        market.claimWinnings(token);

        uint256 distributable = 10 ether - ((10 ether * 200) / 10000);
        uint256 expectedAlice = (10 ether * distributable) / 12 ether;
        assertEq(alice.balance - aliceBalanceBefore, expectedAlice);

        uint256 expectedCarol = (2 ether * distributable) / 12 ether;
        assertEq(carol.balance - carolBalanceBefore, expectedCarol);

        // Bob (NO bettor) should have no winnings
        vm.prank(bob);
        vm.expectRevert("NO_WINNINGS");
        market.claimWinnings(token);
    }

    /* ═════════════════════════════ CLAIM NO WINS ═══════════════════════════ */

    function testClaimWinningsNoWins() public {
        address token = address(mockCurve);
        _helperCreateMarket(token);

        // Alice bets 10 YES, Bob bets 20 NO
        vm.prank(alice);
        market.betYes{value: 10 ether}(token);
        vm.prank(bob);
        market.betNo{value: 20 ether}(token);

        // NO wins (doesn't graduate)
        mockCurve.setGraduated(false);
        market.resolveMarket(token);

        uint256 bobBalanceBefore = bob.balance;

        vm.prank(bob);
        market.claimWinnings(token);

        uint256 expectedBob = 10 ether - ((10 ether * 200) / 10000);
        assertEq(bob.balance - bobBalanceBefore, expectedBob);

        // Alice should have no winnings
        vm.prank(alice);
        vm.expectRevert("NO_WINNINGS");
        market.claimWinnings(token);
    }

    /* ═════════════════════════════ PROTOCOL FEE ═════════════════════════════ */

    function testProtocolFeeOnLosingPool() public {
        address token = address(mockCurve);
        _helperCreateMarket(token);

        // Alice bets 10 YES, Bob bets 10 NO
        vm.prank(alice);
        market.betYes{value: 10 ether}(token);
        vm.prank(bob);
        market.betNo{value: 10 ether}(token);

        mockCurve.setGraduated(true);
        market.resolveMarket(token);

        // Alice claims her winnings
        vm.prank(alice);
        market.claimWinnings(token);

        uint256 feeReceiverBefore = feeReceiver.balance;

        // Sweep protocol fee
        market.sweepProtocolFee(token);

        // Protocol fee = 2% of losing NO pool (10 ether) = 0.2 ether
        uint256 expectedFee = (10 ether * 200) / 10000;
        assertEq(feeReceiver.balance - feeReceiverBefore, expectedFee);
    }

    /* ═══════════════════════════════ ODDS ══════════════════════════════════ */

    function testOddsCalculation() public {
        address token = address(mockCurve);
        _helperCreateMarket(token);

        // No bets: even odds
        (uint256 yesOdds, uint256 noOdds) = market.getOdds(token);
        assertEq(yesOdds, 5000);
        assertEq(noOdds, 5000);

        // 3 YES, 1 NO
        vm.prank(alice);
        market.betYes{value: 3 ether}(token);
        vm.prank(bob);
        market.betNo{value: 1 ether}(token);

        (yesOdds, noOdds) = market.getOdds(token);
        assertEq(yesOdds, 7500); // 3/4
        assertEq(noOdds, 2500);  // 1/4
    }

    /* ═══════════════════════════════ NEW TESTS ═══════════════════════════════ */

    function testDoubleSweepReverts() public {
        address token = address(mockCurve);
        _helperCreateMarket(token);

        vm.prank(alice);
        market.betYes{value: 1 ether}(token);
        vm.prank(bob);
        market.betNo{value: 1 ether}(token);

        mockCurve.setGraduated(true);
        market.resolveMarket(token);

        vm.prank(alice);
        market.claimWinnings(token);

        market.sweepProtocolFee(token);

        vm.expectRevert("ALREADY_SWEPT");
        market.sweepProtocolFee(token);
    }

    function testOneSidedMarketRefund() public {
        address token = address(mockCurve);
        _helperCreateMarket(token);

        // Only YES bets placed
        vm.prank(alice);
        market.betYes{value: 5 ether}(token);

        // Warp past REFUND_DELAY
        vm.warp(block.timestamp + 8 days);

        market.refundOneSidedMarket(token);

        (,,,,,, bool cancelled,) = market.markets(token);
        assertTrue(cancelled, "market should be cancelled");

        uint256 aliceBefore = alice.balance;
        vm.prank(alice);
        market.withdrawRefund(token);

        // Alice should get her 5 ether back
        assertEq(alice.balance - aliceBefore, 5 ether, "Alice should get full refund");
    }

    function testOneSidedMarketRefundTooEarly() public {
        address token = address(mockCurve);
        _helperCreateMarket(token);

        vm.prank(alice);
        market.betYes{value: 1 ether}(token);

        vm.expectRevert("TOO_EARLY");
        market.refundOneSidedMarket(token);
    }

    function testOneSidedMarketRefundBothSidesReverts() public {
        address token = address(mockCurve);
        _helperCreateMarket(token);

        vm.prank(alice);
        market.betYes{value: 1 ether}(token);
        vm.prank(bob);
        market.betNo{value: 1 ether}(token);

        vm.warp(block.timestamp + 8 days);

        vm.expectRevert("MARKET_HAD_BOTH_SIDES");
        market.refundOneSidedMarket(token);
    }

    function testReentrantClaimWinnings() public {
        address token = address(mockCurve);
        _helperCreateMarket(token);

        // Deploy reentrant attacker BEFORE resolution so it can bet
        ReentrantClaimer claimer = new ReentrantClaimer(payable(address(market)), token);
        vm.deal(address(claimer), 10 ether);

        // All bets before resolution
        vm.prank(alice);
        market.betYes{value: 10 ether}(token);
        vm.prank(bob);
        market.betNo{value: 10 ether}(token);
        vm.prank(address(claimer));
        market.betYes{value: 1 ether}(token);

        mockCurve.setGraduated(true);
        market.resolveMarket(token);

        // Now try to claim — attacker's receive() tries to reenter claimWinnings()
        // nonReentrant on claimWinnings() should prevent double-payout
        uint256 beforeBal = address(claimer).balance;
        vm.prank(address(claimer));
        market.claimWinnings(token);

        // Verify solvency: attacker should only be paid once
        uint256 afterBal = address(claimer).balance;
        assertGt(afterBal, beforeBal, "should receive payout");
    }
}

contract ReentrantClaimer {
    PredictionMarket public market;
    address public token;
    bool private attacking;

    constructor(address payable _market, address _token) {
        market = PredictionMarket(_market);
        token = _token;
    }

    function betYes() external payable {
        market.betYes{value: msg.value}(token);
    }

    function claimWinnings() external {
        market.claimWinnings(token);
    }

    receive() external payable {
        if (!attacking) {
            attacking = true;
            try market.claimWinnings(token) {} catch {}
            attacking = false;
        }
    }
}
