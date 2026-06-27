// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import "forge-std/Script.sol";
import "../src/Factory.sol";
import "../src/FeeRouter.sol";
import "../src/GraduationRouter.sol";
import "../src/VaultLPSupport.sol";
import "../src/VaultBuybackBurn.sol";
import "../src/PredictionMarket.sol";
import "../src/LickFactory.sol";
import "../src/LickRouter.sol";
import "../src/GraduationPool.sol";

/**
 * @title DeployMainnet
 * @notice Full mainnet deploy: LickFactory (DEX) + all Phase-3 contracts + LickRouter.
 *
 * Usage:
 *   forge script contracts/script/DeployMainnet.s.sol:DeployMainnet \
 *     --rpc-url $MAINNET_RPC_URL \
 *     --broadcast \
 *     --legacy \
 *     --root contracts
 *
 * Required env vars (in contracts/.env):
 *   PRIVATE_KEY   — Mainnet deployer private key (fresh key, never reuse testnet)
 *   WMON_MAINNET  — Official Monad mainnet WMON address (get from Monad docs / team)
 *
 * ⚠️  Do NOT deploy until:
 *     1. Security audit of ALL contracts (incl. LickRouter) is complete.
 *     2. All audit findings are resolved.
 *     3. You have the correct mainnet WMON address from Monad's official sources.
 */
