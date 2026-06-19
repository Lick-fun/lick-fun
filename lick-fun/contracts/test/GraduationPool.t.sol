// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "forge-std/Test.sol";
import "../src/GraduationPool.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract GraduationPoolTest is Test {
    GraduationPool pool;
    address reporter = address(0xF1);
    address creator  = address(0xC1);
    address funder   = address(0xFF);

    function setUp() public {
        pool = new GraduationPool(reporter);
    }

    // ─── testFundPool ─────────────────────────────────────────────────────────

    function testFundPool() public {
        vm.deal(funder, 100 ether);
        vm.prank(funder);
        pool.fund{value: 50 ether}();

        assertEq(pool.totalPool(), 50 ether);
    }

    function testFundPoolViaReceive() public {
        vm.deal(funder, 100 ether);
        vm.prank(funder);
        (bool ok, ) = address(pool).call{value: 30 ether}("");
        assertTrue(ok);

        assertEq(pool.totalPool(), 30 ether);
    }

    // ─── testClaimDeploySubsidy ───────────────────────────────────────────────

    function testClaimDeploySubsidy() public {
        // Fund pool
        vm.deal(funder, 100 ether);
        vm.prank(funder);
        pool.fund{value: 50 ether}();

        // Set reputation for creator
        vm.prank(reporter);
        pool.setReputation(creator, 50);

        // Claim deploy subsidy
        uint256 before = creator.balance;
        vm.prank(creator);
        pool.claimDeploySubsidy();

        assertEq(creator.balance - before, pool.DEPLOY_FEE());
        assertEq(pool.totalPool(), 50 ether - pool.DEPLOY_FEE());
        assertEq(pool.deploySubsidiesClaimed(creator), pool.DEPLOY_FEE());
    }

    // ─── testClaimGraduationSubsidy ───────────────────────────────────────────

    function testClaimGraduationSubsidy() public {
        // Fund pool
        vm.deal(funder, 100 ether);
        vm.prank(funder);
        pool.fund{value: 50 ether}();

        // Set reputation for creator
        vm.prank(reporter);
        pool.setReputation(creator, 35);

        // Claim graduation subsidy
        uint256 before = creator.balance;
        vm.prank(creator);
        pool.claimGraduationSubsidy();

        assertEq(creator.balance - before, pool.GRADUATION_FEE());
        assertEq(pool.graduationSubsidiesClaimed(creator), pool.GRADUATION_FEE());
    }

    // ─── testCannotClaimBelowMinReputation ────────────────────────────────────

    function testCannotClaimBelowMinReputation() public {
        // Fund pool
        vm.deal(funder, 100 ether);
        vm.prank(funder);
        pool.fund{value: 50 ether}();

        // Set reputation below minimum
        vm.prank(reporter);
        pool.setReputation(creator, 20); // MIN_REPUTATION = 30

        vm.prank(creator);
        vm.expectRevert(GraduationPool.InsufficientReputation.selector);
        pool.claimDeploySubsidy();
    }

    function testCannotClaimWithoutReputation() public {
        vm.deal(funder, 100 ether);
        vm.prank(funder);
        pool.fund{value: 50 ether}();

        vm.prank(creator);
        vm.expectRevert(GraduationPool.InsufficientReputation.selector);
        pool.claimDeploySubsidy();
    }

    // ─── testAlreadyClaimed ───────────────────────────────────────────────────

    function testCannotDoubleClaimDeploy() public {
        vm.deal(funder, 100 ether);
        vm.prank(funder);
        pool.fund{value: 50 ether}();

        vm.prank(reporter);
        pool.setReputation(creator, 50);

        vm.prank(creator);
        pool.claimDeploySubsidy();

        vm.expectRevert(GraduationPool.AlreadyClaimed.selector);
        vm.prank(creator);
        pool.claimDeploySubsidy();
    }

    // ─── testMerkleProofVerification ──────────────────────────────────────────

    function testMerkleProofVerification() public {
        vm.deal(funder, 100 ether);
        vm.prank(funder);
        pool.fund{value: 50 ether}();

        // Build a Merkle tree with a single leaf: keccak256(abi.encodePacked(creator, 50))
        // Merkle root = leaf (single node)
        bytes32 leaf = keccak256(abi.encodePacked(creator, uint256(50)));
        bytes32 root = leaf;

        vm.prank(reporter);
        pool.setMerkleRoot(root);

        // Claim with valid proof (empty proof for single leaf)
        bytes32[] memory proof = new bytes32[](0);
        uint256 before = creator.balance;
        vm.prank(creator);
        pool.claimDeploySubsidyWithProof(proof, 50);

        assertEq(creator.balance - before, pool.DEPLOY_FEE());
        assertEq(pool.deploySubsidiesClaimed(creator), pool.DEPLOY_FEE());
    }

    function testMerkleProofVerificationGraduation() public {
        vm.deal(funder, 100 ether);
        vm.prank(funder);
        pool.fund{value: 50 ether}();

        bytes32 leaf = keccak256(abi.encodePacked(creator, uint256(40)));
        bytes32 root = leaf;

        vm.prank(reporter);
        pool.setMerkleRoot(root);

        bytes32[] memory proof = new bytes32[](0);
        uint256 before = creator.balance;
        vm.prank(creator);
        pool.claimGraduationSubsidyWithProof(proof, 40);

        assertEq(creator.balance - before, pool.GRADUATION_FEE());
    }

    function testMerkleProofInvalidScore() public {
        vm.deal(funder, 100 ether);
        vm.prank(funder);
        pool.fund{value: 50 ether}();

        bytes32 leaf = keccak256(abi.encodePacked(creator, uint256(50)));
        bytes32 root = leaf;

        vm.prank(reporter);
        pool.setMerkleRoot(root);

        bytes32[] memory proof = new bytes32[](0);
        vm.prank(creator);
        // Use score 25 (below MIN_REPUTATION) — should fail
        vm.expectRevert(GraduationPool.InsufficientReputation.selector);
        pool.claimDeploySubsidyWithProof(proof, 25);
    }

    function testMerkleProofInvalidProof() public {
        vm.deal(funder, 100 ether);
        vm.prank(funder);
        pool.fund{value: 50 ether}();

        // Build a tree with a different leaf
        bytes32 differentLeaf = keccak256(abi.encodePacked(address(0xBAD), uint256(50)));
        bytes32 root = differentLeaf;

        vm.prank(reporter);
        pool.setMerkleRoot(root);

        bytes32[] memory proof = new bytes32[](0);
        vm.prank(creator);
        // Claim with score 50 but root doesn't match creator's leaf
        vm.expectRevert(GraduationPool.InvalidProof.selector);
        pool.claimDeploySubsidyWithProof(proof, 50);
    }

    // ─── testInsufficientPool ─────────────────────────────────────────────────

    function testCannotClaimWhenPoolEmpty() public {
        vm.prank(reporter);
        pool.setReputation(creator, 50);

        vm.prank(creator);
        vm.expectRevert(GraduationPool.InsufficientPool.selector);
        pool.claimDeploySubsidy();
    }

    // ─── testOnlyReporterCanSetReputation ─────────────────────────────────────

    function testOnlyReporterCanSetReputation() public {
        vm.prank(creator);
        vm.expectRevert(GraduationPool.NotReporter.selector);
        pool.setReputation(creator, 50);
    }

    function testOnlyReporterCanSetMerkleRoot() public {
        vm.prank(creator);
        vm.expectRevert(GraduationPool.NotReporter.selector);
        pool.setMerkleRoot(bytes32(0));
    }
}