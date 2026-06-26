"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount, useReadContracts } from "wagmi";
import { mockTokens, mockMarkets, getMockOdds } from "@/lib/mock/data";
import {
  getTokenPrice,
  getGraduationProgress,
  PredictionMarketABI,
  PREDICTION_MARKET_ADDRESS,
} from "@/lib/wagmi/contracts";
import { getGraphQLClient } from "@/lib/graphql/client";
import {
  QUERY_ALL_TOKENS,
  QUERY_TOKEN,
  QUERY_TRADES_BY_TOKEN,
  QUERY_CHART_TRADES,
  QUERY_PROFILE,
  QUERY_ALL_PROFILES,
  QUERY_LEADERBOARD,
  QUERY_RECENT_TRADES,
  QUERY_TRADES_24H,
  type TokenEntity,
  type TradeEntity,
  type ProfileEntity,
} from "@/lib/graphql/queries";

/* ──────────────────────────────────────────────────────────────────────────────── */
/* BigInt converters (Envio returns numeric scalar fields as strings)                */
/* ──────────────────────────────────────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toBigIntToken(raw: any): TokenEntity {
  return {
    ...raw,
    virtualMon: BigInt(raw.virtualMon),
    virtualTokens: BigInt(raw.virtualTokens),
    targetTokenAmount: BigInt(raw.targetTokenAmount),
    startTime: BigInt(raw.startTime),
    startBlock: BigInt(raw.startBlock),
    realMon: BigInt(raw.realMon),
    soldTokens: BigInt(raw.soldTokens),
    createdAt: BigInt(raw.createdAt),
    graduatedAt: raw.graduatedAt != null ? BigInt(raw.graduatedAt) : null,
    totalBuyVolume: BigInt(raw.totalBuyVolume),
    totalSellVolume: BigInt(raw.totalSellVolume),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toBigIntTrade(raw: any): TradeEntity {
  return {
    ...raw,
    amountIn: BigInt(raw.amountIn),
    amountOut: BigInt(raw.amountOut),
    blockTimestamp: BigInt(raw.blockTimestamp),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toBigIntProfile(raw: any): ProfileEntity {
  return {
    ...raw,
    createdAt: BigInt(raw.createdAt),
    totalBuyVolume: BigInt(raw.totalBuyVolume),
    totalSellVolume: BigInt(raw.totalSellVolume),
  };
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Token decoration helpers                                                          */
/* ──────────────────────────────────────────────────────────────────────────────── */

function decorateToken(t: TokenEntity) {
  return {
    ...t,
    progress: getGraduationProgress(t.realMon),
    price: getTokenPrice(t.realMon, t.soldTokens),
  };
}

// Decorated token type — includes price + progress fields added by decorateToken
export type DecoratedToken = ReturnType<typeof decorateToken>;

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Live Envio GraphQL hooks                                                          */
/* ──────────────────────────────────────────────────────────────────────────────── */

export function useAllTokens() {
  return useQuery({
    queryKey: ["all-tokens"],
    queryFn: async () => {
      const client = getGraphQLClient();
      const res = await client.request<{ Token: unknown[] }>(QUERY_ALL_TOKENS, {
        limit: 100,
      });
      return ((res.Token as unknown[]) ?? []).map((r) =>
        decorateToken(toBigIntToken(r))
      );
    },
    refetchInterval: 10_000, // live prices on home + discover grids
  });
}

export function useToken(tokenId: string) {
  return useQuery({
    queryKey: ["token", tokenId.toLowerCase()],
    enabled: !!tokenId,
    queryFn: async () => {
      const client = getGraphQLClient();
      const res = await client.request<{ Token_by_pk: unknown | null }>(QUERY_TOKEN, {
        id: tokenId.toLowerCase(),
      });
      if (!res.Token_by_pk) return null;
      return decorateToken(toBigIntToken(res.Token_by_pk));
    },
    refetchInterval: 5_000, // live price on token detail page
  });
}

