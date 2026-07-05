import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lickfun.xyz";

const title = "Prediction Markets — Lickfun.xyz";
const description =
  "Bet MON on whether tokens launched on Lickfun.xyz will graduate to a real DEX. Browse live pools, closing times, and past outcomes.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/markets` },
  openGraph: {
    title,
    description,
    url: `${SITE_URL}/markets`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function MarketsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
