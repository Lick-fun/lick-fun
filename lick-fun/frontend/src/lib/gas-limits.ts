"use client";

/**
 * Tight declared gas limits for every contract write call.
 *
 * Monad charges gas on the DECLARED limit (not gas used), so overestimating
 * wastes MON for every user transaction. These values are set to be just above
 * the expected gas usage for each function.
 */

export const GAS_LIMITS = {
  /** delayed-mint commit tx */
  COMMIT: 200_000n,
  /** BondingCurve.buy */
  BUY_CURVE: 400_000n,
  /** BondingCurve.sell */
  SELL_CURVE: 400_000n,
  /** graduation migration */
  GRADUATE: 4_000_000n,
  /** FeeRouter.claimFees */
  CLAIM_FEES: 150_000n,
  /** ProfileRegistry.linkWallet */
  LINK_WALLET: 100_000n,
  /** PredictionMarket.createMarket / betYes / betNo */
  CREATE_PREDICTION: 200_000n,
  /** PredictionMarket.resolveMarket / claimWinnings */
  RESOLVE_PREDICTION: 150_000n,
  /** VestingController.deposit */
  DEPOSIT_VESTING: 200_000n,
  /** VestingController.claim */
  CLAIM_VESTING: 100_000n,
} as const;