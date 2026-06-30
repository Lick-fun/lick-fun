/**
 * /api/trades/[curve]
 *
 * Server-side API route that fetches CurveBuy + CurveSell logs via the
 * Envio HyperSync HTTP API (https://monad.hypersync.xyz). This supplements
 * the Envio indexer — any trades the indexer missed (e.g. during RPC
 * rate-limit gaps at launch) will still appear in the token page trade table.
 *
 * HyperSync has no block-range limits and returns block timestamps inline,
 * so it avoids all RPC provider restrictions (e.g. Alchemy free tier's
 * 10-block eth_getLogs limit).
 *
 * HyperSync now requires a bearer API token (created at
 * https://app.envio.dev/api-tokens). The token is read from the
 * `ENVIO_API_TOKEN` env var (falls back to `HYPERSYNC_API_TOKEN`).
 *
 * NOTE: The log-query endpoint is `${HYPERSYNC_URL}/query` (no `/v1/` prefix).
 * The `/v1/query` path returns 404 with an empty body, while `/query` returns
 * 200 with the same payload. The NAPI SDK used by the keeper handles this
 * internally; here we hit the REST endpoint directly.
 *
 * Query params:
 *   tokenId   – lowercase token address (for Trade.token_id)
 *   fromBlock – first block to scan (defaults to contract deploy block)
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { keccak256, toBytes } from "viem";

/* ── Event topic hashes ─────────────────────────────────────────────────── */

const BUY_TOPIC0 = keccak256(
  toBytes("CurveBuy(address,address,uint256,uint256)")
);
const SELL_TOPIC0 = keccak256(
  toBytes("CurveSell(address,address,uint256,uint256)")
);

/* ── Constants ──────────────────────────────────────────────────────────── */

/** Maximum total block lookback regardless of fromBlock param. */
const MAX_LOOKBACK = 200_000n;
/** Fallback start block: Monad mainnet contract deploy block. */
const MONAD_DEPLOY_BLOCK = 83_961_211n;
/** Envio HyperSync base URL for Monad mainnet. */
const HYPERSYNC_URL = "https://monad.hypersync.xyz";

/* ── HyperSync types ────────────────────────────────────────────────────── */

interface HyperSyncLog {
  block_number: number;
  transaction_hash: string;
  log_index: number;
  topic0: string | null;
  topic1: string | null;
  topic2: string | null;
  data: string | null;
}

interface HyperSyncResponse {
  data: Array<{
    logs: HyperSyncLog[];
    blocks: Array<{ number: number; timestamp: number }>;
  }>;
  next_block: number;
  archive_height: number;
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

/**
 * Read the Envio/HyperSync API token from env. Set `ENVIO_API_TOKEN` (or
 * `HYPERSYNC_API_TOKEN`) in your deployment. Without a token, HyperSync
 * returns 401 "token is malformed".
 */
function getHyperSyncToken(): string | null {
  return (
    process.env.ENVIO_API_TOKEN?.trim() ||
    process.env.HYPERSYNC_API_TOKEN?.trim() ||
    null
  );
}

/**
 * Headers for any HyperSync request. Includes Authorization: Bearer <token>
 * when a token is configured. Also includes X-Envio-Token (Envio's legacy
 * header) so the token works across SDK versions.
 */
function hyperSyncHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getHyperSyncToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["X-Envio-Token"] = token;
  }
  return headers;
}

/** Extract an address from a 32-byte padded hex topic. */
function topicToAddress(topic: string): string {
  return "0x" + topic.slice(-40).toLowerCase();
}

/**
 * Decode two packed uint256 values from ABI-encoded log data.
 * Layout: [amountIn (32 bytes)][amountOut (32 bytes)]
 */
function decodeUint256Pair(data: string): [bigint, bigint] {
  const hex = data.startsWith("0x") ? data.slice(2) : data;
  const amountIn = BigInt("0x" + (hex.slice(0, 64) || "0"));
  const amountOut = BigInt("0x" + (hex.slice(64, 128) || "0"));
  return [amountIn, amountOut];
}

/** Fetch the latest indexed block height from HyperSync. */
async function getHyperSyncHeight(): Promise<number> {
  const res = await fetch(`${HYPERSYNC_URL}/height`, {
    headers: hyperSyncHeaders(),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`HyperSync /height error ${res.status}`);
  }
  const json = (await res.json()) as { height: number };
  return json.height;
}

/**
 * Fetch all CurveBuy/CurveSell logs for a curve address from HyperSync.
 * Automatically paginates via the next_block cursor — no block-range limits.
 */
