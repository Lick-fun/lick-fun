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
 *
 * Security:
 *   - execute() is permissionless — keeper wallet only needs gas money.
 *   - Never fund this wallet with more than ~50 MON for gas reserves.
 */

import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";
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

const CURVE_GRADUATE_ABI = parseAbi([
  "event CurveGraduate(address indexed token, address indexed pool)",
]);

const TOKEN_CREATED_ABI = parseAbi([
  "event TokenCreated(address indexed token, address indexed curve, address indexed creator)",
]);

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

const FACTORY_ABI = parseAbi([
  "function getCurve(address token) external view returns (address curve)",
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
 */
async function syncKnownTokens(): Promise<void> {
  if (!FACTORY_ADDR) return;
  try {
    const latestBlock = await publicClient.getBlockNumber();
    let from = START_BLOCK;
    while (from <= latestBlock) {
      const to = from + LOG_CHUNK - 1n < latestBlock ? from + LOG_CHUNK - 1n : latestBlock;
      const logs = await publicClient.getLogs({
        address: FACTORY_ADDR,
        event: TOKEN_CREATED_ABI[0],
        fromBlock: from,
        toBlock: to,
      });
      for (const log of logs) {
        const token = (log.args.token as string).toLowerCase();
        const curve = log.args.curve as `0x${string}`;
        if (token && curve) knownTokens.set(token, curve);
      }
      from = to + 1n;
    }
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
      isGraduated = await publicClient.readContract({
        address: curve,
        abi: BONDING_CURVE_ABI,
        functionName: "graduated",
      }) as boolean;
      if (isGraduated) {
        pairAddress = await publicClient.readContract({
          address: GRADUATION_ROUTER!,
          abi: GRADUATION_ROUTER_ABI,
          functionName: "tokenToPair",
          args: [tokenAddr],
        }) as `0x${string}`;
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
          const pending = await publicClient.readContract({
            address: VAULT_BUYBACK,
            abi: VAULT_BUYBACK_ABI,
            functionName: "pendingBurn",
            args: [tokenAddr],
          }) as bigint;

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
          const pending = await publicClient.readContract({
            address: VAULT_LP,
            abi: VAULT_LP_ABI,
            functionName: "pendingLP",
            args: [tokenAddr],
          }) as bigint;

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

// Monad public RPC limits eth_getLogs to 99 blocks per request.
const LOG_CHUNK = 99n;

async function poll(): Promise<void> {
  try {
    const latestBlock = await publicClient.getBlockNumber();
    if (latestBlock <= lastBlock) return;

    // Chunk the range into 99-block windows to satisfy the RPC limit.
    let from = lastBlock + 1n;
    while (from <= latestBlock) {
      const to = from + LOG_CHUNK - 1n < latestBlock ? from + LOG_CHUNK - 1n : latestBlock;

      const logs = await publicClient.getLogs({
        event: CURVE_GRADUATE_ABI[0],
        fromBlock: from,
        toBlock: to,
      });

      if (logs.length > 0) {
        console.log(`[keeper] Found ${logs.length} graduation event(s) in blocks ${from}–${to}`);
      }

      for (const log of logs) {
        const token = log.args.token as `0x${string}`;
        console.log(`[keeper] CurveGraduate: token=${token} in block ${log.blockNumber}`);
        migrate(token).catch((e) => console.error("[keeper] migrate error:", e));
      }

      from = to + 1n;
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
