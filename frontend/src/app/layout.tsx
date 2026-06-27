import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Lick.fun — Launch tokens. Earn reputation.",
  description:
    "Social-first token launchpad on Monad. Launch meme tokens, trade on a bonding curve, and build on-chain reputation. No hype — your behavior is your content.",
  icons: {
    icon: "/logo-transparent.png",
  },
  openGraph: {
    title: "Lick.fun — Launch tokens. Earn reputation.",
    description:
      "Social-first token launchpad on Monad. Launch meme tokens, trade on a bonding curve, and build on-chain reputation.",
    url: "https://lickfun.xyz",
    siteName: "Lick.fun",
    images: [
      {
        url: "https://lickfun.xyz/logo-transparent.png",
        width: 512,
        height: 512,
        alt: "Lick.fun logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Lick.fun — Launch tokens. Earn reputation.",
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
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-figma-bg text-figma-white`}
      >
        <Providers>
          <div className="flex flex-col h-screen overflow-hidden bg-figma-bg">
            <Header />
            <main className="flex-1 overflow-y-auto scrollbar-thin pb-20 lg:pb-0">
              {children}
            </main>
            <BottomNav />
          </div>
        </Providers>
      </body>
    </html>
  );
}
