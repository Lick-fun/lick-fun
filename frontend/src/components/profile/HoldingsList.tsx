"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown } from "lucide-react";
import { TokenImage } from "@/components/ui/TokenImage";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Holding } from "@/lib/hooks/useTokenHoldings";

interface HoldingsListProps {
  holdings: Holding[];
  isLoading: boolean;
  monUsdPrice: number | null | undefined;
}

/**
 * List of token holdings for a wallet.
 * Each row shows: token image, name/symbol, balance, current price, USD value, P&L.
 * Clicking a row navigates to the token detail page.
 */
export function HoldingsList({ holdings, isLoading, monUsdPrice }: HoldingsListProps) {
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

  if (holdings.length === 0) {
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
          No token holdings yet
        </span>
        <span className="text-figma-muted text-figma-11">
          Buy tokens to see them here
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
      {holdings.map((holding) => (
        <HoldingRow
          key={holding.tokenId}
          holding={holding}
          monUsdPrice={monUsdPrice}
        />
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Individual Row                                                                    */
/* ──────────────────────────────────────────────────────────────────────────────── */

function HoldingRow({
  holding,
  monUsdPrice,
}: {
  holding: Holding;
  monUsdPrice: number | null | undefined;
}) {
  const isPositive = holding.pnlMon >= 0;
  const hasUsdPrice = monUsdPrice != null && monUsdPrice > 0;

  // Format balance with adaptive precision
  const balanceDisplay = formatTokenAmount(holding.balanceFormatted);

  // Format current value
  const valueDisplay = hasUsdPrice
    ? `$${formatNumber(holding.currentValueMon * (monUsdPrice ?? 0))}`
    : `${formatNumber(holding.currentValueMon)} MON`;

  // Format P&L
  const pnlDisplay = hasUsdPrice
    ? `${isPositive ? "+" : ""}$${formatNumber(Math.abs(holding.pnlMon) * (monUsdPrice ?? 0))}`
    : `${isPositive ? "+" : ""}${formatNumber(holding.pnlMon)} MON`;

  return (
    <Link
      href={`/token/${holding.tokenId}`}
      className="flex items-center justify-between gap-3 p-2 -mx-2 rounded-lg hover:bg-figma-surface transition-colors group"
    >
      {/* Left: token image + name/symbol */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <TokenImage
          tokenAddress={holding.tokenId}
          tokenName={holding.symbol}
          size="md"
        />
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-figma-white font-figma-bold text-figma-13 truncate">
              {holding.name}
            </span>
            {holding.graduated && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-figma-green/20 text-figma-green">
                GRAD
              </span>
            )}
          </div>
          <span className="text-figma-muted text-figma-11">
            {balanceDisplay} {holding.symbol}
          </span>
        </div>
      </div>

      {/* Right: value + P&L */}
      <div className="flex flex-col items-end shrink-0">
        <span className="text-figma-white font-figma-bold text-figma-13">
          {valueDisplay}
        </span>
        <div className="flex items-center gap-1">
          {isPositive ? (
            <TrendingUp size={10} className="text-figma-green" />
          ) : (
            <TrendingDown size={10} className="text-red-400" />
          )}
          <span
            className={`text-figma-11 font-medium ${
              isPositive ? "text-figma-green" : "text-red-400"
            }`}
          >
            {pnlDisplay}
            {holding.costBasisMon > 0 && (
              <span className="text-figma-muted ml-1">
                ({isPositive ? "+" : ""}{holding.pnlPct.toFixed(1)}%)
              </span>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                            */
/* ──────────────────────────────────────────────────────────────────────────────── */

function formatNumber(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(abs / 1_000).toFixed(2)}K`;
  if (abs >= 1) return abs.toFixed(2);
  if (abs >= 0.001) return abs.toFixed(4);
  return abs.toFixed(6);
}

function formatTokenAmount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n >= 1) return n.toFixed(2);
  if (n >= 0.001) return n.toFixed(4);
  return n.toFixed(0);
}