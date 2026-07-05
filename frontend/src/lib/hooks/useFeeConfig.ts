"use client";

import { useReadContract } from "wagmi";
import { FeeRouterABI, FEE_ROUTER_ADDRESS } from "@/lib/wagmi/contracts";
import { useQuery as useTanstackQuery } from "@tanstack/react-query";
import { getGraphQLClient } from "@/lib/graphql/client";
import { QUERY_FEE_EVENTS_BY_TOKEN, QUERY_VAULT_EXECUTIONS_BY_TOKEN } from "@/lib/graphql/queries";
import { getFeeCorrectionsForToken } from "@/lib/knownFeeCorrections";

/**
 * Reads the on-chain FeeConfig for a specific token from FeeRouter.
 * Returns creatorShareBps, lpSupportBps, buybackBurnBps, giftBps, etc.
 */
export function useFeeConfig(tokenAddress: string | undefined) {
  const enabled =
    !!tokenAddress &&
    tokenAddress.startsWith("0x") &&
    tokenAddress.length === 42 &&
    FEE_ROUTER_ADDRESS !== "0x0000000000000000000000000000000000000000";

  const { data, isLoading, error } = useReadContract({
    address: FEE_ROUTER_ADDRESS,
    abi: FeeRouterABI,
    functionName: "tokenFeeConfigs",
    args: tokenAddress ? [tokenAddress as `0x${string}`] : undefined,
    query: { enabled, staleTime: 60_000 },
  });

  if (!data) {
    return { config: null, isLoading, error };
  }

  // data is a tuple: [creatorShareBps, lpSupportBps, buybackBurnBps, giftBps, giftRecipient, creator, initialized]
  const [creatorShareBps, lpSupportBps, buybackBurnBps, giftBps, giftRecipient, creator, initialized] = data as [
    bigint, bigint, bigint, bigint, `0x${string}`, `0x${string}`, boolean
  ];

  return {
    config: {
      creatorShareBps: Number(creatorShareBps),
      lpSupportBps: Number(lpSupportBps),
      buybackBurnBps: Number(buybackBurnBps),
      giftBps: Number(giftBps),
      giftRecipient,
      creator,
      initialized,
    },
    isLoading,
    error,
  };
}

/**
 * Fetches all FeeEvents for a single token and aggregates totals.
 * Returns { totalAmount, creatorShare, lpShare, buybackShare, executionCount, lastExecuted }
 *
 * Note: also folds in any known indexer-gap corrections (see knownFeeCorrections.ts)
 * for confirmed on-chain FeeRouted events that the indexer failed to capture, so the
 * displayed totals match on-chain reality even when the indexer has gaps.
 */
export function useFeeEvents(tokenId: string | undefined) {
  return useTanstackQuery({
    queryKey: ["fee-events-token", tokenId?.toLowerCase()],
    enabled: !!tokenId && tokenId.startsWith("0x") && tokenId.length === 42,
    queryFn: async () => {
      const client = getGraphQLClient();
      const res = await client.request<{ FeeEvent: unknown[] }>(
        QUERY_FEE_EVENTS_BY_TOKEN,
        {
          tokenId: (tokenId as string).toLowerCase(),
          limit: 1000,
        }
      );

      const events = res.FeeEvent ?? [];
      let totalAmount = 0n;
      let creatorShare = 0n;
      let lpShare = 0n;
      let buybackShare = 0n;
      let lastTimestamp = 0n;

      for (const raw of events) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fee = raw as any;
        totalAmount += BigInt(fee.totalAmount ?? "0");
        creatorShare += BigInt(fee.creatorShare ?? "0");
        lpShare += BigInt(fee.lpShare ?? "0");
        buybackShare += BigInt(fee.buybackShare ?? "0");
        const ts = BigInt(fee.blockTimestamp ?? "0");
        if (ts > lastTimestamp) lastTimestamp = ts;
      }

      // ── Apply known indexer-gap corrections ──────────────────────────────
      // Some confirmed on-chain FeeRouted events are missing from the indexer
      // (see knownFeeCorrections.ts for root cause). Fold them in here so
      // displayed totals match on-chain reality. Safe to remove once the
      // indexer is re-synced to include these tx hashes natively.
      const corrections = getFeeCorrectionsForToken((tokenId as string).toLowerCase());
      let executionCount = events.length;
      for (const c of corrections) {
        totalAmount += c.totalAmount;
        creatorShare += c.creatorShare;
        lpShare += c.lpShare;
        buybackShare += c.buybackShare;
        executionCount += 1;
        if (c.blockTimestamp > lastTimestamp) lastTimestamp = c.blockTimestamp;
      }

      return {
        totalAmount,
        creatorShare,
        lpShare,
        buybackShare,
        executionCount,
        lastExecuted: lastTimestamp > 0n ? new Date(Number(lastTimestamp) * 1000) : null,
      };
    },
    refetchInterval: 30_000,
  });
}

/**
 * Per-vault-type aggregate of actual automated vault executions for a token.
 * "buyback": count + total MON spent + total tokens burned + last executed.
 * "lp":      count + total MON added + total LP burned + last executed.
 *
 * This reflects REAL automated vault execute() calls (the ground truth of what
 * was actually bought back and burned / added as liquidity) — as opposed to
 * useFeeEvents' totals, which reflect fees routed FROM TRADES only. These two
 * numbers can legitimately diverge: e.g. a one-time manual reconciliation
 * deposit (via VaultRecouper, used historically to fix a broken vault) adds
 * to a vault's balance and gets included in a subsequent execute(), but never
 * emits a FeeRouted event — so it shows up here but not in useFeeEvents.
 */
export interface VaultExecutionSummary {
  count: number;
  totalMon: bigint;
  totalResult: bigint; // tokens burned (buyback) or LP burned (lp)
  lastExecuted: Date | null;
}

export function useVaultExecutions(tokenId: string | undefined) {
  return useTanstackQuery({
    queryKey: ["vault-executions-token", tokenId?.toLowerCase()],
    enabled: !!tokenId && tokenId.startsWith("0x") && tokenId.length === 42,
    queryFn: async (): Promise<{ buyback: VaultExecutionSummary; lp: VaultExecutionSummary }> => {
      const client = getGraphQLClient();
      const res = await client.request<{ VaultExecution: unknown[] }>(
        QUERY_VAULT_EXECUTIONS_BY_TOKEN,
        {
          tokenId: (tokenId as string).toLowerCase(),
          limit: 1000,
        }
      );

      const empty = (): VaultExecutionSummary => ({
        count: 0,
        totalMon: 0n,
        totalResult: 0n,
        lastExecuted: null,
      });
      const buyback = empty();
      const lp = empty();

      for (const raw of res.VaultExecution ?? []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const e = raw as any;
        const target = e.vaultType === "lp" ? lp : buyback;
        target.count += 1;
        target.totalMon += BigInt(e.monSpent ?? "0");
        target.totalResult += BigInt(e.tokensResult ?? "0");
        const ts = BigInt(e.blockTimestamp ?? "0");
        const d = ts > 0n ? new Date(Number(ts) * 1000) : null;
        if (d && (!target.lastExecuted || d > target.lastExecuted)) {
          target.lastExecuted = d;
        }
      }

      return { buyback, lp };
    },
    refetchInterval: 30_000,
  });
}
