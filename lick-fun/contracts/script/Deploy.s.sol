// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {ProfileRegistry} from "../src/ProfileRegistry.sol";
import {GraduationPool} from "../src/GraduationPool.sol";
import {VestingController} from "../src/VestingController.sol";
import {FeeRouter} from "../src/FeeRouter.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";
import {LickFactory} from "../src/LickFactory.sol";
import {Factory} from "../src/Factory.sol";
import {GraduationRouter} from "../src/GraduationRouter.sol";

/**
 * @title Deploy
 * @notice Deploys the full Lick.fun protocol to Monad testnet.
 * @dev Run with:
 *      source .env && forge script script/Deploy.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
 *
 *      Deployment order:
 *        1. ProfileRegistry    (no deps)
 *        2. GraduationPool     (reporter = deployer)
 *        3. VestingController  (no deps)
 *        4. FeeRouter          (graduationPool, lpSupportVault, buybackBurnVault)
 *        5. PredictionMarket   (protocolFeeReceiver)
 *        6. LickFactory        (temporary graduationRouter = deployer, updated later)
 *        7. Factory            (protocolTreasury)
 *        8. GraduationRouter   (dexFactory, weth, vestingController, protocolFeeReceiver, launchFactory)
 *        9. Post-deploy wiring (setGraduationRouter, setFeeRouter, setPredictionMarket, setVestingController)
 */
contract Deploy is Script {
    // ─── Monad Testnet WMON (canonical wrapped MON) ────────────────────────
    address constant WMON = 0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701;

    function run() external {
        // Use the deployer for all protocol-owned addresses during testing.
        // forge script already has --private-key, just use the broadcast sender.
        address deployer = msg.sender;
        address protocolTreasury = deployer;
        address protocolFeeReceiver = deployer;
        address reporter = deployer;
        address lpSupportVault = deployer;
        address buybackBurnVault = deployer;

        console.log("Deployer:", deployer);
        console.log("WMON:", WMON);
        console.log("");

        vm.startBroadcast();

        // ── 1. ProfileRegistry ──────────────────────────────────────────────
        ProfileRegistry profileRegistry = new ProfileRegistry();
        console.log("ProfileRegistry deployed at:", address(profileRegistry));

        // ── 2. GraduationPool ───────────────────────────────────────────────
        GraduationPool graduationPool = new GraduationPool(reporter);
        console.log("GraduationPool deployed at:", address(graduationPool));

        // ── 3. VestingController ────────────────────────────────────────────
        VestingController vestingController = new VestingController();
        console.log("VestingController deployed at:", address(vestingController));

        // ── 4. FeeRouter ────────────────────────────────────────────────────
        FeeRouter feeRouter = new FeeRouter(
            address(graduationPool),
            lpSupportVault,
            buybackBurnVault
        );
        console.log("FeeRouter deployed at:", address(feeRouter));

        // ── 5. PredictionMarket ─────────────────────────────────────────────
        PredictionMarket predictionMarket = new PredictionMarket(protocolFeeReceiver);
        console.log("PredictionMarket deployed at:", address(predictionMarket));

        // ── 6. LickFactory (DEX factory) ─────────────────────────────────────
        // Temporarily set graduationRouter to deployer; updated after GraduationRouter deploys.
        LickFactory dexFactory = new LickFactory(deployer);
        console.log("LickFactory (DEX) deployed at:", address(dexFactory));

        // ── 7. Factory (Launch factory) ─────────────────────────────────────
        Factory launchFactory = new Factory(protocolTreasury);
        console.log("Factory (Launch) deployed at:", address(launchFactory));

        // ── 8. GraduationRouter ─────────────────────────────────────────────
        GraduationRouter graduationRouter = new GraduationRouter(
            address(dexFactory),
            WMON,
            address(vestingController),
            protocolFeeReceiver,
            address(launchFactory)
        );
        console.log("GraduationRouter deployed at:", address(graduationRouter));

        // ── 9. Post-deploy wiring ───────────────────────────────────────────
        launchFactory.setGraduationRouter(address(graduationRouter));
        console.log("Factory.setGraduationRouter done");

        launchFactory.setFeeRouter(address(feeRouter));
        console.log("Factory.setFeeRouter done");

        launchFactory.setPredictionMarket(address(predictionMarket));
        console.log("Factory.setPredictionMarket done");

        launchFactory.setVestingController(address(vestingController));
        console.log("Factory.setVestingController done");

        dexFactory.setGraduationRouter(address(graduationRouter));
        console.log("LickFactory.setGraduationRouter done");

        vm.stopBroadcast();

        console.log("");
        console.log("=== Deployment Complete ===");
        console.log("ProfileRegistry:  ", address(profileRegistry));
        console.log("GraduationPool:   ", address(graduationPool));
        console.log("VestingController:", address(vestingController));
        console.log("FeeRouter:        ", address(feeRouter));
        console.log("PredictionMarket: ", address(predictionMarket));
        console.log("LickFactory (DEX):", address(dexFactory));
        console.log("Factory (Launch): ", address(launchFactory));
        console.log("GraduationRouter: ", address(graduationRouter));
    }
}