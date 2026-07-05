/**
 * Known indexer gaps — manual corrections for on-chain `FeeRouted` events that
 * were confirmed (via direct RPC receipt inspection) to exist on-chain but were
 * never picked up by the Envio indexer.
 *
 * Root cause (2026-07-05 investigation): tx 0x8f98becc...52f3 (founder token,
 * block 84404011, 2026-06-29) is an EIP-7702 transaction (type 0x4, carries an
 * `authorizationList`). It emitted a completely normal `CurveBuy` + `FeeRouted`
 * pair of events, confirmed present in the transaction receipt logs, but the
 * indexer's `FeeEvent` table has zero rows for this tx hash. This looks like an
 * indexer/HyperSync parsing gap specific to EIP-7702 transactions rather than a
 * contract or frontend bug — the on-chain event unambiguously exists.
 *
 * Rather than waiting on an indexer re-sync (or silently under-reporting fee
 * totals forever), we patch known gaps here so displayed totals match on-chain
 * reality. Each entry mirrors the exact `FeeRouted(token, totalAmount,
 * creatorShare, lpShare, buybackShare, giftShare)` event args decoded directly
 * from the transaction receipt log.
 *
 * If the indexer is later fixed/re-synced and starts returning this event
 * natively, the corresponding entry here should be removed (or a de-dupe by
 * tx hash added) to avoid double-counting.
 */

export interface FeeEventCorrection {
  /** Transaction hash the correction represents (for documentation / future de-dupe). */
  txHash: string;
  /** Lowercased token address this correction applies to. */
  token: string;
  totalAmount: bigint;
  creatorShare: bigint;
  lpShare: bigint;
  buybackShare: bigint;
  /** Unix seconds. */
  blockTimestamp: bigint;
}

export const KNOWN_FEE_EVENT_CORRECTIONS: FeeEventCorrection[] = [
  {
    txHash: "0x8f98beccfe8d39e01a560ac61e1fee61219338962198c814943f9c21585e52f3",
    token: "0x0236787a1baaeed46a123fa264a2355eed11d151", // founder token
    totalAmount: 2_200_000_000_000_000_000n, // 2.2 MON
    creatorShare: 0n,
    lpShare: 1_760_000_000_000_000_000n, // 1.76 MON
    buybackShare: 440_000_000_000_000_000n, // 0.44 MON
    blockTimestamp: 1782711943n, // 2026-06-29T05:45:43Z
  },
];

/** Returns the corrections applicable to a given (lowercased) token address. */
export function getFeeCorrectionsForToken(tokenLower: string): FeeEventCorrection[] {
  return KNOWN_FEE_EVENT_CORRECTIONS.filter((c) => c.token === tokenLower);
}
