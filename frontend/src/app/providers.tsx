"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi/config";

/**
 * Figma-sourced provider stack.
 *
 * RainbowKit accent color matches the Lick.fun Figma brand green
 * (#70E000 — `var(--color-green)`) rather than the legacy orange.
 *
 * Note: We intentionally do NOT import `@rainbow-me/rainbowkit/styles.css`
 * because its vanilla-extract CSS format conflicts with Next.js 15's
 * default CSS loader. RainbowKit components ship with inline styles for
 * the critical UI, so the page still renders correctly without it.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const lickTheme = darkTheme({
    accentColor: "#70E000",
    accentColorForeground: "#0E0E0E",
    borderRadius: "medium",
    fontStack: "system",
  });

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={lickTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}