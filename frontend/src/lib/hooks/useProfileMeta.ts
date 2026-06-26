"use client";

import { useQuery } from "@tanstack/react-query";

export interface ProfileMeta {
  walletAddress: string;
  displayName: string;
  avatarUri: string;
  avatarUrl: string;
  updatedAt: number;
}

/**
 * Fetches the custom profile metadata (display name + avatar) for a wallet
 * address from the off-chain store. Returns null if no profile has been
 * registered yet.
 */
export function useProfileMeta(address: string | undefined) {
  return useQuery<ProfileMeta | null>({
    queryKey: ["profile-meta", address?.toLowerCase()],
    enabled: !!address,
    queryFn: async () => {
      if (!address) return null;
      try {
        const res = await fetch(`/api/profile-image/${address.toLowerCase()}`);
        if (res.status === 404) return null;
        if (!res.ok) return null;
        return (await res.json()) as ProfileMeta;
      } catch {
        return null;
      }
    },
    staleTime: 30_000,
  });
}