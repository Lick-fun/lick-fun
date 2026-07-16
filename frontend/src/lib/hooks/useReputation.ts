"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getGraphQLClient } from "@/lib/graphql/client";
import { QUERY_PROFILE_SCORE } from "@/lib/graphql/queries";
import { useProfile, useTokensByCreator } from "@/lib/hooks/useData";
import {
  computeScore,
  type ScoringInputs,
  type ScoringResult,
  type TokenEntity,
  type TokenDiversityData,
  type TradeEntity,
} from "@/lib/reputation";

/**
 * Fetch all trades for a given address (as trader) — used to compute
 * pre-buy honesty rate and other trader-side metrics.
 */
function useTradesByTrader(address: string) {
  return useQuery({
    queryKey: ["trades-by-trader", address.toLowerCase()],
    enabled: !!address,
    queryFn: async () => {
      const client = getGraphQLClient();
      const res = await client.request<{ Trade: unknown[] }>(
        QUERY_PROFILE_SCORE,
        { address: address.toLowerCase() }
      );
      return ((res.Trade as unknown[]) ?? []).map((r) => {
        const row = r as Record<string, unknown>;
        return {
          id: (row.id as string) ?? "",
          token_id: (row.token_id as string) ?? "",
          trader: (row.trader as string) ?? "",
          isBuy: Boolean(row.isBuy),
          amountIn: BigInt((row.amountIn as string) ?? "0"),
          amountOut: BigInt((row.amountOut as string) ?? "0"),
          blockNumber: Number(row.blockNumber ?? 0),
          blockTimestamp: BigInt((row.blockTimestamp as string) ?? "0"),
          penaltyBps: Number(row.penaltyBps ?? 0),
        } as TradeEntity;
      });
    },
  });
}

/**
 * Compute the median graduated volume across a list of tokens.
 *
 * NOTE: Previously this was computed per-profile (only the creator's own
 * graduated tokens), which made fVol ≈ 1.0 for any creator with ≥1 graduation
 * (their own volume divided by their own median). The scoring formula intends
 * a GLOBAL normalization denominator.
 *
 * Fetching all graduated tokens across all profiles just to compute a median
 * is too heavy for a per-profile client-side hook. Instead we use a fixed
 * protocol constant: the graduation threshold (100,000 MON). A graduated token
 * has raised ≥100k MON by definition, so this is a stable, meaningful
 * normalization point. Creators whose graduated tokens raised more than the
 * threshold get fVol → 1.0; those with smaller graduations get a proportional
 * fraction. This matches the intent without a network round-trip.
 */
const GRADUATION_THRESHOLD_MON = 100_000n * 10n ** 18n; // 100k MON

function medianGradVolume(): bigint {
  return GRADUATION_THRESHOLD_MON;
}

/**
 * Compute the cumulative graduated volume for a creator's tokens.
 */
function cumulativeGradVolume(tokens: TokenEntity[]): bigint {
  return tokens
    .filter((t) => t.graduated)
    .reduce((sum, t) => sum + t.totalBuyVolume + t.totalSellVolume, 0n);
}

/**
 * Compute volume-weighted graduation quality (0–1).
 * Each graduated token contributes min(volume / medianGradVolume, 1.0).
 */
function computeQualityGradRate(
  tokens: TokenEntity[],
  medianGradVolume: bigint
): number {
  const graduated = tokens.filter((t) => t.graduated);
  if (graduated.length === 0 || medianGradVolume === 0n) return 0;
  const totalQuality = graduated.reduce((sum, t) => {
    const quality = Number(t.totalBuyVolume) / Number(medianGradVolume);
    return sum + Math.min(quality, 1.0);
  }, 0);
  return Math.min(totalQuality / graduated.length, 1.0);
}

/**
 * Compute average unique trader diversity across graduated tokens (0–1).
 */
function computeAvgTraderDiversity(
  tokens: TokenEntity[],
  diversityTarget: number = 50
): number {
  const graduated = tokens.filter((t) => t.graduated);
  if (graduated.length === 0) return 0;
  const total = graduated.reduce((sum, t) => {
    return sum + Math.min((t.uniqueBuyerCount ?? 0) / diversityTarget, 1.0);
  }, 0);
  return total / graduated.length;
}

/**
 * Count tokens launched in the last 30 days.
 */
function computeTokensInLast30Days(tokens: TokenEntity[]): number {
  const cutoff = BigInt(Math.floor(Date.now() / 1000) - 30 * 86400);
  return tokens.filter((t) => t.createdAt >= cutoff).length;
}

/**
 * Sum creator self-trade count across all tokens.
 */
function computeCreatorSelfTradeCount(tokens: TokenEntity[]): number {
  return tokens.reduce((sum, t) => sum + (t.creatorSellCount ?? 0), 0);
}

/**
 * Build the per-token diversity data array needed by computeBadges.
 */
