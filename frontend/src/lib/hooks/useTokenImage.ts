"use client";

import { useQuery } from "@tanstack/react-query";
import { ipfsToHttp } from "@/lib/ipfs";

interface TokenImageData {
  tokenAddress: string;
  imageUri: string;
  metadataUri: string;
  imageUrl: string;
  registeredAt: number;
}

export interface TokenIpfsMeta {
  name?: string;
  symbol?: string;
  description?: string;
  image?: string;
  telegram?: string;
  twitter?: string;
  website?: string;
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

/**
 * Fetches the full IPFS metadata JSON (description, socials, etc.) for a token
 * by first looking up the metadataUri from our token-image API, then fetching
 * the JSON from the IPFS gateway.
 */
export function useTokenIpfsMeta(tokenAddress: string | null | undefined) {
  const { data: imageData } = useTokenImage(tokenAddress);

  return useQuery<TokenIpfsMeta | null>({
    queryKey: ["token-ipfs-meta", tokenAddress?.toLowerCase()],
    enabled: !!imageData?.metadataUri,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      if (!imageData?.metadataUri) return null;
      const url = ipfsToHttp(imageData.metadataUri);
      if (!url) return null;
      const res = await fetch(url);
      if (!res.ok) return null;
      return res.json() as Promise<TokenIpfsMeta>;
    },
  });
}
