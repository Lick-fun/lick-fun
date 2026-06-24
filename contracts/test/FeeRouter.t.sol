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

    // ─── NEW PHASE 2 TESTS ───────────────────────────────────────────────────

    function test_LightPreset_routes_correctly() public {
        router.applyPreset(token, creator, FeeRouter.Preset.LIGHT);

        (uint256 creatorBps, uint256 lpBps, uint256 buybackBps,,,,) = router.tokenFeeConfigs(token);
        assertEq(creatorBps, 1000,  "LIGHT creator bps");
        assertEq(lpBps,      8000,  "LIGHT lp bps");
        assertEq(buybackBps, 1000,  "LIGHT buyback bps");

        uint256 beforeCreator  = creator.balance;
        uint256 beforeLP       = lpVault.balance;
        uint256 beforeBuyback  = buybackVault.balance;

        vm.deal(address(this), 100 ether);
        router.receiveCreatorFee{value: 100 ether}(token);

        assertEq(creator.balance     - beforeCreator,  10 ether, "LIGHT creator 10%");
        assertEq(lpVault.balance     - beforeLP,        80 ether, "LIGHT lp 80%");
        assertEq(buybackVault.balance - beforeBuyback,  10 ether, "LIGHT buyback 10%");
    }

    function test_StandardA_routes_correctly() public {
        router.applyPreset(token, creator, FeeRouter.Preset.STANDARD_A);

        uint256 beforeCreator  = creator.balance;
        uint256 beforeLP       = lpVault.balance;
        uint256 beforeBuyback  = buybackVault.balance;

        vm.deal(address(this), 100 ether);
        router.receiveCreatorFee{value: 100 ether}(token);

        assertEq(creator.balance     - beforeCreator,  30 ether, "STANDARD_A creator 30%");
        assertEq(lpVault.balance     - beforeLP,        60 ether, "STANDARD_A lp 60%");
        assertEq(buybackVault.balance - beforeBuyback,  10 ether, "STANDARD_A buyback 10%");
    }

    function test_StandardB_routes_correctly() public {
        router.applyPreset(token, creator, FeeRouter.Preset.STANDARD_B);

        uint256 beforeCreator  = creator.balance;
        uint256 beforeLP       = lpVault.balance;
        uint256 beforeBuyback  = buybackVault.balance;

        vm.deal(address(this), 100 ether);
        router.receiveCreatorFee{value: 100 ether}(token);

        assertEq(creator.balance     - beforeCreator,  20 ether, "STANDARD_B creator 20%");
        assertEq(lpVault.balance     - beforeLP,        70 ether, "STANDARD_B lp 70%");
        assertEq(buybackVault.balance - beforeBuyback,  10 ether, "STANDARD_B buyback 10%");
    }

    function test_Diamond_customConfig_founder() public {
        // Founder config: 0% creator / 80% LP / 20% burn
        FeeRouter.FeeConfig memory config = FeeRouter.FeeConfig({
            creatorShareBps: 0,
            lpSupportBps:    8000,
            buybackBurnBps:  2000,
            giftBps:         0,
            giftRecipient:   address(0),
            creator:         creator,
            initialized:     true
        });
        router.setCustomConfig(token, config);

        uint256 beforeLP      = lpVault.balance;
        uint256 beforeBuyback = buybackVault.balance;

        vm.deal(address(this), 100 ether);
        router.receiveCreatorFee{value: 100 ether}(token);

        assertEq(lpVault.balance     - beforeLP,       80 ether, "Diamond LP 80%");
        assertEq(buybackVault.balance - beforeBuyback, 20 ether, "Diamond buyback 20%");
    }

    function test_Diamond_customConfig_no_floor() public {
        // 0% creator / 79% LP / 21% burn — LP below 80% used to revert, now allowed
        FeeRouter.FeeConfig memory config = FeeRouter.FeeConfig({
            creatorShareBps: 0,
            lpSupportBps:    7900,
            buybackBurnBps:  2100,
            giftBps:         0,
            giftRecipient:   address(0),
            creator:         creator,
            initialized:     true
        });
        router.setCustomConfig(token, config);

        (uint256 creatorBps, uint256 lpBps, uint256 buybackBps,,,,) = router.tokenFeeConfigs(token);
        assertEq(creatorBps, 0,    "Diamond custom creator 0%");
        assertEq(lpBps,      7900, "Diamond custom LP 79% (no floor)");
        assertEq(buybackBps, 2100, "Diamond custom burn 21%");
    }

    function test_Diamond_customConfig_reverts_invalid_sum() public {
        // bps don't sum to 10000
        FeeRouter.FeeConfig memory config = FeeRouter.FeeConfig({
            creatorShareBps: 0,
            lpSupportBps:    8000,
            buybackBurnBps:  1999, // sum = 9999
            giftBps:         0,
            giftRecipient:   address(0),
            creator:         creator,
            initialized:     true
        });
        vm.expectRevert(FeeRouter.InvalidBps.selector);
        router.setCustomConfig(token, config);
    }

    function test_Ecosystem_preset_unchanged() public {
        router.applyPreset(token, creator, FeeRouter.Preset.ECOSYSTEM);

        (uint256 creatorBps, uint256 lpBps, uint256 buybackBps,,,,) = router.tokenFeeConfigs(token);
        assertEq(creatorBps, 2000, "ECOSYSTEM creator bps");
        assertEq(lpBps,      4000, "ECOSYSTEM lp bps");
        assertEq(buybackBps, 4000, "ECOSYSTEM buyback bps");

        uint256 beforeCreator  = creator.balance;
        uint256 beforeLP       = lpVault.balance;
        uint256 beforeBuyback  = buybackVault.balance;

        vm.deal(address(this), 100 ether);
        router.receiveCreatorFee{value: 100 ether}(token);

        assertEq(creator.balance     - beforeCreator,  20 ether, "ECOSYSTEM creator 20%");
        assertEq(lpVault.balance     - beforeLP,        40 ether, "ECOSYSTEM lp 40%");
        assertEq(buybackVault.balance - beforeBuyback,  40 ether, "ECOSYSTEM buyback 40%");
    }

    // ─── FIX 3: Failure-tolerant fee routing ─────────────────────────────────

    function test_revertingCreator_doesNotBrickRouting() public {
        // Deploy a reverting receiver as the "creator"
        RevertingReceiver badCreator = new RevertingReceiver();
        address tokenB = address(0xBB);

        router.applyPreset(tokenB, address(badCreator), FeeRouter.Preset.STANDARD_A);

        // Should NOT revert even though creator will reject push
        vm.deal(address(this), 100 ether);
        router.receiveCreatorFee{value: 100 ether}(tokenB); // must not revert

        // Creator's 30% should be accrued in pendingWithdrawals
        assertEq(router.pendingWithdrawals(address(badCreator)), 30 ether, "pending for bad creator");
        // LP vault should still get its 60%
        assertEq(lpVault.balance, 60 ether, "lp vault still receives");
    }

    function test_pendingWithdrawal_canBeWithdrawn() public {
        RevertingReceiver badCreator = new RevertingReceiver();
        address tokenB = address(0xBB);
        router.applyPreset(tokenB, address(badCreator), FeeRouter.Preset.DEFAULT);

        vm.deal(address(this), 100 ether);
        router.receiveCreatorFee{value: 100 ether}(tokenB);
        // 80% should be pending for bad creator
        assertEq(router.pendingWithdrawals(address(badCreator)), 80 ether);

        // badCreator fixes itself and withdraws
        badCreator.setAcceptEth(true);
        vm.prank(address(badCreator));
        router.withdraw();
        assertEq(router.pendingWithdrawals(address(badCreator)), 0);
    }

    // ─── FIX 5: Dust sweep ────────────────────────────────────────────────────

    function test_dustSweptToLpVault() public {
        // Use a custom config where rounding will produce dust
        // 3 wei input: creator=0%, lp=80%, buyback=20%
        // With 3 wei: lpShare = floor(3 * 8000/10000) = 2, buybackShare = 0, sum=2, dust=1 → lp gets 3 total
        FeeRouter.FeeConfig memory config = FeeRouter.FeeConfig({
            creatorShareBps: 0,
            lpSupportBps: 8000,
            buybackBurnBps: 2000,
            giftBps: 0,
            giftRecipient: address(0),
            creator: creator,
            initialized: true
        });
        router.setCustomConfig(token, config);

        uint256 beforeLP = lpVault.balance;
        router.receiveCreatorFee{value: 3}(token);
        // dust (1 wei) should go to lp vault: lpShare=2 + dust=1 = 3
        assertEq(lpVault.balance - beforeLP, 3, "dust swept to lp vault");
    }

    // ─── UseCustomConfig error for DIAMOND via applyPreset ─────────────────────

    function test_Diamond_applyPreset_reverts_UseCustomConfig() public {
        vm.expectRevert(FeeRouter.UseCustomConfig.selector);
        router.applyPreset(token, creator, FeeRouter.Preset.DIAMOND);
    }
}

/// @notice Helper contract that can be toggled to revert on receive.
contract RevertingReceiver {
    bool public acceptEth;
    function setAcceptEth(bool v) external { acceptEth = v; }
    receive() external payable {
        require(acceptEth, "REJECT");
    }
}