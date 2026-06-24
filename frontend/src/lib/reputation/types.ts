/**
 * Lick.fun Reputation Engine — Type Definitions
 * Stage 4: Pure off-chain scoring, badges, tiers, and Merkle anchor.
 *
 * Browser-safe copy of reputation/src/types.ts (no node:crypto deps).
 */

export interface TokenEntity {
  id: string;
  creator: string;
  name: string;
  symbol: string;
  curve: string;
  virtualMon: bigint;
  virtualTokens: bigint;
  targetTokenAmount: bigint;
  startTime: bigint;
  startBlock: bigint;
  realMon: bigint;
  soldTokens: bigint;
  graduated: boolean;
  createdAt: bigint;
  graduatedAt?: bigint | null;
  buyCount: number;
  sellCount: number;
  totalBuyVolume: bigint;
  totalSellVolume: bigint;
}

export interface TradeEntity {
  id: string;
  token_id: string;
  trader: string;
  isBuy: boolean;
  amountIn: bigint;
  amountOut: bigint;
  blockNumber: number;
  blockTimestamp: bigint;
  penaltyBps: number;
}

export interface ProfileEntity {
  id: string;
  createdAt: bigint;
  tokenCount: number;
  graduatedCount: number;
  totalBuyVolume: bigint;
  totalSellVolume: bigint;
}

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

export interface RugEvent {
  monRaised: bigint;
  totalMonAllTime: bigint;
  holdersHarmed: number;
  holderBase: number;
}

export interface ScoringInputs {
  accountAgeDays: number;
  tokenCount: number;
  graduatedCount: number;
  graduationRate: number;
  lockFulfillmentRate: number;
  cumulativeGradVolume: bigint;
  medianGradVolume: bigint;
  prebuyHonestyRate: number;
  verifiedTenureDays: number;
  rugEvents: RugEvent[];
  linkedWallets: string[];
}

export interface ScoringResult {
  address: string;
  rawScore: number;
  reputation: number;
  tier: Tier;
  badges: Badge[];
  inputs: ScoringInputs;
  computedAt: number;
}

export interface ProfileScore {
  address: string;
  reputation: number;
  tier: Tier;
  badges: Badge[];
}