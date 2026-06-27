/**
 * Lickfun.xyz Reputation Engine — Core Scoring Module
 *
 * Computes profile reputation scores using a weighted multi-factor model
 * with sigmoid normalization to 0-100.  Fully deterministic: same inputs
 * always produce the same output.
 *
 * Formula (locked):
 *   raw = w_age·f_age(age) + w_grad·qualityGradRate + w_div·avgTraderDiversity
 *       + w_vol·f_vol(cumVol) + w_hon·prebuyHonest + w_vt·f_vtenure(vDays)
 *       - w_rug·Σ severity_i - w_self·selfTradePenalty - w_burst·burstPenalty
 *
 *   reputation = 100 / (1 + e^(-k·(raw - midpoint)))
 */

import type {
  ScoringInputs,
  ScoringResult,
  RugEvent,
  TokenDiversityData,
} from "./types";
import { computeBadges } from "./badges";
import { computeTier } from "./tiers";

/* ═══════════════════════════════════════════════════════════════════════════════ */
/* Constants (tunable)                                                            */
/* ═══════════════════════════════════════════════════════════════════════════════ */

const WEIGHTS = {
  w_age:   0.10,  // account age (time-gated)
  w_grad:  0.30,  // quality-weighted graduation rate (up from 0.25)
  w_div:   0.15,  // average trader diversity (anti-wash, new)
  w_vol:   0.10,  // cumulative graduated volume
  w_hon:   0.10,  // pre-buy honesty
  w_vt:    0.05,  // verified tenure (down from 0.10)
  w_rug:   10.0,  // rug penalty (unchanged — intentionally huge)
  w_self:  0.20,  // creator self-trade penalty (new)
  w_burst: 0.15,  // burst-launch penalty (new)
} as const;

/** Sigmoid steepness */
const K = 0.15;

/** Sigmoid midpoint (raw score where reputation = 50) */
const MIDPOINT = 0.4;

/** Max age days for saturation */
const AGE_CAP_DAYS = 365;

/** Max verified tenure days for saturation */
const VTENURE_CAP_DAYS = 180;

/** Volume maker threshold in MON (used by badge) */
const VOLUME_MAKER_THRESHOLD = 100_000n * 10n ** 18n; // 100k MON

/* ═══════════════════════════════════════════════════════════════════════════════ */
/* Saturating functions                                                           */
/* ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Account age saturating function.
 * Caps at 365 days: f_age(x) = min(x / 365, 1)
 */
export function fAge(ageDays: number): number {
  return Math.min(ageDays / AGE_CAP_DAYS, 1.0);
}

/**
 * Volume saturating function.
 * f_vol(x) = min(x / medianGradVolume, 1)
 * If medianGradVolume is 0, returns 0.
 */
export function fVol(
  cumulativeGradVolume: bigint,
  medianGradVolume: bigint
): number {
  if (medianGradVolume === 0n) return 0;
  const ratio = Number(cumulativeGradVolume) / Number(medianGradVolume);
  return Math.min(ratio, 1.0);
}

/**
 * Verified tenure saturating function.
 * Caps at 180 days: f_vtenure(x) = min(x / 180, 1)
 */
export function fVtenure(tenureDays: number): number {
  return Math.min(tenureDays / VTENURE_CAP_DAYS, 1.0);
}

/**
 * Burst penalty: returns 1 if the creator launched >5 tokens total
 * AND >60% of their lifetime tokens were in the last 30 days.
 * Otherwise returns 0.
 */
export function computeBurstPenalty(
  tokenCount: number,
  tokensInLast30Days: number
): number {
  if (tokenCount <= 5) return 0;
  const burstRatio = tokensInLast30Days / tokenCount;
  return burstRatio > 0.6 ? 1 : 0;
}

/**
 * Self-trade penalty: normalised creator self-buy count on their own tokens.
 * Returns a value in [0, 1] — capped so one or two self-buys don't fully tank the score.
 */
export function computeSelfTradePenalty(creatorSelfTradeCount: number): number {
  // Each self-trade contributes 0.25, capped at 1.0
  return Math.min(creatorSelfTradeCount * 0.25, 1.0);
}

