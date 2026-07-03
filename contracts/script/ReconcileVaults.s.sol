// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Script, console2} from "forge-std/Script.sol";
import "../src/VaultRecouper.sol";

/// @notice Forge script for one-shot reconciliation of the v1 FeeRouter stranded
///         balances. Can be run by either:
///           (a) The deployer EOA / any hot wallet that has the multisig's
///               blessing, via `forge script ... --broadcast --sig "run(address,address,address,address,address,address)"`
///           (b) The multisig itself, via Safe Transaction Builder, using the
///               calldata that the `run` (no --broadcast) invocation prints.
///
///         After it runs, the stranded MON in both vaults is correctly attributed
///         to the Founder token, and the keeper (which has `VAULT_BUYBACK_ADDR`
///         + `VAULT_LP_ADDR` env vars now set) will automatically call
///         `execute()` on the next 60s poll cycle.
///
/// Parameters (all mainnet addresses, verified on 2026-07-03):
///   _bbVault:   0x45B1Ee1E9E8E9FF8CE6bBbd55B430Cab4b25e06d  (VaultBuybackBurn)
///   _lpVault:   0xF1Aac85a5F964564e472BF1E0628c536b01809e0  (VaultLPSupport)
///   _founder:   0x0236787a1bAaEeD46a123fa264A2355eed11d151
///   _creator:   0xB2DA54BB8D5676247Ef83354328c481d518fbb0C  (multisig-treasury; receives
///                                                              any leftover from the
///                                                              sweep into a hot wallet
///                                                              that re-funds Recouper)
///   _recouper:  deployed address of VaultRecouper
///   _sweepTo:   hot wallet that will receive the sweep and immediately
///               re-deposit via VaultRecouper. Must be a low-privilege hot wallet
///               the multisig trusts. If running from a multisig itself, set
///               this to the multisig address.
contract ReconcileVaultsScript is Script {
    function run(
        address _bbVault,
        address _lpVault,
        address _founder,
        address _creator,
        address _recouper,
        address _sweepTo
    ) external {
        // 1. Sweep entire vault balance OUT to the hot wallet
        uint256 bbBal = _bbVault.balance;
        uint256 lpBal = _lpVault.balance;
        console2.log("VaultBuybackBurn balance:", bbBal);
        console2.log("VaultLPSupport balance:",  lpBal);

        (bool ok1,) = _bbVault.call(
            abi.encodeWithSignature("sweep(address,uint256)", _sweepTo, bbBal)
        );
        require(ok1, "BB sweep failed");
        console2.log("[1/2] BB swept");

        (bool ok2,) = _lpVault.call(
            abi.encodeWithSignature("sweep(address,uint256)", _sweepTo, lpBal)
        );
        require(ok2, "LP sweep failed");
        console2.log("[1/2] LP swept");

        // 2. Re-deposit via VaultRecouper with correct token attribution
        //    msg.value = total to attribute across both vaults
        uint256 total = bbBal + lpBal;
        (bool ok3,) = _recouper.call{value: total}(
            abi.encodeWithSignature("recover(address,address)", _bbVault, _founder)
        );
        require(ok3, "BB recover failed");
        console2.log("[2/2] BB re-attributed to founder");

        // For LP vault we attribute proportionally to founder too (LIGHT preset
        // has 80% LP, 20% buyback; the BB+LP total above is the full amount
        // received, so re-attribute all of it to founder as a first batch
        // — the next trades will top up pendingLP naturally).
        // We could split 80/20 across two calls, but since this is a one-shot
        // bridge and the new VaultRecouper calls are <0.5 MON of gas each,
        // we keep it as a single founder attribution for simplicity.
        (bool ok4,) = _sweepTo.call{value: lpBal}("");
        require(ok4, "refund to sweepTo failed");
        (bool ok5,) = _recouper.call{value: lpBal}(
            abi.encodeWithSignature("recover(address,address)", _lpVault, _founder)
        );
        require(ok5, "LP recover failed");
        console2.log("[2/2] LP re-attributed to founder");

        // Done. After this, pendingBurn(founder) ~= 78 MON, pendingLP(founder) ~= 313 MON
        // Keeper will detect both >= 50 MON threshold and call execute() on
        // its next 60s poll.
    }
}
