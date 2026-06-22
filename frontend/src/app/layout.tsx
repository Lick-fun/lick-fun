import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/layout/Sidebar";
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
    icon: "/favicon.ico",
  },
};

/**
 * Root layout — shell for all pages.
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │ Sidebar (lg+) | Header                                  │
 *   │               ├─────────────────────────────────────────┤
 *   │               │                                         │
 *   │               │  Main  (children)                       │
 *   │               │                                         │
 *   │               └─────────────────────────────────────────┤
 *   │ BottomNav (mobile)                                       │
 *   └─────────────────────────────────────────────────────────┘
 *
 * Pages own their own padding (most use `pl-sidebar` to offset
 * the sidebar via the `--sidebar-w` token — no `marginLeft` hacks).
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
          <div className="flex h-screen overflow-hidden bg-figma-bg">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
              <Header />
              <main className="flex-1 overflow-y-auto scrollbar-thin pb-20 lg:pb-0">
                {children}
              </main>
            </div>
            <BottomNav />
          </div>
        </Providers>
      </body>
    </html>
  );
}