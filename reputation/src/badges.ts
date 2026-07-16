/**
 * Lickfun.xyz Reputation Engine — Badge System
 *
 * Badges are milestone-based and never claimed. They are computed
 * deterministically from scoring inputs and final reputation.
 */

import type { Badge, ScoringInputs, TokenDiversityData } from "./types";

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Thresholds                                                                     */
/* ──────────────────────────────────────────────────────────────────────────────── */

const VOLUME_MAKER_THRESHOLD = 100_000n * 10n ** 18n; // 100k MON
const PREBUY_HONESTY_THRESHOLD = 0.95; // 95%
const CROWD_FAVOURITE_TRADERS = 200;     // unique buyers on a single token
const DIVERSITY_MIN_FOR_GRAD_BADGES = 0.3; // min avgTraderDiversity for grad badges
const OG_AGE_DAYS = 365;
const OG_MIN_GRADS = 3;
const NEVER_RUG_MIN_AGE = 30; // days
const VERIFIED_FOUNDER_MIN_SCORE = 70;

/** The one and only address that holds the Founder badge. */
const FOUNDER_ADDRESS = "0xb2da54bb8d5676247ef83354328c481d518fbb0c";

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
 *
 * @param profileAddress - optional wallet address used to grant the hardcoded Founder badge.
 */
export function computeBadges(
  inputs: ScoringInputs,
  reputation: number,
  tokenDiversityData: TokenDiversityData[] = [],
  profileAddress?: string
): Badge[] {
  const badges: Badge[] = [];

  // "Founder" — exclusive to the Lickfun.xyz deployer wallet. Not earnable by anyone else.
  if (profileAddress?.toLowerCase() === FOUNDER_ADDRESS) {
    badges.push("Founder");
  }

  const { tokenCount, graduatedCount } = inputs;

  // "First Token" — tokenCount >= 1
  if (tokenCount >= 1) {
    badges.push("First Token");
  }

  // "First Graduation" — graduatedCount >= 1 (no diversity gate — simplest milestone)
  if (graduatedCount >= 1) {
    badges.push("First Graduation");
  }

  // "Triple Graduate" — graduatedCount >= 3 AND avgTraderDiversity >= threshold
  if (graduatedCount >= 3 && inputs.avgTraderDiversity >= DIVERSITY_MIN_FOR_GRAD_BADGES) {
    badges.push("Triple Graduate");
  }

  // "Deca Graduate" — graduatedCount >= 10 AND avgTraderDiversity >= threshold
  if (graduatedCount >= 10 && inputs.avgTraderDiversity >= DIVERSITY_MIN_FOR_GRAD_BADGES) {
    badges.push("Deca Graduate");
  }

  // "Crowd Favourite" — at least one graduated token had >= 200 unique buyers
  const hasCrowdFavourite = tokenDiversityData.some(
    (t) => t.graduated && t.uniqueBuyerCount >= CROWD_FAVOURITE_TRADERS
  );
  if (hasCrowdFavourite) {
    badges.push("Crowd Favourite");
  }

  // "Diamond Hands" — creator never sold their own token on any graduated token
  const hasNeverSoldOwn = tokenDiversityData
    .filter((t) => t.graduated)
    .every((t) => t.creatorSellCount === 0);
  if (tokenDiversityData.some((t) => t.graduated) && hasNeverSoldOwn) {
    badges.push("Diamond Hands");
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

  // "OG" — profile.age >= 365 days AND graduatedCount >= 3 AND avgTraderDiversity >= threshold
  if (
    inputs.accountAgeDays >= OG_AGE_DAYS &&
    graduatedCount >= OG_MIN_GRADS &&
    inputs.avgTraderDiversity >= DIVERSITY_MIN_FOR_GRAD_BADGES
  ) {
    badges.push("OG");
  }

  return badges;
}