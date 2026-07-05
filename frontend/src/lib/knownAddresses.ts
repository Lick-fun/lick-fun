/**
 * Known contract addresses with friendly display labels.
 * Keys MUST be lowercase to match address.toLowerCase() comparisons.
 *
 * These addresses appear as "traders" in the Recent Trades feed when
 * automated on-chain operations (buybacks, LP support) execute.
 */
export const KNOWN_ADDRESS_LABELS: Record<string, string> = {
  // VaultBuybackBurn v2 (active — burn-to-dead-address, deployed 2026-07-05)
  "0xd22bef54ad5baea2c21a80b91e38c5b67cbb1822": "🔥 Buyback and Burn",
  // VaultBuybackBurn v1 (deprecated — calls token.burn() which doesn't exist on deployed tokens)
  "0x45b1ee1e9e8e9ff8ce6bbbd55b430cab4b25e06d": "🔥 Buyback and Burn",
  // VaultBuybackBurn v0 (very old, pre-audit)
  "0xe64d7d3e2d714f23b38bc00e1c185875c2b4d1d1": "🔥 Buyback and Burn",
  // VaultLPSupport v2 (active)
  "0xf1aac85a5f964564e472bf1e0628c536b01809e0": "💧 LP Support",
  // VaultLPSupport v1 (deprecated)
  "0x69240beca90d25e2d50ca443d8ecaaab69cce183": "💧 LP Support",
  // Bonus Buyback and Burn
  "0x95c7cb05a2ab71f46bad2537cbea1d2362c5bb05": "🎁 Bonus Buyback and Burn",
};


/**
 * Returns true if the given address is a known contract (vault, router, etc.)
 * that should NOT be clickable in the Recent Trades ticker — clicking would
 * navigate to the token page, but these addresses aren't traders, they're
 * automated on-chain actors.
 */
export function isKnownAddress(addr: string): boolean {
  return addr.toLowerCase() in KNOWN_ADDRESS_LABELS;
}