export function useTokenTrades(tokenId: string) {
  return useQuery({
    queryKey: ["token-trades", tokenId.toLowerCase()],
    enabled: !!tokenId,
    queryFn: async () => {
      const client = getGraphQLClient();
      const res = await client.request<{ Trade: unknown[] }>(
        QUERY_TRADES_BY_TOKEN,
        { tokenId: tokenId.toLowerCase(), limit: 50 }
      );
      return ((res.Trade as unknown[]) ?? []).map((r) => toBigIntTrade(r));
    },
    refetchInterval: 10_000, // keep recent trades list fresh
  });
}

export function useProfile(address: string) {
  return useQuery({
    queryKey: ["profile", address.toLowerCase()],
    enabled: !!address,
    queryFn: async () => {
      const client = getGraphQLClient();
      const res = await client.request<{ Profile_by_pk: unknown | null }>(
        QUERY_PROFILE,
        { address: address.toLowerCase() }
      );
      if (!res.Profile_by_pk) return null;
      return toBigIntProfile(res.Profile_by_pk);
    },
  });
}

export function useTokensByCreator(creator: string) {
  return useQuery({
    queryKey: ["tokens-by-creator", creator.toLowerCase()],
    enabled: !!creator,
    queryFn: async () => {
      const client = getGraphQLClient();
      const res = await client.request<{ Token: unknown[] }>(QUERY_ALL_TOKENS, {
        limit: 100,
        where: { creator: { _eq: creator.toLowerCase() } },
      });
      return ((res.Token as unknown[]) ?? []).map((r) =>
        decorateToken(toBigIntToken(r))
      );
    },
  });
}

export function useAllProfiles() {
  return useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const client = getGraphQLClient();
      const res = await client.request<{ Profile: unknown[] }>(QUERY_ALL_PROFILES);
      return ((res.Profile as unknown[]) ?? []).map((r) => toBigIntProfile(r));
    },
  });
}

export function useLeaderboard(limit: number = 20) {
  return useQuery({
    queryKey: ["leaderboard", limit],
    queryFn: async () => {
      const client = getGraphQLClient();
      const res = await client.request<{ Profile: unknown[] }>(QUERY_LEADERBOARD, {
        limit,
      });
      return ((res.Profile as unknown[]) ?? []).map((r) => toBigIntProfile(r));
    },
  });
}

export function useRecentTrades(limit: number = 10) {
  return useQuery({
    queryKey: ["recent-trades", limit],
    queryFn: async () => {
      const client = getGraphQLClient();
      const res = await client.request<{ Trade: unknown[] }>(QUERY_RECENT_TRADES, {
        limit,
      });
      return ((res.Trade as unknown[]) ?? []).map((r) => toBigIntTrade(r));
    },
    refetchInterval: 15_000, // refresh every 15s for live feed
  });
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Live 24h price-change tracker (percentage change over last 24h)                  */
/* ──────────────────────────────────────────────────────────────────────────────── */

const DAY_SECONDS = 86_400n;

/**
 * Returns the effective trade price in MON per token from a single Trade.
 * This is the price the market actually transacted at (excluding fees).
 */
function priceFromTrade(trade: TradeEntity): number {
  if (trade.isBuy) {
    // amountIn = MON spent (wei), amountOut = tokens received (wei)
    if (trade.amountOut === 0n) return 0;
    return Number(trade.amountIn) / Number(trade.amountOut);
  }
  // Sell: amountIn = tokens sold (wei), amountOut = MON received (wei)
  if (trade.amountIn === 0n) return 0;
  return Number(trade.amountOut) / Number(trade.amountIn);
}

/**
 * Fetches the earliest trade per token in the last 24h and computes the
 * percentage change between that trade's price and the current price.
 *
 * - Positive change = green
 * - Negative change = red
 * - No trade in last 24h = 0% (neutral badge hidden by caller)
 */
export function useTokenPriceChanges(tokenIds: string[]) {
  const since = useMemo(() => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    return now - DAY_SECONDS;
  }, []);

  return useQuery({
    queryKey: ["token-price-changes", tokenIds, since.toString()],
    queryFn: async () => {
      const client = getGraphQLClient();
      const map = new Map<string, number>();
      if (tokenIds.length === 0) return map;

      // Fetch earliest 24h trade per token (one lightweight query each).
      // With up to 60 paginated tokens this is acceptable; for larger grids
      // consider batching or a server-side aggregate.
      await Promise.all(
        tokenIds.map(async (id) => {
          try {
            const res = await client.request<{ Trade: unknown[] }>(
              QUERY_TRADES_24H,
              { since: since.toString(), tokenId: id.toLowerCase(), limit: 1 }
            );
            const trades = ((res.Trade as unknown[]) ?? []).map((r) =>
              toBigIntTrade(r)
            );
            if (trades.length === 0) return;
            const firstTrade = trades[0];
            const oldPrice = priceFromTrade(firstTrade);
            if (oldPrice === 0) return;
            map.set(id.toLowerCase(), oldPrice);
          } catch (err) {
            // Fail open: missing data means no badge shown, no UI crash.
            console.warn(`useTokenPriceChanges error for ${id}:`, err);
          }
        })
      );

      return map;
    },
    refetchInterval: 15_000, // refresh every 15s
    enabled: tokenIds.length > 0,
  });
}

