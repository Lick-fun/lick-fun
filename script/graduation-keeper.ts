/**
 * graduation-keeper.ts
 *
 * Dual-purpose keeper for Lick.fun:
 *
 * 1. GRADUATION KEEPER
 *    Watches for CurveGraduate events and automatically calls
 *    GraduationRouter.migrateLiquidity() so liquidity is never stranded.
 *
 * 2. VAULT EXECUTION KEEPER
 *    Periodically checks VaultBuybackBurn.pendingBurn[token] and
 *    VaultLPSupport.pendingLP[token] for all known tokens.
 *    When a token's accumulated balance >= EXECUTION_THRESHOLD (50 MON),
 *    calls vault.execute() to trigger the automated buyback+burn or LP deepening.
 *
 * Usage:
 *   npx tsx graduation-keeper.ts
 *
 * Env vars (create script/.env or set in shell):
 *   KEEPER_RPC_URL              — Monad RPC (dedicated, not public)
 *   KEEPER_PRIVATE_KEY          — Private key for the funded keeper wallet (0x...)
 *   GRADUATION_ROUTER_ADDR      — GraduationRouter contract address
 *   VAULT_BUYBACK_ADDR          — VaultBuybackBurn v2 contract address
 *   VAULT_LP_ADDR               — VaultLPSupport v2 contract address
 *   FACTORY_ADDR                — Factory contract address (for TokenCreated events)
 *   START_BLOCK                 — Block to start scanning from (Factory deploy block)
 *   POLL_INTERVAL_MS            — Optional. How often to poll (default 6000ms)
 *   VAULT_POLL_INTERVAL_MS      — Optional. How often to check vault balances (default 60000ms)
 *   HYPERSYNC_URL               — Optional. Override HyperSync endpoint (default https://monad.hypersync.xyz)
 *   ENVIO_API_TOKEN             — Required. Envio API token (same one used for HyperIndex GraphQL).
 *                                   Get a free token at https://envio.dev after signing up.
 *                                   HYPERSYNC_API_TOKEN is also accepted as a fallback.
 *
 * Security:
 *   - execute() is permissionless — keeper wallet only needs gas money.
 *   - Never fund this wallet with more than ~50 MON for gas reserves.
 */

import { createPublicClient, createWalletClient, http, parseAbi, keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";
import { HypersyncClient, LogField } from "@envio-dev/hypersync-client";
import * as dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, ".env") });

// ─── Config ──────────────────────────────────────────────────────────────────

const RPC_URL = process.env.KEEPER_RPC_URL;
const PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY as `0x${string}` | undefined;
const GRADUATION_ROUTER = process.env.GRADUATION_ROUTER_ADDR as `0x${string}` | undefined;
const VAULT_BUYBACK = process.env.VAULT_BUYBACK_ADDR as `0x${string}` | undefined;
const VAULT_LP = process.env.VAULT_LP_ADDR as `0x${string}` | undefined;
const FACTORY_ADDR = process.env.FACTORY_ADDR as `0x${string}` | undefined;
const START_BLOCK = BigInt(process.env.START_BLOCK ?? "0");
const POLL_MS = Number(process.env.POLL_INTERVAL_MS ?? 6_000);
const VAULT_POLL_MS = Number(process.env.VAULT_POLL_INTERVAL_MS ?? 60_000);
// ONE_SHOT=true: poll once and exit (used by GitHub Actions cron job)
const ONE_SHOT = process.env.ONE_SHOT === "true";

/// @notice Execution threshold — must match VaultBuybackBurn/VaultLPSupport constant (50 MON).
const EXECUTION_THRESHOLD = 50n * 10n ** 18n;

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

const GRADUATION_ROUTER_ABI = parseAbi([
  "function migrateLiquidity(address token) external returns (address pair)",
  "function tokenToPair(address token) external view returns (address)",
]);

const VAULT_BUYBACK_ABI = parseAbi([
  "function pendingBurn(address token) external view returns (uint256)",
  "function execute(address token) external",
]);

const VAULT_LP_ABI = parseAbi([
  "function pendingLP(address token) external view returns (uint256)",
  "function execute(address token) external",
]);

