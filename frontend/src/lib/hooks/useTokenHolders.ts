"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReadContracts } from "wagmi";
import { getGraphQLClient } from "@/lib/graphql/client";
import { QUERY_TRADERS_BY_TOKEN } from "@/lib/graphql/queries";
import { getTokenPrice } from "@/lib/wagmi/contracts";

/* ─────────────────────────────────────────────────────────────── */
/* Types                                                           */
/* ─────────────────────────────────────────────────────────────── */

export interface TokenHolder {
  address: string;
  balance: bigint;
  balanceFormatted: number;
  pctOfSupply: number; // 0–100
  valueMonFormatted: number; // balance × current price in MON
  valueUsd: number | null; // null if monUsdPrice unavailable
}

/* ─────────────────────────────────────────────────────────────── */
/* ERC-20 ABI (balanceOf + totalSupply)                           */
/* ─────────────────────────────────────────────────────────────── */

const ERC20_BALANCE_AND_SUPPLY_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const;

/* ─────────────────────────────────────────────────────────────── */
/* Hook                                                            */
/* ─────────────────────────────────────────────────────────────── */

/**
 * Returns all current holders of a bonding-curve token, sorted by balance desc.
 *
 * Strategy:
 * 1. Fetch all trader addresses from the indexer (high limit, deduplicated)
 * 2. Multicall balanceOf on-chain for every unique trader
 * 3. Filter to wallets with balance > 0
 * 4. Compute % of supply and USD value
 *
 * @param tokenId      Token contract address
 * @param soldTokens   Total tokens sold (from Token entity) — used for price calc
 * @param realMon      Real MON in bonding curve — used for price calc
 * @param monUsdPrice  Current MON/USD price (optional, for USD column)
 */
export function useTokenHolders(
  tokenId: string,
  soldTokens: bigint | undefined,
  realMon: bigint | undefined,
  monUsdPrice?: number | null
) {
  const enabled = !!tokenId;
  const tokenLower = tokenId.toLowerCase();

  // Step 1: Fetch all unique trader addresses
  const tradersQuery = useQuery({
    queryKey: ["token-traders", tokenLower],
    enabled,
    queryFn: async () => {
      const client = getGraphQLClient();
      const res = await client.request<{ Trade: { trader: string }[] }>(
        QUERY_TRADERS_BY_TOKEN,
        { tokenId: tokenLower, limit: 2000 }
      );
      const seen = new Set<string>();
      for (const t of res.Trade ?? []) seen.add(t.trader.toLowerCase());
      return Array.from(seen);
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const traders = tradersQuery.data ?? [];

  // Step 2: Multicall totalSupply + balanceOf for every unique trader
  const balanceContracts = useMemo(
    () =>
      [
        {
          address: tokenLower as `0x${string}`,
          abi: ERC20_BALANCE_AND_SUPPLY_ABI,
          functionName: "totalSupply" as const,
        },
        ...traders.map((addr) => ({
          address: tokenLower as `0x${string}`,
          abi: ERC20_BALANCE_AND_SUPPLY_ABI,
          functionName: "balanceOf" as const,
          args: [addr as `0x${string}`] as const,
        })),
      ],
    [traders, tokenLower]
  );

  const { data: balanceResults, isLoading: balancesLoading } = useReadContracts({
    contracts: balanceContracts,
    query: {
      enabled: balanceContracts.length > 0,
      refetchInterval: 30_000,
    },
  });

  // Step 3 & 4: Build sorted holder list
  const holders = useMemo<TokenHolder[]>(() => {
    if (!balanceResults || balanceResults.length === 0) return [];

    const totalSupplyRaw = balanceResults[0];
    if (totalSupplyRaw?.status !== "success") return [];
    const totalSupply = totalSupplyRaw.result as bigint;

    const price =
      soldTokens != null && realMon != null
        ? getTokenPrice(realMon, soldTokens).monPerToken
        : 0;

    const result: TokenHolder[] = [];

    for (let i = 0; i < traders.length; i++) {
      const raw = balanceResults[i + 1];
      if (raw?.status !== "success") continue;
      const balance = raw.result as bigint;
      if (balance === 0n) continue;

      const balanceFormatted = Number(balance) / 1e18;
      const pctOfSupply = totalSupply > 0n ? (Number(balance) / Number(totalSupply)) * 100 : 0;
      const valueMonFormatted = balanceFormatted * price;
      const valueUsd = monUsdPrice != null ? valueMonFormatted * monUsdPrice : null;

      result.push({
        address: traders[i],
        balance,
        balanceFormatted,
        pctOfSupply,
        valueMonFormatted,
        valueUsd,
      });
    }

    return result.sort((a, b) => (b.balance > a.balance ? 1 : -1));
  }, [balanceResults, traders, soldTokens, realMon, monUsdPrice]);

  return {
    holders,
    isLoading: tradersQuery.isLoading || balancesLoading,
    traderCount: traders.length,
  };
}
