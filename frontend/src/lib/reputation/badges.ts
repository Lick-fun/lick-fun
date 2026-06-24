/**
 * Lick.fun Reputation Engine — Badge System (browser-safe)
 *
 * Badges are milestone-based and never claimed. They are computed
 * deterministically from scoring inputs and final reputation.
 */

import type { Badge, ScoringInputs } from "./types";

const VOLUME_MAKER_THRESHOLD = 100_000n * 10n ** 18n;
const PREBUY_HONESTY_THRESHOLD = 0.95;
const LOCKED_HONEST_180 = 180;
const LOCKED_HONEST_365 = 365;
const OG_AGE_DAYS = 365;
const OG_MIN_GRADS = 3;
const NEVER_RUG_MIN_AGE = 30;
const VERIFIED_FOUNDER_MIN_SCORE = 70;

function hasRugPenalty(inputs: ScoringInputs): boolean {
  return inputs.rugEvents.length > 0;
}

export function computeBadges(
  inputs: ScoringInputs,
  reputation: number
): Badge[] {
  const badges: Badge[] = [];
  const { tokenCount, graduatedCount } = inputs;

  if (tokenCount >= 1) badges.push("First Token");
  if (graduatedCount >= 3) badges.push("Triple Graduate");
  if (graduatedCount >= 10) badges.push("Deca Graduate");
  if (inputs.lockFulfillmentRate >= 1.0 && inputs.accountAgeDays >= LOCKED_HONEST_180) {
    badges.push("Locked & Honest — 180d");
  }
  if (inputs.lockFulfillmentRate >= 1.0 && inputs.accountAgeDays >= LOCKED_HONEST_365) {
    badges.push("Locked & Honest — 365d");
  }
  if (inputs.accountAgeDays >= NEVER_RUG_MIN_AGE && !hasRugPenalty(inputs)) {
    badges.push("Never Rug");
  }
  if (inputs.prebuyHonestyRate >= PREBUY_HONESTY_THRESHOLD) {
    badges.push("Pre-buy Honest");
  }
  if (inputs.cumulativeGradVolume > VOLUME_MAKER_THRESHOLD) {
    badges.push("Volume Maker");
  }
  if (reputation >= VERIFIED_FOUNDER_MIN_SCORE) {
    badges.push("Verified Founder");
  }
  if (inputs.accountAgeDays >= OG_AGE_DAYS && graduatedCount >= OG_MIN_GRADS) {
    badges.push("OG");
  }

  return badges;
}