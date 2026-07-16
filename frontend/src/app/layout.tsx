import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Sora } from "next/font/google";

import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Footer } from "@/components/layout/Footer";
import { Analytics } from "@/components/layout/Analytics";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

// Used by the token detail price chart toolbar/header to match the
// TradingView-style Figma design (Sora ExtraBold for labels/buttons).
// Sora doubles as the punchy display face for headings / meme-energy hero copy.
const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["300", "400", "600", "700", "800"],
});


export const metadata: Metadata = {
  metadataBase: new URL("https://lickfun.xyz"),
  title: "Lickfun.xyz — Launch tokens. Earn reputation.",
  description:
    "Social-first token launchpad on Monad. Launch meme tokens, trade on a bonding curve, and build on-chain reputation. No hype — your behavior is your content.",
  manifest: "/site.webmanifest",
  alternates: {
    canonical: "https://lickfun.xyz",
  },
  icons: {
    icon: "/tokens/founder-token.png",
    apple: "/tokens/founder-token.png",
  },

  openGraph: {
    title: "Lickfun.xyz — Launch tokens. Earn reputation.",
    description:
      "Social-first token launchpad on Monad. Launch meme tokens, trade on a bonding curve, and build on-chain reputation.",
    url: "https://lickfun.xyz",
    siteName: "Lickfun.xyz",
    images: [
      {
        url: "https://lickfun.xyz/logo-transparent.png",
        width: 512,
        height: 512,
        alt: "Lickfun.xyz logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lickfun.xyz — Launch tokens. Earn reputation.",
    description:
      "Social-first token launchpad on Monad. Launch meme tokens, trade on a bonding curve, and build on-chain reputation.",
    images: ["https://lickfun.xyz/logo-transparent.png"],
    site: "@_Lickfun",
    creator: "@_Lickfun",
  },
};

/**
 * Root layout — shell for all pages.
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │ Header (full-width top nav with logo + links + search)  │
 *   ├─────────────────────────────────────────────────────────┤
 *   │                                                         │
 *   │  Main  (children)                                       │
 *   │                                                         │
 *   ├─────────────────────────────────────────────────────────┤
 *   │ BottomNav (mobile)                                      │
 *   └─────────────────────────────────────────────────────────┘
 */
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://lickfun.xyz/#organization",
    name: "Lickfun.xyz",
    url: "https://lickfun.xyz",
    logo: "https://lickfun.xyz/logo-transparent.png",
    description:
      "Social-first token launchpad on Monad. Launch meme tokens, trade on a bonding curve, and build on-chain reputation.",
    sameAs: [
      "https://x.com/_Lickfun",
      "https://t.me/Lick_fun",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://lickfun.xyz/#website",
    name: "Lickfun.xyz",
    url: "https://lickfun.xyz",
    description:
      "Social-first token launchpad on Monad. Launch meme tokens, trade on a bonding curve, earn on-chain reputation, and watch strong projects graduate to a real DEX.",
    publisher: { "@id": "https://lickfun.xyz/#organization" },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://lickfun.xyz/discover?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${sora.variable} font-sans antialiased bg-figma-bg text-figma-white`}

      >
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Analytics />
        <Providers>

          <div className="flex flex-col h-screen overflow-hidden bg-figma-bg">
            <Header />
            <main className="flex-1 overflow-y-auto scrollbar-thin pb-20 lg:pb-0 flex flex-col">
              <div className="flex-1">{children}</div>
              <Footer />
            </main>
            <BottomNav />
          </div>
        </Providers>
      </body>
    </html>
  );
}
