/**
 * Lick.fun Reputation Engine — Core Scoring Module (browser-safe)
 *
 * Computes profile reputation scores using a weighted multi-factor model
 * with sigmoid normalization to 0-100. Fully deterministic.
 *
 * Formula (locked):
 *   raw = w_age·f_age(age) + w_grad·gradRate + w_lock·lockRate
 *       + w_vol·f_vol(cumVol) + w_honest·prebuyHonest + w_vtenure·f_vtenure(vDays)
 *       - w_rug·Σ severity_i
 *
 *   reputation = 100 / (1 + e^(-k·(raw - midpoint)))
 */

import type { ScoringInputs, ScoringResult } from "./types";
import { computeBadges } from "./badges";
import { computeTier } from "./tiers";

const WEIGHTS = {
  w_age: 0.1,
  w_grad: 0.25,
  w_lock: 0.25,
  w_vol: 0.1,
  w_honest: 0.1,
  w_vtenure: 0.1,
  w_rug: 10.0,
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
  const ageTerm = WEIGHTS.w_age * fAge(inputs.accountAgeDays);
  const gradTerm = WEIGHTS.w_grad * inputs.graduationRate;
  const lockTerm = WEIGHTS.w_lock * inputs.lockFulfillmentRate;
  const volTerm = WEIGHTS.w_vol * fVol(inputs.cumulativeGradVolume, inputs.medianGradVolume);
  const honestTerm = WEIGHTS.w_honest * inputs.prebuyHonestyRate;
  const vtenureTerm = WEIGHTS.w_vtenure * fVtenure(inputs.verifiedTenureDays);
  const rugPenalty = WEIGHTS.w_rug * computeRugPenalty(inputs.rugEvents);

  return ageTerm + gradTerm + lockTerm + volTerm + honestTerm + vtenureTerm - rugPenalty;
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
  computedAt?: number
): ScoringResult {
  const rawScore = computeRawScore(inputs);
  const reputation = sigmoid(rawScore);
  const tier = computeTier(reputation);
  const badges = computeBadges(inputs, reputation);

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
  return entries.map(({ address, inputs }) => computeScore(address, inputs, ts));
}