async function queryHyperSync(
  curveAddr: string,
  fromBlock: number,
  toBlock: number
): Promise<{
  logs: HyperSyncLog[];
  blockTimestamps: Map<number, number>;
}> {
  const allLogs: HyperSyncLog[] = [];
  const blockTimestamps = new Map<number, number>();
  let currentFrom = fromBlock;

  while (currentFrom <= toBlock) {
    const body = {
      from_block: currentFrom,
      to_block: toBlock,
      logs: [
        {
          address: [curveAddr],
          topics: [[BUY_TOPIC0, SELL_TOPIC0]],
        },
      ],
      field_selection: {
        log: [
          "block_number",
          "transaction_hash",
          "log_index",
          "topic0",
          "topic1",
          "topic2",
          "data",
        ],
        block: ["number", "timestamp"],
      },
    };

    const res = await fetch(`${HYPERSYNC_URL}/query`, {
      method: "POST",
      headers: hyperSyncHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HyperSync query error ${res.status}: ${text}`);
    }

    const json: HyperSyncResponse = await res.json();

    for (const batch of json.data) {
      allLogs.push(...batch.logs);
      for (const block of batch.blocks) {
        blockTimestamps.set(block.number, block.timestamp);
      }
    }

    // Pagination: continue if HyperSync returns a next_block inside our range.
    // A next_block <= currentFrom means no progress (shouldn't happen), abort.
    if (json.next_block <= currentFrom || json.next_block > toBlock) {
      break;
    }
    currentFrom = json.next_block;
  }

  return { logs: allLogs, blockTimestamps };
}

/* ── Route handler ──────────────────────────────────────────────────────── */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ curve: string }> }
) {
  try {
    const { curve } = await params;
    const tokenId = req.nextUrl.searchParams.get("tokenId") ?? "";
    const fromBlockParam = req.nextUrl.searchParams.get("fromBlock");

    // Get the current chain tip from HyperSync (no RPC call needed)
    const latestBlock = await getHyperSyncHeight();
    const latestBlockBig = BigInt(latestBlock);

    // Determine fromBlock, capped to MAX_LOOKBACK from latest
    const requestedFrom = fromBlockParam
      ? BigInt(fromBlockParam)
      : MONAD_DEPLOY_BLOCK;

    const fromBlockBig =
      latestBlockBig - requestedFrom > MAX_LOOKBACK
        ? latestBlockBig - MAX_LOOKBACK
        : requestedFrom;

    const fromBlock = Number(fromBlockBig);
    const curveAddr = curve.toLowerCase();

    // Fetch all buy/sell logs from HyperSync (paginated, no block-range limits)
    const { logs, blockTimestamps } = await queryHyperSync(
      curveAddr,
      fromBlock,
      latestBlock
    );

    // Build serialised trade objects (bigints → strings for JSON transport)
    const trades = logs
      .filter((log) => log.topic0 && log.topic1 && log.topic2 && log.data)
      .map((log) => {
        const isBuy =
          log.topic0!.toLowerCase() === BUY_TOPIC0.toLowerCase();
        const [amountIn, amountOut] = decodeUint256Pair(log.data!);
        const trader = topicToAddress(log.topic1!); // indexed buyer / seller
        const derivedTokenId = topicToAddress(log.topic2!); // indexed token

        return {
          id: `${log.transaction_hash}-${log.log_index}`,
          token_id:
            tokenId.toLowerCase() || derivedTokenId,
          trader,
          isBuy,
          amountIn: amountIn.toString(),
          amountOut: amountOut.toString(),
          blockNumber: log.block_number,
          blockTimestamp: (
            blockTimestamps.get(log.block_number) ?? 0
          ).toString(),
          penaltyBps: 0,
        };
      })
      .sort((a, b) => b.blockNumber - a.blockNumber);

    const buyCount = trades.filter((t) => t.isBuy).length;
    const sellCount = trades.filter((t) => !t.isBuy).length;

    return NextResponse.json({
      trades,
      meta: {
        fromBlock: fromBlock.toString(),
        toBlock: latestBlock.toString(),
        buyCount,
        sellCount,
      },
    });
  } catch (err) {
    // Surface a clear, actionable error: if ENVIO_API_TOKEN is missing,
    // the user gets one obvious fix instead of a stack trace dump.
    const message = err instanceof Error ? err.message : String(err);
    const noTokenConfigured = !getHyperSyncToken();
    if (noTokenConfigured) {
      console.error(
        "[api/trades] ENVIO_API_TOKEN is not set — add it to .env.local or your deployment env. " +
          "Generate a token at https://app.envio.dev/api-tokens"
      );
    }
    console.error("[api/trades] unhandled error:", message);
    const hint = noTokenConfigured
      ? "ENVIO_API_TOKEN missing — generate one at https://app.envio.dev/api-tokens and add it to .env.local"
      : message;
    return NextResponse.json(
      { trades: [], error: hint },
      { status: 500 }
    );
  }
}