contract DeployMainnet is Script {
    // ─── Mainnet constants ─────────────────────────────────────────────────
    // Fill in official Monad mainnet addresses before deploying.
    // These are clearly marked so they can't be missed.

    /// @dev Monad mainnet WMON — verified from docs.monad.xyz/developer-essentials/network-information/tokens-and-bridges
    /// Source: "Natively-Issued Assets" table, Symbol WMON, 2026-06-27
    address constant WMON_MAINNET = 0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A;

    function run() external {
        // Fail loudly if WMON is not set — safeguard against deploying with zero address.
        require(WMON_MAINNET != address(0), "WMON_MAINNET must be set before deploying");

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // audit M-06: all privileged roles, the protocol treasury, and every fee receiver
        // are set to a multisig/timelock, NOT the deployer EOA. Set MULTISIG_ADDR in
        // contracts/.env to a deployed Safe (or timelock) address before running.
        address treasury = vm.envAddress("MULTISIG_ADDR");
        require(treasury != address(0), "MULTISIG_ADDR must be set");
        // audit L-07: reporter/anchor for GraduationPool reputation feed (can equal treasury).
        address reporter = vm.envOr("REPORTER_ADDR", treasury);

        vm.startBroadcast(deployerPrivateKey);

        // ── Step A: Deploy recoverable vaults (audit C-01) ────────────────────
        // Owner = treasury multisig so routed fees are never permanently locked.
        // lickRouter is deployed later at Step G — use address(0) as placeholder,
        // then call setLickRouter() after LickRouter is deployed.
        // We pass a temporary address here; setLickRouter() is called post-deploy.
        address lickRouterPlaceholder = address(0x1); // updated after LickRouter deploy
        address gradRouterPlaceholder = address(0x2); // updated after GraduationRouter deploy
        address factoryPlaceholder = address(0x3);    // updated after Factory deploy
        VaultLPSupport vaultLP = new VaultLPSupport(treasury, lickRouterPlaceholder, WMON_MAINNET, gradRouterPlaceholder);
        console.log("VaultLPSupport:       ", address(vaultLP));

        VaultBuybackBurn vaultBB = new VaultBuybackBurn(treasury, lickRouterPlaceholder, factoryPlaceholder, gradRouterPlaceholder);
        console.log("VaultBuybackBurn:     ", address(vaultBB));

        // ── Step B: Deploy LickFactory (DEX pair registry) ───────────────────
        // Temporarily set deployer as router so we can call setGraduationRouter after
        LickFactory dexFactory = new LickFactory(deployer);
        console.log("LickFactory (DEX):    ", address(dexFactory));

        // ── Step C: Deploy real GraduationPool (audit H-02 / I-04) ────────────
        // A dedicated, recoverable subsidy pool — NOT the LP vault. This keeps the
        // graduation-pool fee stream distinct from the LP-support sink.
        GraduationPool graduationPool = new GraduationPool(reporter);
        console.log("GraduationPool:       ", address(graduationPool));

        // ── Step D: Deploy new FeeRouter ──────────────────────────────────────
        // audit H-02: three DISTINCT, recoverable destinations.
        FeeRouter feeRouter = new FeeRouter(
            address(graduationPool),
            address(vaultLP),
            address(vaultBB)
        );
        console.log("FeeRouter:            ", address(feeRouter));

        // ── Step E: Deploy Factory (launch factory) ───────────────────────────
        // audit M-06: treasury multisig is owner + protocolTreasury.
        Factory factory = new Factory(treasury);
        console.log("Factory:              ", address(factory));

        // ── Step F: Deploy PredictionMarket ───────────────────────────────────
        // audit M-06: protocolFeeReceiver = treasury multisig.
        PredictionMarket predictionMarket = new PredictionMarket(treasury, address(factory));
        console.log("PredictionMarket:     ", address(predictionMarket));

        // ── Step G: Deploy GraduationRouter ───────────────────────────────────
        GraduationRouter graduationRouter = new GraduationRouter(
            address(dexFactory),
            WMON_MAINNET,
            treasury,           // protocolFeeReceiver (audit M-06)
            address(factory)    // launchFactory
        );
        console.log("GraduationRouter:     ", address(graduationRouter));

        // ── Step H: Deploy LickRouter (user-facing DEX swap router) ───────────
        LickRouter lickRouter = new LickRouter(address(dexFactory), WMON_MAINNET);
        console.log("LickRouter:           ", address(lickRouter));

        // ── Step I: Wire everything up ────────────────────────────────────────
        // The deployer is the temporary owner of Factory + FeeRouter so that all wiring
        // happens atomically inside this single broadcast. Ownership is transferred to the
        // treasury multisig at the very end (audit M-06).

        // audit M-04: authorise the Factory to apply per-token fee configs.
        feeRouter.setFactory(address(factory));

        // Wire Factory (owner-only, deployer is current owner).
        factory.setFeeRouter(address(feeRouter));
        factory.setPredictionMarket(address(predictionMarket));
        factory.setGraduationRouter(address(graduationRouter));

        // Wire LickFactory: only GraduationRouter may create pairs, then lock it (audit M-01).
        dexFactory.setGraduationRouter(address(graduationRouter));
        dexFactory.lockRouter();

        // ── Step I.5: Post-wiring self-checks (fail the deploy loudly on mis-wiring) ──
        require(factory.feeRouter() == address(feeRouter), "WIRE_FEEROUTER");
        require(factory.predictionMarket() == address(predictionMarket), "WIRE_PM");
        require(factory.graduationRouter() == address(graduationRouter), "WIRE_GRAD");
        require(feeRouter.factory() == address(factory), "WIRE_FACTORY");
        require(feeRouter.lpSupportVault() == address(vaultLP), "WIRE_LPVAULT");
        require(feeRouter.buybackBurnVault() == address(vaultBB), "WIRE_BBVAULT");
        require(feeRouter.graduationPool() == address(graduationPool), "WIRE_GPOOL");
        require(dexFactory.graduationRouter() == address(graduationRouter), "WIRE_DEXROUTER");
        require(dexFactory.routerLocked(), "WIRE_ROUTERLOCK");
        require(address(vaultLP) != address(vaultBB), "DISTINCT_VAULTS");
        require(address(graduationPool) != address(vaultLP), "DISTINCT_GPOOL");

        // ── Step I.6: Hand admin to the treasury multisig (audit M-06) ──────────
        feeRouter.transferOwnership(treasury);
        factory.transferOwnership(treasury);
        require(factory.owner() == treasury, "OWN_FACTORY");
        require(feeRouter.owner() == treasury, "OWN_FEEROUTER");

        // ── Step J: Summary ───────────────────────────────────────────────────
        console.log("---");
        console.log("Monad Mainnet Deploy Complete");
        console.log("Chain: 143");
        console.log("Deployer:", deployer);
        console.log("");
        console.log("=== COPY THESE INTO frontend/.env.local ===");
        console.log("NEXT_PUBLIC_CHAIN_ID=143");
        console.log("NEXT_PUBLIC_FACTORY_ADDRESS=", address(factory));
        console.log("NEXT_PUBLIC_FEE_ROUTER_ADDRESS=", address(feeRouter));
        console.log("NEXT_PUBLIC_GRADUATION_ROUTER_ADDRESS=", address(graduationRouter));
        console.log("NEXT_PUBLIC_VAULT_LP_SUPPORT_ADDRESS=", address(vaultLP));
        console.log("NEXT_PUBLIC_VAULT_BUYBACK_BURN_ADDRESS=", address(vaultBB));
        console.log("NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=", address(predictionMarket));
        console.log("NEXT_PUBLIC_DEX_FACTORY_ADDRESS=", address(dexFactory));
        console.log("NEXT_PUBLIC_WMON_ADDRESS=", WMON_MAINNET);
        console.log("NEXT_PUBLIC_LICK_ROUTER_ADDRESS=", address(lickRouter));
        console.log("NEXT_PUBLIC_GRADUATION_POOL_ADDRESS=", address(graduationPool));
        console.log("Treasury (multisig owner):", treasury);
        console.log("");
        console.log("=== COPY THESE INTO indexer/config.yaml ===");
        console.log("  Factory address:", address(factory));
        console.log("  FeeRouter address:", address(feeRouter));
        console.log("  PredictionMarket address:", address(predictionMarket));
        console.log("  GraduationRouter address:", address(graduationRouter));
        console.log("  start_block: <use the block number from this deploy tx>");
        console.log("");
        console.log("=== COPY THESE INTO script/.env (keeper) ===");
        console.log("  GRADUATION_ROUTER_ADDR=", address(graduationRouter));
        console.log("  FACTORY_ADDR=", address(factory));

        vm.stopBroadcast();
    }
}
