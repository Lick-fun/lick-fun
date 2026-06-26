/**
 * GET /api/profile-image/[address]
 *
 * Returns { displayName, avatarUri, avatarUrl } for a given wallet address.
 * avatarUrl is the gateway-converted HTTPS URL ready to use in <img>.
 * Returns 404 if no profile metadata is registered for this address.
 */

import { type NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "src", "data", "profile-metadata.json");

// Public IPFS gateway used for serving images to the browser.
// Keep this in sync with NEXT_PUBLIC_PINATA_GATEWAY in .env.local
const IPFS_GATEWAY =
  process.env.NEXT_PUBLIC_PINATA_GATEWAY ?? "https://gateway.pinata.cloud/ipfs/";

function ipfsToHttp(uri: string): string {
  if (uri.startsWith("https://") || uri.startsWith("http://")) return uri;
  if (uri.startsWith("ipfs://")) {
    return `${IPFS_GATEWAY}${uri.replace("ipfs://", "")}`;
  }
  return `${IPFS_GATEWAY}${uri}`;
}

type ProfileStore = Record<
  string,
  { displayName: string; avatarUri: string; updatedAt: number }
>;

async function readStore(): Promise<ProfileStore> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as ProfileStore;
  } catch {
    return {};
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const normalised = address.toLowerCase();
  const store = await readStore();
  const entry = store[normalised];

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    walletAddress: normalised,
    displayName: entry.displayName,
    avatarUri: entry.avatarUri,
    avatarUrl: ipfsToHttp(entry.avatarUri),
    updatedAt: entry.updatedAt,
  });
}