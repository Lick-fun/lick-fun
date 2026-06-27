/**
 * Lickfun.xyz Reputation Engine — Badge System (browser-safe)
 *
 * Badges are milestone-based and never claimed. They are computed
 * deterministically from scoring inputs and final reputation.
 */

import type { Badge, ScoringInputs, TokenDiversityData } from "./types";

const VOLUME_MAKER_THRESHOLD = 100_000n * 10n ** 18n;
const PREBUY_HONESTY_THRESHOLD = 0.95;
const CROWD_FAVOURITE_TRADERS = 200;     // unique buyers on a single token
const DIVERSITY_MIN_FOR_GRAD_BADGES = 0.3; // min avgTraderDiversity for grad badges
const OG_AGE_DAYS = 365;
const OG_MIN_GRADS = 3;
const NEVER_RUG_MIN_AGE = 30;
const VERIFIED_FOUNDER_MIN_SCORE = 70;

/** The one and only address that holds the Founder badge. */
const FOUNDER_ADDRESS = "0xb2da54bb8d5676247ef83354328c481d518fbb0c";

function hasRugPenalty(inputs: ScoringInputs): boolean {
  return inputs.rugEvents.length > 0;
}

/**
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

  if (tokenCount >= 1) badges.push("First Token");
  if (graduatedCount >= 3 && inputs.avgTraderDiversity >= DIVERSITY_MIN_FOR_GRAD_BADGES) {
    badges.push("Triple Graduate");
  }
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
  if (
    inputs.accountAgeDays >= OG_AGE_DAYS &&
    graduatedCount >= OG_MIN_GRADS &&
    inputs.avgTraderDiversity >= DIVERSITY_MIN_FOR_GRAD_BADGES
  ) {
    badges.push("OG");
  }

  return badges;
}