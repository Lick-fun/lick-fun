/**
 * /api/trades/[curve]
 *
 * Server-side API route that fetches CurveBuy + CurveSell logs directly via
 * the Alchemy RPC (viem publicClient.getLogs). This supplements the Envio
 * indexer — any trades the indexer missed will still appear in the token
 * page trade table.
 *
 * Previously this route queried Envio's HyperSync HTTP API to work around
 * Alchemy's free-tier 10-block eth_getLogs range limit. Now that the project
 * runs on Alchemy's Pay-As-You-Go plan (unlimited block range on Monad
 * Mainnet), we query Alchemy directly and no longer need a separate service
 * or API token for this route.
 *
 * Query params:
 *   tokenId   – lowercase token address (for Trade.token_id)
 *   fromBlock – first block to scan (defaults to contract deploy block)
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem, defineChain } from "viem";

/* ── Event definitions ──────────────────────────────────────────────────── */

const BUY_EVENT = parseAbiItem(
  "event CurveBuy(address indexed buyer, address indexed token, uint256 amountIn, uint256 amountOut)"
);
const SELL_EVENT = parseAbiItem(
  "event CurveSell(address indexed seller, address indexed token, uint256 amountIn, uint256 amountOut)"
);

/* ── Constants ──────────────────────────────────────────────────────────── */

/** Maximum total block lookback regardless of fromBlock param. */
const MAX_LOOKBACK = 200_000n;
/** Fallback start block: Monad mainnet contract deploy block. */
const MONAD_DEPLOY_BLOCK = 83_961_211n;
/** Maximum block span per getLogs call — chunked defensively. */
const MAX_LOG_CHUNK = 500_000n;

/**
 * Monad mainnet RPC (Alchemy PAYG — no eth_getLogs block-range limit).
 *
 * Server-side code (no browser Origin header) must NOT use an
 * origin-restricted Alchemy key — Alchemy's domain allowlist only inspects
 * the Origin/Referer header, which Node.js server requests never send, so a
 * browser-restricted key gets rejected here with "Unspecified origin not on
 * whitelist". Prefer a dedicated, unrestricted server key (MONAD_RPC_URL);
 * fall back to the public browser var only if no server override is set.
 */
const RPC_URL =
  process.env.MONAD_RPC_URL ||
  process.env.NEXT_PUBLIC_MONAD_RPC ||
  "https://rpc.monad.xyz";

const monadMainnet = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

const publicClient = createPublicClient({
  chain: monadMainnet,
  transport: http(RPC_URL),
});

/* ── Helpers ────────────────────────────────────────────────────────────── */

/**
 * Fetch CurveBuy/CurveSell logs for a curve address in [fromBlock, toBlock],
 * chunking the range defensively to avoid oversized single requests.
 */
async function getTradeLogs(
  curveAddr: `0x${string}`,
  fromBlock: bigint,
  toBlock: bigint
) {
  const buys: Awaited<ReturnType<typeof publicClient.getLogs>> = [];
  const sells: Awaited<ReturnType<typeof publicClient.getLogs>> = [];

  let cursor = fromBlock;
  while (cursor <= toBlock) {
    const end = cursor + MAX_LOG_CHUNK > toBlock ? toBlock : cursor + MAX_LOG_CHUNK;

    const [buyLogs, sellLogs] = await Promise.all([
      publicClient.getLogs({
        address: curveAddr,
        event: BUY_EVENT,
        fromBlock: cursor,
        toBlock: end,
      }),
      publicClient.getLogs({
        address: curveAddr,
        event: SELL_EVENT,
        fromBlock: cursor,
        toBlock: end,
      }),
    ]);

    buys.push(...buyLogs);
    sells.push(...sellLogs);
    cursor = end + 1n;
  }

  return { buys, sells };
}

