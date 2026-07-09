// generate-reconcile-batch.mjs
//
// Generates a fresh Safe Transaction Builder batch that reconciles the
// currently-untracked MON sitting in VaultBuybackBurnV2 and VaultLPSupport
// back to their correct per-token pendingBurn/pendingLP mappings.
//
// WHY THIS IS NEEDED (recurring, not a one-off):
// The live FeeRouter (0x5BBe...9E903) predates the receiveForToken() audit
// fix and can never be replaced (Factory.feeRouter is set-once). Every trade
// fee since deploy has been raw-sent to the vaults' bare receive(), which
// does NOT populate the per-token mapping the vaults' execute() threshold
// check relies on. So this reconcile has to be re-run periodically (whenever
// a token's untracked share re-crosses the 50 MON execution threshold).
//
// This script re-queries LIVE on-chain state (does not trust any numbers
// from a previous chat/session) and computes, per vault, per token:
//   untracked = (all FeeRouted.<share> events strictly after the vault's
//                last Deposited event) — i.e. exactly the wei that arrived
//                via the broken raw-send path since the last reconcile.
// It then emits a Safe Transaction Builder JSON batch:
//   [sweep(safe, totalUntracked) on vault]
//   [VaultRecouper.recover(vault, token) for each token with untracked > 0]
// repeated for both the BB vault and the LP vault.
//
// Run with: node script/generate-reconcile-batch.mjs
// Output:   script/safe-batch-reconcile-<timestamp>.json

import { createPublicClient, http, parseAbi, formatEther } from "viem";
import { defineChain } from "viem";
import * as dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { writeFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, ".env") });

// ─── Config ──────────────────────────────────────────────────────────────────

const RPC_URL = process.env.KEEPER_RPC_URL;
const FACTORY_ADDR = process.env.FACTORY_ADDR;
const START_BLOCK = BigInt(process.env.START_BLOCK ?? "83961211");

const FEE_ROUTER = "0x5BBe528936E627d33DE36f10d9DB946089b9E903";
const BB_VAULT = "0xd22bEf54aD5baeA2C21a80B91E38C5B67Cbb1822"; // VaultBuybackBurnV2
const LP_VAULT = "0xF1Aac85a5F964564e472BF1E0628c536b01809e0"; // VaultLPSupport
const RECOUPER = process.env.RECOUPER_ADDR || "0x3b0e57DBd9F80dB7963aa80A1167A224eD5E2b91";
const SAFE_ADDR = "0x9F3fDE2C42BA3B00110fC4dc3365782dFE2743fA";

if (!RPC_URL || !FACTORY_ADDR) {
  console.error("Missing KEEPER_RPC_URL or FACTORY_ADDR in script/.env");
  process.exit(1);
}

const monad = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

const client = createPublicClient({ chain: monad, transport: http(RPC_URL) });

// ─── ABIs ────────────────────────────────────────────────────────────────────

const FACTORY_ABI = parseAbi([
  "event TokenCreated(address indexed token, address indexed curve, address indexed creator)",
]);
const FEE_ROUTER_ABI = parseAbi([
  "event FeeRouted(address indexed token, uint256 totalAmount, uint256 creatorShare, uint256 lpShare, uint256 buybackShare, uint256 giftShare)",
]);
const VAULT_ABI = parseAbi([
  "event Deposited(address indexed token, address indexed sender, uint256 amount)",
]);

const MAX_CHUNK = 500_000n;

async function getLogsChunked(address, event, fromBlock, toBlock) {
  const all = [];
  let cursor = fromBlock;
  while (cursor <= toBlock) {
    const end = cursor + MAX_CHUNK > toBlock ? toBlock : cursor + MAX_CHUNK;
    const logs = await client.getLogs({ address, event, fromBlock: cursor, toBlock: end });
    all.push(...logs);
    cursor = end + 1n;
  }
  return all;
}

/**
 * Computes, for a given vault + FeeRouted share field ("buybackShare" or
 * "lpShare"), the untracked-per-token wei amounts: everything the vault
 * received via raw-send since its own last Deposited event (i.e. since the
 * last time this vault was reconciled). Also verifies the sum matches the
 * vault's live balance minus already-attributed pendingBurn/pendingLP, as a
 * sanity check (logged, not enforced, since dust/timing may cause tiny
 * float-level differences that don't matter for wei-exact sweep amounts).
 */
async function computeUntracked(vaultAddr, shareField, latest) {
  const depLogs = await getLogsChunked(vaultAddr, VAULT_ABI[0], START_BLOCK, latest);
  let lastReconcileBlock = START_BLOCK;
  for (const l of depLogs) {
    if (l.blockNumber > lastReconcileBlock) lastReconcileBlock = l.blockNumber;
  }

  const feeLogs = await getLogsChunked(FEE_ROUTER, FEE_ROUTER_ABI[0], lastReconcileBlock + 1n, latest);
  const byToken = {};
  for (const l of feeLogs) {
    const t = l.args.token.toLowerCase();
    byToken[t] = (byToken[t] || 0n) + l.args[shareField];
  }
  return { byToken, lastReconcileBlock };
}

