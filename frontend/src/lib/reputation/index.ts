/**
 * Lick.fun Reputation Engine — Browser entry point
 *
 * Re-exports the pure scoring engine for use in the frontend.
 * The anchor (Merkle root) and off-chain query layer live in
 * reputation/src/ and are not needed in the browser.
 */

export type {
  Badge,
  Tier,
  RugEvent,
  ScoringInputs,
  ScoringResult,
  ProfileScore,
  TokenEntity,
  TradeEntity,
  ProfileEntity,
  TokenDiversityData,
} from "./types";

export {
  fAge,
  fVol,
  fVtenure,
  computeBurstPenalty,
  computeSelfTradePenalty,
  computeRugSeverity,
  computeRugPenalty,
  computeRawScore,
  sigmoid,
  computeScore,
  computeScores,
} from "./scoring";

export { computeTier } from "./tiers";
export { computeBadges } from "./badges";