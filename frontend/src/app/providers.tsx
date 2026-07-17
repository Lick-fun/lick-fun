"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi/config";
import "@rainbow-me/rainbowkit/styles.css";

/**
 * Figma-sourced provider stack.
 *
 * RainbowKit accent color matches the Lickfun.xyz Figma brand green
 * (#70E000 — `var(--color-green)`) rather than the legacy orange.
 *
 * The RainbowKit stylesheet is imported here — `next.config.ts` already
 * has `transpilePackages: ["@rainbow-me/rainbowkit"]` so Next.js 15's
 * CSS loader processes it correctly. Without it, the ConnectButton,
 * network switcher, and account dropdown render unstyled/broken.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
            // Default cache lifetimes. Individual hooks that need live-polling
            // data (prices, trades, migration status) set their own explicit
            // `refetchInterval`/`staleTime` and override these — this default
            // only prevents redundant refetches for queries that don't poll
            // (e.g. one-off profile/holdings lookups) when the user navigates
            // back to a page within a few seconds. Important under traffic
            // spikes: without this, every route change re-fires every query.
            staleTime: 10_000,
            gcTime: 5 * 60_000,
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