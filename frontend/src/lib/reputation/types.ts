/**
 * Lickfun.xyz Reputation Engine — Type Definitions
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
  /** Number of unique buyer wallet addresses on this token */
  uniqueBuyerCount: number;
  /** Number of times the creator sold their own token */
  creatorSellCount: number;
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
  | "Founder"
  | "First Token"
  | "First Graduation"
  | "Triple Graduate"
  | "Deca Graduate"
  | "Crowd Favourite"
  | "Diamond Hands"
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
  /** Volume-weighted graduation quality (0–1). Replaces raw graduationRate. */
  qualityGradRate: number;
  /** Average unique trader diversity across graduated tokens (0–1). */
  avgTraderDiversity: number;
  /** Number of times the creator bought their own token after the dev pre-buy. */
  creatorSelfTradeCount: number;
  /** Number of tokens launched in the last 30 days (for burst detection). */
  tokensInLast30Days: number;
  cumulativeGradVolume: bigint;
  medianGradVolume: bigint;
  prebuyHonestyRate: number;
  verifiedTenureDays: number;
  rugEvents: RugEvent[];
  linkedWallets: string[];
}

export interface TokenDiversityData {
  /** Unique buyer addresses on this token */
  uniqueBuyerCount: number;
  /** Total MON buy volume (for quality weighting) */
  totalBuyVolume: bigint;
  /** Whether this token has graduated */
  graduated: boolean;
  /** Age of token in days at graduation (0 if not graduated) */
  ageAtGraduationDays: number;
  /** Number of times the creator sold their own token */
  creatorSellCount: number;
}

export interface ScoringResult {
  address: string;
  rawScore: number;
  reputation: number;
  tier: Tier;
  badges: Badge[];
  inputs: ScoringInputs;
  /**
   * True when the profile has so little on-chain activity that the numeric
   * reputation is not yet meaningful. UI consumers should render an
   * "Unranked" / "Building reputation" state instead of the raw number.
   *
   * A profile is sparse when it has:
   *   - no tokens created, AND
   *   - no graduations, AND
   *   - no verified tenure, AND
   *   - no rug events
   * (i.e. the only signal is account age and/or a handful of trades).
   */
  isSparse: boolean;
  computedAt: number;
}

export interface ProfileScore {
  address: string;
  reputation: number;
  tier: Tier;
  badges: Badge[];
}