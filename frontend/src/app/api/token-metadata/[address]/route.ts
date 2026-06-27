/**
 * GET /api/token-metadata/[address]
 *
 * Returns a standard OpenSea / ERC-1155 metadata JSON for a given token address.
 * This is the endpoint that DEX aggregators (GMGN, DexScreener, etc.) can index
 * to automatically display token images, descriptions, and social links.
 *
 * Standard shape (OpenSea metadata standard):
 * {
 *   name: string,
 *   symbol: string,
 *   description: string,
 *   image: string,           ← direct HTTPS image URL
 *   external_url: string,    ← token page on lickfun.xyz
 *   telegram: string?,
 *   twitter: string?,
 *   website: string?,
 *   links: { telegram?, twitter?, website? },  ← alternate key some aggregators use
 *   lickfun: {               ← platform-specific extras
 *     tokenAddress: string,
 *     metadataUri: string,
 *     imageUri: string,
 *     registeredAt: number,
 *   }
 * }
 *
 * Returns 404 if no metadata is registered for this address.
 *
 * CORS: open (* ) so any aggregator or bot can call this without credentials.
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

// Standard metadata shape that aggregators understand
interface AggregatorMeta {
  name: string;
  symbol: string;
  description: string;
  image: string;
  external_url: string;
  telegram?: string;
  twitter?: string;
  website?: string;
  links: {
    telegram?: string;
    twitter?: string;
    website?: string;
  };
  lickfun: {
    tokenAddress: string;
    metadataUri: string;
    imageUri: string;
    registeredAt: number;
  };
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  // Cache for 5 minutes at the CDN/client level — fresh enough for aggregators
  "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=60",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
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
    return NextResponse.json(
      { error: "No metadata registered for this token address" },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  // Fetch the metadata JSON from Storj to get name/symbol/description/socials
  let upstream: Record<string, unknown> = {};
  try {
    const metaUrl = ipfsToHttp(entry.metadataUri);
    const res = await fetch(metaUrl, { next: { revalidate: 300 } });
    if (res.ok) {
      upstream = (await res.json()) as Record<string, unknown>;
    }
  } catch {
    // Storj may be temporarily unavailable — fall back to minimal response
  }

  const name = (upstream.name as string) ?? "";
  const symbol = (upstream.symbol as string) ?? "";
  const description = (upstream.description as string) ?? "";
  const telegram = (upstream.telegram as string) ?? undefined;
  const twitter = (upstream.twitter as string) ?? undefined;
  const website = (upstream.website as string) ?? undefined;

  // Prefer the upstream image URL (already a Storj HTTPS link).
  // Fall back to our stored imageUri converted to HTTP.
  const imageUrl =
    typeof upstream.image === "string" && upstream.image
      ? ipfsToHttp(upstream.image)
      : ipfsToHttp(entry.imageUri);

  const body: AggregatorMeta = {
    name,
    symbol,
    description,
    image: imageUrl,
    external_url: `${SITE_URL}/token/${normalised}`,
    ...(telegram && { telegram }),
    ...(twitter && { twitter }),
    ...(website && { website }),
    links: {
      ...(telegram && { telegram }),
      ...(twitter && { twitter }),
      ...(website && { website }),
    },
    lickfun: {
      tokenAddress: normalised,
      metadataUri: entry.metadataUri,
      imageUri: entry.imageUri,
      registeredAt: entry.registeredAt,
    },
  };

  return NextResponse.json(body, { headers: CORS_HEADERS });
}
