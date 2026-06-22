"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReadContracts } from "wagmi";
import { mockTokens, mockMarkets, getMockOdds } from "@/lib/mock/data";
import { getTokenPrice, getGraduationProgress } from "@/lib/wagmi/contracts";
import { getGraphQLClient } from "@/lib/graphql/client";
import {
  QUERY_ALL_TOKENS,
  QUERY_TOKEN,
  QUERY_TRADES_BY_TOKEN,
  QUERY_PROFILE,
  QUERY_ALL_PROFILES,
  QUERY_LEADERBOARD,
  QUERY_RECENT_TRADES,
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

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Prediction market hooks (still mock-based, consistent { data, isLoading, error } */
/* ──────────────────────────────────────────────────────────────────────────────── */

function decorateMarket(m: (typeof mockMarkets)[number]) {
  const token = mockTokens.find((t) => t.id === m.tokenId);
  return {
    ...m,
    token,
    odds: getMockOdds(m.tokenId),
    totalPool: m.totalYesMON + m.totalNoMON,
  };
}

type DecoratedMarket = ReturnType<typeof decorateMarket>;

export function useAllMarkets(): {
  data: DecoratedMarket[];
  isLoading: boolean;
  error: Error | null;
} {
  const data = useMemo(() => mockMarkets.map((m) => decorateMarket(m)), []);
  return { data, isLoading: false, error: null };
}

export function useMarket(tokenId: string): {
  data: DecoratedMarket | null;
  isLoading: boolean;
  error: Error | null;
} {
  const data = useMemo(() => {
    const m = mockMarkets.find((m) => m.tokenId === tokenId.toLowerCase());
    if (!m) return null;
    return decorateMarket(m);
  }, [tokenId]);
  return { data, isLoading: false, error: null };
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
