/**
 * graduation-keeper.ts
 *
 * Watches for CurveGraduate events on the Factory's BondingCurve contracts and
 * automatically calls GraduationRouter.migrateLiquidity() so liquidity is never
 * stranded waiting for a user to click "Finalize graduation".
 *
 * Usage:
 *   node --loader ts-node/esm graduation-keeper.ts
 *   # or with tsx:
 *   npx tsx graduation-keeper.ts
 *
 * Env vars (create script/.env or set in shell):
 *   KEEPER_RPC_URL         — Monad RPC (dedicated, not public)
 *   KEEPER_PRIVATE_KEY     — Private key for the funded keeper wallet (0x...)
 *   GRADUATION_ROUTER_ADDR — GraduationRouter contract address
 *   FACTORY_ADDR           — Factory contract address (for start block)
 *   START_BLOCK            — Block to start scanning from (Factory deploy block)
 *   POLL_INTERVAL_MS       — Optional. How often to poll for new events (default 6000)
 *
 * Security:
 *   - The keeper wallet only needs enough MON for gas — no privileged roles required.
 *   - migrateLiquidity() is permissionless; the keeper just pays gas.
 *   - Never fund this wallet with more than ~50 MON for gas reserves.
 */

import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, ".env") });

// ─── Config ──────────────────────────────────────────────────────────────────

const RPC_URL = process.env.KEEPER_RPC_URL;
const PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY as `0x${string}` | undefined;
const GRADUATION_ROUTER = process.env.GRADUATION_ROUTER_ADDR as `0x${string}` | undefined;
const START_BLOCK = BigInt(process.env.START_BLOCK ?? "0");
const POLL_MS = Number(process.env.POLL_INTERVAL_MS ?? 6_000);

if (!RPC_URL || !PRIVATE_KEY || !GRADUATION_ROUTER) {
  console.error(
    "Missing env vars. Required: KEEPER_RPC_URL, KEEPER_PRIVATE_KEY, GRADUATION_ROUTER_ADDR"
  );
  process.exit(1);
}

// ─── Chain ───────────────────────────────────────────────────────────────────

const monadMainnet = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

// ─── ABIs ────────────────────────────────────────────────────────────────────

const CURVE_GRADUATE_ABI = parseAbi([
  "event CurveGraduate(address indexed token, address indexed pool)",
]);

const GRADUATION_ROUTER_ABI = parseAbi([
  "function migrateLiquidity(address token) external returns (address pair)",
  "function tokenToPair(address token) external view returns (address)",
]);

// ─── Clients ─────────────────────────────────────────────────────────────────

const account = privateKeyToAccount(PRIVATE_KEY);

const publicClient = createPublicClient({
  chain: monadMainnet,
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account,
  chain: monadMainnet,
  transport: http(RPC_URL),
});

// ─── State ───────────────────────────────────────────────────────────────────

/** Track the last processed block to avoid re-scanning. */
let lastBlock = START_BLOCK;

/** Tokens already migrated (or migration attempted) — avoid duplicate txs. */
const attempted = new Set<string>();

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function isMigrated(token: string): Promise<boolean> {
  try {
    const pair = await publicClient.readContract({
      address: GRADUATION_ROUTER!,
      abi: GRADUATION_ROUTER_ABI,
      functionName: "tokenToPair",
      args: [token as `0x${string}`],
    });
    // address(0) = not migrated, address(1) = sentinel / in-progress
    return (
      pair !== "0x0000000000000000000000000000000000000000" &&
      pair !== "0x0000000000000000000000000000000000000001"
    );
  } catch {
    return false;
  }
}

async function migrate(token: `0x${string}`): Promise<void> {
  if (attempted.has(token.toLowerCase())) return;
  attempted.add(token.toLowerCase());

  // Double-check on-chain before sending a tx
  if (await isMigrated(token)) {
    console.log(`[keeper] ${token} — already migrated, skipping`);
    return;
  }

  console.log(`[keeper] Migrating ${token}...`);
  try {
    const hash = await walletClient.writeContract({
      address: GRADUATION_ROUTER!,
      abi: GRADUATION_ROUTER_ABI,
      functionName: "migrateLiquidity",
      args: [token],
    });
    console.log(`[keeper] ✓ migrateLiquidity tx: ${hash}`);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === "success") {
      console.log(`[keeper] ✓ Migration confirmed for ${token} in block ${receipt.blockNumber}`);
    } else {
      console.warn(`[keeper] ⚠ Migration tx reverted for ${token}`);
      // Remove from attempted so it can be retried next poll
      attempted.delete(token.toLowerCase());
    }
  } catch (err) {
    console.error(`[keeper] ✗ Migration error for ${token}:`, (err as Error).message);
    attempted.delete(token.toLowerCase());
  }
}

// ─── Poll loop ────────────────────────────────────────────────────────────────

async function poll(): Promise<void> {
  try {
    const latestBlock = await publicClient.getBlockNumber();
    if (latestBlock <= lastBlock) return;

    // Scan for CurveGraduate events across all BondingCurve contracts
    // (no address filter — BondingCurves are deployed per-token)
    const logs = await publicClient.getLogs({
      event: CURVE_GRADUATE_ABI[0],
      fromBlock: lastBlock + 1n,
      toBlock: latestBlock,
    });

    if (logs.length > 0) {
      console.log(`[keeper] Found ${logs.length} graduation event(s) in blocks ${lastBlock + 1n}–${latestBlock}`);
    }

    for (const log of logs) {
      const token = log.args.token as `0x${string}`;
      console.log(`[keeper] CurveGraduate: token=${token} in block ${log.blockNumber}`);
      // Fire-and-forget each migration (they serialize internally via attempted set)
      migrate(token).catch((e) => console.error("[keeper] migrate error:", e));
    }

    lastBlock = latestBlock;
  } catch (err) {
    console.error("[keeper] poll error:", (err as Error).message);
  }
}

// ─── Startup ─────────────────────────────────────────────────────────────────

console.log(`[keeper] Starting graduation keeper`);
console.log(`[keeper] GraduationRouter: ${GRADUATION_ROUTER}`);
console.log(`[keeper] Keeper wallet:     ${account.address}`);
console.log(`[keeper] Start block:       ${START_BLOCK}`);
console.log(`[keeper] Poll interval:     ${POLL_MS}ms`);

// Initial poll immediately, then on interval
poll().then(() => {
  setInterval(poll, POLL_MS);
});
