/**
 * GET /api/token-image/[address]
 *
 * Returns { imageUri, metadataUri, imageUrl } for a given token address.
 * imageUrl is the gateway-converted HTTPS URL ready to use in <img>.
 * Returns 404 if no metadata is registered for this address.
 *
 * The metadata index lives in Storj (S3-compatible bucket), so it survives
 * Railway redeploys. See lib/server/tokenMetadataStore.ts.
 */

import { type NextRequest, NextResponse } from "next/server";
import { readMetadataIndex } from "@/lib/server/tokenMetadataStore";

// Public IPFS gateway used for serving images to the browser.
// Keep this in sync with NEXT_PUBLIC_PINATA_GATEWAY in .env.local
const IPFS_GATEWAY =
  process.env.NEXT_PUBLIC_PINATA_GATEWAY ?? "https://gateway.pinata.cloud/ipfs/";

function ipfsToHttp(uri: string): string {
  if (uri.startsWith("https://") || uri.startsWith("http://")) {
    // Storj share links need ?wrap=0 to serve raw files instead of the download portal
    if (uri.includes("storjshare.io") && !uri.includes("wrap=0")) {
      return `${uri}?wrap=0`;
    }
    return uri;
  }
  // Local/relative asset served from the Next.js public/ folder (e.g. a
  // short-term hardcoded image at /tokens/foo.jpg) — pass through as-is so
  // the browser resolves it against the current origin.
  if (uri.startsWith("/")) {
    return uri;
  }
  if (uri.startsWith("ipfs://")) {
    return `${IPFS_GATEWAY}${uri.replace("ipfs://", "")}`;
  }
  return `${IPFS_GATEWAY}${uri}`;
}


export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const normalised = address.toLowerCase();

  let store;
  try {
    store = await readMetadataIndex();
  } catch (err) {
    console.error("[token-image] failed to read metadata index:", err);
    return NextResponse.json(
      { error: "Metadata index unavailable" },
      { status: 503 }
    );
  }

  const entry = store[normalised];

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    tokenAddress: normalised,
    imageUri: entry.imageUri,
    metadataUri: entry.metadataUri,
    imageUrl: ipfsToHttp(entry.imageUri),
    registeredAt: entry.registeredAt,
  });
}