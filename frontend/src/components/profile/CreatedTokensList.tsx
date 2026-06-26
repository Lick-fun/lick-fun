"use client";

import { useState } from "react";
import Link from "next/link";
import { TokenImage } from "@/components/ui/TokenImage";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatMarketCapUsd } from "@/lib/format";
import { useMonUsdPrice } from "@/lib/hooks/useMonUsdPrice";
import type { DecoratedToken } from "@/lib/hooks/useData";

interface CreatedTokensListProps {
  tokens: DecoratedToken[];
  isLoading: boolean;
  /** Map of token address → total creator fees in MON (wei) */
  creatorFees: Map<string, bigint>;
  /** Whether creator fees data is still loading */
  feesLoading: boolean;
  /** Max number of tokens to show before "Show more" */
  initialLimit?: number;
}

/**
 * Enhanced "Tokens Created" list for the profile page.
 * Each row shows: token image, name/symbol, MC in USD, creator fees distributed, trade count.
 */
export function CreatedTokensList({
  tokens,
  isLoading,
  creatorFees,
  feesLoading,
  initialLimit = 10,
}: CreatedTokensListProps) {
  const [showAll, setShowAll] = useState(false);
  const { data: monUsdPrice } = useMonUsdPrice();

  const displayed = showAll ? tokens : tokens.slice(0, initialLimit);
  const hasMore = tokens.length > initialLimit;

  if (isLoading) {
    return (
      <div
        className="flex flex-col gap-3 w-full"
        style={{
          background: "#000000",
          borderRadius: "24px",
          padding: "20px",
        }}
      >
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5 items-end">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3 w-14" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 w-full py-10"
        style={{
          background: "#000000",
          borderRadius: "24px",
          padding: "20px",
        }}
      >
        <span className="text-figma-muted text-figma-13">
          No tokens created yet
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-2 w-full"
      style={{
        background: "#000000",
        borderRadius: "24px",
        padding: "16px 20px",
      }}
    >
      {displayed.map((token) => {
        const feesWei = creatorFees.get(token.id.toLowerCase()) ?? 0n;
        const feesMon = Number(feesWei) / 1e18;
        const mcMon = token.price.marketCapMon;

        return (
          <Link
            key={token.id}
            href={`/token/${token.id}`}
            className="flex items-center justify-between gap-3 p-2 -mx-2 rounded-lg hover:bg-figma-surface transition-colors"
          >
            {/* Left: token image + name/symbol */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <TokenImage
                tokenAddress={token.id}
                tokenName={token.symbol}
                size="md"
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-figma-white font-figma-bold text-figma-13 truncate">
                    {token.name}
                  </span>
                  {token.graduated && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-figma-green/20 text-figma-green">
                      GRAD
                    </span>
                  )}
                </div>
                <span className="text-figma-muted text-figma-11">
                  ${token.symbol} · {token.buyCount + token.sellCount} trades
                </span>
              </div>
            </div>

            {/* Right: MC + creator fees */}
            <div className="flex flex-col items-end shrink-0">
              {/* Market Cap in USD */}
              <span className="text-figma-white font-figma-bold text-figma-13">
                {formatMarketCapUsd(mcMon, monUsdPrice)}
              </span>
              {/* Creator fees */}
              <span className="text-figma-muted text-figma-11">
                {feesLoading ? (
                  <span className="inline-block w-12 h-3 bg-figma-surface rounded animate-pulse" />
                ) : feesMon > 0 ? (
                  <span className="text-figma-green">
                    +{formatFees(feesMon, monUsdPrice)} fees
                  </span>
                ) : (
                  "0 fees"
                )}
              </span>
            </div>
          </Link>
        );
      })}

      {/* Show more / less */}
      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="self-center mt-2 px-4 py-1.5 rounded-pill text-figma-11 text-figma-muted hover:text-figma-white hover:bg-figma-surface transition-colors"
        >
          {showAll
            ? "Show less"
            : `Show all ${tokens.length} tokens`}
        </button>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                            */
/* ──────────────────────────────────────────────────────────────────────────────── */

function formatFees(mon: number, monUsdPrice: number | null | undefined): string {
  if (monUsdPrice != null && monUsdPrice > 0) {
    const usd = mon * monUsdPrice;
    if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`;
    if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
    if (usd >= 1) return `$${usd.toFixed(2)}`;
    return `$${usd.toFixed(3)}`;
  }
  if (mon >= 1_000_000) return `${(mon / 1_000_000).toFixed(2)}M MON`;
  if (mon >= 1_000) return `${(mon / 1_000).toFixed(1)}K MON`;
  if (mon >= 1) return `${mon.toFixed(2)} MON`;
  return `${mon.toFixed(3)} MON`;
}