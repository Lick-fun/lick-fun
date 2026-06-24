/**
 * Lick.fun Reputation Engine — Type Definitions
 * Stage 4: Pure off-chain scoring, badges, tiers, and Merkle anchor.
 */

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Envio GraphQL Entity Shapes (mirrors indexer schema for clarity)                */
/* ──────────────────────────────────────────────────────────────────────────────── */

export interface TokenEntity {
  id: string;               // token address (lowercase hex)
  creator: string;           // creator wallet address
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
  id: string;               // "${txHash}-${logIndex}"
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
  id: string;               // creator wallet address (lowercase hex)
  createdAt: bigint;
  tokenCount: number;
  graduatedCount: number;
  totalBuyVolume: bigint;
  totalSellVolume: bigint;
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Reputation Types                                                               */
/* ──────────────────────────────────────────────────────────────────────────────── */

export type Badge =
  | "First Token"
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
  /** Total MON raised by the rug-pulled token */
  monRaised: bigint;
  /** Total MON raised across all tokens ever (for severity denominator) */
  totalMonAllTime: bigint;
  /** Number of holders harmed */
  holdersHarmed: number;
  /** Base holder count for normalization (e.g. 100) */
  holderBase: number;
}

export interface ScoringInputs {
  /** Account age in days (current time - first token launch timestamp) */
  accountAgeDays: number;
  /** Total tokens created by this profile */
  tokenCount: number;
  /** Total tokens graduated */
  graduatedCount: number;
  /** Volume-weighted graduation quality (0–1). Replaces raw graduationRate. */
  qualityGradRate: number;
  /** Average unique trader diversity across graduated tokens (0–1). */
  avgTraderDiversity: number;
  /** Number of times the creator bought their own token after the dev pre-buy. */
  creatorSelfTradeCount: number;
  /** Number of tokens launched in the last 30 days (for burst detection). */
  tokensInLast30Days: number;
  /** Cumulative MON volume across all graduated tokens */
  cumulativeGradVolume: bigint;
  /** Median graduated volume across all profiles (for normalization) */
  medianGradVolume: bigint;
  /** prebuyHonestyRate = fraction of pre-buys that were honest (0-1) */
  prebuyHonestyRate: number;
  /** Days since the creator's wallet was verified (0 if not verified) */
  verifiedTenureDays: number;
  /** Accumulated rug events with severity data */
  rugEvents: RugEvent[];
  /** Set of linked wallet addresses whose rug penalties propagate here */
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
  /** The profile address being scored */
  address: string;
  /** Raw linear score before sigmoid */
  rawScore: number;
  /** Final reputation score 0–100 */
  reputation: number;
  /** Tier derived from reputation */
  tier: Tier;
  /** Active badges */
  badges: Badge[];
  /** The scoring inputs used (for auditability) */
  inputs: ScoringInputs;
  /** Computed at */
  computedAt: number;       // unix timestamp
}

export interface ProfileScore {
  address: string;
  reputation: number;
  tier: Tier;
  badges: Badge[];
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Merkle Anchor Types                                                            */
/* ──────────────────────────────────────────────────────────────────────────────── */

export interface MerkleLeaf {
  address: string;
  reputation: number;
  tier: Tier;
  activeBadges: Badge[];
}

export interface MerkleAnchor {
  /** Keccak256 Merkle root of all profile leaves */
  root: string;
  /** Number of profiles in the tree */
  profileCount: number;
  /** Unix timestamp of anchor computation */
  timestamp: number;
  /** Encoded calldata for the anchor contract (Stage 6) */
  calldata: string;
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Query Types                                                                   */
/* ──────────────────────────────────────────────────────────────────────────────── */

export interface LeaderboardEntry {
  address: string;
  reputation: number;
  tier: Tier;
  graduatedCount: number;
  tokenCount: number;
}

export interface EnvioProfileResponse {
  profile?: ProfileEntity | null;
  tokens: TokenEntity[];
  trades: TradeEntity[];
}

export interface EnvioAllProfilesResponse {
  profiles: ProfileEntity[];
}

export interface EnvioLeaderboardResponse {
  profiles: ProfileEntity[];
}