/* ═══════════════════════════════════════════════════════════════════════════════ */
/* Rug penalty computation                                                        */
/* ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Compute severity for a single rug event.
 *
 *   severity_i = (MON_raised_at_rug / total_MON_raised_all_time)
 *              × (holders_harmed / holder_base)
 *
 * A single confirmed rug produces a severity high enough that
 * w_rug × severity floors the sigmoid input to near-zero reputation.
 */
export function computeRugSeverity(event: RugEvent): number {
  if (event.totalMonAllTime === 0n || event.holderBase === 0) return 0;

  const monFraction =
    Number(event.monRaised) / Number(event.totalMonAllTime);
  const holderFraction = event.holdersHarmed / event.holderBase;

  return monFraction * holderFraction;
}

/**
 * Total rug penalty = Σ severity_i
 */
export function computeRugPenalty(events: RugEvent[]): number {
  return events.reduce((sum, e) => sum + computeRugSeverity(e), 0);
}

/* ═══════════════════════════════════════════════════════════════════════════════ */
/* Raw score computation                                                          */
/* ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Compute the raw linear score from scoring inputs.
 * This is deterministic — same inputs, same output.
 */
export function computeRawScore(inputs: ScoringInputs): number {
  const ageTerm      = WEIGHTS.w_age   * fAge(inputs.accountAgeDays);
  const gradTerm     = WEIGHTS.w_grad  * inputs.qualityGradRate;
  const divTerm      = WEIGHTS.w_div   * inputs.avgTraderDiversity;
  const volTerm      = WEIGHTS.w_vol   * fVol(inputs.cumulativeGradVolume, inputs.medianGradVolume);
  const honTerm      = WEIGHTS.w_hon   * inputs.prebuyHonestyRate;
  const vtenureTerm  = WEIGHTS.w_vt    * fVtenure(inputs.verifiedTenureDays);
  const rugPenalty   = WEIGHTS.w_rug   * computeRugPenalty(inputs.rugEvents);
  const selfPenalty  = WEIGHTS.w_self  * computeSelfTradePenalty(inputs.creatorSelfTradeCount);
  const burstPenalty = WEIGHTS.w_burst * computeBurstPenalty(inputs.tokenCount, inputs.tokensInLast30Days);

  return ageTerm + gradTerm + divTerm + volTerm + honTerm + vtenureTerm
       - rugPenalty - selfPenalty - burstPenalty;
}

/* ═══════════════════════════════════════════════════════════════════════════════ */
/* Sigmoid normalization                                                          */
/* ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Map raw score to 0-100 via sigmoid:
 *   reputation = 100 / (1 + e^(-k × (raw - midpoint)))
 *
 * Clamped to [0, 100] to account for floating-point edge cases.
 */
export function sigmoid(rawScore: number, k: number = K, midpoint: number = MIDPOINT): number {
  const exponent = -k * (rawScore - midpoint);
  // Clip exponent to avoid overflow/underflow in Math.exp
  const clippedExponent = Math.max(-700, Math.min(700, exponent));
  const score = 100 / (1 + Math.exp(clippedExponent));
  return Math.max(0, Math.min(100, score));
}

/* ═══════════════════════════════════════════════════════════════════════════════ */
/* Full scoring pipeline                                                         */
/* ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Compute the full profile score: raw → sigmoid → tier + badges.
 */
export function computeScore(
  address: string,
  inputs: ScoringInputs,
  tokenDiversityData: TokenDiversityData[] = [],
  computedAt?: number
): ScoringResult {
  const rawScore = computeRawScore(inputs);
  const reputation = sigmoid(rawScore);
  const tier = computeTier(reputation);
  const badges = computeBadges(inputs, reputation, tokenDiversityData, address);

  return {
    address,
    rawScore,
    reputation,
    tier,
    badges,
    inputs,
    computedAt: computedAt ?? Date.now(),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════ */
/* Batch scoring                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Compute scores for multiple profiles in one pass.
 */
export function computeScores(
  entries: Array<{ address: string; inputs: ScoringInputs }>,
  computedAt?: number
): ScoringResult[] {
  const ts = computedAt ?? Date.now();
  return entries.map(({ address, inputs }) =>
    computeScore(address, inputs, [], ts)
  );
}