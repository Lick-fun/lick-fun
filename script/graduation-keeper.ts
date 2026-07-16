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
 *   KEEPER_RPC_URL              — Monad RPC (dedicated Alchemy provider, PAYG plan)
 *   KEEPER_PRIVATE_KEY          — Private key for the funded keeper wallet (0x...)
 *   GRADUATION_ROUTER_ADDR      — GraduationRouter contract address
 *   VAULT_BUYBACK_ADDR          — VaultBuybackBurn v2 contract address
 *   VAULT_LP_ADDR               — VaultLPSupport v2 contract address
 *   FACTORY_ADDR                — Factory contract address (for TokenCreated events)
 *   START_BLOCK                 — Block to start scanning from (Factory deploy block)
 *   POLL_INTERVAL_MS            — Optional. How often to poll (default 6000ms)
 *   VAULT_POLL_INTERVAL_MS      — Optional. How often to check vault balances (default 60000ms)
 *
 * Log scanning:
 *   All eth_getLogs / eth_blockNumber calls go straight through the Alchemy RPC
 *   configured via KEEPER_RPC_URL. Alchemy's Pay-As-You-Go plan has no block-range
 *   limit on Monad Mainnet (the old 10-block free-tier cap that previously forced
 *   this keeper onto Envio HyperSync no longer applies), so a single viem
 *   publicClient handles reads, writes, and log queries.
 *
 * Security:
 *   - execute() is permissionless — keeper wallet only needs gas money.
 *   - Never fund this wallet with more than ~50 MON for gas reserves.
 */

import { createPublicClient, createWalletClient, http, parseAbi, parseAbiItem } from "viem";
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

// ─── Untracked-vault-balance monitoring (Telegram alert) ───────────────────
// The live FeeRouter predates the receiveForToken() audit fix and can never
// be replaced (Factory.feeRouter is set-once) — see MEMORY.md. Every trade
// fee is raw-sent to the vaults' bare receive(), which does NOT populate the
// per-token pendingBurn/pendingLP mapping that execute()'s threshold check
// relies on. This makes reconciliation (script/generate-reconcile-batch.mjs
// + a Safe multisig batch) a RECURRING manual task, not a one-time fix —
// funds silently pile up "untracked" until someone remembers to run it.
//
// Since sweep() is deliberately onlyOwner (multisig-only — an audit fix we
// should not weaken), the keeper cannot move funds itself. Instead it
// monitors vault.balance() vs. the sum of tracked pendingBurn/pendingLP
// across all known tokens, and posts a Telegram alert once the untracked
// amount crosses a configurable threshold, so reconciliation happens on a
// schedule instead of by luck.
const ALERT_BOT_TOKEN = process.env.ALERT_TELEGRAM_BOT_TOKEN;
const ALERT_CHAT_ID = process.env.ALERT_TELEGRAM_CHAT_ID;
const UNTRACKED_ALERT_THRESHOLD = BigInt(
  Math.round(Number(process.env.UNTRACKED_ALERT_THRESHOLD_MON ?? "30") * 1e18)
);
// Re-alert every time the untracked amount grows by at least this much more
// beyond the last alert, so a single ack doesn't silence future growth.
const UNTRACKED_ALERT_STEP = BigInt(
  Math.round(Number(process.env.UNTRACKED_ALERT_STEP_MON ?? "20") * 1e18)
);

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
  // Custom errors — included so viem can decode reverts with human-readable
  // names instead of raw undecodable selectors (e.g. 0xd92e233d).
  "error NotGraduated()",
  "error AlreadyMigrated()",
  "error ZeroAddress()",
]);

