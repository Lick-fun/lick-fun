/**
 * GET /api/profile-image/[address]
 *
 * Returns profile metadata for a given wallet address, including display name,
 * avatar URL, and social links (X, website, Telegram).
 * avatarUrl is the gateway-converted HTTPS URL ready to use in <img>.
 * Returns 404 if no profile metadata is registered for this address.
 */

import { type NextRequest, NextResponse } from "next/server";
import { readProfileIndex } from "@/lib/server/profileMetadataStore";

// Public IPFS gateway used for serving images to the browser.
// Keep this in sync with NEXT_PUBLIC_PINATA_GATEWAY in .env.local
const IPFS_GATEWAY =
  process.env.NEXT_PUBLIC_PINATA_GATEWAY ?? "https://gateway.pinata.cloud/ipfs/";

function ipfsToHttp(uri: string): string {
  if (!uri) return "";
  if (uri.startsWith("https://") || uri.startsWith("http://")) return uri;
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
  const store = await readProfileIndex();
  const entry = store[normalised];

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    walletAddress: normalised,
    displayName: entry.displayName,
    avatarUri: entry.avatarUri,
    avatarUrl: ipfsToHttp(entry.avatarUri),
    xUrl: entry.xUrl ?? "",
    websiteUrl: entry.websiteUrl ?? "",
    telegramUrl: entry.telegramUrl ?? "",
    updatedAt: entry.updatedAt,
  });
}