"use client";

import { useMemo } from "react";
import { mockTokens, mockProfiles, mockTrades, getMockTradesForToken, getMockProfile, getMockTokensByCreator, mockMarkets, getMockOdds } from "@/lib/mock/data";
import { getTokenPrice, getGraduationProgress } from "@/lib/wagmi/contracts";
import type { TokenEntity, TradeEntity, ProfileEntity } from "@/lib/graphql/queries";

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Hooks using mock data (swap to real Envio queries when endpoint is live)         */
/* ──────────────────────────────────────────────────────────────────────────────── */

export function useAllTokens() {
  return useMemo(() => {
    return mockTokens.map((t) => ({
      ...t,
      progress: getGraduationProgress(t.realMon),
      price: getTokenPrice(t.realMon, t.soldTokens),
    }));
  }, []);
}

export function useToken(tokenId: string) {
  return useMemo(() => {
    const t = mockTokens.find((t) => t.id === tokenId.toLowerCase());
    if (!t) return null;
    return {
      ...t,
      progress: getGraduationProgress(t.realMon),
      price: getTokenPrice(t.realMon, t.soldTokens),
    };
  }, [tokenId]);
}

export function useTokenTrades(tokenId: string): TradeEntity[] {
  return useMemo(() => getMockTradesForToken(tokenId), [tokenId]);
}

export function useProfile(address: string) {
  return useMemo(() => getMockProfile(address), [address]);
}

export function useTokensByCreator(creator: string) {
  return useMemo(() => {
    return getMockTokensByCreator(creator).map((t) => ({
      ...t,
      progress: getGraduationProgress(t.realMon),
      price: getTokenPrice(t.realMon, t.soldTokens),
    }));
  }, [creator]);
}

export function useAllProfiles() {
  return useMemo(() => mockProfiles, []);
}

export function useLeaderboard(limit: number = 20) {
  return useMemo(() => {
    return [...mockProfiles]
      .sort((a, b) => b.graduatedCount - a.graduatedCount)
      .slice(0, limit)
      .map((p) => ({ ...p }));
  }, [limit]);
}

export function useAllMarkets() {
  return useMemo(() => {
    return mockMarkets.map((m) => {
      const token = mockTokens.find((t) => t.id === m.tokenId);
      return {
        ...m,
        token,
        odds: getMockOdds(m.tokenId),
        totalPool: m.totalYesMON + m.totalNoMON,
      };
    });
  }, []);
}

export function useMarket(tokenId: string) {
  return useMemo(() => {
    const m = mockMarkets.find((m) => m.tokenId === tokenId.toLowerCase());
    if (!m) return null;
    const token = mockTokens.find((t) => t.id === tokenId.toLowerCase());
    return {
      ...m,
      token,
      odds: getMockOdds(tokenId),
      totalPool: m.totalYesMON + m.totalNoMON,
    };
  }, [tokenId]);
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

  // Simple scoring: base on tokens + graduation rate + volume
  const gradRate = profile.tokenCount > 0 ? profile.graduatedCount / profile.tokenCount : 0;
  const volumeScore = Number(profile.totalBuyVolume) / 1e18;

  let rawScore =
    Math.min(profile.tokenCount * 3, 20) +
    Math.min(profile.graduatedCount * 5, 30) +
    gradRate * 25 +
    Math.min(volumeScore / 5000, 20) +
    Math.min(accountAgeDays / 10, 5);

  rawScore = Math.min(Math.max(Math.round(rawScore), 0), 100);

  // Tier
  let tier: Tier = "Starter";
  if (rawScore >= 70) tier = "Verified";
  else if (rawScore >= 30) tier = "Established";

  // Badges
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
  if (accountAgeDays >= 365 && profile.graduatedCount >= OG_MIN_GRADS) badges.push("OG");

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