import type { Metadata } from "next";
import { promises as fs } from "fs";
import path from "path";
import { getGraphQLClient } from "@/lib/graphql/client";
import { QUERY_PROFILE, type ProfileEntity } from "@/lib/graphql/queries";
import { formatMon } from "@/lib/bondingCurve";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lickfun.xyz";
const DATA_FILE = path.join(process.cwd(), "src", "data", "profile-metadata.json");

interface ProfileResponse {
  Profile_by_pk: Record<string, unknown> | null;
}

interface ProfileMetaEntry {
  displayName?: string;
  avatarUri?: string;
  xUrl?: string;
  websiteUrl?: string;
  telegramUrl?: string;
}

/**
 * Envio returns numeric scalar fields as strings over GraphQL — must be
 * explicitly converted to BigInt before use (mirrors the client-side
 * conversion in useData.ts's toBigIntProfile).
 */
function toBigIntProfile(raw: Record<string, unknown>): ProfileEntity {
  return {
    ...(raw as unknown as ProfileEntity),
    createdAt: BigInt(raw.createdAt as string),
    totalBuyVolume: BigInt(raw.totalBuyVolume as string),
    totalSellVolume: BigInt(raw.totalSellVolume as string),
  };
}

async function getProfileData(address: string) {
  try {
    const client = getGraphQLClient();
    const res = await client.request<ProfileResponse>(QUERY_PROFILE, {
      address: address.toLowerCase(),
    });
    if (!res.Profile_by_pk) return null;
    return toBigIntProfile(res.Profile_by_pk);
  } catch (err) {
    console.error("[profile/[address]/layout] failed to fetch profile from indexer:", err);
    return null;
  }
}


async function getProfileMeta(address: string): Promise<ProfileMetaEntry | null> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const store = JSON.parse(raw) as Record<string, ProfileMetaEntry>;
    return store[address.toLowerCase()] ?? null;
  } catch {
    return null;
  }
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>;
}): Promise<Metadata> {
  const { address } = await params;
  const addr = address.toLowerCase();

  const [profile, meta] = await Promise.all([getProfileData(addr), getProfileMeta(addr)]);

  const displayName = meta?.displayName?.trim() || truncateAddress(addr);
  const canonicalUrl = `${SITE_URL}/profile/${addr}`;
  const title = `${displayName} — Lickfun.xyz`;

  const tokenCount = profile?.tokenCount ?? 0;
  const graduatedCount = profile?.graduatedCount ?? 0;
  const volume = profile
    ? formatMon(profile.totalBuyVolume + profile.totalSellVolume)
    : "0 MON";

  const description = profile
    ? `${displayName} on Lickfun.xyz — ${tokenCount} token${tokenCount === 1 ? "" : "s"} created, ${graduatedCount} graduated, ${volume} total trading volume. View reputation score, badges, and on-chain activity.`
    : `${displayName}'s profile on Lickfun.xyz — reputation score, badges, created tokens, and trading activity on Monad.`;

  const ogImage = meta?.avatarUri || `${SITE_URL}/logo-transparent.png`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "profile",
      images: [{ url: ogImage, width: 512, height: 512, alt: displayName }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  const addr = address.toLowerCase();

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Profile", item: `${SITE_URL}/profile/${addr}` },
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

