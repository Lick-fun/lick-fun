// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Test, console} from "forge-std/Test.sol";
import {ProfileRegistry} from "../src/ProfileRegistry.sol";

contract ProfileRegistryTest is Test {
    ProfileRegistry public registry;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public carol = makeAddr("carol");
    address public anchor = makeAddr("anchor");
    address public stranger = makeAddr("stranger");

    bytes32 public constant TEST_ROOT = keccak256("test-root");

    function setUp() public {
        registry = new ProfileRegistry();
    }

    // ═══════════════════════════════════════════════════════════
    // registerProfile
    // ═══════════════════════════════════════════════════════════

    function testRegisterProfile() public {
        vm.prank(alice);
        uint256 profileId = registry.registerProfile();

        assertEq(profileId, 1);
        assertTrue(registry.profileExists(1));
        assertEq(registry.walletToProfileId(alice), 1);
        assertEq(registry.getProfileId(alice), 1);

        address[] memory wallets = registry.getLinkedWallets(1);
        assertEq(wallets.length, 1);
        assertEq(wallets[0], alice);
    }

    function testCannotRegisterTwice() public {
        vm.prank(alice);
        registry.registerProfile();

        vm.prank(alice);
        vm.expectRevert("Already has a profile");
        registry.registerProfile();
    }

    function testMultipleProfilesGetDifferentIds() public {
        vm.prank(alice);
        uint256 aliceId = registry.registerProfile();

        vm.prank(bob);
        uint256 bobId = registry.registerProfile();

        assertEq(aliceId, 1);
        assertEq(bobId, 2);
        assertEq(registry.getProfileId(alice), 1);
        assertEq(registry.getProfileId(bob), 2);
    }

    // ═══════════════════════════════════════════════════════════
    // linkWallet
    // ═══════════════════════════════════════════════════════════

    function testLinkWallet() public {
        vm.prank(alice);
        registry.registerProfile();

        vm.deal(bob, 1 ether);
        vm.prank(bob);
        registry.linkWallet{value: 0.1 ether}(1);

        assertEq(registry.walletToProfileId(bob), 1);
        assertEq(registry.getProfileId(bob), 1);
        assertEq(registry.profileMonStaked(1), 0.1 ether);

        address[] memory wallets = registry.getLinkedWallets(1);
        assertEq(wallets.length, 2);
        assertEq(wallets[0], alice);
        assertEq(wallets[1], bob);
    }

    function testLinkWalletRevertsIfAlreadyLinked() public {
        vm.prank(alice);
        registry.registerProfile();

        vm.deal(bob, 1 ether);
        vm.prank(bob);
        registry.linkWallet{value: 0.1 ether}(1);

        vm.prank(bob);
        vm.expectRevert("Already linked to a profile");
        registry.linkWallet{value: 0.1 ether}(1);
    }

    function testLinkWalletRevertsIfProfileNotFound() public {
        vm.deal(bob, 1 ether);
        vm.prank(bob);
        vm.expectRevert("Profile does not exist");
        registry.linkWallet{value: 0.1 ether}(999);
    }

    function testLinkWalletRevertsIfInsufficientBond() public {
        vm.prank(alice);
        registry.registerProfile();

        vm.deal(bob, 1 ether);
        vm.prank(bob);
        vm.expectRevert("Insufficient bond");
        registry.linkWallet{value: 0.05 ether}(1);
    }

    function testLinkWalletCanPayMoreThanBond() public {
        vm.prank(alice);
        registry.registerProfile();

        vm.deal(bob, 1 ether);
        vm.prank(bob);
        registry.linkWallet{value: 0.5 ether}(1);

        assertEq(registry.profileMonStaked(1), 0.5 ether);
        assertEq(registry.getProfileId(bob), 1);
    }

    function testLinkWalletRevertsIfAlreadyOnProfile() public {
        vm.deal(alice, 1 ether);

        vm.prank(alice);
        registry.registerProfile();

        vm.prank(alice);
        vm.expectRevert("Already linked to a profile");
        registry.linkWallet{value: 0.1 ether}(1);
    }

    // ═══════════════════════════════════════════════════════════
    // unlinkWallet
    // ═══════════════════════════════════════════════════════════

    function testUnlinkWalletRefundsBond() public {
        vm.prank(alice);
        registry.registerProfile();

        vm.deal(bob, 1 ether);
        vm.prank(bob);
        registry.linkWallet{value: 0.1 ether}(1);

        uint256 balanceBefore = bob.balance;

        vm.prank(bob);
        registry.unlinkWallet(1);

        uint256 balanceAfter = bob.balance;
        assertEq(balanceAfter, balanceBefore + 0.1 ether);
        assertEq(registry.walletToProfileId(bob), 0);
        assertEq(registry.getProfileId(bob), 0);
        assertEq(registry.profileMonStaked(1), 0);

        address[] memory wallets = registry.getLinkedWallets(1);
        assertEq(wallets.length, 1);
        assertEq(wallets[0], alice);
    }

    function testUnlinkWalletRevertsIfNotLinked() public {
        vm.prank(alice);
        registry.registerProfile();

        vm.prank(bob);
        vm.expectRevert("Not linked to this profile");
        registry.unlinkWallet(1);
    }

    function testUnlinkWalletRevertsIfWrongProfile() public {
        vm.prank(alice);
        registry.registerProfile();

        vm.deal(bob, 1 ether);
        vm.prank(bob);
        registry.linkWallet{value: 0.1 ether}(1);

        vm.prank(bob);
        vm.expectRevert("Not linked to this profile");
        registry.unlinkWallet(2);
    }

    function testUnlinkWalletMaintainsArrayOrder() public {
        // Link alice, bob, carol then unlink bob — verify array integrity
        vm.prank(alice);
        registry.registerProfile();

        vm.deal(bob, 1 ether);
        vm.prank(bob);
        registry.linkWallet{value: 0.1 ether}(1);

        vm.deal(carol, 1 ether);
        vm.prank(carol);
        registry.linkWallet{value: 0.1 ether}(1);

        // Unlink bob (middle element)
        vm.prank(bob);
        registry.unlinkWallet(1);

        address[] memory wallets = registry.getLinkedWallets(1);
        assertEq(wallets.length, 2);

        // After swap-and-pop, bob is replaced by carol, then popped
        // So remaining should be alice and carol (order may vary)
        bool foundAlice;
        bool foundCarol;
        bool foundBob;
        for (uint256 i = 0; i < wallets.length; i++) {
            if (wallets[i] == alice) foundAlice = true;
            if (wallets[i] == carol) foundCarol = true;
            if (wallets[i] == bob) foundBob = true;
        }
        assertTrue(foundAlice);
        assertTrue(foundCarol);
        assertFalse(foundBob);
    }

    // ═══════════════════════════════════════════════════════════
    // setMerkleRoot
    // ═══════════════════════════════════════════════════════════

    function testSetMerkleRoot() public {
        vm.warp(1_000_000);

        vm.prank(registry.merkleAnchor());
        registry.setMerkleRoot(TEST_ROOT);

        assertEq(registry.dailyMerkleRoot(), TEST_ROOT);
        assertEq(registry.lastAnchorTimestamp(), 1_000_000);
    }

    function testOnlyMerkleAnchorCanSetRoot() public {
        vm.prank(stranger);
        vm.expectRevert("Only merkle anchor");
        registry.setMerkleRoot(TEST_ROOT);
    }

    function testSetMerkleRootEmitsEvent() public {
        vm.prank(registry.merkleAnchor());
        vm.expectEmit(true, true, false, false);
        emit ProfileRegistry.MerkleRootAnchored(TEST_ROOT, block.timestamp);
        registry.setMerkleRoot(TEST_ROOT);
    }

    // ═══════════════════════════════════════════════════════════
    // Queries
    // ═══════════════════════════════════════════════════════════

    function testGetLinkedWallets() public {
        vm.prank(alice);
        registry.registerProfile();

        vm.deal(bob, 1 ether);
        vm.prank(bob);
        registry.linkWallet{value: 0.1 ether}(1);

        vm.deal(carol, 1 ether);
        vm.prank(carol);
        registry.linkWallet{value: 0.1 ether}(1);

        address[] memory wallets = registry.getLinkedWallets(1);
        assertEq(wallets.length, 3);
        assertEq(wallets[0], alice);
        assertEq(wallets[1], bob);
        assertEq(wallets[2], carol);
    }

    function testGetLinkedWalletsEmptyProfile() public {
        address[] memory wallets = registry.getLinkedWallets(1);
        assertEq(wallets.length, 0);
    }

    function testProfileQueries() public {
        vm.prank(alice);
        registry.registerProfile();

        vm.deal(bob, 1 ether);
        vm.prank(bob);
        registry.linkWallet{value: 0.1 ether}(1);

        assertEq(registry.getProfileId(alice), 1);
        assertEq(registry.getProfileId(bob), 1);
        assertEq(registry.getProfileId(carol), 0);
        assertEq(registry.getProfileId(stranger), 0);
    }

    // ═══════════════════════════════════════════════════════════
    // Events
    // ═══════════════════════════════════════════════════════════

    function testProfileCreatedEvent() public {
        vm.prank(alice);
        vm.expectEmit(true, true, false, false);
        emit ProfileRegistry.ProfileCreated(1, alice);
        registry.registerProfile();
    }

    function testWalletLinkedEvent() public {
        vm.prank(alice);
        registry.registerProfile();

        vm.deal(bob, 1 ether);
        vm.prank(bob);
        vm.expectEmit(true, true, false, true);
        emit ProfileRegistry.WalletLinked(1, bob, 0.1 ether);
        registry.linkWallet{value: 0.1 ether}(1);
    }

    function testWalletUnlinkedEvent() public {
        vm.prank(alice);
        registry.registerProfile();

        vm.deal(bob, 1 ether);
        vm.prank(bob);
        registry.linkWallet{value: 0.1 ether}(1);

        vm.prank(bob);
        vm.expectEmit(true, true, false, false);
        emit ProfileRegistry.WalletUnlinked(1, bob);
        registry.unlinkWallet(1);
    }
}