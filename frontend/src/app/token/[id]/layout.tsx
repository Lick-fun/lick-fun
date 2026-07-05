import type { Metadata } from "next";
import { getGraphQLClient } from "@/lib/graphql/client";
import { QUERY_TOKEN, type TokenEntity } from "@/lib/graphql/queries";
import { getTokenPrice, getGraduationProgress, formatMon } from "@/lib/bondingCurve";
import { readMetadataIndex } from "@/lib/server/tokenMetadataStore";
import { resolveTokenMeta } from "@/lib/server/resolveTokenMeta";
import { ipfsToHttp } from "@/lib/ipfs";


const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lickfun.xyz";

interface TokenResponse {
  Token_by_pk: Record<string, unknown> | null;
}

/**
 * Envio returns numeric scalar fields (realMon, soldTokens, etc.) as strings
 * over GraphQL — they must be explicitly converted to BigInt before use in
 * bonding-curve math (mirrors the conversion done client-side in useData.ts).
 */
function toBigIntToken(raw: Record<string, unknown>): TokenEntity {
  return {
    ...(raw as unknown as TokenEntity),
    virtualMon: BigInt(raw.virtualMon as string),
    virtualTokens: BigInt(raw.virtualTokens as string),
    targetTokenAmount: BigInt(raw.targetTokenAmount as string),
    startTime: BigInt(raw.startTime as string),
    startBlock: BigInt(raw.startBlock as string),
    realMon: BigInt(raw.realMon as string),
    soldTokens: BigInt(raw.soldTokens as string),
    createdAt: BigInt(raw.createdAt as string),
    graduatedAt: raw.graduatedAt != null ? BigInt(raw.graduatedAt as string) : null,
    totalBuyVolume: BigInt(raw.totalBuyVolume as string),
    totalSellVolume: BigInt(raw.totalSellVolume as string),
  };
}

async function getTokenData(id: string) {
  try {
    const client = getGraphQLClient();
    const res = await client.request<TokenResponse>(QUERY_TOKEN, { id: id.toLowerCase() });
    if (!res.Token_by_pk) return null;
    return toBigIntToken(res.Token_by_pk);
  } catch (err) {
    console.error("[token/[id]/layout] failed to fetch token from indexer:", err);
    return null;
  }
}


async function getOffchainMeta(id: string) {
  try {
    const store = await readMetadataIndex();
    const entry = store[id.toLowerCase()];
    if (!entry) return null;

    let upstream: { name?: string; symbol?: string; description?: string; image?: string } = {};
    try {
      const metaUrl = ipfsToHttp(entry.metadataUri);
      if (metaUrl) {
        const res = await fetch(metaUrl, { next: { revalidate: 300 } });
        if (res.ok) upstream = await res.json();
      }
    } catch {
      // Storj temporarily unavailable — fall back to just the image
    }

    return {
      description: upstream.description ?? "",
      image: upstream.image ? ipfsToHttp(upstream.image) : ipfsToHttp(entry.imageUri),
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const tokenId = id.toLowerCase();

  const [token, offchain] = await Promise.all([
    getTokenData(tokenId),
    getOffchainMeta(tokenId),
  ]);

  if (!token) {
    return {
      title: "Token Not Found — Lickfun.xyz",
      description: "This token could not be found on Lickfun.xyz.",
      alternates: { canonical: `${SITE_URL}/token/${tokenId}` },
    };
  }

  const { name, symbol } = await resolveTokenMeta(tokenId, token.name, token.symbol);
  const { monPerToken, marketCapMon } = getTokenPrice(token.realMon, token.soldTokens);

  const progress = getGraduationProgress(token.realMon);
  const statusLabel = token.graduated
    ? "Graduated to DEX"
    : `${progress.toFixed(1)}% to graduation`;

  const description =
    offchain?.description?.trim() ||
    `$${symbol} (${name}) on Lickfun.xyz — price ${monPerToken.toFixed(
      8
    )} MON, market cap ~${formatMon(BigInt(Math.round(marketCapMon * 1e18)))}. ${statusLabel}. Trade on a bonding curve on Monad.`;

  const title = `$${symbol} (${name}) — Lickfun.xyz`;
  const canonicalUrl = `${SITE_URL}/token/${tokenId}`;
  const ogImage = offchain?.image || `${SITE_URL}/api/og/token/${tokenId}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${name} (${symbol})` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function TokenLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tokenId = id.toLowerCase();

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Discover", item: `${SITE_URL}/discover` },
      { "@type": "ListItem", position: 3, name: tokenId, item: `${SITE_URL}/token/${tokenId}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {children}
    </>
  );
}

