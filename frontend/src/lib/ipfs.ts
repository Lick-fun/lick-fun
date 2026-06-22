/**
 * IPFS utilities — resolve CIDs/URIs via the configured public gateway.
 *
 * Uploads now happen server-side in /api/upload-token so the Pinata JWT is
 * never exposed to the browser.
 *
 * Set NEXT_PUBLIC_PINATA_GATEWAY in .env.local (defaults to Pinata's gateway).
 */

// Public gateway used only for *displaying* pinned content in the browser.
const IPFS_GATEWAY =
  process.env.NEXT_PUBLIC_PINATA_GATEWAY ?? "https://gateway.pinata.cloud/ipfs/";

// Fallback public gateways tried in order when the primary fails client-side.
const FALLBACK_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
];

/* ──────────────────────────────────────────────────────────────────────────────── */
/* URI helpers                                                                       */
/* ──────────────────────────────────────────────────────────────────────────────── */

/**
 * Convert any IPFS URI or CID to a displayable HTTPS URL using the primary gateway.
 * Passthrough for regular https:// URLs.
 */
export function ipfsToHttp(uri: string | null | undefined): string | null {
  if (!uri) return null;
  if (uri.startsWith("https://") || uri.startsWith("http://")) return uri;
  if (uri.startsWith("ipfs://")) {
    const cid = uri.replace("ipfs://", "").replace(/^\//, "");
    return `${IPFS_GATEWAY}${cid}`;
  }
  // Bare CID (Qm... or bafy...)
  if (uri.startsWith("Qm") || uri.startsWith("bafy")) {
    return `${IPFS_GATEWAY}${uri}`;
  }
  return null;
}

/**
 * Return fallback gateway URLs for an IPFS URI (for <img> onError retry logic).
 */
export function ipfsFallbackUrls(uri: string | null | undefined): string[] {
  if (!uri) return [];
  const cid = uri
    .replace("ipfs://", "")
    .replace(/^https?:\/\/[^/]+\/ipfs\//, "")
    .replace(/^\//, "");
  return FALLBACK_GATEWAYS.map((gw) => `${gw}${cid}`);
}
