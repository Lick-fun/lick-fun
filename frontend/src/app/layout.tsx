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
  title: "Lick.fun — A meme lake on liquidity fun",
  description:
    "Social-first token launchpad on Monad. Launch tokens with earned reputation.",
  icons: {
    icon: "/logo-transparent.png",
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
