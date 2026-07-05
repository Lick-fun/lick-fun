import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lickfun.xyz";

const title = "Discover Tokens — Lickfun.xyz";
const description =
  "Search and filter every token launched on Lickfun.xyz. Sort by volume, bonding-curve progress, or recency, and filter by live vs. graduated status.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/discover` },
  openGraph: {
    title,
    description,
    url: `${SITE_URL}/discover`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return children;
}
