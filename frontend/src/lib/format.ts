/**
 * Shared formatting helpers used across pages.
 */

/**
 * Format a market-cap value (in MON) as USD when a MON/USD price is available,
 * otherwise fall back to a MON-denominated label (no misleading `$` sign).
 *
 * @param mcMon        market cap in MON (raw number, not wei)
 * @param monUsdPrice  current MON/USD price, or null/undefined if unavailable
 */
export function formatMarketCapUsd(
  mcMon: number,
  monUsdPrice: number | null | undefined
): string {
  if (monUsdPrice != null && monUsdPrice > 0) {
    const usd = mcMon * monUsdPrice;
    if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`;
    if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
    if (usd >= 1) return `$${usd.toFixed(2)}`;
    return `$${usd.toFixed(3)}`;
  }
  // Fallback: show MON value with no `$` prefix
  if (mcMon >= 1_000_000) return `${(mcMon / 1_000_000).toFixed(2)}M MON`;
  if (mcMon >= 1_000) return `${(mcMon / 1_000).toFixed(1)}K MON`;
  return `${mcMon.toFixed(0)} MON`;
}

/**
 * Format a price-per-token value in MON with adaptive precision.
 */
export function formatPriceMon(monPerToken: number): string {
  if (monPerToken === 0) return "0 MON";
  if (monPerToken >= 1) return `${monPerToken.toFixed(4)} MON`;
  if (monPerToken >= 0.001) return `${monPerToken.toFixed(6)} MON`;
  if (monPerToken >= 0.000_001) return `${monPerToken.toFixed(9)} MON`;
  return `${monPerToken.toFixed(12)} MON`;
}

/**
 * Format a 24h volume (sum of buy + sell) in MON.
 */
export function formatVolume(totalBuy: bigint, totalSell: bigint): string {
  const total = Number(totalBuy + totalSell) / 1e18;
  if (total >= 1_000_000) return `${(total / 1_000_000).toFixed(1)}M`;
  if (total >= 1_000) return `${(total / 1_000).toFixed(1)}K`;
  return total.toFixed(2);
}

/**
 * Format a transaction count (buy + sell).
 */
export function formatTxCount(buyCount: number, sellCount: number): string {
  return (buyCount + sellCount).toString();
}