const BONDING_CURVE_ABI = parseAbi([
  "function graduated() external view returns (bool)",
  "function realMon() external view returns (uint256)",
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

// ─── HyperSync client (for eth_getLogs) ──────────────────────────────────────
// HyperSync is a purpose-built log query service. It's required for all log
// scanning and the latest-block lookup so the keeper contributes ZERO
// eth_getLogs / eth_blockNumber load to Alchemy's free tier (which was
// throttling us with HTTP 429s when shared with the frontend).
// Alchemy is still used for readContract / writeContract / waitForTransactionReceipt
// — those are cheap and within the free tier.
//
// HyperSync requires authentication (since 3 Nov 2025). We reuse the same
// ENVIO_API_TOKEN as the HyperIndex GraphQL endpoint — Envio issues a single
// token per account that works for both. Sign up at https://envio.dev.

const HYPERSYNC_URL =
  process.env.HYPERSYNC_URL ?? "https://monad.hypersync.xyz";
const ENVIO_API_TOKEN =
  process.env.ENVIO_API_TOKEN ?? process.env.HYPERSYNC_API_TOKEN ?? "";
if (!ENVIO_API_TOKEN) {
  console.error(
    "[keeper] Missing ENVIO_API_TOKEN. HyperSync requires authentication.\n" +
      "  Sign up at https://envio.dev and set ENVIO_API_TOKEN in your env."
  );
  process.exit(1);
}
const hypersync = new HypersyncClient({
  url: HYPERSYNC_URL,
  apiToken: ENVIO_API_TOKEN,
});

// Compute event topic0 hashes at startup (keccak256 of canonical signature).
// Using these as topic0 filters is the cheapest, most selective HyperSync query.
const CURVE_GRADUATE_TOPIC = keccak256(
  toBytes("CurveGraduate(address,address)")
);
const TOKEN_CREATED_TOPIC = keccak256(
  toBytes("TokenCreated(address,address,address)")
);

/** Extract an indexed address (last 20 bytes) from a 32-byte topic. */
function topicToAddress(
  topic: string | undefined | null
): `0x${string}` | null {
  if (!topic || topic === "0x") return null;
  return `0x${topic.slice(-40).padStart(40, "0")}` as `0x${string}`;
}

interface HypersyncLog {
  blockNumber: bigint;
  topics: string[];
}

/** Fields we ask HyperSync to return for each log. */
const LOG_FIELDS: LogField[] = [
  "Topic0",
  "Topic1",
  "Topic2",
  "Topic3",
  "BlockNumber",
];

/**
 * Query HyperSync for logs matching a given topic0 in [fromBlock, toBlock].
 * Handles pagination automatically via the `nextBlock` cursor returned by
 * HyperSync when results exceed the per-page limit.
 */
async function getLogsViaHypersync(
  topic0: `0x${string}`,
  fromBlock: bigint,
  toBlock: bigint
): Promise<HypersyncLog[]> {
  const all: HypersyncLog[] = [];
  let currentFrom = fromBlock;
  // Safety cap to avoid runaway loops on misconfigured queries
  let safety = 100;
  while (currentFrom <= toBlock && safety-- > 0) {
    const res = await hypersync.get({
      fromBlock: Number(currentFrom),
      toBlock: Number(toBlock),
      // topics is a 2D array: outer index = topic position, inner = OR options.
      // We filter on topic[0] only.
      logs: [{ topics: [[topic0]] }],
      fieldSelection: { log: LOG_FIELDS },
    });
    for (const log of res.data.logs) {
      all.push({
        blockNumber: BigInt(log.blockNumber ?? 0),
        topics: (log.topics ?? []) as string[],
      });
    }
    // HyperSync returns nextBlock when there are more results to page through.
    // If nextBlock >= toBlock, we got everything in this single call.
    if (res.nextBlock >= Number(toBlock)) break;
    if (res.nextBlock <= Number(currentFrom)) break;
    currentFrom = BigInt(res.nextBlock);
  }
  return all;
}

/**
 * Get the current chain height from HyperSync.
 * Used instead of publicClient.getBlockNumber() to avoid contributing to
 * Alchemy's free-tier load.
 */
async function getLatestBlockHypersync(): Promise<bigint> {
  return BigInt(await hypersync.getHeight());
}

// ─── State ───────────────────────────────────────────────────────────────────

/** Track the last processed block to avoid re-scanning. */
let lastBlock = START_BLOCK;

/** Tokens already migrated (or migration attempted) — avoid duplicate txs. */
const attempted = new Set<string>();

/** All known tokens discovered from TokenCreated events: token → curve address. */
const knownTokens = new Map<string, `0x${string}`>();

/** Tokens whose vault execution is already in-flight — avoid duplicate txs. */
const vaultAttempted = new Set<string>(); // key = `${vault}-${token}`

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

// ─── Vault helpers ────────────────────────────────────────────────────────────

/**
 * Scan TokenCreated events from Factory to build the knownTokens map.
 * Called once at startup and again on each graduation poll to catch new tokens.
 *
 * Uses HyperSync instead of Alchemy eth_getLogs.
 */
async function syncKnownTokens(): Promise<void> {
  if (!FACTORY_ADDR) return;
  try {
    const latestBlock = await getLatestBlockHypersync();
    const logs = await getLogsViaHypersync(
      TOKEN_CREATED_TOPIC,
      START_BLOCK,
      latestBlock
    );
    for (const log of logs) {
      // TokenCreated(address indexed token, address indexed curve, address indexed creator)
      // topic1 = token, topic2 = curve, topic3 = creator
      const token = topicToAddress(log.topics[1])?.toLowerCase();
      const curve = topicToAddress(log.topics[2]);
      if (token && curve) knownTokens.set(token, curve);
    }
    console.log(`[vault] synced ${knownTokens.size} known token(s) via HyperSync`);
  } catch (err) {
    console.error("[vault] syncKnownTokens error:", (err as Error).message);
  }
}

/**
 * Check all known tokens and execute vault buyback/LP when threshold is met.
 */
async function pollVaults(): Promise<void> {
  if (!VAULT_BUYBACK && !VAULT_LP) return;
  if (knownTokens.size === 0) return;

  for (const [token, curve] of knownTokens.entries()) {
    const tokenAddr = token as `0x${string}`;

    // Determine if token is graduated and get pair address
    let isGraduated = false;
    let pairAddress: `0x${string}` | null = null;
    try {
      isGraduated = (await publicClient.readContract({
        address: curve,
        abi: BONDING_CURVE_ABI,
        functionName: "graduated",
      })) as boolean;
      if (isGraduated) {
        pairAddress = (await publicClient.readContract({
          address: GRADUATION_ROUTER!,
          abi: GRADUATION_ROUTER_ABI,
          functionName: "tokenToPair",
          args: [tokenAddr],
        })) as `0x${string}`;
        // address(0) or sentinel = no pair yet
        if (
          pairAddress === "0x0000000000000000000000000000000000000000" ||
          pairAddress === "0x0000000000000000000000000000000000000001"
        ) {
          pairAddress = null;
        }
      }
    } catch {
      continue; // curve may not be accessible — skip
    }

    // ── VaultBuybackBurn ──────────────────────────────────────────────────
    if (VAULT_BUYBACK) {
      const bbKey = `burn-${token}`;
      if (!vaultAttempted.has(bbKey)) {
        try {
          const pending = (await publicClient.readContract({
            address: VAULT_BUYBACK,
            abi: VAULT_BUYBACK_ABI,
            functionName: "pendingBurn",
            args: [tokenAddr],
          })) as bigint;

          if (pending >= EXECUTION_THRESHOLD) {
            console.log(`[vault] BuybackBurn: ${token} has ${pending / 10n ** 18n} MON pending — executing`);
            vaultAttempted.add(bbKey);
            try {
              const hash = await walletClient.writeContract({
                address: VAULT_BUYBACK,
                abi: VAULT_BUYBACK_ABI,
                functionName: "execute",
                args: [tokenAddr],
              });
              console.log(`[vault] ✓ BuybackBurn execute tx: ${hash}`);
              const receipt = await publicClient.waitForTransactionReceipt({ hash });
              if (receipt.status === "success") {
                console.log(`[vault] ✓ BuybackBurn executed for ${token}`);
              } else {
                console.warn(`[vault] ⚠ BuybackBurn execute reverted for ${token}`);
              }
            } catch (err) {
              console.error(`[vault] ✗ BuybackBurn error for ${token}:`, (err as Error).message);
            } finally {
              vaultAttempted.delete(bbKey);
            }
          }
        } catch {
          // silent — token may not have accumulated any fees yet
        }
      }
    }

    // ── VaultLPSupport ────────────────────────────────────────────────────
    // Only execute LP support for graduated tokens with a known pair
    if (VAULT_LP && isGraduated && pairAddress) {
      const lpKey = `lp-${token}`;
      if (!vaultAttempted.has(lpKey)) {
        try {
          const pending = (await publicClient.readContract({
            address: VAULT_LP,
            abi: VAULT_LP_ABI,
            functionName: "pendingLP",
            args: [tokenAddr],
          })) as bigint;

          if (pending >= EXECUTION_THRESHOLD) {
            console.log(`[vault] LPSupport: ${token} has ${pending / 10n ** 18n} MON pending — executing`);
            vaultAttempted.add(lpKey);
            try {
              const hash = await walletClient.writeContract({
                address: VAULT_LP,
                abi: VAULT_LP_ABI,
                functionName: "execute",
                args: [tokenAddr],
              });
              console.log(`[vault] ✓ LPSupport execute tx: ${hash}`);
              const receipt = await publicClient.waitForTransactionReceipt({ hash });
              if (receipt.status === "success") {
                console.log(`[vault] ✓ LPSupport executed for ${token}`);
              } else {
                console.warn(`[vault] ⚠ LPSupport execute reverted for ${token}`);
              }
            } catch (err) {
              console.error(`[vault] ✗ LPSupport error for ${token}:`, (err as Error).message);
            } finally {
              vaultAttempted.delete(lpKey);
            }
          }
        } catch {
          // silent
        }
      }
    }
  }
}

// ─── Poll loop ────────────────────────────────────────────────────────────────

async function poll(): Promise<void> {
  try {
    const latestBlock = await getLatestBlockHypersync();
    if (latestBlock <= lastBlock) return;

    // HyperSync has no block-range limit, so we query the entire window in one
    // call (with internal pagination handled by getLogsViaHypersync).
    const logs = await getLogsViaHypersync(
      CURVE_GRADUATE_TOPIC,
      lastBlock + 1n,
      latestBlock
    );

    if (logs.length > 0) {
      console.log(
        `[keeper] Found ${logs.length} graduation event(s) in blocks ${lastBlock + 1n}–${latestBlock}`
      );
    }

    for (const log of logs) {
      // CurveGraduate(address indexed token, address indexed pool)
      // topic1 = token, topic2 = pool
      const token = topicToAddress(log.topics[1]);
      if (!token) continue;
      console.log(`[keeper] CurveGraduate: token=${token} in block ${log.blockNumber}`);
      migrate(token).catch((e) => console.error("[keeper] migrate error:", e));
    }

    lastBlock = latestBlock;
  } catch (err) {
    console.error("[keeper] poll error:", (err as Error).message);
  }
}

// ─── Startup ─────────────────────────────────────────────────────────────────

console.log(`[keeper] Starting graduation + vault keeper`);
console.log(`[keeper] GraduationRouter:  ${GRADUATION_ROUTER}`);
console.log(`[keeper] VaultBuybackBurn:  ${VAULT_BUYBACK ?? "(not configured)"}`);
console.log(`[keeper] VaultLPSupport:    ${VAULT_LP ?? "(not configured)"}`);
console.log(`[keeper] Factory:           ${FACTORY_ADDR ?? "(not configured — vault polling disabled)"}`);
console.log(`[keeper] Keeper wallet:     ${account.address}`);
console.log(`[keeper] Start block:       ${START_BLOCK}`);
console.log(`[keeper] HyperSync URL:     ${HYPERSYNC_URL}`);
console.log(`[keeper] Grad poll:         ${POLL_MS}ms`);
console.log(`[keeper] Vault poll:        ${VAULT_POLL_MS}ms`);

// Seed the known tokens map before first vault poll
syncKnownTokens().catch(console.error);

// Initial poll immediately, then on interval (or exit if ONE_SHOT)
poll().then(() => {
  if (ONE_SHOT) {
    // In ONE_SHOT mode, also run a single vault poll before exiting
    syncKnownTokens()
      .then(() => pollVaults())
      .then(() => {
        console.log("[keeper] ONE_SHOT mode — exiting after single poll");
        process.exit(0);
      })
      .catch(console.error);
    return;
  }

  setInterval(poll, POLL_MS);

  // Vault polling runs on a slower cadence (default 60s) to reduce RPC load.
  // It re-syncs known tokens on each cycle to catch newly launched tokens.
  setInterval(async () => {
    await syncKnownTokens();
    await pollVaults();
  }, VAULT_POLL_MS);
});