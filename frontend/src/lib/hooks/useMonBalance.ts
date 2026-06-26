"use client";

import { useBalance } from "wagmi";

/**
 * Fetches the native MON balance for a given address.
 * Returns the balance in wei (bigint) and a formatted string.
 *
 * @param address  Wallet address to query. If empty, returns zero balance.
 */
export function useMonBalance(address: string | undefined) {
  const enabled = !!address && address.startsWith("0x") && address.length === 42;

  const { data, isLoading, isError, refetch } = useBalance({
    address: (address ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
    query: {
      enabled,
      refetchInterval: 30_000, // refresh every 30s
    },
  });

  return {
    balanceWei: data?.value ?? 0n,
    balanceMon: data ? Number(data.value) / 1e18 : 0,
    formatted: data?.formatted ?? "0",
    symbol: data?.symbol ?? "MON",
    isLoading,
    isError,
    refetch,
  };
}