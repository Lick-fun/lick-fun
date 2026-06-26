"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * Fetches the current MON/USD price from CoinGecko.
 * Returns null if the price is unavailable (e.g. MON not yet listed).
 * Caches for 60s to avoid hammering the free API.
 */
export function useMonUsdPrice() {
  return useQuery<number | null>({
    queryKey: ["mon-usd-price"],
    queryFn: async () => {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=monad&vs_currencies=usd",
          { cache: "no-store" }
        );
        if (!res.ok) return null;
        const data = await res.json();
        const price = data?.monad?.usd;
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