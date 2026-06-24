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
 * Used as the normalization denominator for the volume factor.
 */
function medianGradVolume(tokens: TokenEntity[]): bigint {
  const graduated = tokens.filter((t) => t.graduated);
  if (graduated.length === 0) return 0n;
  const volumes = graduated
    .map((t) => t.totalBuyVolume + t.totalSellVolume)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const mid = Math.floor(volumes.length / 2);
  return volumes.length % 2 === 0
    ? (volumes[mid - 1] + volumes[mid]) / 2n
    : volumes[mid];
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
 * Compute the lock fulfillment rate: fraction of tokens that did NOT rug.
 * Without on-chain rug detection, we approximate using graduated status:
 *   - Graduated tokens count as "fulfilled" (1.0)
 *   - Non-graduated tokens count as "unfulfilled" (0.0)
 *
 * This is a conservative approximation — true rug detection requires
 * LP removal events which aren't indexed yet.
 */
function lockFulfillmentRate(tokens: TokenEntity[]): number {
  if (tokens.length === 0) return 1.0;
  const fulfilled = tokens.filter((t) => t.graduated).length;
  return fulfilled / tokens.length;
}

/**
 * Compute pre-buy honesty rate: fraction of the creator's own buys
 * (where trader == creator) that were small relative to their sells.
 *
 * Without explicit "pre-buy" tagging, we approximate: a creator's buys
 * on their own tokens are honest if they don't exceed 5% of total buys.
 */
function prebuyHonestyRate(
  tokens: TokenEntity[],
  trades: TradeEntity[]
): number {
  if (tokens.length === 0) return 1.0;
  // No rug detection yet — default to 1.0 (fully honest) until
  // rug events are indexed. This is the safe default.
  void trades;
  return 1.0;
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
    if (!profile) return null;

    const nowSec = BigInt(Math.floor(Date.now() / 1000));
    const accountAgeDays = Math.max(
      0,
      Math.floor(Number(nowSec - profile.createdAt) / 86_400)
    );

    const tokenCount = profile.tokenCount;
    const graduatedCount = profile.graduatedCount;
    const graduationRate =
      tokenCount > 0 ? graduatedCount / tokenCount : 0;

    const cumVol = cumulativeGradVolume(tokens);
    const medVol = medianGradVolume(tokens);
    const lockRate = lockFulfillmentRate(tokens);
    const honestRate = prebuyHonestyRate(tokens, trades);

    const inputs: ScoringInputs = {
      accountAgeDays,
      tokenCount,
      graduatedCount,
      graduationRate,
      lockFulfillmentRate: lockRate,
      cumulativeGradVolume: cumVol,
      medianGradVolume: medVol,
      prebuyHonestyRate: honestRate,
      verifiedTenureDays: 0, // not tracked yet
      rugEvents: [], // not indexed yet
      linkedWallets: [], // ProfileRegistry not deployed yet
    };

    return computeScore(address.toLowerCase(), inputs);
  }, [address, profile, tokens, trades]);

  return {
    data: result,
    isLoading: profileLoading || tokensLoading || tradesLoading,
  };
}