/**
 * Server-safe bonding curve math — mirrors the on-chain BondingCurve contract.
 *
 * These are pure functions with no client-only dependencies, so they can be
 * imported from both client components (via re-export in wagmi/contracts.ts)
 * and server components / generateMetadata() functions. Keeping this logic in
 * a file with no "use client" directive avoids pulling wagmi/viem's client
 * bundle into server-rendered metadata generation.
 */

const VIRTUAL_MON = 80_000n * 10n ** 18n;
const VIRTUAL_TOKENS = 477_000_000n * 10n ** 18n;
const GRADUATION_THRESHOLD = 100_000n * 10n ** 18n;

export function getTokenPrice(
  realMon: bigint,
  soldTokens: bigint
): { monPerToken: number; marketCapMon: number } {
  const reserveTokens = VIRTUAL_TOKENS - soldTokens;
  if (reserveTokens <= 0n) return { monPerToken: 0, marketCapMon: 0 };
  const reserveMon = VIRTUAL_MON + realMon;
  // AMM spot price: reserveMon and reserveTokens are both in wei (1e18),
  // so their ratio gives MON per token directly (units cancel).
  const monPerToken = Number(reserveMon) / Number(reserveTokens);
  const totalSupply = 1_000_000_000; // 1 billion tokens
  const marketCapMon = monPerToken * totalSupply;
  return { monPerToken, marketCapMon };
}

export function getGraduationProgress(realMon: bigint): number {
  if (realMon >= GRADUATION_THRESHOLD) return 100;
  return Number((realMon * 10000n) / GRADUATION_THRESHOLD) / 100;
}

export function formatMon(wei: bigint): string {
  const num = Number(wei) / 1e18;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K MON`;
  return `${num.toFixed(2)} MON`;
}

export function formatTokens(wei: bigint): string {
  const num = Number(wei) / 1e18;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
}
