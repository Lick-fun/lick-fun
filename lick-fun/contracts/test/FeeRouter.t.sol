// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "forge-std/Test.sol";
import "../src/FeeRouter.sol";

contract FeeRouterTest is Test {
    FeeRouter router;
    address graduationPool  = address(0x111);
    address lpVault         = address(0x222);
    address buybackVault    = address(0x333);
    address creator         = address(0xC1);
    address token           = address(0xAA);

    function setUp() public {
        router = new FeeRouter(graduationPool, lpVault, buybackVault);
    }

    // ─── testSetFeeConfig ─────────────────────────────────────────────────────

    function testSetFeeConfig() public {
        FeeRouter.FeeConfig memory config = FeeRouter.FeeConfig({
            creatorShareBps: 8000,
            lpSupportBps: 1000,
            buybackBurnBps: 1000,
            giftBps: 0,
            giftRecipient: address(0),
            creator: creator,
            initialized: true
        });
        router.setFeeConfig(token, config);

        (
            uint256 creatorShareBps,
            uint256 lpSupportBps,
            uint256 buybackBurnBps,
            uint256 giftBps,
            address giftRecipient,
            address storedCreator,
            bool initialized
        ) = router.tokenFeeConfigs(token);

        assertEq(creatorShareBps, 8000);
        assertEq(lpSupportBps, 1000);
        assertEq(buybackBurnBps, 1000);
        assertEq(storedCreator, creator);
        assertTrue(initialized);
    }

    // ─── testReceiveAndRouteCreatorFee ────────────────────────────────────────

    function testReceiveAndRouteCreatorFee() public {
        // Set config: 50% creator, 25% LP, 25% buyback
        FeeRouter.FeeConfig memory config = FeeRouter.FeeConfig({
            creatorShareBps: 5000,
            lpSupportBps: 2500,
            buybackBurnBps: 2500,
            giftBps: 0,
            giftRecipient: address(0),
            creator: creator,
            initialized: true
        });
        router.setFeeConfig(token, config);

        uint256 beforeCreator = creator.balance;
        uint256 beforeLP = lpVault.balance;
        uint256 beforeBuyback = buybackVault.balance;

        vm.deal(address(this), 100 ether);
        router.receiveCreatorFee{value: 100 ether}(token);

        assertEq(creator.balance - beforeCreator, 50 ether);
        assertEq(lpVault.balance - beforeLP, 25 ether);
        assertEq(buybackVault.balance - beforeBuyback, 25 ether);
    }

    // ─── testDefaultPreset ────────────────────────────────────────────────────

    function testDefaultPreset() public {
        router.applyPreset(token, creator, FeeRouter.Preset.DEFAULT);

        (
            uint256 creatorShareBps,
            uint256 lpSupportBps,
            uint256 buybackBurnBps,
            ,,
            address storedCreator,
            bool initialized
        ) = router.tokenFeeConfigs(token);

        assertEq(creatorShareBps, 8000);   // 80%
        assertEq(lpSupportBps, 1000);        // 10%
        assertEq(buybackBurnBps, 1000);      // 10%
        assertEq(storedCreator, creator);
        assertTrue(initialized);

        // Verify fee routing matches preset
        uint256 beforeCreator = creator.balance;
        uint256 beforeLP = lpVault.balance;
        uint256 beforeBuyback = buybackVault.balance;

        vm.deal(address(this), 100 ether);
        router.receiveCreatorFee{value: 100 ether}(token);

        assertEq(creator.balance - beforeCreator, 80 ether);
        assertEq(lpVault.balance - beforeLP, 10 ether);
        assertEq(buybackVault.balance - beforeBuyback, 10 ether);
    }

    // ─── testEcosystemPreset ──────────────────────────────────────────────────

    function testEcosystemPreset() public {
        router.applyPreset(token, creator, FeeRouter.Preset.ECOSYSTEM);

        (
            uint256 creatorShareBps,
            uint256 lpSupportBps,
            uint256 buybackBurnBps,
            ,,
            address storedCreator,
            bool initialized
        ) = router.tokenFeeConfigs(token);

        assertEq(creatorShareBps, 2000);   // 20%
        assertEq(lpSupportBps, 4000);        // 40%
        assertEq(buybackBurnBps, 4000);      // 40%
        assertEq(storedCreator, creator);
        assertTrue(initialized);

        // Verify fee routing matches preset
        uint256 beforeCreator = creator.balance;
        uint256 beforeLP = lpVault.balance;
        uint256 beforeBuyback = buybackVault.balance;

        vm.deal(address(this), 100 ether);
        router.receiveCreatorFee{value: 100 ether}(token);

        assertEq(creator.balance - beforeCreator, 20 ether);
        assertEq(lpVault.balance - beforeLP, 40 ether);
        assertEq(buybackVault.balance - beforeBuyback, 40 ether);
    }

    // ─── testCannotReinitializeFeeConfig ──────────────────────────────────────

    function testCannotReinitializeFeeConfig() public {
        FeeRouter.FeeConfig memory config = FeeRouter.FeeConfig({
            creatorShareBps: 8000,
            lpSupportBps: 1000,
            buybackBurnBps: 1000,
            giftBps: 0,
            giftRecipient: address(0),
            creator: creator,
            initialized: true
        });
        router.setFeeConfig(token, config);

        vm.expectRevert(FeeRouter.AlreadyInitialized.selector);
        router.setFeeConfig(token, config);
    }

    // ─── testInvalidBps ───────────────────────────────────────────────────────

    function testInvalidBps() public {
        FeeRouter.FeeConfig memory config = FeeRouter.FeeConfig({
            creatorShareBps: 9000,
            lpSupportBps: 500,
            buybackBurnBps: 500,
            giftBps: 1, // total = 10001, not 10000
            giftRecipient: address(0),
            creator: creator,
            initialized: true
        });
        vm.expectRevert(FeeRouter.InvalidBps.selector);
        router.setFeeConfig(token, config);
    }
}