// Minimal ABI for verifying a token actually belongs to Lick.fun's own
// Factory before attempting migration. See isLickFunToken() below for why.
const FACTORY_LOOKUP_ABI = parseAbi([
  "function tokenToCurve(address token) external view returns (address)",
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

// Event signatures used for getLogs — parsed once at startup.
const CURVE_GRADUATE_EVENT = parseAbiItem(
  "event CurveGraduate(address indexed token, address indexed pool)"
);
const TOKEN_CREATED_EVENT = parseAbiItem(
  "event TokenCreated(address indexed token, address indexed curve, address indexed creator)"
);

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

/**
 * Maximum block span per getLogs call. Alchemy PAYG has no hard block-range
 * limit on Monad Mainnet, but we still chunk defensively to avoid oversized
 * responses / timeouts on very wide ranges (e.g. first boot from deploy block).
 */
const MAX_LOG_CHUNK = 500_000n;

/**
 * Fetch logs for a given event across [fromBlock, toBlock], chunking the
 * range defensively so we never send a single unbounded request.
 */
async function getLogsChunked(
  event: typeof CURVE_GRADUATE_EVENT | typeof TOKEN_CREATED_EVENT,
  address: `0x${string}` | undefined,
  fromBlock: bigint,
  toBlock: bigint
): Promise<Array<{ blockNumber: bigint; args: Record<string, unknown> }>> {
  const all: Array<{ blockNumber: bigint; args: Record<string, unknown> }> = [];
  let cursor = fromBlock;
  while (cursor <= toBlock) {
    const end = cursor + MAX_LOG_CHUNK > toBlock ? toBlock : cursor + MAX_LOG_CHUNK;
    const logs = await publicClient.getLogs({
      address,
      event: event as typeof CURVE_GRADUATE_EVENT,
      fromBlock: cursor,
      toBlock: end,
    });
    for (const log of logs) {
      all.push({
        blockNumber: log.blockNumber,
        args: (log as unknown as { args: Record<string, unknown> }).args,
      });
    }
    cursor = end + 1n;
  }
  return all;
}


/** Get the current chain height via the Alchemy RPC. */
async function getLatestBlock(): Promise<bigint> {
  return publicClient.getBlockNumber();
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

/** Last untracked amount (wei) we alerted on, per vault — avoids alert spam. */
const lastUntrackedAlerted = new Map<string, bigint>(); // key = vault address

// ─── Alerting ────────────────────────────────────────────────────────────────

async function sendTelegramAlert(text: string): Promise<void> {
  if (!ALERT_BOT_TOKEN || !ALERT_CHAT_ID) return;
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${ALERT_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: ALERT_CHAT_ID,
          text,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        }),
      }
    );
    if (!res.ok) {
      console.error(`[alert] Telegram API returned ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.error("[alert] Failed to send Telegram alert:", (err as Error).message);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Verify that `token` was actually created by Lick.fun's own Factory before
 * attempting migration.
 *
 * WHY THIS EXISTS: CurveGraduate(address indexed token, address indexed pool)
 * is a generic-sounding event signature. Other bonding-curve launchpads on
 * Monad happen to emit an event with the exact same signature/topic hash from
 * their own (unrelated) contracts. Because poll() scans logs chain-wide with
 * no `address` filter (to catch every Lick.fun BondingCurve without knowing
 * their addresses in advance), it can pick up a foreign platform's graduation
 * event by coincidence. Attempting to migrate such a token via
 * GraduationRouter.migrateLiquidity() always reverts with ZeroAddress()
 * because Factory.tokenToCurve(token) is unset for it — this is the exact
 * failure seen in production for token 0x0a917fCC...0389d7777 ("Salmonad"),
 * which turned out to belong to a different launchpad entirely (confirmed via
 * `cast run` trace: it uses setIsGraduated()/Uniswap-V3-style CLMM migration,
 * not Lick.fun's BondingCurve/LickPair flow).
 *
 * Filtering on Factory.tokenToCurve() here stops the keeper from ever
 * sending a doomed transaction (and spamming error logs) for tokens that
 * aren't actually part of the Lick.fun ecosystem.
 */
async function isLickFunToken(token: `0x${string}`): Promise<boolean> {
  if (!FACTORY_ADDR) return true; // can't verify — fall back to old behavior
  try {
    const curve = await publicClient.readContract({
      address: FACTORY_ADDR,
      abi: FACTORY_LOOKUP_ABI,
      functionName: "tokenToCurve",
      args: [token],
    });
    return curve !== "0x0000000000000000000000000000000000000000";
  } catch {
    // If the lookup itself fails, don't block migration attempts — treat as
    // unknown/true so we don't silently mask a real RPC problem.
    return true;
  }
}

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
    const latestBlock = await getLatestBlock();
    const logs = await getLogsChunked(
      TOKEN_CREATED_EVENT,
      FACTORY_ADDR,
      START_BLOCK,
      latestBlock
    );
    for (const log of logs) {
      const args = log.args as { token?: `0x${string}`; curve?: `0x${string}` };
      const token = args.token?.toLowerCase();
      const curve = args.curve;
      if (token && curve) knownTokens.set(token, curve);
    }
    console.log(`[vault] synced ${knownTokens.size} known token(s) via Alchemy`);
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

/**
 * Compares a vault's raw MON balance against the sum of its tracked
 * per-token mapping (pendingBurn or pendingLP) across all known tokens.
 * Any positive difference is MON that arrived via the FeeRouter's raw-send
 * path and is invisible to execute()'s threshold check — i.e. "untracked".
 *
 * This is read-only (no txs) — it only decides whether to fire a Telegram
 * alert so a human can run script/generate-reconcile-batch.mjs and execute
 * the resulting Safe batch. Alerts only re-fire once the untracked amount
 * grows by at least UNTRACKED_ALERT_STEP beyond the last alert, so this is
 * safe to poll frequently without spamming the chat.
 */
async function checkUntrackedVaultBalance(
  vault: `0x${string}`,
  abi: typeof VAULT_BUYBACK_ABI | typeof VAULT_LP_ABI,
  pendingFn: "pendingBurn" | "pendingLP",
  label: string
): Promise<void> {
  try {
    const balance = await publicClient.getBalance({ address: vault });
    let trackedSum = 0n;
    for (const token of knownTokens.keys()) {
      try {
        const pending = (await publicClient.readContract({
          address: vault,
          abi,
          functionName: pendingFn,
          args: [token as `0x${string}`],
        })) as bigint;
        trackedSum += pending;
      } catch {
        // skip token if the read fails — don't let one bad read block the check
      }
    }

    const untracked = balance > trackedSum ? balance - trackedSum : 0n;
    if (untracked < UNTRACKED_ALERT_THRESHOLD) {
      // Below threshold — clear any prior alert state so the next crossing re-alerts.
      lastUntrackedAlerted.delete(vault.toLowerCase());
      return;
    }

    const lastAlerted = lastUntrackedAlerted.get(vault.toLowerCase()) ?? 0n;
    if (untracked < lastAlerted + UNTRACKED_ALERT_STEP) {
      return; // already alerted for roughly this amount — avoid spam
    }

    lastUntrackedAlerted.set(vault.toLowerCase(), untracked);
    const untrackedMon = Number(untracked) / 1e18;
    const balanceMon = Number(balance) / 1e18;
    console.warn(
      `[vault] ⚠ ${label} (${vault}) has ${untrackedMon.toFixed(2)} MON untracked (balance ${balanceMon.toFixed(2)} MON) — run generate-reconcile-batch.mjs`
    );
    await sendTelegramAlert(
      `⚠️ *Vault reconciliation needed*\n\n` +
        `*${label}* (\`${vault}\`) has *${untrackedMon.toFixed(2)} MON* untracked ` +
        `(total balance ${balanceMon.toFixed(2)} MON).\n\n` +
        `This MON arrived via the FeeRouter's legacy raw-send path and isn't ` +
        `attributed to any token yet, so it won't count toward the 50 MON ` +
        `execute() threshold.\n\n` +
        `Run \`node script/generate-reconcile-batch.mjs\` and execute the ` +
        `resulting Safe batch to fix.`
    );
  } catch (err) {
    console.error(`[vault] checkUntrackedVaultBalance error for ${label}:`, (err as Error).message);
  }
}

// ─── Poll loop ────────────────────────────────────────────────────────────────

async function poll(): Promise<void> {
  try {
    const latestBlock = await getLatestBlock();
    if (latestBlock <= lastBlock) return;

    const logs = await getLogsChunked(
      CURVE_GRADUATE_EVENT,
      undefined,
      lastBlock + 1n,
      latestBlock
    );

    if (logs.length > 0) {
      console.log(
        `[keeper] Found ${logs.length} graduation event(s) in blocks ${lastBlock + 1n}–${latestBlock}`
      );
    }

    for (const log of logs) {
      const args = log.args as { token?: `0x${string}` };
      const token = args.token;
      if (!token) continue;
      console.log(`[keeper] CurveGraduate: token=${token} in block ${log.blockNumber}`);
      isLickFunToken(token)
        .then((isOurs) => {
          if (!isOurs) {
            console.log(
              `[keeper] ${token} — not a Lick.fun token (Factory.tokenToCurve is zero), skipping migration attempt`
            );
            return;
          }
          return migrate(token);
        })
        .catch((e) => console.error("[keeper] migrate error:", e));
    }

    lastBlock = latestBlock;
  } catch (err) {
    console.error("[keeper] poll error:", (err as Error).message);
  }
}

// ─── Startup ─────────────────────────────────────────────────────────────────

// ─── Graceful shutdown & error guards ───────────────────────────────────────
// Railway (and most container platforms) send SIGTERM on redeploy/restart.
// Without an explicit handler, npm's process wrapper logs a scary
// "npm error signal SIGTERM" even though nothing is actually broken.
// Handling the signal ourselves lets us exit(0) cleanly and log intent.
let shuttingDown = false;
function handleShutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[keeper] Received ${signal} — shutting down gracefully`);
  process.exit(0);
}
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("[keeper] Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[keeper] Uncaught exception:", err);
});

console.log(`[keeper] Starting graduation + vault keeper`);

console.log(`[keeper] GraduationRouter:  ${GRADUATION_ROUTER}`);
console.log(`[keeper] VaultBuybackBurn:  ${VAULT_BUYBACK ?? "(not configured)"}`);
console.log(`[keeper] VaultLPSupport:    ${VAULT_LP ?? "(not configured)"}`);
console.log(`[keeper] Factory:           ${FACTORY_ADDR ?? "(not configured — vault polling disabled)"}`);
console.log(`[keeper] Keeper wallet:     ${account.address}`);
console.log(`[keeper] Start block:       ${START_BLOCK}`);
console.log(`[keeper] RPC:               ${RPC_URL}`);
console.log(`[keeper] Grad poll:         ${POLL_MS}ms`);
console.log(`[keeper] Vault poll:        ${VAULT_POLL_MS}ms`);
console.log(
  `[keeper] Untracked alert:   ${ALERT_BOT_TOKEN && ALERT_CHAT_ID ? `enabled (threshold ${Number(UNTRACKED_ALERT_THRESHOLD) / 1e18} MON, step ${Number(UNTRACKED_ALERT_STEP) / 1e18} MON)` : "disabled — set ALERT_TELEGRAM_BOT_TOKEN + ALERT_TELEGRAM_CHAT_ID"}`
);

// Seed the known tokens map before first vault poll
syncKnownTokens().catch(console.error);

// Initial poll immediately, then on interval (or exit if ONE_SHOT)
poll().then(() => {
  if (ONE_SHOT) {
    // In ONE_SHOT mode, also run a single vault poll before exiting
    syncKnownTokens()
      .then(() => pollVaults())
      .then(async () => {
        if (VAULT_BUYBACK) {
          await checkUntrackedVaultBalance(VAULT_BUYBACK, VAULT_BUYBACK_ABI, "pendingBurn", "VaultBuybackBurn");
        }
        if (VAULT_LP) {
          await checkUntrackedVaultBalance(VAULT_LP, VAULT_LP_ABI, "pendingLP", "VaultLPSupport");
        }
      })
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
    if (VAULT_BUYBACK) {
      await checkUntrackedVaultBalance(VAULT_BUYBACK, VAULT_BUYBACK_ABI, "pendingBurn", "VaultBuybackBurn");
    }
    if (VAULT_LP) {
      await checkUntrackedVaultBalance(VAULT_LP, VAULT_LP_ABI, "pendingLP", "VaultLPSupport");
    }
  }, VAULT_POLL_MS);
});
