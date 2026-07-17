"use client";

import { useQuery } from "@tanstack/react-query";
import { getGraphQLClient } from "@/lib/graphql/client";
import {
  QUERY_ALL_TOKENS,
  QUERY_FEE_EVENTS_BY_TOKENS,
  type FeeEventEntity,
} from "@/lib/graphql/queries";

/**
 * Fetches total creator fees distributed per token for tokens created by a
 * specific address. Returns a map of token address → total creator fees in MON.
 *
 * Two-step approach:
 * 1. Fetch all tokens created by the address
 * 2. Fetch all FeeEvents for those token addresses
 * 3. Aggregate `creatorShare` per token
 *
 * @param creator  Creator wallet address. If empty, returns empty map.
 */
export function useCreatorFees(creator: string | undefined) {
  return useQuery({
    queryKey: ["creator-fees", creator?.toLowerCase()],
    enabled: !!creator && creator.startsWith("0x") && creator.length === 42,
    queryFn: async () => {
      const client = getGraphQLClient();
      const creatorLower = (creator as string).toLowerCase();

      // Step 1: Get all tokens created by this address
      const tokensRes = await client.request<{ Token: { id: string }[] }>(
        QUERY_ALL_TOKENS,
        {
          limit: 200,
          where: { creator: { _eq: creatorLower } },
        }
      );
      const tokenIds = (tokensRes.Token ?? []).map((t) => t.id.toLowerCase());

      if (tokenIds.length === 0) {
        return new Map<string, bigint>();
      }

      // Step 2: Fetch all FeeEvents for those tokens
      const feesRes = await client.request<{ FeeEvent: unknown[] }>(
        QUERY_FEE_EVENTS_BY_TOKENS,
        {
          tokenIds,
          limit: 1000,
        }
      );

      // Step 3: Aggregate creatorShare per token
      const feesByToken = new Map<string, bigint>();
      for (const raw of feesRes.FeeEvent ?? []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fee = raw as any;
        const tokenAddr = (fee.token ?? "").toLowerCase();
        const creatorShare = BigInt(fee.creatorShare ?? "0");
        if (!tokenAddr) continue;
        const current = feesByToken.get(tokenAddr) ?? 0n;
        feesByToken.set(tokenAddr, current + creatorShare);
      }

      return feesByToken;
    },
    refetchInterval: 45_000, // refresh every 45s
  });
}

/**
 * Fetches total creator fees distributed for a single token.
 *
 * @param tokenId  Token address. If empty, returns 0n.
 */
export function useCreatorFeesForToken(tokenId: string | undefined) {
  return useQuery({
    queryKey: ["creator-fees-token", tokenId?.toLowerCase()],
    enabled: !!tokenId && tokenId.startsWith("0x") && tokenId.length === 42,
    queryFn: async () => {
      const client = getGraphQLClient();
      const res = await client.request<{ FeeEvent: unknown[] }>(
        QUERY_FEE_EVENTS_BY_TOKENS,
        {
          tokenIds: [(tokenId as string).toLowerCase()],
          limit: 1000,
        }
      );

      let total = 0n;
      for (const raw of res.FeeEvent ?? []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fee = raw as any;
        total += BigInt(fee.creatorShare ?? "0");
      }
      return total;
    },
    refetchInterval: 45_000,
  });
}

/**
 * Helper to convert a FeeEventEntity array to a Map<tokenAddress, totalCreatorShare>.
 */
export function aggregateCreatorFees(
  events: FeeEventEntity[]
): Map<string, bigint> {
  const map = new Map<string, bigint>();
  for (const e of events) {
    const key = e.token.toLowerCase();
    const current = map.get(key) ?? 0n;
    map.set(key, current + e.creatorShare);
  }
  return map;
}