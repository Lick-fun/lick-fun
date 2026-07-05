import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lickfun.xyz";

const title = "Create a Token — Lickfun.xyz";
const description =
  "Launch a new meme token on Monad for a flat 1 MON fee. Instant bonding-curve trading, sniper protection, and automatic DEX graduation at 100,000 MON.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/create` },
  openGraph: {
    title,
    description,
    url: `${SITE_URL}/create`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
