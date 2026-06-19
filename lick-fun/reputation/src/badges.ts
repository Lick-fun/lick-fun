/**
 * Lick.fun Reputation Engine — Badge System
 *
 * Badges are milestone-based and never claimed. They are computed
 * deterministically from scoring inputs and final reputation.
 */

import type { Badge, ScoringInputs } from "./types";

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Thresholds                                                                     */
/* ──────────────────────────────────────────────────────────────────────────────── */

const VOLUME_MAKER_THRESHOLD = 100_000n * 10n ** 18n; // 100k MON
const PREBUY_HONESTY_THRESHOLD = 0.95; // 95%
const LOCKED_HONEST_180 = 180; // days
const LOCKED_HONEST_365 = 365; // days
const OG_AGE_DAYS = 365;
const OG_MIN_GRADS = 3;
const NEVER_RUG_MIN_AGE = 30; // days
const VERIFIED_FOUNDER_MIN_SCORE = 70;

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Individual badge checks                                                        */
/* ──────────────────────────────────────────────────────────────────────────────── */

function hasRugPenalty(inputs: ScoringInputs): boolean {
  return inputs.rugEvents.length > 0;
}

function totalRugSeverity(inputs: ScoringInputs): number {
  return inputs.rugEvents.reduce((sum, e) => {
    if (e.totalMonAllTime === 0n || e.holderBase === 0) return sum;
    const monFrac = Number(e.monRaised) / Number(e.totalMonAllTime);
    const holderFrac = e.holdersHarmed / e.holderBase;
    return sum + monFrac * holderFrac;
  }, 0);
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Badge computation                                                              */
/* ──────────────────────────────────────────────────────────────────────────────── */

/**
 * Compute all active badges for a profile.
 * Deterministic: given the same inputs + reputation, always returns the same set.
 */
export function computeBadges(
  inputs: ScoringInputs,
  reputation: number
): Badge[] {
  const badges: Badge[] = [];

  const { tokenCount, graduatedCount } = inputs;

  // "First Token" — tokenCount >= 1
  if (tokenCount >= 1) {
    badges.push("First Token");
  }

  // "Triple Graduate" — graduatedCount >= 3
  if (graduatedCount >= 3) {
    badges.push("Triple Graduate");
  }

  // "Deca Graduate" — graduatedCount >= 10
  if (graduatedCount >= 10) {
    badges.push("Deca Graduate");
  }

  // "Locked & Honest — 180d" — lockFulfillmentRate >= 100% AND accountAgeDays >= 180
  if (inputs.lockFulfillmentRate >= 1.0 && inputs.accountAgeDays >= LOCKED_HONEST_180) {
    badges.push("Locked & Honest — 180d");
  }

  // "Locked & Honest — 365d" — lockFulfillmentRate >= 100% AND accountAgeDays >= 365
  if (inputs.lockFulfillmentRate >= 1.0 && inputs.accountAgeDays >= LOCKED_HONEST_365) {
    badges.push("Locked & Honest — 365d");
  }

  // "Never Rug" — profile.age >= 30 days AND rugPenalty === 0
  if (inputs.accountAgeDays >= NEVER_RUG_MIN_AGE && !hasRugPenalty(inputs)) {
    badges.push("Never Rug");
  }

  // "Pre-buy Honest" — prebuyHonestyRate >= 95%
  if (inputs.prebuyHonestyRate >= PREBUY_HONESTY_THRESHOLD) {
    badges.push("Pre-buy Honest");
  }

  // "Volume Maker" — cumulativeGradVolume > 100k MON
  if (inputs.cumulativeGradVolume > VOLUME_MAKER_THRESHOLD) {
    badges.push("Volume Maker");
  }

  // "Verified Founder" — reputation >= 70
  if (reputation >= VERIFIED_FOUNDER_MIN_SCORE) {
    badges.push("Verified Founder");
  }

  // "OG" — profile.age >= 365 days AND graduatedCount >= 3
  if (inputs.accountAgeDays >= OG_AGE_DAYS && graduatedCount >= OG_MIN_GRADS) {
    badges.push("OG");
  }

  return badges;
}