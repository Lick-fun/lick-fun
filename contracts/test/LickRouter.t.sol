// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {Test, console} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {LickRouter} from "../src/LickRouter.sol";
import {LickFactory} from "../src/LickFactory.sol";
import {LickPair} from "../src/LickPair.sol";
import {LickToken} from "../src/LickToken.sol";
import {BondingCurve} from "../src/BondingCurve.sol";
import {Factory} from "../src/Factory.sol";
import {GraduationRouter} from "../src/GraduationRouter.sol";

/**
 * @title LickRouterTest
 * @notice Tests for LickRouter — the post-graduation DEX swap router.
 *         Covers both swap directions, slippage, deadline, and pair-not-found errors.
 */
contract LickRouterTest is Test {
    // ─── Contracts ────────────────────────────────────────────────────────────
    Factory public launchFactory;
    LickFactory public dexFactory;
    GraduationRouter public gradRouter;
    LickRouter public router;
    MockWMON public wmon;

    // ─── Addresses ────────────────────────────────────────────────────────────
    address public treasury = makeAddr("treasury");
    address public creator  = makeAddr("creator");
    address public buyer    = makeAddr("buyer");
    address public trader   = makeAddr("trader");
    address public protocolFee = makeAddr("protocolFee");

    // ─── Token state ──────────────────────────────────────────────────────────
    LickToken public token;
    BondingCurve public curve;
    address public pair;

    // ─── Constants ────────────────────────────────────────────────────────────
    uint256 constant MON = 1 ether;

    // ─────────────────────────────────────────────────────────────────────────

    function setUp() public {
        // Deploy WMON mock
        wmon = new MockWMON();

        // Deploy DEX factory (temp owner = address(this) so we can set router)
        dexFactory = new LickFactory(address(this));

        // Deploy launch factory
        launchFactory = new Factory(treasury);

        // Deploy graduation router
        gradRouter = new GraduationRouter(
            address(dexFactory),
            address(wmon),
            protocolFee,
            address(launchFactory)
        );

        // Wire
        launchFactory.setGraduationRouter(address(gradRouter));
        dexFactory.setGraduationRouter(address(gradRouter));

        // Deploy LickRouter under test
        router = new LickRouter(address(dexFactory), address(wmon));

        // Create a token (starts at 100% supply on curve)
        (address tokenAddr, address curveAddr) = launchFactory.createToken(
            "Router Test Token", "RTT", creator, block.timestamp
        );
        token = LickToken(tokenAddr);
        curve = BondingCurve(payable(curveAddr));

        // Graduate the curve by buying enough MON
        uint256 buyAmount = 110_000 ether;
        vm.deal(buyer, buyAmount);
        vm.prank(buyer);
        curve.buy{value: buyAmount}(0);

        assertTrue(curve.graduated(), "curve must be graduated");

        // Migrate liquidity → creates LickPair with WMON + token
        pair = gradRouter.migrateLiquidity(address(token));
        assertTrue(pair != address(0), "pair must exist after migration");

        // Fund trader with MON for swaps
        vm.deal(trader, 50_000 ether);
    }

    /* ══════════════════════════════════════════════════════════════════════════
                            getAmountOut (pure math)
       ══════════════════════════════════════════════════════════════════════════ */

    function test_getAmountOut_basic() public view {
        // With equal reserves of 1000 and 0.25% fee:
        // amountIn = 100, reserveIn = 1000, reserveOut = 1000
        // amountInWithFee = 100 * 9975 = 997500
        // amountOut = 997500 * 1000 / (1000 * 10000 + 997500) = 997500000 / 10997500 ≈ 90.7
        uint256 out = router.getAmountOut(100, 1000, 1000);
        assertGt(out, 0, "amountOut must be > 0");
        assertLt(out, 100, "amountOut must be < amountIn (fee applied)");
    }

    function test_getAmountOut_revertsZeroInput() public {
        vm.expectRevert(LickRouter.InsufficientInputAmount.selector);
        router.getAmountOut(0, 1000, 1000);
    }

    function test_getAmountOut_revertsZeroReserve() public {
        vm.expectRevert(LickRouter.InsufficientInputAmount.selector);
        router.getAmountOut(100, 0, 1000);
    }

    /* ══════════════════════════════════════════════════════════════════════════
                            swapExactETHForTokens (MON → token)
       ══════════════════════════════════════════════════════════════════════════ */

    function test_swapExactETHForTokens_basic() public {
        uint256 amountIn = 100 ether;
        uint256 deadline = block.timestamp + 300;

        // Get expected output from router's pure helper
        (uint112 r0, uint112 r1,) = LickPair(pair).getReserves();
        address token0 = LickPair(pair).token0();
        (uint256 reserveWmon, uint256 reserveToken) = (address(wmon) == token0)
            ? (uint256(r0), uint256(r1))
            : (uint256(r1), uint256(r0));
        uint256 expectedOut = router.getAmountOut(amountIn, reserveWmon, reserveToken);

        uint256 tokenBefore = IERC20(address(token)).balanceOf(trader);

        vm.prank(trader);
        uint256 actualOut = router.swapExactETHForTokens{value: amountIn}(
            address(token),
            expectedOut,  // amountOutMin = exact expected (no extra slippage)
            trader,
            deadline
        );

        uint256 tokenAfter = IERC20(address(token)).balanceOf(trader);
        assertEq(actualOut, expectedOut, "returned amountOut must match expected");
        assertEq(tokenAfter - tokenBefore, actualOut, "trader must receive tokens");
        assertGt(actualOut, 0, "must receive > 0 tokens");
    }

    function test_swapExactETHForTokens_revertsOnSlippage() public {
        uint256 amountIn = 100 ether;
        uint256 deadline = block.timestamp + 300;

        // amountOutMin = absurdly high value → must revert
        vm.prank(trader);
        vm.expectRevert(LickRouter.InsufficientOutputAmount.selector);
        router.swapExactETHForTokens{value: amountIn}(
            address(token),
            type(uint256).max,   // impossible minimum
            trader,
            deadline
        );
    }

    function test_swapExactETHForTokens_revertsOnDeadline() public {
        uint256 pastDeadline = block.timestamp - 1;

        vm.prank(trader);
        vm.expectRevert(LickRouter.DeadlineExpired.selector);
        router.swapExactETHForTokens{value: 100 ether}(
            address(token),
            0,
            trader,
            pastDeadline
        );
    }

    function test_swapExactETHForTokens_revertsZeroInput() public {
        vm.prank(trader);
        vm.expectRevert(LickRouter.InsufficientInputAmount.selector);
        router.swapExactETHForTokens{value: 0}(
            address(token),
            0,
            trader,
            block.timestamp + 300
        );
    }

    function test_swapExactETHForTokens_revertsUnknownPair() public {
        address fakeTok = makeAddr("fakeTok");
        vm.prank(trader);
        vm.expectRevert(LickRouter.PairNotFound.selector);
        router.swapExactETHForTokens{value: 1 ether}(
            fakeTok, 0, trader, block.timestamp + 300
        );
    }

    /* ══════════════════════════════════════════════════════════════════════════
                            swapExactTokensForETH (token → MON)
       ══════════════════════════════════════════════════════════════════════════ */

    function test_swapExactTokensForETH_basic() public {
        // First, trader needs some tokens (buy via curve or from buyer)
        // Buy on the DEX first to get tokens
        uint256 buyMon = 100 ether;
        vm.prank(trader);
        uint256 tokensReceived = router.swapExactETHForTokens{value: buyMon}(
            address(token), 0, trader, block.timestamp + 300
        );
        assertGt(tokensReceived, 0, "setup: must receive tokens");

        // Now sell those tokens back
        uint256 deadline = block.timestamp + 300;

        // Approve router
        vm.prank(trader);
        IERC20(address(token)).approve(address(router), tokensReceived);

        // Get expected MON output
        (uint112 r0, uint112 r1,) = LickPair(pair).getReserves();
        address token0 = LickPair(pair).token0();
        (uint256 reserveToken, uint256 reserveWmon) = (address(token) == token0)
            ? (uint256(r0), uint256(r1))
            : (uint256(r1), uint256(r0));
        uint256 expectedMon = router.getAmountOut(tokensReceived, reserveToken, reserveWmon);

        uint256 monBefore = trader.balance;

        vm.prank(trader);
        uint256 actualMon = router.swapExactTokensForETH(
            address(token),
            tokensReceived,
            expectedMon,  // exact amountOutMin
            trader,
            deadline
        );

        uint256 monAfter = trader.balance;
        assertEq(actualMon, expectedMon, "returned MON must match expected");
        assertEq(monAfter - monBefore, actualMon, "trader must receive MON");
        assertGt(actualMon, 0, "must receive > 0 MON");
    }

    function test_swapExactTokensForETH_revertsOnSlippage() public {
        // Get some tokens first
        vm.prank(trader);
        uint256 tokensReceived = router.swapExactETHForTokens{value: 100 ether}(
            address(token), 0, trader, block.timestamp + 300
        );

        vm.prank(trader);
        IERC20(address(token)).approve(address(router), tokensReceived);

        vm.prank(trader);
        vm.expectRevert(LickRouter.InsufficientOutputAmount.selector);
        router.swapExactTokensForETH(
            address(token),
            tokensReceived,
            type(uint256).max,  // impossible minimum
            trader,
            block.timestamp + 300
        );
    }

    function test_swapExactTokensForETH_revertsOnDeadline() public {
        vm.prank(trader);
        vm.expectRevert(LickRouter.DeadlineExpired.selector);
        router.swapExactTokensForETH(
            address(token), 1 ether, 0, trader, block.timestamp - 1
        );
    }

    function test_swapExactTokensForETH_revertsZeroInput() public {
        vm.prank(trader);
        vm.expectRevert(LickRouter.InsufficientInputAmount.selector);
        router.swapExactTokensForETH(
            address(token), 0, 0, trader, block.timestamp + 300
        );
    }

    /* ══════════════════════════════════════════════════════════════════════════
                            Round-trip sanity
       ══════════════════════════════════════════════════════════════════════════ */

    function test_roundTrip_MONtoTokenToMON() public {
        uint256 startMon = trader.balance;
        uint256 buyAmount = 500 ether;

        // Buy tokens
        vm.prank(trader);
        uint256 tokens = router.swapExactETHForTokens{value: buyAmount}(
            address(token), 0, trader, block.timestamp + 300
        );
        assertGt(tokens, 0, "must receive tokens");

        // Sell tokens back
        vm.prank(trader);
        IERC20(address(token)).approve(address(router), tokens);

        vm.prank(trader);
        uint256 monBack = router.swapExactTokensForETH(
            address(token), tokens, 0, trader, block.timestamp + 300
        );

        // After round-trip, MON received must be less than sent (fee taken twice)
        assertLt(monBack, buyAmount, "round-trip must lose MON to fees");
        assertGt(monBack, 0, "must get some MON back");

        uint256 endMon = trader.balance;
        // Net loss = buyAmount - monBack (both fees charged)
        assertEq(startMon - buyAmount + monBack, endMon, "balance accounting must match");
    }
}

/* ══════════════════════════════════════════════════════════════════════════════
                           MockWMON (ERC-20 + deposit/withdraw)
   ══════════════════════════════════════════════════════════════════════════════ */

contract MockWMON is IERC20 {
    string public name = "Wrapped MON";
    string public symbol = "WMON";
    uint8 public decimals = 18;

    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;
    uint256 public override totalSupply;

    function deposit() external payable {
        balanceOf[msg.sender] += msg.value;
        totalSupply += msg.value;
    }

    function withdraw(uint256 wad) external {
        require(balanceOf[msg.sender] >= wad, "WMON: insufficient");
        balanceOf[msg.sender] -= wad;
        totalSupply -= wad;
        payable(msg.sender).transfer(wad);
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        if (allowance[from][msg.sender] != type(uint256).max) {
            allowance[from][msg.sender] -= amount;
        }
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
}
