"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * Fetches the current MON/USD price via our own server-side proxy
 * (`/api/mon-price`), which caches the upstream CoinGecko response for 2
 * minutes across ALL visitors. This hook no longer calls CoinGecko directly
 * from the browser — under a traffic spike, every visitor hitting CoinGecko
 * individually could trip its rate limit for the whole site at once; routing
 * through our own cached endpoint means CoinGecko sees at most one request
 * every ~2 minutes regardless of visitor count.
 *
 * Returns null if the price is unavailable (e.g. MON not yet listed).
 */
export function useMonUsdPrice() {
  return useQuery<number | null>({
    queryKey: ["mon-usd-price"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/mon-price");
        if (!res.ok) return null;
        const data = await res.json();
        const price = data?.price;
        return typeof price === "number" && price > 0 ? price : null;
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });
}