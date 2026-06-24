/**
 * Lick.fun Reputation Engine — Core Scoring Module (browser-safe)
 *
 * Computes profile reputation scores using a weighted multi-factor model
 * with sigmoid normalization to 0-100. Fully deterministic.
 *
 * Formula (locked):
 *   raw = w_age·f_age(age) + w_grad·qualityGradRate + w_div·avgTraderDiversity
 *       + w_vol·f_vol(cumVol) + w_hon·prebuyHonest + w_vt·f_vtenure(vDays)
 *       - w_rug·Σ severity_i - w_self·selfTradePenalty - w_burst·burstPenalty
 *
 *   reputation = 100 / (1 + e^(-k·(raw - midpoint)))
 */

import type { ScoringInputs, ScoringResult, TokenDiversityData } from "./types";
import { computeBadges } from "./badges";
import { computeTier } from "./tiers";

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

const K = 0.15;
const MIDPOINT = 0.4;
const AGE_CAP_DAYS = 365;
const VTENURE_CAP_DAYS = 180;

export function fAge(ageDays: number): number {
  return Math.min(ageDays / AGE_CAP_DAYS, 1.0);
}

export function fVol(
  cumulativeGradVolume: bigint,
  medianGradVolume: bigint
): number {
  if (medianGradVolume === 0n) return 0;
  const ratio = Number(cumulativeGradVolume) / Number(medianGradVolume);
  return Math.min(ratio, 1.0);
}

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

export function computeRugSeverity(event: {
  monRaised: bigint;
  totalMonAllTime: bigint;
  holdersHarmed: number;
  holderBase: number;
}): number {
  if (event.totalMonAllTime === 0n || event.holderBase === 0) return 0;
  const monFraction = Number(event.monRaised) / Number(event.totalMonAllTime);
  const holderFraction = event.holdersHarmed / event.holderBase;
  return monFraction * holderFraction;
}

export function computeRugPenalty(
  events: { monRaised: bigint; totalMonAllTime: bigint; holdersHarmed: number; holderBase: number }[]
): number {
  return events.reduce((sum, e) => sum + computeRugSeverity(e), 0);
}

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

export function sigmoid(rawScore: number, k: number = K, midpoint: number = MIDPOINT): number {
  const exponent = -k * (rawScore - midpoint);
  const clippedExponent = Math.max(-700, Math.min(700, exponent));
  const score = 100 / (1 + Math.exp(clippedExponent));
  return Math.max(0, Math.min(100, score));
}

export function computeScore(
  address: string,
  inputs: ScoringInputs,
  tokenDiversityData: TokenDiversityData[] = [],
  computedAt?: number
): ScoringResult {
  const rawScore = computeRawScore(inputs);
  const reputation = sigmoid(rawScore);
  const tier = computeTier(reputation);
  const badges = computeBadges(inputs, reputation, tokenDiversityData);

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

export function computeScores(
  entries: Array<{ address: string; inputs: ScoringInputs }>,
  computedAt?: number
): ScoringResult[] {
  const ts = computedAt ?? Date.now();
  return entries.map(({ address, inputs }) =>
    computeScore(address, inputs, [], ts)
  );
}