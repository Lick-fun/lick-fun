// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "forge-std/Test.sol";
import "../src/VaultLPSupport.sol";
import "../src/VaultBuybackBurn.sol";

contract VaultsTest is Test {

    VaultLPSupport  vaultLP;
    VaultBuybackBurn vaultBB;

    address constant DUMMY_ROUTER = address(0x1111);
    address constant DUMMY_WMON   = address(0x2222);
    address constant DUMMY_FACTORY = address(0x3333);
    address constant DUMMY_GRAD    = address(0x4444);

    function setUp() public {
        vaultLP = new VaultLPSupport(address(this), DUMMY_ROUTER, DUMMY_WMON, DUMMY_GRAD);
        vaultBB = new VaultBuybackBurn(address(this), DUMMY_ROUTER, DUMMY_FACTORY, DUMMY_GRAD);
    }

    // ─── VaultLPSupport ───────────────────────────────────────────────────────

    function test_VaultLPSupport_receives_mon() public {
        vm.deal(address(this), 1 ether);
        address token = makeAddr("token");

        vm.expectEmit(true, true, false, true, address(vaultLP));
        emit VaultLPSupport.Deposited(token, address(this), 1 ether);

        vaultLP.receiveForToken{value: 1 ether}(token);
        assertEq(address(vaultLP).balance, 1 ether, "vault should hold 1 ether");
        assertEq(vaultLP.pendingLP(token), 1 ether, "pendingLP should be 1 ether");
    }

    // ─── VaultBuybackBurn ─────────────────────────────────────────────────────

    function test_VaultBuybackBurn_receives_mon() public {
        vm.deal(address(this), 2 ether);
        address token = makeAddr("token");

        vm.expectEmit(true, true, false, true, address(vaultBB));
        emit VaultBuybackBurn.Deposited(token, address(this), 2 ether);

        vaultBB.receiveForToken{value: 2 ether}(token);
        assertEq(address(vaultBB).balance, 2 ether, "vault should hold 2 ether");
        assertEq(vaultBB.pendingBurn(token), 2 ether, "pendingBurn should be 2 ether");
    }

    // ─── Zero value ───────────────────────────────────────────────────────────

    function test_Vaults_accept_zero_value() public {
        // Should not revert for raw receive()
        (bool ok1,) = address(vaultLP).call{value: 0}("");
        assertTrue(ok1, "VaultLPSupport should accept 0");

        (bool ok2,) = address(vaultBB).call{value: 0}("");
        assertTrue(ok2, "VaultBuybackBurn should accept 0");
    }

    // ─── Below threshold ──────────────────────────────────────────────────────

    function test_BuybackBurn_execute_reverts_below_threshold() public {
        vm.deal(address(this), 1 ether);
        address token = makeAddr("token");

        vaultBB.receiveForToken{value: 1 ether}(token);

        vm.expectRevert(VaultBuybackBurn.BelowThreshold.selector);
        vaultBB.execute(token);
    }

    function test_LPSupport_execute_reverts_below_threshold() public {
        vm.deal(address(this), 1 ether);
        address token = makeAddr("token");

        vaultLP.receiveForToken{value: 1 ether}(token);

        vm.expectRevert(VaultLPSupport.BelowThreshold.selector);
        vaultLP.execute(token);
    }

    // ─── Sweep ────────────────────────────────────────────────────────────────

    function test_Vault_sweep() public {
        vm.deal(address(this), 5 ether);
        address token = makeAddr("token");
        vaultBB.receiveForToken{value: 5 ether}(token);

        address receiver = makeAddr("receiver");
        vaultBB.sweep(receiver, 5 ether);
        assertEq(receiver.balance, 5 ether);
    }
}