/** Fetch block timestamps for a set of unique block numbers. */
async function getBlockTimestamps(
  blockNumbers: Set<bigint>
): Promise<Map<number, number>> {
  const timestamps = new Map<number, number>();
  await Promise.all(
    Array.from(blockNumbers).map(async (blockNumber) => {
      try {
        const block = await publicClient.getBlock({ blockNumber });
        timestamps.set(Number(blockNumber), Number(block.timestamp));
      } catch {
        // leave unset — falls back to 0 downstream
      }
    })
  );
  return timestamps;
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

    const latestBlock = await publicClient.getBlockNumber();

    // Determine fromBlock.
    // When the caller supplies an explicit startBlock (the token's deploy block),
    // use it directly so we scan the full history — Alchemy PAYG has no
    // block-range limit on Monad Mainnet, so this is safe.
    // Only fall back to the MAX_LOOKBACK window when no startBlock was given, to
    // avoid scanning the entire chain history for tokens with no known deploy block.
    const requestedFrom = fromBlockParam
      ? BigInt(fromBlockParam)
      : MONAD_DEPLOY_BLOCK;

    const fromBlockBig = fromBlockParam
      ? requestedFrom                            // explicit startBlock → use as-is
      : latestBlock > MAX_LOOKBACK                // no startBlock → recent-window fallback
        ? latestBlock - MAX_LOOKBACK
        : MONAD_DEPLOY_BLOCK;

    const fromBlock = fromBlockBig;
    const curveAddr = curve.toLowerCase() as `0x${string}`;

    // Fetch all buy/sell logs from Alchemy (chunked, no hard block-range limit)
    const { buys, sells } = await getTradeLogs(curveAddr, fromBlock, latestBlock);

    // Collect unique block numbers to resolve timestamps
    const blockNumbers = new Set<bigint>();
    for (const log of [...buys, ...sells]) {
      if (log.blockNumber != null) blockNumbers.add(log.blockNumber);
    }
    const blockTimestamps = await getBlockTimestamps(blockNumbers);

    // Build serialised trade objects (bigints → strings for JSON transport)
    const buyTrades = buys.map((log) => {
      const args = (log as unknown as { args: Record<string, unknown> }).args as {
        buyer?: `0x${string}`;
        token?: `0x${string}`;
        amountIn?: bigint;
        amountOut?: bigint;
      };

      return {
        id: `${log.transactionHash!.toLowerCase()}-${log.logIndex}`,
        token_id: tokenId.toLowerCase() || args.token?.toLowerCase() || "",
        trader: args.buyer?.toLowerCase() ?? "",
        isBuy: true,
        amountIn: (args.amountIn ?? 0n).toString(),
        amountOut: (args.amountOut ?? 0n).toString(),
        blockNumber: Number(log.blockNumber),
        blockTimestamp: (
          blockTimestamps.get(Number(log.blockNumber)) ?? 0
        ).toString(),
        penaltyBps: 0,
      };
    });

    const sellTrades = sells.map((log) => {
      const args = (log as unknown as { args: Record<string, unknown> }).args as {
        seller?: `0x${string}`;
        token?: `0x${string}`;
        amountIn?: bigint;
        amountOut?: bigint;
      };

      return {
        id: `${log.transactionHash!.toLowerCase()}-${log.logIndex}`,
        token_id: tokenId.toLowerCase() || args.token?.toLowerCase() || "",
        trader: args.seller?.toLowerCase() ?? "",
        isBuy: false,
        amountIn: (args.amountIn ?? 0n).toString(),
        amountOut: (args.amountOut ?? 0n).toString(),
        blockNumber: Number(log.blockNumber),
        blockTimestamp: (
          blockTimestamps.get(Number(log.blockNumber)) ?? 0
        ).toString(),
        penaltyBps: 0,
      };
    });

    const trades = [...buyTrades, ...sellTrades].sort(
      (a, b) => b.blockNumber - a.blockNumber
    );

    return NextResponse.json({
      trades,
      meta: {
        fromBlock: fromBlock.toString(),
        toBlock: latestBlock.toString(),
        buyCount: buyTrades.length,
        sellCount: sellTrades.length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/trades] unhandled error:", message);
    return NextResponse.json(
      { trades: [], error: message },
      { status: 500 }
    );
  }
}
