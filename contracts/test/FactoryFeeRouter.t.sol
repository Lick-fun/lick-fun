// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "forge-std/Test.sol";
import "../src/Factory.sol";
import "../src/BondingCurve.sol";
import "../src/FeeRouter.sol";
import "../src/VaultLPSupport.sol";
import "../src/VaultBuybackBurn.sol";
import "../src/LickToken.sol";

/**
 * @title FactoryFeeRouterTest
 * @notice Integration tests for Factory + FeeRouter + Vaults across all tiers.
 * @dev    Tests the FeeRouter routing logic with Factory-created tokens.
 *         We deploy BondingCurve directly with creator=feeRouter so the 1% creator
 *         fee flows through FeeRouter. This simulates what createTokenWithPreset()
 *         does in production.
 */
contract FactoryFeeRouterTest is Test {
    Factory public factory;
    FeeRouter public feeRouter;
    VaultLPSupport public vaultLP;
    VaultBuybackBurn public vaultBB;

    address public deployer = makeAddr("deployer");
    address public creator = makeAddr("creator");
    address public buyer = makeAddr("buyer");

    function setUp() public {
        // Deploy vaults
        vaultLP = new VaultLPSupport();
        vaultBB = new VaultBuybackBurn();

        // Deploy FeeRouter (test contract is owner)
        feeRouter = new FeeRouter(
            address(0x111), // graduationPool (not used in these tests)
            address(vaultLP),
            address(vaultBB)
        );

        // Deploy Factory
        factory = new Factory(deployer);
        factory.setFeeRouter(address(feeRouter));
    }

    /// @notice Helper: create a token + curve where creator fee goes to FeeRouter.
    function _createTokenWithFeeRouter()
        internal
        returns (address tokenAddr, address curveAddr)
    {
        // Deploy token via Factory (standard mode)
        (tokenAddr, curveAddr) = factory.createToken(
            "Test",
            "TST",
            creator,
            0 // startTime = now
        );

        // Deploy a new BondingCurve with creator = feeRouter
        // This simulates what createTokenWithPreset() does
        LickToken tok = LickToken(tokenAddr);
        BondingCurve newCurve = new BondingCurve(
            tokenAddr,
            deployer,           // protocolFeeReceiver
            address(feeRouter), // creator = FeeRouter (so 1% fee flows here)
            0,                  // startTime
            address(0)          // graduationRouter (not needed for these tests)
        );

        // Transfer tokens from old curve to new curve
        uint256 curveBalance = tok.balanceOf(curveAddr);
        if (curveBalance > 0) {
            vm.prank(curveAddr);
            tok.transfer(address(newCurve), curveBalance);
        }

        curveAddr = address(newCurve);
    }

    /// @notice Helper: test fee routing for a given preset.
    function _testPresetRouting(
        FeeRouter.Preset preset,
        uint256 expectedCreatorBps,
        uint256 expectedLpBps,
        uint256 expectedBuybackBps
    ) internal {
        (address tokenAddr, address curveAddr) = _createTokenWithFeeRouter();

        // Apply preset
        feeRouter.applyPreset(tokenAddr, creator, preset);

        uint256 buyAmount = 100 ether;
        uint256 beforeCreator = creator.balance;
        uint256 beforeLP = address(vaultLP).balance;
        uint256 beforeBB = address(vaultBB).balance;

        // Buy tokens
        vm.deal(buyer, buyAmount);
        vm.startPrank(buyer);
        BondingCurve(payable(curveAddr)).buy{value: buyAmount}(0);
        vm.stopPrank();

        // Route the creator fee through FeeRouter
        uint256 feeBalance = address(feeRouter).balance;
        if (feeBalance > 0) {
            feeRouter.receiveCreatorFee{value: feeBalance}(tokenAddr);
        }

        // Creator fee = 1% of buyAmount = 1 ether
        uint256 totalFee = buyAmount / 100;
        assertEq(
            creator.balance - beforeCreator,
            (totalFee * expectedCreatorBps) / 10000,
            "creator share"
        );
        assertEq(
            address(vaultLP).balance - beforeLP,
            (totalFee * expectedLpBps) / 10000,
            "LP vault share"
        );
        assertEq(
            address(vaultBB).balance - beforeBB,
            (totalFee * expectedBuybackBps) / 10000,
            "buyback vault share"
        );
    }

    // ─── LIGHT preset: 10% creator / 80% LP / 10% burn ────────────────────────

    function test_LIGHT_preset_routes_fees() public {
        _testPresetRouting(FeeRouter.Preset.LIGHT, 1000, 8000, 1000);
    }

    // ─── STANDARD_A preset: 30% creator / 60% LP / 10% burn ───────────────────

    function test_STANDARD_A_preset_routes_fees() public {
        _testPresetRouting(FeeRouter.Preset.STANDARD_A, 3000, 6000, 1000);
    }

    // ─── STANDARD_B preset: 20% creator / 70% LP / 10% burn ───────────────────

    function test_STANDARD_B_preset_routes_fees() public {
        _testPresetRouting(FeeRouter.Preset.STANDARD_B, 2000, 7000, 1000);
    }

    // ─── ECOSYSTEM preset: 20% creator / 40% LP / 40% burn ────────────────────

    function test_ECOSYSTEM_preset_routes_fees() public {
        _testPresetRouting(FeeRouter.Preset.ECOSYSTEM, 2000, 4000, 4000);
    }

    // ─── DIAMOND with custom config (founder: 0/80/20) ────────────────────────

    function test_DIAMOND_customConfig_founder() public {
        (address tokenAddr, address curveAddr) = _createTokenWithFeeRouter();

        // Apply custom DIAMOND config (founder: 0/80/20)
        FeeRouter.FeeConfig memory config = FeeRouter.FeeConfig({
            creatorShareBps: 0,
            lpSupportBps:    8000,
            buybackBurnBps:  2000,
            giftBps:         0,
            giftRecipient:   address(0),
            creator:         creator,
            initialized:     true
        });
        feeRouter.setCustomConfig(tokenAddr, config);

        uint256 buyAmount = 100 ether;
        uint256 beforeCreator = creator.balance;
        uint256 beforeLP = address(vaultLP).balance;
        uint256 beforeBB = address(vaultBB).balance;

        vm.deal(buyer, buyAmount);
        vm.startPrank(buyer);
        BondingCurve(payable(curveAddr)).buy{value: buyAmount}(0);
        vm.stopPrank();

        uint256 feeBalance = address(feeRouter).balance;
        if (feeBalance > 0) {
            feeRouter.receiveCreatorFee{value: feeBalance}(tokenAddr);
        }

        uint256 totalFee = buyAmount / 100;
        assertEq(creator.balance - beforeCreator, 0, "DIAMOND founder creator 0%");
        assertEq(address(vaultLP).balance - beforeLP, (totalFee * 8000) / 10000, "DIAMOND founder LP 80%");
        assertEq(address(vaultBB).balance - beforeBB, (totalFee * 2000) / 10000, "DIAMOND founder burn 20%");
    }

    // ─── Existing token without FeeRouter still works ─────────────────────────

    function test_existingToken_noFeeRouter_stillWorks() public {
        // Deploy a separate Factory WITHOUT feeRouter
        Factory factoryNoFR = new Factory(deployer);

        (, address curveAddr) = factoryNoFR.createToken(
            "NoFR",
            "NOFR",
            creator,
            0
        );

        uint256 buyAmount = 100 ether;
        uint256 beforeCreator = creator.balance;

        vm.deal(buyer, buyAmount);
        vm.startPrank(buyer);
        BondingCurve(payable(curveAddr)).buy{value: buyAmount}(0);
        vm.stopPrank();

        // Creator receives full 1% directly (no FeeRouter involved)
        uint256 expectedFee = buyAmount / 100; // 1% of 100 ether
        assertEq(creator.balance - beforeCreator, expectedFee, "creator gets full 1% directly");
    }
}