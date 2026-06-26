"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReadContracts } from "wagmi";
import { getGraphQLClient } from "@/lib/graphql/client";
import {
  QUERY_TRADES_BY_TRADER,
  type TradeEntity,
} from "@/lib/graphql/queries";
import { getTokenPrice } from "@/lib/wagmi/contracts";

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Types                                                                            */
/* ──────────────────────────────────────────────────────────────────────────────── */

export interface Holding {
  /** Token address (lowercase) */
  tokenId: string;
  /** Token name (from indexer or contract) */
  name: string;
  /** Token symbol (from indexer or contract) */
  symbol: string;
  /** Current on-chain balance (raw wei) */
  balance: bigint;
  /** Current on-chain balance (human-readable, e.g. "1234.56") */
  balanceFormatted: number;
  /** Total MON spent buying this token (wei) */
  totalBoughtMon: bigint;
  /** Total MON received selling this token (wei) */
  totalSoldMon: bigint;
  /** Net cost basis in MON (bought - sold) */
  costBasisMon: number;
  /** Average buy price in MON per token */
  avgBuyPriceMon: number;
  /** Current price in MON per token (from bonding curve) */
  currentPriceMon: number;
  /** Current value in MON (balance × current price) */
  currentValueMon: number;
  /** Profit/loss in MON (current value - cost basis) */
  pnlMon: number;
  /** Profit/loss as percentage */
  pnlPct: number;
  /** Whether the token has graduated (price is frozen) */
  graduated: boolean;
  /** Current market cap in MON */
  marketCapMon: number;
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* ERC-20 ABI (minimal — only balanceOf)                                            */
/* ──────────────────────────────────────────────────────────────────────────────── */

const ERC20_BALANCE_OF_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const;

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                          */
/* ──────────────────────────────────────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toBigIntTrade(raw: any): TradeEntity {
  return {
    ...raw,
    amountIn: BigInt(raw.amountIn),
    amountOut: BigInt(raw.amountOut),
    blockTimestamp: BigInt(raw.blockTimestamp),
  };
}

/**
 * Aggregates trades by token to compute net balance, cost basis, and avg buy price.
 * Returns a map of tokenId → aggregated stats.
 */
function aggregateTrades(trades: TradeEntity[]): Map<
  string,
  {
    totalBoughtMon: bigint;
    totalSoldMon: bigint;
    tokensBought: bigint;
    tokensSold: bigint;
    name: string;
    symbol: string;
  }
> {
  const map = new Map<
    string,
    {
      totalBoughtMon: bigint;
      totalSoldMon: bigint;
      tokensBought: bigint;
      tokensSold: bigint;
      name: string;
      symbol: string;
    }
  >();

  for (const trade of trades) {
    const tokenId = trade.token_id.toLowerCase();
    const existing = map.get(tokenId) ?? {
      totalBoughtMon: 0n,
      totalSoldMon: 0n,
      tokensBought: 0n,
      tokensSold: 0n,
      name: trade.token?.name ?? "",
      symbol: trade.token?.symbol ?? "",
    };

    if (trade.isBuy) {
      // Buy: amountIn = MON spent, amountOut = tokens received
      existing.totalBoughtMon += trade.amountIn;
      existing.tokensBought += trade.amountOut;
    } else {
      // Sell: amountIn = tokens sold, amountOut = MON received
      existing.totalSoldMon += trade.amountOut;
      existing.tokensSold += trade.amountIn;
    }

    // Update name/symbol if we have them from the nested token field
    if (trade.token?.name && !existing.name) existing.name = trade.token.name;
    if (trade.token?.symbol && !existing.symbol) existing.symbol = trade.token.symbol;

    map.set(tokenId, existing);
  }

  return map;
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Main Hook                                                                        */
/* ──────────────────────────────────────────────────────────────────────────────── */

/**
 * Fetches token holdings for a wallet address.
 *
 * Strategy:
 * 1. Query all trades by trader from the indexer
 * 2. Aggregate to find candidate tokens + cost basis
 * 3. Read `balanceOf` on-chain for each candidate token (handles transfers)
 * 4. Compute current value using bonding curve price
 * 5. Compute P&L (current value - cost basis)
 *
 * Returns holdings sorted by current USD value descending.
 *
 * @param address  Wallet address to query holdings for
 * @param monUsdPrice  Current MON/USD price for USD conversion (optional)
 */
export function useTokenHoldings(
  address: string | undefined,
  monUsdPrice?: number | null
) {
  const enabled = !!address && address.startsWith("0x") && address.length === 42;
  const addrLower = address?.toLowerCase() ?? "";

  // Step 1: Fetch all trades by this trader
  const tradesQuery = useQuery({
    queryKey: ["trades-by-trader", addrLower],
    enabled,
    queryFn: async () => {
      const client = getGraphQLClient();
      const res = await client.request<{ Trade: unknown[] }>(
        QUERY_TRADES_BY_TRADER,
        { trader: addrLower, limit: 500 }
      );
      return ((res.Trade as unknown[]) ?? []).map((r) => toBigIntTrade(r));
    },
    refetchInterval: 15_000,
  });

  // Step 2: Aggregate trades to find candidate tokens
  const aggregated = useMemo(() => {
    if (!tradesQuery.data) return new Map<string, ReturnType<typeof aggregateTrades> extends Map<string, infer V> ? V : never>();
    return aggregateTrades(tradesQuery.data);
  }, [tradesQuery.data]);

  const candidateTokenIds = useMemo(() => {
    return Array.from(aggregated.keys());
  }, [aggregated]);

  // Step 3: Read balanceOf on-chain for each candidate token
  const balanceContracts = useMemo(
    () =>
      candidateTokenIds.map((id) => ({
        address: id as `0x${string}`,
        abi: ERC20_BALANCE_OF_ABI,
        functionName: "balanceOf" as const,
        args: [addrLower as `0x${string}`] as const,
      })),
    [candidateTokenIds, addrLower]
  );

  const { data: balanceResults } = useReadContracts({
    contracts: balanceContracts,
    query: {
      enabled: balanceContracts.length > 0,
      refetchInterval: 30_000,
    },
  });

  // Step 4: Fetch current token data (realMon, soldTokens, graduated) for price calc
  // We need to query Token entities for the candidate tokens to get current price
  const tokenDataQuery = useQuery({
    queryKey: ["holding-token-data", candidateTokenIds],
    enabled: candidateTokenIds.length > 0,
    queryFn: async () => {
      const client = getGraphQLClient();
      // Fetch all candidate tokens in one query using _in filter
      const res = await client.request<{ Token: unknown[] }>(
        `query GetTokensByIds($ids: [String!]!) {
          Token(where: { id: { _in: $ids } }) {
            id
            name
            symbol
            realMon
            soldTokens
            graduated
          }
        }`,
        { ids: candidateTokenIds }
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = new Map<string, any>();
      for (const raw of res.Token ?? []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const t = raw as any;
        map.set(t.id.toLowerCase(), {
          id: t.id.toLowerCase(),
          name: t.name,
          symbol: t.symbol,
          realMon: BigInt(t.realMon),
          soldTokens: BigInt(t.soldTokens),
          graduated: t.graduated,
        });
      }
      return map;
    },
    refetchInterval: 10_000, // live prices
  });

  // Step 5: Compute final holdings
  const holdings = useMemo<Holding[]>(() => {
    if (!balanceResults || !tokenDataQuery.data) return [];

    const result: Holding[] = [];

    for (let i = 0; i < candidateTokenIds.length; i++) {
      const tokenId = candidateTokenIds[i];
      const agg = aggregated.get(tokenId);
      const balanceResult = balanceResults[i];
      const tokenData = tokenDataQuery.data.get(tokenId);

      if (!agg || !tokenData) continue;

      // Get on-chain balance (fallback to aggregated if read failed)
      const balance = (balanceResult?.result as bigint | undefined) ?? 0n;
      const balanceFormatted = Number(balance) / 1e18;

      // Skip tokens with zero balance
      if (balance === 0n) continue;

      // Cost basis = MON spent on buys - MON received from sells
      const costBasisMon =
        Number(agg.totalBoughtMon - agg.totalSoldMon) / 1e18;

      // Average buy price = total MON spent / total tokens bought
      const avgBuyPriceMon =
        agg.tokensBought > 0n
          ? Number(agg.totalBoughtMon) / Number(agg.tokensBought)
          : 0;

      // Current price from bonding curve
      const { monPerToken, marketCapMon } = getTokenPrice(
        tokenData.realMon,
        tokenData.soldTokens
      );

      // Current value
      const currentValueMon = balanceFormatted * monPerToken;

      // P&L
      const pnlMon = currentValueMon - costBasisMon;
      const pnlPct = costBasisMon > 0 ? (pnlMon / costBasisMon) * 100 : 0;

      result.push({
        tokenId,
        name: tokenData.name || agg.name || `${tokenId.slice(0, 6)}...`,
        symbol: tokenData.symbol || agg.symbol || "???",
        balance,
        balanceFormatted,
        totalBoughtMon: agg.totalBoughtMon,
        totalSoldMon: agg.totalSoldMon,
        costBasisMon,
        avgBuyPriceMon,
        currentPriceMon: monPerToken,
        currentValueMon,
        pnlMon,
        pnlPct,
        graduated: tokenData.graduated,
        marketCapMon,
      });
    }

    // Sort by current value descending
    result.sort((a, b) => b.currentValueMon - a.currentValueMon);

    return result;
  }, [balanceResults, tokenDataQuery.data, candidateTokenIds, aggregated]);

  // Compute totals
  const totals = useMemo(() => {
    const totalValueMon = holdings.reduce((sum, h) => sum + h.currentValueMon, 0);
    const totalCostBasisMon = holdings.reduce((sum, h) => sum + h.costBasisMon, 0);
    const totalPnlMon = totalValueMon - totalCostBasisMon;
    const totalPnlPct =
      totalCostBasisMon > 0 ? (totalPnlMon / totalCostBasisMon) * 100 : 0;

    const totalValueUsd =
      monUsdPrice != null && monUsdPrice > 0
        ? totalValueMon * monUsdPrice
        : null;

    return {
      totalValueMon,
      totalCostBasisMon,
      totalPnlMon,
      totalPnlPct,
      totalValueUsd,
      count: holdings.length,
    };
  }, [holdings, monUsdPrice]);

  return {
    holdings,
    totals,
    isLoading: tradesQuery.isLoading || tokenDataQuery.isLoading,
    isError: tradesQuery.isError,
    refetch: () => {
      tradesQuery.refetch();
      tokenDataQuery.refetch();
    },
  };
}