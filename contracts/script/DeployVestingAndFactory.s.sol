// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import "forge-std/Script.sol";
import "../src/VestingController.sol";
import "../src/Factory.sol";

/**
 * @title DeployVestingAndFactory
 * @notice Redeploys VestingController and Factory to fix the onlyOwner bug.
 *         Deploys VestingController first (owner = deployer),
 *         then deploys Factory with protocolTreasury = deployer.
 *         Finally configures GraduationRouter, PredictionMarket, and FeeRouter on the new Factory.
 *
 *         Existing addresses to set:
 *           GraduationRouter: 0xf7067c6f9Fc81f0FB435bEcaeA05e5878B092c86
 *           PredictionMarket: 0xc47FA8e0044458aaC0eeCCf6F2442E858f2387A6
 *           FeeRouter:         0xA0a17b2eB3c836119e22E0Aa10e4243e88405161
 */
contract DeployVestingAndFactory is Script {
    // Existing contract addresses
    address constant GRADUATION_ROUTER = 0xf7067c6f9Fc81f0FB435bEcaeA05e5878B092c86;
    address constant PREDICTION_MARKET = 0xc47FA8e0044458aaC0eeCCf6F2442E858f2387A6;
    address constant FEE_ROUTER = 0xA0a17b2eB3c836119e22E0Aa10e4243e88405161;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy VestingController (owner = deployer)
        VestingController vestingController = new VestingController();
        address vestingControllerAddr = address(vestingController);
        console.log("VestingController deployed at:", vestingControllerAddr);

        // Step 2: Deploy Factory with protocolTreasury = deployer
        Factory factory = new Factory(deployer);
        address factoryAddr = address(factory);
        console.log("Factory deployed at:", factoryAddr);

        // Step 3: Set VestingController on Factory
        factory.setVestingController(vestingControllerAddr);

        // Step 4: Set GraduationRouter on Factory
        factory.setGraduationRouter(GRADUATION_ROUTER);

        // Step 5: Set PredictionMarket on Factory
        factory.setPredictionMarket(PREDICTION_MARKET);

        // Step 6: Set FeeRouter on Factory
        factory.setFeeRouter(FEE_ROUTER);

        console.log("Factory configured with:");
        console.log("  VestingController:", vestingControllerAddr);
        console.log("  GraduationRouter:", GRADUATION_ROUTER);
        console.log("  PredictionMarket:", PREDICTION_MARKET);
        console.log("  FeeRouter:", FEE_ROUTER);

        vm.stopBroadcast();
    }
}