function buildTokenDiversityData(tokens: TokenEntity[]): TokenDiversityData[] {
  return tokens.map((t) => ({
    uniqueBuyerCount: t.uniqueBuyerCount ?? 0,
    totalBuyVolume: t.totalBuyVolume,
    graduated: t.graduated,
    ageAtGraduationDays:
      t.graduated && t.graduatedAt && t.createdAt
        ? Math.max(
            0,
            Math.floor(Number(t.graduatedAt - t.createdAt) / 86_400)
          )
        : 0,
    creatorSellCount: t.creatorSellCount ?? 0,
  }));
}

/**
 * Compute pre-buy honesty rate: fraction of the creator's own buys
 * (where trader == creator) that were small relative to their sells.
 *
 * Without explicit "pre-buy" tagging indexed on-chain, we cannot measure this
 * accurately. Returning 0.0 (rather than the previous 1.0) ensures:
 *   - The w_hon scoring factor contributes 0 (no unearned bonus)
 *   - The "Pre-buy Honest" badge (threshold 0.95) is NOT auto-awarded
 * Once pre-buy events are indexed, replace this with a real computation.
 */
function prebuyHonestyRate(
  tokens: TokenEntity[],
  trades: TradeEntity[]
): number {
  void tokens;
  void trades;
  return 0.0;
}

/**
 * Main hook: compute reputation for a given address.
 *
 * Combines:
 *   - Profile stats from indexer (tokenCount, graduatedCount, volume, age)
 *   - Tokens created by this address
 *   - Trades by this address
 *   - Pure scoring engine from reputation/src/scoring.ts
 *
 * Returns a ScoringResult with reputation score, tier, and badges.
 */
export function useReputation(address: string) {
  const { data: profile, isLoading: profileLoading } = useProfile(address);
  const { data: tokens = [], isLoading: tokensLoading } =
    useTokensByCreator(address);
  const { data: trades = [], isLoading: tradesLoading } =
    useTradesByTrader(address);

  const result = useMemo<ScoringResult | null>(() => {
    // Trader-only profiles: the indexer only creates a Profile row on
    // Factory.TokenCreated, so wallets that only buy/sell have no Profile.
    // Synthesize a minimal profile from trade data so they still get a
    // Starter-tier score + relevant badges instead of nothing.
    const hasTradeData = trades.length > 0;
    if (!profile && !hasTradeData) return null;

    const nowSec = BigInt(Math.floor(Date.now() / 1000));

    // accountAgeDays: from Profile.createdAt (creators) or earliest trade
    // timestamp (trader-only wallets). Falls back to 0 if neither exists.
    const createdAt = profile?.createdAt
      ?? (trades.length > 0
        ? trades.reduce(
            (min, t) => (t.blockTimestamp < min ? t.blockTimestamp : min),
            trades[0].blockTimestamp
          )
        : nowSec);
    const accountAgeDays = Math.max(
      0,
      Math.floor(Number(nowSec - createdAt) / 86_400)
    );

    const tokenCount = profile?.tokenCount ?? 0;
    const graduatedCount = profile?.graduatedCount ?? 0;

    const cumVol = cumulativeGradVolume(tokens);
    const medVol = medianGradVolume();
    const honestRate = prebuyHonestyRate(tokens, trades);

    const qualityGradRate = computeQualityGradRate(tokens, medVol);
    const avgTraderDiversity = computeAvgTraderDiversity(tokens);
    const tokensInLast30Days = computeTokensInLast30Days(tokens);
    const creatorSelfTradeCount = computeCreatorSelfTradeCount(tokens);
    const tokenDiversityData = buildTokenDiversityData(tokens);

    const inputs: ScoringInputs = {
      accountAgeDays,
      tokenCount,
      graduatedCount,
      qualityGradRate,
      avgTraderDiversity,
      creatorSelfTradeCount,
      tokensInLast30Days,
      cumulativeGradVolume: cumVol,
      medianGradVolume: medVol,
      prebuyHonestyRate: honestRate,
      verifiedTenureDays: 0, // not tracked yet
      rugEvents: [], // not indexed yet
      linkedWallets: [], // ProfileRegistry not deployed yet
    };

    const score = computeScore(address.toLowerCase(), inputs, tokenDiversityData);

    // Filter out badges that depend on data we don't yet index.
    // - "Never Rug": requires rugEvents to be indexed to verify "no rugs".
    //   With rugEvents always [], the badge would auto-award to everyone —
    //   suppress it until rug detection is live.
    // - "Pre-buy Honest": already suppressed via prebuyHonestyRate() returning 0,
    //   but double-filter here for safety.
    const UNMEASURED_BADGES = new Set(["Never Rug", "Pre-buy Honest"]);
    const filteredBadges = score.badges.filter((b) => !UNMEASURED_BADGES.has(b));

    return { ...score, badges: filteredBadges };
  }, [address, profile, tokens, trades]);

  return {
    data: result,
    isLoading: profileLoading || tokensLoading || tradesLoading,
  };
}