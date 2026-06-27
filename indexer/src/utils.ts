/**
 * Lickfun.xyz Indexer — Pure utility functions
 * Exported for use in EventHandlers.ts and unit tests.
 */

/* ═══════════════════════ CONSTANTS (mirrored from contracts) ═══════════════════════ */

export const VIRTUAL_MON: bigint = 80_000n * 10n ** 18n;
export const VIRTUAL_TOKENS: bigint = 477_000_000n * 10n ** 18n;
export const TOTAL_SUPPLY: bigint = 1_000_000_000n * 10n ** 18n;
export const GRADUATION_THRESHOLD: bigint = 100_000n * 10n ** 18n;
export const K: bigint = VIRTUAL_MON * VIRTUAL_TOKENS;

/**
 * Tokens available on the bonding curve:
 * TOTAL_SUPPLY (1B) − VIRTUAL_TOKENS (477M) = 523M tokens
 */
export const TARGET_TOKEN_AMOUNT: bigint = TOTAL_SUPPLY - VIRTUAL_TOKENS;

/* ══════════════════════════ ANTI-SNIPING DECAY TABLE ══════════════════════════════ */

/**
 * Returns the anti-sniping penalty in basis points based on blocks elapsed since
 * BondingCurve deployment (startBlock). Mirrors BondingCurve.getAntiSnipingPenaltyBps().
 *
 * @param elapsed  blocks elapsed since startBlock (blockNumber - startBlock)
 * @returns        penalty in bps (0–8000); 0 when elapsed >= 7
 *
 * Decay table:
 *   block 0 → 8000 bps (80%)
 *   block 1 → 4000 bps (40%)
 *   block 2 → 2000 bps (20%)
 *   block 3 → 1500 bps (15%)
 *   block 4 → 1000 bps (10%)
 *   block 5 → 1000 bps (10%)
 *   block 6 →  500 bps  (5%)
 *   block 7+ →   0 bps  (0%)
 */
export function getPenaltyBps(elapsed: bigint): number {
  if (elapsed >= 7n) return 0;
  if (elapsed === 0n) return 8000;
  if (elapsed === 1n) return 4000;
  if (elapsed === 2n) return 2000;
  if (elapsed === 3n) return 1500;
  if (elapsed === 4n) return 1000;
  if (elapsed === 5n) return 1000;
  return 500; // elapsed === 6n
}

/* ════════════════════════════ CPMM STATE DERIVATION ═══════════════════════════════ */

/**
 * Derives the exact realMon value from the CPMM invariant given soldTokens.
 *
 * Formula: realMon = K / (VIRTUAL_TOKENS − soldTokens) − VIRTUAL_MON
 *
 * Uses integer division throughout to mirror Solidity's uint256 arithmetic.
 * This gives the exact on-chain realMon without tracking fees or penalties.
 *
 * @param soldTokens  current soldTokens state
 * @returns           exact realMon value in wei (≥ 0)
 */
export function deriveRealMon(soldTokens: bigint): bigint {
  const remaining = VIRTUAL_TOKENS - soldTokens;
  if (remaining <= 0n) return 0n;
  const quotient = K / remaining; // integer division — matches Solidity
  return quotient > VIRTUAL_MON ? quotient - VIRTUAL_MON : 0n;
}
