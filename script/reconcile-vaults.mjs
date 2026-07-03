// reconcile-vaults.mjs
//
// One-shot, on-chain script that reconciles the stranded MON in
// VaultBuybackBurn + VaultLPSupport back to the Founder token's
// per-token mapping (so the keeper can fire execute() automatically).
//
// Run with:
//   PRIVATE_KEY=0x... node script/reconcile-vaults.mjs
//
// Or import the function and call it with a viem WalletClient from a Safe SDK /
// multisig helper. The script is non-destructive: it sweeps the vault balance
// OUT, then re-deposits it via VaultRecouper with the correct token attribution.
// Net effect: pendingBurn(founder) ~= 78 MON, pendingLP(founder) ~= 313 MON,
// and the Railway keeper will trigger execute() automatically on its next 60s
// poll cycle.

import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  parseEventLogs,
  keccak256,
  toBytes,
  getContract,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";
import * as dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, ".env") });

// ─── Config ──────────────────────────────────────────────────────────────────

const RPC_URL = process.env.KEEPER_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.KEEPER_PRIVATE_KEY;
if (!RPC_URL || !PRIVATE_KEY) {
  console.error("Missing KEEPER_RPC_URL or PRIVATE_KEY in env / .env");
  process.exit(1);
}

const BB_VAULT = "0x45B1Ee1E9E8E9FF8CE6bBbd55B430Cab4b25e06d";
const LP_VAULT = "0xF1Aac85a5F964564e472BF1E0628c536b01809e0";
const FOUNDER = "0x0236787a1bAaEeD46a123fa264A2355eed11d151";
const RECOUPER = process.env.RECOUPER_ADDR; // set after deploying VaultRecouper

if (!RECOUPER) {
  console.error("Set RECOUPER_ADDR=<deployed VaultRecouper> in env first");
  process.exit(1);
}

const monad = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

const account = privateKeyToAccount(PRIVATE_KEY);

const publicClient = createPublicClient({ chain: monad, transport: http(RPC_URL) });
const walletClient = createWalletClient({ account, chain: monad, transport: http(RPC_URL) });

// ─── ABIs ────────────────────────────────────────────────────────────────────

const SWEEP_ABI = parseAbi(["function sweep(address to, uint256 amount) external"]);
const RECOVER_ABI = parseAbi(["function recover(address payable vault, address token) external payable"]);

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Signer: ${account.address}`);
  console.log(`BB vault:  ${BB_VAULT}  (bal=${(Number(await publicClient.getBalance({ address: BB_VAULT })) / 1e18} MON)`);
  console.log(`LP vault:  ${LP_VAULT}  (bal=${(Number(await publicClient.getBalance({ address: LP_VAULT })) / 1e18} MON)`);
  console.log(`Founder:   ${FOUNDER}`);
  console.log(`Recouper:  ${RECOUPER}`);
  console.log("");

  const bbBal = await publicClient.getBalance({ address: BB_VAULT });
  const lpBal = await publicClient.getBalance({ address: LP_VAULT });

  // Step 1: sweep both vaults to signer (works because signer is the multisig
  // or a hot wallet authorised by it).
  console.log("[1/4] Sweeping BB vault...");
  const sweepBB = await walletClient.writeContract({
    address: BB_VAULT,
    abi: SWEEP_ABI,
    functionName: "sweep",
    args: [account.address, bbBal],
  });
  await publicClient.waitForTransactionReceipt({ hash: sweepBB });
  console.log("    tx:", sweepBB);

  console.log("[2/4] Sweeping LP vault...");
  const sweepLP = await walletClient.writeContract({
    address: LP_VAULT,
    abi: SWEEP_ABI,
    functionName: "sweep",
    args: [account.address, lpBal],
  });
  await publicClient.waitForTransactionReceipt({ hash: sweepLP });
  console.log("    tx:", sweepLP);

  // Step 2: re-deposit via VaultRecouper with correct token attribution.
  // We split 100% to founder for both vaults (BB share 20% + LP share 80% per
  // LIGHT preset).
  console.log("[3/4] Re-attributing BB balance to founder via VaultRecouper...");
  const recBB = await walletClient.writeContract({
    address: RECOUPER,
    abi: RECOVER_ABI,
    functionName: "recover",
    args: [BB_VAULT, FOUNDER],
    value: bbBal,
  });
  await publicClient.waitForTransactionReceipt({ hash: recBB });
  console.log("    tx:", recBB);

  console.log("[4/4] Re-attributing LP balance to founder via VaultRecouper...");
  const recLP = await walletClient.writeContract({
    address: RECOUPER,
    abi: RECOVER_ABI,
    functionName: "recover",
    args: [LP_VAULT, FOUNDER],
    value: lpBal,
  });
  await publicClient.waitForTransactionReceipt({ hash: recLP });
  console.log("    tx:", recLP);

  // Verify
  const pendingBurnAfter = await publicClient.readContract({
    address: BB_VAULT,
    abi: parseAbi(["function pendingBurn(address) view returns (uint256)"]),
    functionName: "pendingBurn",
    args: [FOUNDER],
  });
  const pendingLPAfter = await publicClient.readContract({
    address: LP_VAULT,
    abi: parseAbi(["function pendingLP(address) view returns (uint256)"]),
    functionName: "pendingLP",
    args: [FOUNDER],
  });
  console.log("");
  console.log("✅ Done!");
  console.log("  pendingBurn(founder):", Number(pendingBurnAfter) / 1e18, "MON (threshold 50 MON)");
  console.log("  pendingLP(founder):  ", Number(pendingLPAfter) / 1e18, "MON (threshold 50 MON)");
  console.log("");
  console.log("Railway keeper will detect both ≥ 50 MON and call execute() within 60s.");
  console.log("After this, monitor logs for:");
  console.log("  [vault] BuybackBurn: 0x0236...d151 has ~78 MON pending — executing");
  console.log("  [vault] LPSupport:   0x0236...d151 has ~313 MON pending — executing");
}

main().catch((e) => {
  console.error("FATAL:", e.shortMessage || e.message);
  process.exit(1);
});
