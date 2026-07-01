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
 *     name: string,
 *     symbol: string,
 *     description: string,
 *     image: string,         ← direct HTTPS image URL
 *     telegram?: string,
 *     twitter?: string,
 *     website?: string,
 *     metadataUrl: string,   ← URL to full metadata (i.e. /api/token-metadata/{address})
 *     registeredAt: number,
 *   }>
 * }
 *
 * CORS: open (*) so any aggregator can call without credentials.
 */

import { type NextRequest, NextResponse } from "next/server";
import { readMetadataIndex } from "@/lib/server/tokenMetadataStore";

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
  // Local/relative asset served from the Next.js public/ folder — external
  // aggregators need a fully-qualified URL, so prefix with SITE_URL.
  if (uri.startsWith("/")) {
    return `${SITE_URL}${uri}`;
  }
  if (uri.startsWith("ipfs://")) {
    return `${IPFS_GATEWAY}${uri.replace("ipfs://", "")}`;
  }
  return `${IPFS_GATEWAY}${uri}`;
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

  let store;
  try {
    store = await readMetadataIndex();
  } catch (err) {
    console.error("[token-metadata] failed to read metadata index:", err);
    return NextResponse.json(
      { error: "Metadata index unavailable" },
      { status: 503, headers: CORS_HEADERS }
    );
  }

  // Sort by registeredAt descending (newest first)
  const entries = Object.entries(store).sort(
    ([, a], [, b]) => b.registeredAt - a.registeredAt
  );

  const total = entries.length;
  const start = (page - 1) * limit;
  const slice = entries.slice(start, start + limit);

  // Fetch full metadata (name/symbol/socials) from Storj in parallel.
  // Each token has its own Storj JSON — we fan-out and settle all at once.
  const tokens = await Promise.all(
    slice.map(async ([address, entry]) => {
      let name = "";
      let symbol = "";
      let description = "";
      let telegram: string | undefined;
      let twitter: string | undefined;
      let website: string | undefined;

      try {
        const metaUrl = ipfsToHttp(entry.metadataUri);
        const res = await fetch(metaUrl, { next: { revalidate: 300 } });
        if (res.ok) {
          const upstream = (await res.json()) as Record<string, unknown>;
          name = (upstream.name as string) ?? "";
          symbol = (upstream.symbol as string) ?? "";
          description = (upstream.description as string) ?? "";
          telegram = upstream.telegram as string | undefined;
          twitter = upstream.twitter as string | undefined;
          website = upstream.website as string | undefined;
        }
      } catch {
        // Storj temporarily unavailable — return minimal record
      }

      return {
        tokenAddress: address,
        name,
        symbol,
        description,
        image: ipfsToHttp(entry.imageUri),
        ...(telegram && { telegram }),
        ...(twitter && { twitter }),
        ...(website && { website }),
        metadataUrl: `${SITE_URL}/api/token-metadata/${address}`,
        registeredAt: entry.registeredAt,
      };
    })
  );

  return NextResponse.json(
    { total, page, limit, tokens },
    { headers: CORS_HEADERS }
  );
}
