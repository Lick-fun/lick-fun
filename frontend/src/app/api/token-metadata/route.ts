/**
 * GET /api/token-metadata
 *
 * Returns a paginated list of all tokens with registered metadata.
 * Useful for GMGN / DexScreener bulk-indexing requests.
 *
 * Query params:
 *   page   (default 1)
 *   limit  (default 100, max 500)
 *
 * Response shape:
 * {
 *   total: number,
 *   page: number,
 *   limit: number,
 *   tokens: Array<{
 *     tokenAddress: string,
 *     image: string,
 *     metadataUrl: string,   ← URL to full metadata (i.e. /api/token-metadata/{address})
 *     registeredAt: number,
 *   }>
 * }
 *
 * CORS: open (*) so any aggregator can call without credentials.
 */

import { type NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "src", "data", "token-metadata.json");

const IPFS_GATEWAY =
  process.env.NEXT_PUBLIC_PINATA_GATEWAY ?? "https://gateway.pinata.cloud/ipfs/";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lickfun.xyz";

function ipfsToHttp(uri: string): string {
  if (uri.startsWith("https://") || uri.startsWith("http://")) {
    if (uri.includes("storjshare.io") && !uri.includes("wrap=0")) {
      return `${uri}?wrap=0`;
    }
    return uri;
  }
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

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=30",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") ?? "100", 10)));

  const store = await readStore();

  // Sort by registeredAt descending (newest first)
  const entries = Object.entries(store).sort(
    ([, a], [, b]) => b.registeredAt - a.registeredAt
  );

  const total = entries.length;
  const start = (page - 1) * limit;
  const slice = entries.slice(start, start + limit);

  const tokens = slice.map(([address, entry]) => ({
    tokenAddress: address,
    image: ipfsToHttp(entry.imageUri),
    metadataUrl: `${SITE_URL}/api/token-metadata/${address}`,
    registeredAt: entry.registeredAt,
  }));

  return NextResponse.json(
    { total, page, limit, tokens },
    { headers: CORS_HEADERS }
  );
}
