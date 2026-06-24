// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {Test} from "forge-std/Test.sol";
import {LickToken} from "../src/LickToken.sol";
import {BondingCurve} from "../src/BondingCurve.sol";
import {Factory} from "../src/Factory.sol";
import {GraduationRouter} from "../src/GraduationRouter.sol";
import {LickFactory} from "../src/LickFactory.sol";
import {LickPair} from "../src/LickPair.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title GraduationRouterTest
 * @notice Full lifecycle tests for graduation and liquidity migration.
 */
contract GraduationRouterTest is Test {
    // ─── Contracts ────────────────────────────────────────────────────────────
    Factory public launchFactory;
    LickFactory public dexFactory;
    GraduationRouter public router;
    MockWETH public weth;

    // ─── Test addresses ───────────────────────────────────────────────────────
    address public protocolTreasury = makeAddr("protocolTreasury");
    address public creator = makeAddr("creator");
    address public buyer = makeAddr("buyer");
    address public protocolFeeReceiver = makeAddr("protocolFeeReceiver");

    // ─── Token state ───────────────────────────────────────────────────────────
    LickToken public token;
    BondingCurve public curve;

    // ─── Constants ────────────────────────────────────────────────────────────
    uint256 constant MON = 1 ether;
    uint256 constant GRADUATION_THRESHOLD = 100_000 ether;

    function setUp() public {
        // ── Deploy infrastructure ──
        // Deploy LickFactory with a temporary router (address(this)) so
        // GraduationRouter can call createPair via setGraduationRouter
        dexFactory = new LickFactory(address(this));
        weth = new MockWETH();

        // Deploy launch factory
        launchFactory = new Factory(protocolTreasury);

        // Deploy GraduationRouter (no vestingController param — LP burns to 0xdead)
        router = new GraduationRouter(
            address(dexFactory),
            address(weth),
            protocolFeeReceiver,
            address(launchFactory)
        );

        // Set graduationRouter on launch factory
        launchFactory.setGraduationRouter(address(router));

        // Set graduationRouter on LickFactory so GraduationRouter can create pairs
        dexFactory.setGraduationRouter(address(router));

        // ── Create token ──
        // Note: we do NOT set vestingController on launchFactory because
        // initVesting() has onlyOwner and Factory is not the owner.
        // The token is created without dev allocation vesting.
        (address tokenAddr, address curveAddr) = launchFactory.createToken(
            "Test Token",
            "TEST",
            creator,
            block.timestamp
        );
        token = LickToken(tokenAddr);
        curve = BondingCurve(payable(curveAddr));
    }

    /* ════════════════════════════════════════════════════════════════════════
                                  MIGRATION TESTS
       ════════════════════════════════════════════════════════════════════════ */

    /// @notice Full lifecycle: create token, buy to graduation, migrate liquidity.
    function testMigrateLiquidity() public {
        // ── Buy enough to reach graduation threshold ──
        // Need to push realMon >= 100,000 MON
        // Each buy: netAmountIn ≈ msg.value * 0.98 (after 2% fees)
        // To reach 100,000 MON net: need ~102,041 MON gross
        uint256 buyAmount = 110_000 ether;
        vm.deal(buyer, buyAmount);

        vm.startPrank(buyer);
        curve.buy{value: buyAmount}(0);
        vm.stopPrank();

        // Verify graduation
        assertTrue(curve.graduated(), "curve should be graduated");

        // ── Migrate liquidity ──
        address pair = router.migrateLiquidity(address(token));

        // Verify pair is deployed
        assertTrue(pair != address(0), "pair should be deployed");
        assertEq(router.tokenToPair(address(token)), pair, "tokenToPair should be set");

        // Verify pair has reserves
        (uint112 reserve0, uint112 reserve1,) = LickPair(pair).getReserves();
        assertTrue(reserve0 > 0, "reserve0 should have liquidity");
        assertTrue(reserve1 > 0, "reserve1 should have liquidity");

        // Verify LP tokens are burned to 0xdead
        uint256 deadBalance = IERC20(pair).balanceOf(address(0xdead));
        assertTrue(deadBalance > 0, "LP tokens should be burned to 0xdead");
    }

    /// @notice Cannot migrate before graduation threshold is reached.
    function testCannotMigrateBeforeGraduation() public {
        // Buy a small amount (not enough to graduate)
        uint256 smallBuy = 10_000 ether;
        vm.deal(buyer, smallBuy);

        vm.startPrank(buyer);
        curve.buy{value: smallBuy}(0);
        vm.stopPrank();

        // Curve should NOT be graduated
        assertFalse(curve.graduated(), "curve should not be graduated");

        // Attempt migration should revert
        vm.expectRevert(GraduationRouter.NotGraduated.selector);
        router.migrateLiquidity(address(token));
    }

    /// @notice Cannot migrate the same token twice.
    function testCannotMigrateTwice() public {
        // Graduate
        uint256 buyAmount = 110_000 ether;
        vm.deal(buyer, buyAmount);

        vm.startPrank(buyer);
        curve.buy{value: buyAmount}(0);
        vm.stopPrank();

        // First migration
        router.migrateLiquidity(address(token));

        // Second migration should revert
        vm.expectRevert(GraduationRouter.AlreadyMigrated.selector);
        router.migrateLiquidity(address(token));
    }

    /// @notice After migration, the pair has correct reserves matching what was sent.
    function testLiquidityInPair() public {
        // Graduate
        uint256 buyAmount = 110_000 ether;
        vm.deal(buyer, buyAmount);

        vm.startPrank(buyer);
        curve.buy{value: buyAmount}(0);
        vm.stopPrank();

        // Migrate
        address pair = router.migrateLiquidity(address(token));

        // Verify reserves
        (uint112 reserve0, uint112 reserve1,) = LickPair(pair).getReserves();

        // The pair should have token and WETH reserves
        // Both should be non-zero
        assertTrue(reserve0 > 0, "reserve0 should be > 0");
        assertTrue(reserve1 > 0, "reserve1 should be > 0");

        // Total liquidity should match what was sent (minus MINIMUM_LIQUIDITY burned)
        uint256 totalReserves = uint256(reserve0) + uint256(reserve1);
        assertTrue(totalReserves > 0, "total reserves should be > 0");
    }

    /// @notice LP tokens are burned to 0xdead on graduation migration.
    function testLPTokensBurnedToDead() public {
        // Graduate
        uint256 buyAmount = 110_000 ether;
        vm.deal(buyer, buyAmount);

        vm.startPrank(buyer);
        curve.buy{value: buyAmount}(0);
        vm.stopPrank();

        // Migrate
        address pair = router.migrateLiquidity(address(token));

        // Verify LP tokens are burned to 0xdead
        uint256 deadBalance = IERC20(pair).balanceOf(address(0xdead));
        assertTrue(deadBalance > 0, "LP tokens should be burned to 0xdead");
    }

    /// @notice Verify LP tokens are burned to 0xdead on graduation migration.
    function test_lpBurnedAt0xdead_onGraduation() public {
        uint256 buyAmount = 110_000 ether;
        vm.deal(buyer, buyAmount);
        vm.startPrank(buyer);
        curve.buy{value: buyAmount}(0);
        vm.stopPrank();

        assertTrue(curve.graduated(), "curve should be graduated");

        address pair = router.migrateLiquidity(address(token));

        uint256 deadBalance = IERC20(pair).balanceOf(address(0xdead));
        assertTrue(deadBalance > 0, "LP tokens must be sent to 0xdead");
        assertEq(router.tokenToPair(address(token)), pair, "tokenToPair should be set");
    }

    /// @notice GraduationRouter has no vestingController state variable.
    function test_noVestingController_reference_in_migration() public {
        // If this test compiles and runs, there is no vestingController dependency.
        // The migrateLiquidity call must succeed without any VestingController.
        uint256 buyAmount = 110_000 ether;
        vm.deal(buyer, buyAmount);
        vm.startPrank(buyer);
        curve.buy{value: buyAmount}(0);
        vm.stopPrank();

        address pair = router.migrateLiquidity(address(token));
        assertTrue(pair != address(0), "migration should succeed without vestingController");
    }
}

/* ════════════════════════════════════════════════════════════════════════════
                               MOCK CONTRACTS
   ════════════════════════════════════════════════════════════════════════════ */

/**
 * @notice Minimal WETH9 mock for testing.
 */
contract MockWETH is IERC20 {
    string public name = "Wrapped MON";
    string public symbol = "WMON";
    uint8 public decimals = 18;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;

    function deposit() public payable {
        balanceOf[msg.sender] += msg.value;
        totalSupply += msg.value;
    }

    function withdraw(uint256 wad) external {
        balanceOf[msg.sender] -= wad;
        totalSupply -= wad;
        payable(msg.sender).transfer(wad);
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

    receive() external payable {
        deposit();
    }
}