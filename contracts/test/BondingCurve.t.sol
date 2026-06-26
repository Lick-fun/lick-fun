// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {Test} from "forge-std/Test.sol";
import {LickToken} from "../src/LickToken.sol";
import {BondingCurve} from "../src/BondingCurve.sol";
import {Factory} from "../src/Factory.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";

/// @title BondingCurveTest
/// @notice Foundry tests for the Stage 1 + Stage 2 bonding curve implementation.
contract BondingCurveTest is Test {
    LickToken public token;
    BondingCurve public curve;
    Factory public factory;

    address public protocolFeeReceiver = makeAddr("protocol");
    address public creator = makeAddr("creator");
    address public buyer = makeAddr("buyer");
    address public seller = makeAddr("seller");
    address public sniper = makeAddr("sniper");

    uint256 constant MON = 1 ether;

    function setUp() public {
        // Deploy factory with protocol fee receiver.
        factory = new Factory(protocolFeeReceiver);

        // Create a token + curve pair with startTime = 0 (active immediately).
        vm.startPrank(address(this));
        (address _token, address _curve) = factory.createToken("Test Token", "TEST", creator, 0);
        vm.stopPrank();

        token = LickToken(_token);
        curve = BondingCurve(payable(_curve));

        // Fund test accounts (enough for graduation: ~102,041 MON needed).
        vm.deal(buyer, 200_000 ether);
        vm.deal(seller, 100_000 ether);
        vm.deal(sniper, 100_000 ether);
    }

    /* ════════════════════════════════════════════════════════════════════════════
       STAGE 1 TESTS (existing, updated for startTime param)
       ════════════════════════════════════════════════════════════════════════════ */

    /* TEST 1: Buy */
    function testBuy() public {
        uint256 buyAmount = 1 ether;
        uint256 buyerBalanceBefore = buyer.balance;

        // First buy is exempt from anti-sniping; fees still apply.
        // Penalty = 0 (first buy). AfterPenalty = msg.value.
        uint256 protocolFee = (buyAmount * 100) / 10_000;
        uint256 creatorFee = (buyAmount * 100) / 10_000;
        uint256 netIn = buyAmount - protocolFee - creatorFee;
        uint256 expectedTokens = curve.getAmountOut(netIn, true);

        vm.startPrank(buyer);
        uint256 tokensOut = curve.buy{value: buyAmount}(0);
        vm.stopPrank();

        assertEq(token.balanceOf(buyer), tokensOut);
        assertEq(tokensOut, expectedTokens, "tokensOut should match expected");
        assertEq(curve.realMon(), netIn, "realMon should be net amount");
        assertEq(curve.soldTokens(), tokensOut, "soldTokens should match");
        assertEq(protocolFeeReceiver.balance, protocolFee, "protocol fee");
        assertEq(creator.balance, creatorFee, "creator fee");
        assertEq(buyerBalanceBefore - buyer.balance, buyAmount, "buyer paid full amount");
    }

    /* TEST 2: Sell */
    function testSell() public {
        // First buyer buys some tokens (exempt from penalty).
        vm.startPrank(buyer);
        uint256 tokensHeld = curve.buy{value: 1 ether}(0);
        vm.stopPrank();

        // Roll to block 7+ so sell has no anti-sniping penalty.
        vm.roll(block.number + 7);

        // Seller buys tokens, then sells them all back.
        vm.startPrank(seller);
        uint256 sellerTokens = curve.buy{value: 1 ether}(0);
        token.approve(address(curve), sellerTokens);

        uint256 sellerBalanceBeforeSell = seller.balance;
        uint256 monOut = curve.sell(sellerTokens, 0);
        vm.stopPrank();

        assertEq(seller.balance - sellerBalanceBeforeSell, monOut, "seller should receive monOut");
        assertTrue(monOut < 1 ether, "monOut should be less than input due to fees");
        assertEq(token.balanceOf(seller), 0, "seller should have 0 tokens");
        assertEq(curve.soldTokens(), tokensHeld, "soldTokens should equal remaining");
    }

    /* TEST 3: Cannot buy after graduation */
    function testCannotBuyAfterGraduation() public {
        uint256 graduationBuyAmount = 102_041 ether;

        vm.startPrank(buyer);
        curve.buy{value: graduationBuyAmount}(0);
        vm.stopPrank();

        assertTrue(curve.graduated(), "should be graduated");

        vm.startPrank(buyer);
        vm.expectRevert("GRADUATED");
        curve.buy{value: 1 ether}(0);
        vm.stopPrank();
    }

    /* TEST 4: Graduation triggers */
    function testGraduationTriggers() public {
        assertFalse(curve.graduated(), "should start not graduated");

        uint256 graduationAmount = 102_041 ether;

        vm.expectEmit(true, true, true, true);
        emit BondingCurve.CurveGraduate(address(token), address(curve));

        vm.startPrank(buyer);
        curve.buy{value: graduationAmount}(0);
        vm.stopPrank();

        assertTrue(curve.graduated(), "should be graduated after threshold");
        assertGe(curve.realMon(), curve.GRADUATION_THRESHOLD(), "realMon should be >= threshold");
    }

    /* TEST 5: Fee calculation */
    function testFeeCalculation() public {
        uint256 buyAmount = 10 ether;

        uint256 expectedProtocolFee = (buyAmount * 100) / 10_000; // 1% = 0.1 MON
        uint256 expectedCreatorFee = (buyAmount * 100) / 10_000; // 1% = 0.1 MON

        uint256 protocolBefore = protocolFeeReceiver.balance;
        uint256 creatorBefore = creator.balance;

        vm.startPrank(buyer);
        curve.buy{value: buyAmount}(0);
        vm.stopPrank();

        assertEq(
            protocolFeeReceiver.balance - protocolBefore,
            expectedProtocolFee,
            "protocol fee should be exactly 1%"
        );
        assertEq(creator.balance - creatorBefore, expectedCreatorFee, "creator fee should be exactly 1%");
    }

    /* TEST 6: Get progress */
    function testGetProgress() public {
        assertEq(curve.getProgress(), 0, "progress should be 0");

        vm.startPrank(buyer);
        curve.buy{value: 10 ether}(0);
        vm.stopPrank();

        uint256 netIn = 10 ether - (10 ether * 200) / 10_000; // 9.8 MON
        uint256 expectedProgress = (netIn * 10_000) / 100_000 ether;
        assertEq(curve.getProgress(), expectedProgress, "progress mismatch");
    }

    /* TEST 7: Cannot sell after graduation */
    function testCannotSellAfterGraduation() public {
        vm.startPrank(buyer);
        curve.buy{value: 102_041 ether}(0);
        uint256 tokensHeld = token.balanceOf(buyer);
        vm.stopPrank();

        vm.startPrank(buyer);
        token.approve(address(curve), tokensHeld);
        vm.expectRevert("GRADUATED");
        curve.sell(tokensHeld, 0);
        vm.stopPrank();
    }

    /* TEST 8: Factory creates token with correct supply */
    function testFactoryCreatesTokenWithCorrectSupply() public view {
        assertEq(token.totalSupply(), 1_000_000_000 ether, "total supply should be 1B");
        // Phase 3: no auto dev allocation — curve receives 100% of supply.
        assertEq(token.balanceOf(address(curve)), 1_000_000_000 ether, "curve should hold 100% of tokens");
    }

    /* ════════════════════════════════════════════════════════════════════════════
       STAGE 2 TESTS: Delayed-Mint + Anti-Sniping
       ════════════════════════════════════════════════════════════════════════════ */

    /* TEST 9: Cannot trade before startTime */
    function testCannotTradeBeforeStartTime() public {
        // Deploy a new token with startTime in the future.
        uint256 futureStart = block.timestamp + 1000;
        vm.startPrank(address(this));
        (, address _curve2) = factory.createToken("Future", "FUT", creator, futureStart);
        vm.stopPrank();

        BondingCurve futureCurve = BondingCurve(payable(_curve2));

        // Buy should revert.
        vm.startPrank(buyer);
        vm.expectRevert("Trading not yet active");
        futureCurve.buy{value: 1 ether}(0);
        vm.stopPrank();

        // Sell should also revert.
        vm.startPrank(buyer);
        vm.expectRevert("Trading not yet active");
        futureCurve.sell(1 ether, 0);
        vm.stopPrank();
    }

    /* TEST 10: Trading active after startTime */
    function testTradingActiveAfterStartTime() public {
        uint256 futureStart = block.timestamp + 1;
        vm.startPrank(address(this));
        (, address _curve2) = factory.createToken("Future2", "FUT2", creator, futureStart);
        vm.stopPrank();

        BondingCurve futureCurve = BondingCurve(payable(_curve2));

        // Warp past startTime.
        vm.warp(block.timestamp + 2);

        // Buy should succeed now.
        vm.startPrank(buyer);
        uint256 tokensOut = futureCurve.buy{value: 1 ether}(0);
        vm.stopPrank();

        assertTrue(tokensOut > 0, "buy should return tokens");
    }

    /* TEST 11: Anti-sniping penalty at block 0 (80%) */
    function testAntiSnipingPenaltyBlock0() public {
        // First buy is exempt (no penalty).
        uint256 protocolBefore = protocolFeeReceiver.balance;
        vm.startPrank(buyer);
        curve.buy{value: 1 ether}(0);
        vm.stopPrank();

        // First buy: only 1% protocol fee, no penalty.
        uint256 firstBuyProtocol = protocolFeeReceiver.balance - protocolBefore;
        assertEq(firstBuyProtocol, 0.01 ether, "first buy should have no penalty, only 1% fee");

        // Second buy in same block (block 0) → 80% penalty applies.
        // Penalty = 1 MON * 80% = 0.8 MON
        // AfterPenalty = 0.2 MON
        // Protocol fee = 0.2 * 1% = 0.002 MON
        // Total to protocol = 0.8 + 0.002 = 0.802 MON
        uint256 protocolBeforeSecond = protocolFeeReceiver.balance;
        vm.startPrank(sniper);
        curve.buy{value: 1 ether}(0);
        vm.stopPrank();

        uint256 secondBuyProtocol = protocolFeeReceiver.balance - protocolBeforeSecond;
        // Expected: 0.8 (penalty) + 0.002 (1% of 0.2) = 0.802 MON
        assertEq(secondBuyProtocol, 0.802 ether, "second buy should have 80% penalty + 1% fee");
    }

    /* TEST 12: Anti-sniping penalty decays over blocks */
    function testAntiSnipingPenaltyDecays() public {
        // First buy (exempt).
        vm.startPrank(buyer);
        curve.buy{value: 1 ether}(0);
        vm.stopPrank();

        // Roll to block 6 (5% penalty).
        vm.roll(block.number + 6);
        uint256 protocolBeforeBlock6 = protocolFeeReceiver.balance;
        vm.startPrank(sniper);
        curve.buy{value: 1 ether}(0);
        vm.stopPrank();

        // Block 6: penalty = 5% = 0.05 MON, afterPenalty = 0.95 MON
        // Protocol fee = 0.95 * 1% = 0.0095 MON
        // Total to protocol = 0.05 + 0.0095 = 0.0595 MON
        uint256 block6Protocol = protocolFeeReceiver.balance - protocolBeforeBlock6;
        assertEq(block6Protocol, 0.0595 ether, "block 6 should have 5% penalty + 1% fee");

        // Roll to block 7+ (0% penalty).
        vm.roll(block.number + 1);
        uint256 protocolBeforeBlock7 = protocolFeeReceiver.balance;
        vm.startPrank(sniper);
        curve.buy{value: 1 ether}(0);
        vm.stopPrank();

        // Block 7+: no penalty, only 1% protocol fee = 0.01 MON
        uint256 block7Protocol = protocolFeeReceiver.balance - protocolBeforeBlock7;
        assertEq(block7Protocol, 0.01 ether, "block 7+ should have 0% penalty, only 1% fee");
    }

    /* TEST 13: Symmetric sell penalty */
    function testSymmetricSellPenalty() public {
        // First buy (exempt) at block 0.
        vm.startPrank(buyer);
        curve.buy{value: 1 ether}(0);
        vm.stopPrank();

        // Sniper buys at block 1 (40% penalty on buy).
        vm.roll(block.number + 1);
        vm.startPrank(sniper);
        uint256 sniperTokens = curve.buy{value: 1 ether}(0);
        vm.stopPrank();

        // Now sell at block 1 → 40% penalty on sell output.
        uint256 protocolBeforeSell = protocolFeeReceiver.balance;
        vm.startPrank(sniper);
        token.approve(address(curve), sniperTokens);
        uint256 monOut = curve.sell(sniperTokens, 0);
        vm.stopPrank();

        // Verify sell had a penalty: monOut should be significantly less than
        // what a no-penalty sell would give (due to 40% penalty + 2% fees).
        assertTrue(monOut < 0.6 ether, "sell output should reflect 40% penalty + fees");

        // Protocol receiver should have received penalty + protocol fee from sell.
        uint256 sellProtocolGain = protocolFeeReceiver.balance - protocolBeforeSell;
        assertTrue(sellProtocolGain > 0, "protocol should gain from sell penalty");
    }

    /* TEST 14: Initial buy is exempt from anti-sniping */
    function testInitialBuyExempt() public {
        // At block 0, the penalty would be 80% if not exempt.
        // Verify first buy pays NO penalty (only the 1% protocol fee).
        uint256 protocolBefore = protocolFeeReceiver.balance;
        uint256 creatorBefore = creator.balance;

        vm.startPrank(buyer);
        curve.buy{value: 1 ether}(0);
        vm.stopPrank();

        // Protocol should only get 1% fee = 0.01 MON (no 80% penalty).
        assertEq(
            protocolFeeReceiver.balance - protocolBefore,
            0.01 ether,
            "first buy should have no anti-sniping penalty"
        );

        // Creator should get 1% fee = 0.01 MON.
        assertEq(creator.balance - creatorBefore, 0.01 ether, "creator fee on first buy");

        // initialBuyExecuted should now be true.
        assertTrue(curve.initialBuyExecuted(), "initialBuyExecuted should be true after first buy");
    }

    /* ════════════════════════════════════════════════════════════════════════════
       NEW TESTS: Solvency, Multi-User, Reentrancy
       ════════════════════════════════════════════════════════════════════════════ */

    /* TEST 15: Solvency invariant — after every sell, curve balance >= realMon */
    function testSolvencyInvariantAfterSell() public {
        vm.startPrank(buyer);
        curve.buy{value: 1 ether}(0);
        vm.stopPrank();
        vm.roll(block.number + 7);
        vm.startPrank(seller);
        uint256 sellerTokens = curve.buy{value: 5 ether}(0);
        token.approve(address(curve), sellerTokens);
        uint256 monOut = curve.sell(sellerTokens, 0);
        vm.stopPrank();
        uint256 curveBalance = address(curve).balance;
        uint256 real = curve.realMon();
        assertGe(curveBalance, real, "curve balance must be >= realMon after sell");
    }

    /* TEST 16: Multi-user buy -> sell round-trip solvency */
    function testMultiUserBuySellSolvency() public {
        address[3] memory users = [buyer, seller, sniper];
        uint256[3] memory amounts = [uint256(1 ether), uint256(2 ether), uint256(3 ether)];
        for (uint256 i = 0; i < 3; i++) {
            vm.startPrank(users[i]);
            curve.buy{value: amounts[i]}(0);
            vm.stopPrank();
        }
        vm.roll(block.number + 7);
        for (uint256 i = 0; i < 3; i++) {
            vm.startPrank(users[2 - i]);
            uint256 bal = token.balanceOf(users[2 - i]);
            if (bal > 0) {
                token.approve(address(curve), bal);
                curve.sell(bal, 0);
            }
            vm.stopPrank();
            uint256 cb = address(curve).balance;
            uint256 rm = curve.realMon();
            assertGe(cb, rm, "curve balance must be >= realMon after each sell");
        }
    }

    /* TEST 17: Reentrant attacker receive() cannot double-claim on sell */
    function testReentrantSell() public {
        ReentrantAttacker attacker = new ReentrantAttacker(address(curve), address(token));
        vm.deal(address(attacker), 100 ether);
        vm.startPrank(buyer);
        curve.buy{value: 1 ether}(0);
        vm.stopPrank();
        vm.roll(block.number + 7);
        vm.startPrank(address(attacker));
        uint256 tok = curve.buy{value: 5 ether}(0);
        attacker.approveTokens(tok);
        uint256 monOut = attacker.attackSell(tok);
        vm.stopPrank();
        uint256 cb = address(curve).balance;
        uint256 rm = curve.realMon();
        assertGe(cb, rm, "curve balance must be >= realMon after reentrant sell");
    }

    /* TEST 18: Integration — createMarket with real BondingCurve + LickToken → resolve works */
    function testCreateMarketIntegration() public {
        // Deploy PredictionMarket and link it to the factory
        PredictionMarket pm = new PredictionMarket(protocolFeeReceiver, address(factory));
        factory.setPredictionMarket(address(pm));

        // Create a second token — factory should auto-create a market for it
        vm.startPrank(address(this));
        (address token2, address curve2) = factory.createToken("Token2", "TK2", creator, 0);
        vm.stopPrank();

        LickToken tok2 = LickToken(token2);
        BondingCurve cv2 = BondingCurve(payable(curve2));

        // Verify market exists
        (address mToken, address mCurve,,,,,,) = pm.markets(token2);
        assertEq(mToken, token2, "market token should match");
        assertEq(mCurve, curve2, "market curve should match (C1 fix)");

        // Fund the curve to graduation threshold
        vm.startPrank(buyer);
        cv2.buy{value: 102_041 ether}(0);
        vm.stopPrank();

        assertTrue(cv2.graduated(), "curve should be graduated");

        // Fund address(this) for bets
        vm.deal(address(this), 10 ether);

        // Place bets
        vm.prank(address(this));
        pm.betYes{value: 1 ether}(token2);
        vm.prank(address(this));
        pm.betNo{value: 1 ether}(token2);

        // Resolve the market — should use the stored curve address (C1 fix)
        pm.resolveMarket(token2);

        (,,,, bool resolved, bool outcome,,) = pm.markets(token2);
        assertTrue(resolved, "market should be resolved");
        assertTrue(outcome, "outcome should be YES (graduated)");
    }

    // ─── Solvency invariant ───────────────────────────────────────────────────

    function test_solvency_invariant_afterBuyAndSell() public {
        // After a buy and partial sell, contract balance >= realMon
        address buyer2 = makeAddr("buyer2");
        vm.deal(buyer2, 10_000 ether);
        vm.startPrank(buyer2);
        uint256 tokens = curve.buy{value: 10_000 ether}(0);
        // Sell half back
        IERC20(address(token)).approve(address(curve), tokens / 2);
        curve.sell(tokens / 2, 0);
        vm.stopPrank();

        uint256 contractBalance = address(curve).balance;
        uint256 realMon = curve.realMon();
        assertGe(contractBalance, realMon, "contract balance must be >= realMon");
    }

    receive() external payable {}
}

/// @notice Helper contract that attempts reentrancy on sell()
contract ReentrantAttacker {
    BondingCurve public curve;
    IERC20 public token;
    bool private attacking;
    uint256 private attackTokens;

    constructor(address _curve, address _token) {
        curve = BondingCurve(payable(_curve));
        token = IERC20(_token);
    }

    function approveTokens(uint256 amount) external {
        token.approve(address(curve), amount);
    }

    function attackSell(uint256 amount) external returns (uint256) {
        attackTokens = amount;
        attacking = true;
        return curve.sell(amount, 0);
    }

    receive() external payable {
        if (attacking) {
            attacking = false;
            // Attempt reentrancy — wrap in try/catch since tokens may be gone
            try curve.sell(attackTokens, 0) {} catch {}
        }
    }
}