/**
 * Formats a 24h percentage change value for display on token cards.
 */
export function formatPriceChange(pct: number | undefined): {
  text: string;
  isPositive: boolean;
  isNegative: boolean;
} {
  if (pct === undefined || isNaN(pct)) {
    return { text: "0.00%", isPositive: false, isNegative: false };
  }
  const sign = pct > 0 ? "+" : pct < 0 ? "" : "";
  return {
    text: `${sign}${pct.toFixed(2)}%`,
    isPositive: pct > 0,
    isNegative: pct < 0,
  };
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Token name/symbol resolution (reads from contract when indexer has empty strings) */
/* ──────────────────────────────────────────────────────────────────────────────── */

const ERC20_NAME_SYMBOL_ABI = [
  { type: "function", name: "name", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
  { type: "function", name: "symbol", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
] as const;

/**
 * Resolves token name and symbol from the contract when the indexer stored empty strings.
 * Returns the indexer values if they are already populated.
 */
export function useTokenMeta(tokenId: string, indexerName: string, indexerSymbol: string) {
  const needsResolution = !indexerName || !indexerSymbol;
  const { data } = useReadContracts({
    contracts: [
      {
        address: tokenId as `0x${string}`,
        abi: ERC20_NAME_SYMBOL_ABI,
        functionName: "name",
      },
      {
        address: tokenId as `0x${string}`,
        abi: ERC20_NAME_SYMBOL_ABI,
        functionName: "symbol",
      },
    ],
    query: { enabled: needsResolution && !!tokenId },
  });

  if (!needsResolution) {
    return { name: indexerName, symbol: indexerSymbol };
  }

  const name = (data?.[0]?.result as string | undefined) ?? indexerName ?? tokenId.slice(0, 8);
  const symbol = (data?.[1]?.result as string | undefined) ?? indexerSymbol ?? "???";
  return { name, symbol };
}

/**
 * Batch version of useTokenMeta — multicalls name() and symbol() for every token in `tokens`
 * whose indexer-supplied name or symbol is empty, and returns a new array with those values
 * filled in. Tokens that already have a non-empty name/symbol from the indexer are returned
 * unchanged. If there is nothing to resolve, no on-chain read is performed.
 */
export function useTokensMeta<T extends { id: string; name: string; symbol: string }>(
  tokens: T[]
): T[] {
  // Build a stable list of token ids that still need on-chain resolution
  const toResolve = useMemo(
    () =>
      tokens.filter((t) => !t.name || !t.symbol).map((t) => t.id.toLowerCase()),
    [tokens]
  );

  // Two contracts per token (name, symbol). Only fire the multicall when there is work to do.
  const contracts = useMemo(
    () =>
      toResolve.flatMap((id) => [
        {
          address: id as `0x${string}`,
          abi: ERC20_NAME_SYMBOL_ABI,
          functionName: "name" as const,
        },
        {
          address: id as `0x${string}`,
          abi: ERC20_NAME_SYMBOL_ABI,
          functionName: "symbol" as const,
        },
      ]),
    [toResolve]
  );

  const { data } = useReadContracts({
    contracts,
    query: { enabled: contracts.length > 0 },
  });

  return useMemo(() => {
    if (!data || toResolve.length === 0) return tokens;

    // Build a lookup map: tokenId (lowercased) → { name, symbol }
    const resolved = new Map<string, { name: string; symbol: string }>();
    for (let i = 0; i < toResolve.length; i++) {
      const id = toResolve[i];
      const nameResult = data[i * 2]?.result as string | undefined;
      const symbolResult = data[i * 2 + 1]?.result as string | undefined;
      resolved.set(id, {
        name: nameResult ?? "",
        symbol: symbolResult ?? "",
      });
    }

    return tokens.map((t) => {
      const id = t.id.toLowerCase();
      const r = resolved.get(id);
      if (!r) return t;
      return {
        ...t,
        name: t.name && t.name.trim() ? t.name : r.name,
        symbol: t.symbol && t.symbol.trim() ? t.symbol : r.symbol,
      };
    });
  }, [tokens, data, toResolve]);
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Prediction market hooks (live on-chain via multicall)                            */
/* ──────────────────────────────────────────────────────────────────────────────── */

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export interface MarketEntity {
  tokenId: string;
  tokenName: string;
  tokenSymbol: string;
  curve: string;
  totalYesMON: bigint;
  totalNoMON: bigint;
  resolved: boolean;
  outcome: boolean;
  cancelled: boolean;
  closeTime: bigint;
  userYesBet: bigint;
  userNoBet: bigint;
  claimed: boolean;
  odds: { yesOdds: number; noOdds: number };
  totalPool: bigint;
  token?: DecoratedToken | null;
}

const PREDICTION_MARKET_DEPLOYED =
  PREDICTION_MARKET_ADDRESS !== ZERO_ADDRESS;

/**
 * Fetches all live prediction markets by:
 *   1. Loading every token from the Envio indexer.
 *   2. Multicalling `markets(token)` on the PredictionMarket contract for each.
 *   3. Filtering out tokens with no market (markets[token].token == address(0)).
 *   4. Multicalling `getOdds(token)` for the surviving markets.
 *   5. Multicalling `yesBets/noBets/winningsClaimed` for the connected wallet.
 *
 * Falls back to mock data when the PredictionMarket contract isn't deployed
 * (e.g. local dev without a contract address configured).
 */
export function useAllMarkets(): {
  data: MarketEntity[];
  isLoading: boolean;
  error: Error | null;
} {
  const { address: userAddress } = useAccount();
  const tokensQuery = useAllTokens();

  const tokenIds = useMemo(
    () => (tokensQuery.data ?? []).map((t) => t.id.toLowerCase()),
    [tokensQuery.data]
  );

  // Multicall: markets(token) for each token
  const marketsContracts = useMemo(
    () =>
      tokenIds.map((id) => ({
        address: PREDICTION_MARKET_ADDRESS,
        abi: PredictionMarketABI,
        functionName: "markets" as const,
        args: [id as `0x${string}`] as const,
      })),
    [tokenIds]
  );

  const { data: marketsRaw, isLoading: isLoadingMarkets } = useReadContracts({
    contracts: marketsContracts,
    query: {
      enabled: PREDICTION_MARKET_DEPLOYED && tokenIds.length > 0,
    },
  });

  // Filter to tokens that actually have a market.
  // Also build a lookup map (tokenId → result) keyed by the *original* tokenIds index
  // so we can retrieve the correct marketsRaw entry by id, not by filtered index.
  const { activeTokenIds, marketResultMap } = useMemo(() => {
    if (!marketsRaw) return { activeTokenIds: [] as string[], marketResultMap: new Map<string, readonly [string, string, bigint, bigint, boolean, boolean, boolean, bigint]>() };
    const out: string[] = [];
    const map = new Map<string, readonly [string, string, bigint, bigint, boolean, boolean, boolean, bigint]>();
    for (let i = 0; i < tokenIds.length; i++) {
      const r = marketsRaw[i]?.result as
        | readonly [string, string, bigint, bigint, boolean, boolean, boolean, bigint]
        | undefined;
      if (r && r[0] !== ZERO_ADDRESS) {
        out.push(tokenIds[i]);
        map.set(tokenIds[i], r);
      }
    }
    return { activeTokenIds: out, marketResultMap: map };
  }, [marketsRaw, tokenIds]);

  // Multicall: getOdds(token) for each active market
  const oddsContracts = useMemo(
    () =>
      activeTokenIds.map((id) => ({
        address: PREDICTION_MARKET_ADDRESS,
        abi: PredictionMarketABI,
        functionName: "getOdds" as const,
        args: [id as `0x${string}`] as const,
      })),
    [activeTokenIds]
  );

  const { data: oddsRaw } = useReadContracts({
    contracts: oddsContracts,
    query: {
      enabled: PREDICTION_MARKET_DEPLOYED && activeTokenIds.length > 0,
    },
  });

  // Multicall: yesBets/noBets/winningsClaimed for the connected wallet
  const userBetContracts = useMemo(() => {
    if (!userAddress) return [];
    return activeTokenIds.flatMap((id) => [
      {
        address: PREDICTION_MARKET_ADDRESS,
        abi: PredictionMarketABI,
        functionName: "yesBets" as const,
        args: [id as `0x${string}`, userAddress] as const,
      },
      {
        address: PREDICTION_MARKET_ADDRESS,
        abi: PredictionMarketABI,
        functionName: "noBets" as const,
        args: [id as `0x${string}`, userAddress] as const,
      },
      {
        address: PREDICTION_MARKET_ADDRESS,
        abi: PredictionMarketABI,
        functionName: "winningsClaimed" as const,
        args: [id as `0x${string}`, userAddress] as const,
      },
    ]);
  }, [activeTokenIds, userAddress]);

  const { data: userBetsRaw } = useReadContracts({
    contracts: userBetContracts,
    query: {
      enabled: !!userAddress && userBetContracts.length > 0,
    },
  });

  const data = useMemo<MarketEntity[]>(() => {
    // Fallback to mock data when the contract isn't deployed
    if (!PREDICTION_MARKET_DEPLOYED) {
      return mockMarkets.map((m) => {
        const rawToken = mockTokens.find((t) => t.id === m.tokenId);
        const token = rawToken ? decorateToken(rawToken) : undefined;
        return {
          tokenId: m.tokenId,
          tokenName: m.tokenName,
          tokenSymbol: token?.symbol ?? "",
          curve: token?.curve ?? ZERO_ADDRESS,
          totalYesMON: m.totalYesMON,
          totalNoMON: m.totalNoMON,
          resolved: m.resolved,
          outcome: m.outcome,
          cancelled: false,
          closeTime: 0n,
          userYesBet: m.userYesBet,
          userNoBet: m.userNoBet,
          claimed: m.claimed,
          odds: getMockOdds(m.tokenId),
          totalPool: m.totalYesMON + m.totalNoMON,
          token,
        };
      });
    }

    if (!marketsRaw) return [];

    const tokenMap = new Map(
      (tokensQuery.data ?? []).map((t) => [t.id.toLowerCase(), t])
    );

    return activeTokenIds.map((id, i) => {
      // Use the lookup map to get the correct market result by token id,
      // not by the filtered index i (which would be wrong when some tokens
      // have no market and were excluded during filtering).
      const m = marketResultMap.get(id);
      const o = oddsRaw?.[i]?.result as readonly [bigint, bigint] | undefined;
      const token = tokenMap.get(id);

      const totalYesMON = m?.[2] ?? 0n;
      const totalNoMON = m?.[3] ?? 0n;

      // Per-user bets (3 contracts per token: yesBets, noBets, winningsClaimed)
      const userYesBet =
        userBetsRaw && userBetsRaw[i * 3]
          ? ((userBetsRaw[i * 3].result as bigint) ?? 0n)
          : 0n;
      const userNoBet =
        userBetsRaw && userBetsRaw[i * 3 + 1]
          ? ((userBetsRaw[i * 3 + 1].result as bigint) ?? 0n)
          : 0n;
      const claimed =
        userBetsRaw && userBetsRaw[i * 3 + 2]
          ? ((userBetsRaw[i * 3 + 2].result as boolean) ?? false)
          : false;

      // getOdds returns basis points (0–10000). Convert to percentages.
      const odds = o
        ? {
            yesOdds: Number(o[0]) / 100,
            noOdds: Number(o[1]) / 100,
          }
        : { yesOdds: 50, noOdds: 50 };

      return {
        tokenId: id,
        tokenName: token?.name ?? id.slice(0, 8),
        tokenSymbol: token?.symbol ?? "",
        curve: m?.[1] ?? ZERO_ADDRESS,
        totalYesMON,
        totalNoMON,
        resolved: m?.[4] ?? false,
        outcome: m?.[5] ?? false,
        cancelled: m?.[6] ?? false,
        closeTime: m?.[7] ?? 0n,
        userYesBet,
        userNoBet,
        claimed,
        odds,
        totalPool: totalYesMON + totalNoMON,
        token,
      };
    });
  }, [
    marketsRaw,
    oddsRaw,
    userBetsRaw,
    activeTokenIds,
    marketResultMap,
    tokensQuery.data,
  ]);

  return {
    data,
    isLoading: tokensQuery.isLoading || isLoadingMarkets,
    error: tokensQuery.error as Error | null,
  };
}

/**
 * Fetches a single market by token address. Uses the same multicall pattern
 * as useAllMarkets but scoped to one token.
 */
export function useMarket(tokenId: string): {
  data: MarketEntity | null;
  isLoading: boolean;
  error: Error | null;
} {
  const { address: userAddress } = useAccount();
  const tokenQuery = useToken(tokenId);

  const id = tokenId.toLowerCase();
  const contracts = useMemo(() => {
    if (!PREDICTION_MARKET_DEPLOYED || !tokenId) return [];
    return [
      {
        address: PREDICTION_MARKET_ADDRESS,
        abi: PredictionMarketABI,
        functionName: "markets" as const,
        args: [id as `0x${string}`] as const,
      },
      {
        address: PREDICTION_MARKET_ADDRESS,
        abi: PredictionMarketABI,
        functionName: "getOdds" as const,
        args: [id as `0x${string}`] as const,
      },
      ...(userAddress
        ? ([
            {
              address: PREDICTION_MARKET_ADDRESS,
              abi: PredictionMarketABI,
              functionName: "yesBets" as const,
              args: [id as `0x${string}`, userAddress] as const,
            },
            {
              address: PREDICTION_MARKET_ADDRESS,
              abi: PredictionMarketABI,
              functionName: "noBets" as const,
              args: [id as `0x${string}`, userAddress] as const,
            },
            {
              address: PREDICTION_MARKET_ADDRESS,
              abi: PredictionMarketABI,
              functionName: "winningsClaimed" as const,
              args: [id as `0x${string}`, userAddress] as const,
            },
          ] as const)
        : []),
    ];
  }, [id, tokenId, userAddress]);

  const { data, isLoading } = useReadContracts({
    contracts,
    query: { enabled: contracts.length > 0 },
  });

  const market = useMemo<MarketEntity | null>(() => {
    if (!PREDICTION_MARKET_DEPLOYED) {
      // Mock fallback
      const m = mockMarkets.find((m) => m.tokenId === id);
      if (!m) return null;
      const rawToken = mockTokens.find((t) => t.id === m.tokenId);
      const token = rawToken ? decorateToken(rawToken) : undefined;
      return {
        tokenId: m.tokenId,
        tokenName: m.tokenName,
        tokenSymbol: token?.symbol ?? "",
        curve: token?.curve ?? ZERO_ADDRESS,
        totalYesMON: m.totalYesMON,
        totalNoMON: m.totalNoMON,
        resolved: m.resolved,
        outcome: m.outcome,
        cancelled: false,
        closeTime: 0n,
        userYesBet: m.userYesBet,
        userNoBet: m.userNoBet,
        claimed: m.claimed,
        odds: getMockOdds(m.tokenId),
        totalPool: m.totalYesMON + m.totalNoMON,
        token,
      };
    }

    if (!data || data.length === 0) return null;

    const m = data[0]?.result as
      | readonly [string, string, bigint, bigint, boolean, boolean, boolean, bigint]
      | undefined;
    if (!m || m[0] === ZERO_ADDRESS) return null;

    const o = data[1]?.result as readonly [bigint, bigint] | undefined;
    const userYesBet = (data[2]?.result as bigint) ?? 0n;
    const userNoBet = (data[3]?.result as bigint) ?? 0n;
    const claimed = (data[4]?.result as boolean) ?? false;

    const totalYesMON = m[2];
    const totalNoMON = m[3];

    const odds = o
      ? {
          yesOdds: Number(o[0]) / 100,
          noOdds: Number(o[1]) / 100,
        }
      : { yesOdds: 50, noOdds: 50 };

    return {
      tokenId: id,
      tokenName: tokenQuery.data?.name ?? id.slice(0, 8),
      tokenSymbol: tokenQuery.data?.symbol ?? "",
      curve: m[1],
      totalYesMON,
      totalNoMON,
      resolved: m[4],
      outcome: m[5],
      cancelled: m[6],
      closeTime: m[7],
      userYesBet,
      userNoBet,
      claimed,
      odds,
      totalPool: totalYesMON + totalNoMON,
      token: tokenQuery.data ? decorateToken(tokenQuery.data) : undefined,
    };
  }, [data, id, tokenQuery.data]);

  return {
    data: market,
    isLoading: tokenQuery.isLoading || isLoading,
    error: tokenQuery.error as Error | null,
  };
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Reputation computation (client-side, mirrors reputation/src/ + tiers.ts)         */
/* ──────────────────────────────────────────────────────────────────────────────── */

export type Badge =
  | "First Token"
  | "Triple Graduate"
  | "Deca Graduate"
  | "Locked & Honest — 180d"
  | "Locked & Honest — 365d"
  | "Never Rug"
  | "Pre-buy Honest"
  | "Volume Maker"
  | "Verified Founder"
  | "OG";

export type Tier = "Starter" | "Established" | "Verified";

const VOLUME_MAKER_THRESHOLD = 100_000n * 10n ** 18n;
const OG_MIN_GRADS = 3;

export function computeReputation(profile: ProfileEntity): {
  score: number;
  tier: Tier;
  badges: Badge[];
} {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const DAY = 86400n;
  const accountAgeDays = Number((now - profile.createdAt) / DAY);

  const gradRate =
    profile.tokenCount > 0 ? profile.graduatedCount / profile.tokenCount : 0;
  const volumeScore = Number(profile.totalBuyVolume) / 1e18;

  let rawScore =
    Math.min(profile.tokenCount * 3, 20) +
    Math.min(profile.graduatedCount * 5, 30) +
    gradRate * 25 +
    Math.min(volumeScore / 5000, 20) +
    Math.min(accountAgeDays / 10, 5);

  rawScore = Math.min(Math.max(Math.round(rawScore), 0), 100);

  let tier: Tier = "Starter";
  if (rawScore >= 70) tier = "Verified";
  else if (rawScore >= 30) tier = "Established";

  const badges: Badge[] = [];
  if (profile.tokenCount >= 1) badges.push("First Token");
  if (profile.graduatedCount >= 3) badges.push("Triple Graduate");
  if (profile.graduatedCount >= 10) badges.push("Deca Graduate");
  if (accountAgeDays >= 30) badges.push("Never Rug");
  if (accountAgeDays >= 180) badges.push("Locked & Honest — 180d");
  if (accountAgeDays >= 365) badges.push("Locked & Honest — 365d");
  if (gradRate >= 0.95) badges.push("Pre-buy Honest");
  if (profile.totalBuyVolume > VOLUME_MAKER_THRESHOLD) badges.push("Volume Maker");
  if (rawScore >= 70) badges.push("Verified Founder");
  if (accountAgeDays >= 365 && profile.graduatedCount >= OG_MIN_GRADS)
    badges.push("OG");

  return { score: rawScore, tier, badges };
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Formatting Helpers                                                               */
/* ──────────────────────────────────────────────────────────────────────────────── */

export function formatMon(wei: bigint): string {
  const num = Number(wei) / 1e18;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K MON`;
  return `${num.toFixed(2)} MON`;
}

export function formatTokens(wei: bigint): string {
  const num = Number(wei) / 1e18;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
}

export function formatTimeAgo(timestamp: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const seconds = now - Number(timestamp);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function tierColor(tier: Tier): string {
  switch (tier) {
    case "Starter":
      return "text-gray-400";
    case "Established":
      return "text-blue-400";
    case "Verified":
      return "text-amber-400";
  }
}

export function tierBg(tier: Tier): string {
  switch (tier) {
    case "Starter":
      return "bg-gray-500/10 border-gray-500/30";
    case "Established":
      return "bg-blue-500/10 border-blue-500/30";
    case "Verified":
      return "bg-amber-500/10 border-amber-500/30";
  }
}

export function reputationColor(score: number): string {
  if (score >= 70) return "text-green-400";
  if (score >= 30) return "text-blue-400";
  return "text-yellow-400";
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* OHLC Price Bar types & hook (powers the TradingView Lightweight Charts chart)    */
/* ──────────────────────────────────────────────────────────────────────────────── */

export type ChartResolution = "1" | "5" | "15" | "60" | "240" | "1D" | "1W" | "1M";

/** Resolution label → seconds per candle */
const RESOLUTION_SECONDS: Record<ChartResolution, number> = {
  "1": 60,
  "5": 300,
  "15": 900,
  "60": 3_600,
  "240": 14_400,
  "1D": 86_400,
  "1W": 604_800,
  "1M": 2_592_000,
};

export interface OHLCBar {
  /** Unix timestamp (seconds) — start of the candle bucket */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  /** MON volume for the candle */
  volume: number;
}

/**
 * Derives the effective traded price in MON per token from a single trade.
 * Buy:  amountIn (MON wei) / amountOut (token wei)
 * Sell: amountOut (MON wei) / amountIn (token wei)
 */
function tradePrice(trade: TradeEntity): number {
  if (trade.isBuy) {
    if (trade.amountOut === 0n) return 0;
    return Number(trade.amountIn) / Number(trade.amountOut);
  }
  if (trade.amountIn === 0n) return 0;
  return Number(trade.amountOut) / Number(trade.amountIn);
}

/**
 * Aggregates an array of trades (sorted ASC by blockTimestamp) into OHLC candles.
 * Each candle covers exactly `bucketSecs` seconds.
 */
function buildOHLCBars(trades: TradeEntity[], bucketSecs: number): OHLCBar[] {
  if (trades.length === 0) return [];

  const bars = new Map<number, OHLCBar>();

  for (const trade of trades) {
    const price = tradePrice(trade);
    if (price === 0) continue;

    const ts = Number(trade.blockTimestamp);
    const bucketTime = Math.floor(ts / bucketSecs) * bucketSecs;

    const vol = trade.isBuy
      ? Number(trade.amountIn) / 1e18   // MON in
      : Number(trade.amountOut) / 1e18; // MON out

    const existing = bars.get(bucketTime);
    if (!existing) {
      bars.set(bucketTime, {
        time: bucketTime,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: vol,
      });
    } else {
      existing.high = Math.max(existing.high, price);
      existing.low = Math.min(existing.low, price);
      existing.close = price;
      existing.volume += vol;
    }
  }

  return Array.from(bars.values()).sort((a, b) => a.time - b.time);
}

/**
 * Fetches trades for a token (up to 1000, ASC) and aggregates them into OHLC
 * candles for the selected resolution. Polls every 10s to keep the latest candle
 * live on the token detail page chart.
 *
 * Returns `bars`, the current `resolution`, and a `setResolution` setter so the
 * chart resolution tabs can switch the candle size without re-mounting.
 */
export function useTokenPriceBars(tokenId: string) {
  const [resolution, setResolution] = useState<ChartResolution>("5");

  const { data: trades = [], isLoading } = useQuery({
    queryKey: ["chart-trades", tokenId.toLowerCase()],
    enabled: !!tokenId,
    queryFn: async () => {
      const client = getGraphQLClient();
      const res = await client.request<{ Trade: unknown[] }>(
        QUERY_CHART_TRADES,
        { tokenId: tokenId.toLowerCase(), limit: 1000 }
      );
      return ((res.Trade as unknown[]) ?? []).map((r) => toBigIntTrade(r));
    },
    refetchInterval: 10_000,
  });

  const bars = useMemo(
    () => buildOHLCBars(trades, RESOLUTION_SECONDS[resolution]),
    [trades, resolution]
  );

  return { bars, resolution, setResolution, isLoading };
}
