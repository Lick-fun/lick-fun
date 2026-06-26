/**
 * GET /api/token-image/[address]
 *
 * Returns { imageUri, metadataUri, imageUrl } for a given token address.
 * imageUrl is the gateway-converted HTTPS URL ready to use in <img>.
 * Returns 404 if no metadata is registered for this address.
 */

import { type NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "src", "data", "token-metadata.json");

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

type MetadataStore = Record<
  string,
  { metadataUri: string; imageUri: string; registeredAt: number }
>;

async function readStore(): Promise<MetadataStore> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as MetadataStore;
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
    tokenAddress: normalised,
    imageUri: entry.imageUri,
    metadataUri: entry.metadataUri,
    imageUrl: ipfsToHttp(entry.imageUri),
    registeredAt: entry.registeredAt,
  });
}
