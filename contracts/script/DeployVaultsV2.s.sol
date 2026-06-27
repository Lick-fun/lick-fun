// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import "forge-std/Script.sol";
import "../src/VaultLPSupport.sol";
import "../src/VaultBuybackBurn.sol";
import "../src/FeeRouter.sol";

/**
 * @title DeployVaultsV2
 * @notice STEP 1 of 2 — deploys the new vault contracts using the deployer EOA.
 *
 * The deployer EOA (0xB2DA54BB...) deploys both vault contracts.
 * Vault ownership is set to the Safe multisig (0x9F3fDE2C...).
 *
 * STEP 2 (Safe multisig) must be done separately via the Safe UI:
 *   a) Sweep old vaults (see calldata printed below)
 *   b) Call FeeRouter.setVaults(newLP, newBB) (see calldata printed below)
 *
 * Current state before running:
 *   Old VaultLPSupport:   0x69240beca90d25e2D50ca443D8ECaaAB69cCe183  (13.92 MON)
 *   Old VaultBuybackBurn: 0xe64d7d3E2d714f23B38bc00E1c185875C2b4D1D1  (3.48 MON)
 *
 * Usage:
 *   cd contracts
 *   forge script script/DeployVaultsV2.s.sol:DeployVaultsV2 \
 *     --rpc-url https://rpc.monad.xyz \
 *     --broadcast \
 *     --legacy
 */
contract DeployVaultsV2 is Script {

    // ─── Known mainnet addresses ───────────────────────────────────────────
    address constant WMON_MAINNET         = 0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A;
    address constant FEE_ROUTER           = 0x5BBe528936E627d33DE36f10d9DB946089b9E903;
    address constant LICK_ROUTER          = 0xD0cC6C69162eb0635A7d423aEb2086F1821cA844;
    address constant FACTORY              = 0x9845c5625d9f9C48e17956940485aAAAD168aA10;
    address constant GRADUATION_ROUTER    = 0xb2Dc164Ac4eCDDA7Ea2D4115bC122463c65460b2;
    address constant MULTISIG             = 0x9F3fDE2C42BA3B00110fC4dc3365782dFE2743fA;
    address constant OLD_VAULT_LP         = 0x69240beca90d25e2D50ca443D8ECaaAB69cCe183;
    address constant OLD_VAULT_BB         = 0xe64d7d3E2d714f23B38bc00E1c185875C2b4D1D1;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=== DeployVaultsV2 (Step 1 of 2) ===");
        console.log("Deployer (EOA):  ", deployer);
        console.log("Multisig (owner):", MULTISIG);
        console.log("FeeRouter:       ", FEE_ROUTER);
        console.log("LickRouter:      ", LICK_ROUTER);
        console.log("WMON:            ", WMON_MAINNET);

        vm.startBroadcast(deployerPrivateKey);

        // ── 1. Deploy VaultBuybackBurn v2 (owner = multisig) ─────────────────
        VaultBuybackBurn vaultBB = new VaultBuybackBurn(MULTISIG, LICK_ROUTER, FACTORY, GRADUATION_ROUTER);
        console.log("VaultBuybackBurn v2:", address(vaultBB));

        // ── 2. Deploy VaultLPSupport v2 (owner = multisig) ───────────────────
        VaultLPSupport vaultLP = new VaultLPSupport(MULTISIG, LICK_ROUTER, WMON_MAINNET, GRADUATION_ROUTER);
        console.log("VaultLPSupport v2:  ", address(vaultLP));

        vm.stopBroadcast();

        // ── 3. Print Safe transaction calldata for Step 2 ────────────────────
        console.log("");
        console.log("=== STEP 2: Safe Multisig Transactions (submit via safe.global) ===");
        console.log("");
        console.log("-- Tx A: Sweep old VaultLPSupport (13.92 MON) --");
        console.log("  To:   ", OLD_VAULT_LP);
        console.log("  Data: ", vm.toString(abi.encodeWithSignature("sweep(address,uint256)", MULTISIG, 13920000000000000000)));
        console.log("");
        console.log("-- Tx B: Sweep old VaultBuybackBurn (3.48 MON) --");
        console.log("  To:   ", OLD_VAULT_BB);
        console.log("  Data: ", vm.toString(abi.encodeWithSignature("sweep(address,uint256)", MULTISIG, 3480000000000000000)));
        console.log("");
        console.log("-- Tx C: Wire new vaults into FeeRouter --");
        console.log("  To:   ", FEE_ROUTER);
        console.log("  Data: ", vm.toString(abi.encodeWithSignature("setVaults(address,address)", address(vaultLP), address(vaultBB))));
        console.log("");
        console.log("=== POST-DEPLOY: Update config files ===");
        console.log("indexer/config.yaml  VaultBuybackBurn address:", address(vaultBB));
        console.log("indexer/config.yaml  VaultLPSupport   address:", address(vaultLP));
        console.log("script/.env          VAULT_BUYBACK_ADDR=", address(vaultBB));
        console.log("script/.env          VAULT_LP_ADDR=    ", address(vaultLP));
    }
}
