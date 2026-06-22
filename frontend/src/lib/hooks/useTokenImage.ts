"use client";

import { useQuery } from "@tanstack/react-query";

interface TokenImageData {
  tokenAddress: string;
  imageUri: string;
  metadataUri: string;
  imageUrl: string;
  registeredAt: number;
}

/**
 * Fetches the token image URL from our /api/token-image/[address] endpoint.
 * Returns null imageUrl when no image is registered (token created without one,
 * or before the image feature was rolled out).
 */
export function useTokenImage(tokenAddress: string | null | undefined) {
  return useQuery<TokenImageData | null>({
    queryKey: ["token-image", tokenAddress?.toLowerCase()],
    enabled: !!tokenAddress && tokenAddress !== "0x0000000000000000000000000000000000000000",
    // Images rarely change — 5 min stale is plenty
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false, // don't spam 404s
    queryFn: async () => {
      if (!tokenAddress) return null;
      const res = await fetch(`/api/token-image/${tokenAddress.toLowerCase()}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`token-image API error ${res.status}`);
      return res.json() as Promise<TokenImageData>;
    },
  });
}
