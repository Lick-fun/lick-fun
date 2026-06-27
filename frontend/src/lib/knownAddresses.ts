/**
 * Known contract addresses with friendly display labels.
 * Keys MUST be lowercase to match address.toLowerCase() comparisons.
 *
 * These addresses appear as "traders" in the Recent Trades feed when
 * automated on-chain operations (buybacks, LP support) execute.
 */
export const KNOWN_ADDRESS_LABELS: Record<string, string> = {
  // VaultBuybackBurn v2 (active)
  "0x45b1ee1e9e8e9ff8ce6bbbd55b430cab4b25e06d": "🔥 Buyback & Burn",
  // VaultBuybackBurn v1 (deprecated, old trades still reference it)
  "0xe64d7d3e2d714f23b38bc00e1c185875c2b4d1d1": "🔥 Buyback & Burn",
  // VaultLPSupport v2 (active)
  "0xf1aac85a5f964564e472bf1e0628c536b01809e0": "💧 LP Support",
  // VaultLPSupport v1 (deprecated)
  "0x69240beca90d25e2d50ca443d8ecaaab69cce183": "💧 LP Support",
};
