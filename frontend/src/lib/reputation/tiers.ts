/**
 * Lickfun.xyz Reputation Engine — Profile Tiers (browser-safe)
 *
 * Tiers are derived deterministically from reputation score:
 *   Starter:     0–30
 *   Established: 30–70
 *   Verified:    70–100
 */

import type { Tier } from "./types";

const STARTER_MAX = 30;
const ESTABLISHED_MAX = 70;

export function computeTier(reputation: number): Tier {
  if (reputation < STARTER_MAX) return "Starter";
  if (reputation < ESTABLISHED_MAX) return "Established";
  return "Verified";
}