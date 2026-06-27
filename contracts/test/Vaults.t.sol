// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "forge-std/Test.sol";
import "../src/VaultLPSupport.sol";
import "../src/VaultBuybackBurn.sol";

contract VaultsTest is Test {

    VaultLPSupport  vaultLP;
    VaultBuybackBurn vaultBB;

    function setUp() public {
        vaultLP = new VaultLPSupport(address(this));
        vaultBB = new VaultBuybackBurn(address(this));
    }

    // ─── VaultLPSupport ───────────────────────────────────────────────────────

    function test_VaultLPSupport_receives_mon() public {
        vm.deal(address(this), 1 ether);

        vm.expectEmit(true, false, false, true, address(vaultLP));
        emit VaultLPSupport.Deposited(address(this), 1 ether);

        (bool ok,) = address(vaultLP).call{value: 1 ether}("");
        assertTrue(ok, "transfer should succeed");
        assertEq(address(vaultLP).balance, 1 ether, "vault should hold 1 ether");
    }

    // ─── VaultBuybackBurn ─────────────────────────────────────────────────────

    function test_VaultBuybackBurn_receives_mon() public {
        vm.deal(address(this), 2 ether);

        vm.expectEmit(true, false, false, true, address(vaultBB));
        emit VaultBuybackBurn.Deposited(address(this), 2 ether);

        (bool ok,) = address(vaultBB).call{value: 2 ether}("");
        assertTrue(ok, "transfer should succeed");
        assertEq(address(vaultBB).balance, 2 ether, "vault should hold 2 ether");
    }

    // ─── Zero value ───────────────────────────────────────────────────────────

    function test_Vaults_accept_zero_value() public {
        // Should not revert
        (bool ok1,) = address(vaultLP).call{value: 0}("");
        assertTrue(ok1, "VaultLPSupport should accept 0");

        (bool ok2,) = address(vaultBB).call{value: 0}("");
        assertTrue(ok2, "VaultBuybackBurn should accept 0");
    }
}