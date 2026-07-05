import type { MetadataRoute } from "next";
import { getGraphQLClient } from "@/lib/graphql/client";
import { QUERY_ALL_TOKENS, QUERY_ALL_PROFILES } from "@/lib/graphql/queries";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lickfun.xyz";

// Cap how many dynamic entries we pull into the sitemap to keep generation
// fast and the file within the ~50k URL soft-limit search engines expect.
const MAX_TOKENS = 5000;
const MAX_PROFILES = 2000;

// NOTE: Envio's GraphQL API serializes all numeric/bigint scalar fields as
// JSON strings (not native numbers/bigints). We only need `id`, `createdAt`,
// and `graduated` here, and since we only ever call Number(createdAt) (never
// BigInt arithmetic), typing these as string is both accurate and safe.
interface SitemapTokenRow {
  id: string;
  createdAt: string;
  graduated: boolean;
}

interface SitemapProfileRow {
  id: string;
  createdAt: string;
}

interface AllTokensResponse {
  Token: SitemapTokenRow[];
}

interface AllProfilesResponse {
  Profile: SitemapProfileRow[];
}


/**
 * Dynamic sitemap — Next.js App Router convention (app/sitemap.ts).
 * Combines static marketing/app routes with every indexed token and profile
 * page so search engines and AI crawlers can discover deep content without
 * relying solely on internal links.
 *
 * Fails soft: if the indexer is unreachable at build/request time, we still
 * return the static routes rather than throwing (which would break the
 * entire sitemap and de-index the whole site).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/discover`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/create`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/markets`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/how-it-works`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  let tokenRoutes: MetadataRoute.Sitemap = [];
  let profileRoutes: MetadataRoute.Sitemap = [];

  try {
    const client = getGraphQLClient();

    const [tokensRes, profilesRes] = await Promise.all([
      client.request<AllTokensResponse>(QUERY_ALL_TOKENS, {
        limit: MAX_TOKENS,
        offset: 0,
        orderBy: [{ createdAt: "desc" }],
      }),
      client.request<AllProfilesResponse>(QUERY_ALL_PROFILES),
    ]);

    tokenRoutes = (tokensRes.Token ?? []).map((token) => ({
      url: `${SITE_URL}/token/${token.id}`,
      lastModified: new Date(Number(token.createdAt) * 1000),
      changeFrequency: "hourly" as const,
      priority: token.graduated ? 0.7 : 0.6,
    }));

    profileRoutes = (profilesRes.Profile ?? [])
      .slice(0, MAX_PROFILES)
      .map((profile) => ({
        url: `${SITE_URL}/profile/${profile.id}`,
        lastModified: new Date(Number(profile.createdAt) * 1000),
        changeFrequency: "daily" as const,
        priority: 0.5,
      }));
  } catch (err) {
    console.error("[sitemap] failed to fetch dynamic routes from indexer:", err);
  }

  return [...staticRoutes, ...tokenRoutes, ...profileRoutes];
}
