// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import "forge-std/Script.sol";
import "../src/Factory.sol";
import "../src/FeeRouter.sol";
import "../src/GraduationRouter.sol";
import "../src/VaultLPSupport.sol";
import "../src/VaultBuybackBurn.sol";
import "../src/PredictionMarket.sol";

/**
 * @title DeployVestingAndFactory
 * @notice Phase 3 deploy: deploys VaultLPSupport, VaultBuybackBurn, new FeeRouter,
 *         new Factory (no dev allocation — 100% supply to curve), new PredictionMarket,
 *         and new GraduationRouter.
 *         VestingController is no longer wired into Factory (creators buy their own tokens).
 */
contract DeployVestingAndFactory is Script {
    // Existing live addresses (DO NOT redeploy)
    address constant GRADUATION_POOL  = 0x5c9CFaBf0E94f1ACF37A77a6f21B1e5acfD20568;

    // Monad testnet WMON address
    address constant WMON = 0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701;

    // Lick.fun DEX factory (LickFactory)
    address constant DEX_FACTORY = 0x6848A334f9f7C2Cd5a2b34580EcC05F1616bAE48;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // ── Step A: Deploy recoverable vaults (owner = deployer on testnet) ──
        VaultLPSupport vaultLP = new VaultLPSupport(deployer);
        console.log("VaultLPSupport deployed at:", address(vaultLP));

        VaultBuybackBurn vaultBB = new VaultBuybackBurn(deployer);
        console.log("VaultBuybackBurn deployed at:", address(vaultBB));

        // ── Step B: Deploy new FeeRouter ──
        FeeRouter feeRouter = new FeeRouter(
            GRADUATION_POOL,
            address(vaultLP),
            address(vaultBB)
        );
        console.log("FeeRouter deployed at:", address(feeRouter));

        // ── Step C: Deploy new Factory ──
        Factory factory = new Factory(deployer);
        console.log("Factory deployed at:", address(factory));

        // audit M-04: authorise Factory to apply per-token fee configs.
        feeRouter.setFactory(address(factory));

        // ── Step D: Deploy new PredictionMarket (with factory param) ──
        PredictionMarket predictionMarket = new PredictionMarket(deployer, address(factory));
        console.log("PredictionMarket deployed at:", address(predictionMarket));

        factory.setPredictionMarket(address(predictionMarket));
        factory.setFeeRouter(address(feeRouter));

        // ── Step E: Deploy new GraduationRouter (no vestingController param) ──
        GraduationRouter graduationRouter = new GraduationRouter(
            DEX_FACTORY,
            WMON,
            deployer,          // protocolFeeReceiver
            address(factory)   // launchFactory
        );
        console.log("GraduationRouter deployed at:", address(graduationRouter));

        factory.setGraduationRouter(address(graduationRouter));

        console.log("---");
        console.log("All Phase 3 contracts deployed.");
        console.log("Factory configured with:");
        console.log("  GraduationRouter:", address(graduationRouter));
        console.log("  PredictionMarket:", address(predictionMarket));
        console.log("  FeeRouter:", address(feeRouter));

        vm.stopBroadcast();
    }
}