async function main() {
  const latest = await client.getBlockNumber();
  console.log(`Latest block: ${latest}\n`);

  // Discover all launched tokens (for logging/labels only)
  const tokenLogs = await getLogsChunked(FACTORY_ADDR, FACTORY_ABI[0], START_BLOCK, latest);
  const allTokens = tokenLogs.map((l) => l.args.token.toLowerCase());
  console.log(`Discovered ${allTokens.length} launched token(s):`, allTokens.join(", "), "\n");

  // ── BB vault ──────────────────────────────────────────────────────────────
  const bbBal = await client.getBalance({ address: BB_VAULT });
  const { byToken: bbUntracked, lastReconcileBlock: bbLastBlock } = await computeUntracked(
    BB_VAULT,
    "buybackShare",
    latest
  );
  const bbSum = Object.values(bbUntracked).reduce((a, b) => a + b, 0n);
  console.log(`=== BB Vault (${BB_VAULT}) ===`);
  console.log(`Balance: ${formatEther(bbBal)} MON | last reconcile block: ${bbLastBlock}`);
  for (const [t, v] of Object.entries(bbUntracked)) {
    console.log(`  ${t}: untracked = ${formatEther(v)} MON`);
  }
  console.log(`  Sum untracked: ${formatEther(bbSum)} MON (balance diff: ${formatEther(bbBal - bbSum)} MON)\n`);

  // ── LP vault ──────────────────────────────────────────────────────────────
  const lpBal = await client.getBalance({ address: LP_VAULT });
  const { byToken: lpUntracked, lastReconcileBlock: lpLastBlock } = await computeUntracked(
    LP_VAULT,
    "lpShare",
    latest
  );
  const lpSum = Object.values(lpUntracked).reduce((a, b) => a + b, 0n);
  console.log(`=== LP Vault (${LP_VAULT}) ===`);
  console.log(`Balance: ${formatEther(lpBal)} MON | last reconcile block: ${lpLastBlock}`);
  for (const [t, v] of Object.entries(lpUntracked)) {
    console.log(`  ${t}: untracked = ${formatEther(v)} MON`);
  }
  console.log(`  Sum untracked: ${formatEther(lpSum)} MON (balance diff: ${formatEther(lpBal - lpSum)} MON)\n`);

  // ── Build Safe Transaction Builder batch ────────────────────────────────
  const transactions = [];

  function addVaultReconcile(vaultAddr, sumUntracked, untrackedByToken, label) {
    if (sumUntracked === 0n) {
      console.log(`(skipping ${label} — nothing untracked)`);
      return;
    }
    // 1. sweep(safe, sumUntracked)
    transactions.push({
      to: vaultAddr,
      value: "0",
      data: null,
      contractMethod: {
        inputs: [
          { name: "to", type: "address", internalType: "address" },
          { name: "amount", type: "uint256", internalType: "uint256" },
        ],
        name: "sweep",
        payable: false,
      },
      contractInputsValues: {
        to: SAFE_ADDR,
        amount: sumUntracked.toString(),
      },
    });
    // 2. recover(vault, token) per token with nonzero untracked amount
    for (const [token, amount] of Object.entries(untrackedByToken)) {
      if (amount === 0n) continue;
      transactions.push({
        to: RECOUPER,
        value: amount.toString(),
        data: null,
        contractMethod: {
          inputs: [
            { name: "vault", type: "address", internalType: "address payable" },
            { name: "token", type: "address", internalType: "address" },
          ],
          name: "recover",
          payable: true,
        },
        contractInputsValues: {
          vault: vaultAddr,
          token: token,
        },
      });
    }
  }

  addVaultReconcile(BB_VAULT, bbSum, bbUntracked, "BB vault");
  addVaultReconcile(LP_VAULT, lpSum, lpUntracked, "LP vault");

  if (transactions.length === 0) {
    console.log("Nothing to reconcile — both vaults are fully attributed. No batch generated.");
    return;
  }

  const batch = {
    version: "1.0",
    chainId: "143",
    createdAt: Date.now(),
    meta: {
      name: "Reconcile untracked vault MON (recurring, post-V2-migration)",
      description:
        "Sweeps VaultBuybackBurnV2 and VaultLPSupport for MON received via the FeeRouter's raw-send path (untracked in the per-token pendingBurn/pendingLP mappings since the last reconcile), then re-deposits each amount via VaultRecouper.recover() attributed to the correct token, per-token (not lumped into a single token). Balances/amounts computed fresh at generation time from live on-chain FeeRouted events. Re-verify balances immediately before executing if significant time has passed, since fees accrue continuously.",
      txBuilderVersion: "1.16.5",
    },
    transactions,
  };

  const filename = `safe-batch-reconcile-${Date.now()}.json`;
  const outPath = resolve(__dirname, filename);
  writeFileSync(outPath, JSON.stringify(batch, null, 2));
  console.log(`\n✅ Wrote batch: script/${filename}`);
  console.log(`   ${transactions.length} transaction(s) total.`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
