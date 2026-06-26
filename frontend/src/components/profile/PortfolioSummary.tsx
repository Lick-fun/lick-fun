"use client";

import { Wallet, TrendingUp, TrendingDown, Coins } from "lucide-react";
import { useMonBalance } from "@/lib/hooks/useMonBalance";
import { useMonUsdPrice } from "@/lib/hooks/useMonUsdPrice";

interface PortfolioSummaryProps {
  address: string;
  /** Total holdings value in MON (from useTokenHoldings) */
  holdingsValueMon: number;
  /** Total cost basis in MON (from useTokenHoldings) */
  holdingsCostBasisMon: number;
  /** Number of tokens held */
  holdingsCount: number;
  /** Whether holdings data is still loading */
  isLoading?: boolean;
}

/**
 * Portfolio summary card showing:
 * - Native MON balance
 * - Total holdings value (in USD when price available, else MON)
 * - Total P&L (profit/loss) with percentage
 * - Number of tokens held
 */
export function PortfolioSummary({
  address,
  holdingsValueMon,
  holdingsCostBasisMon,
  holdingsCount,
  isLoading,
}: PortfolioSummaryProps) {
  const { balanceMon, formatted: monFormatted, isLoading: monLoading } = useMonBalance(address);
  const { data: monUsdPrice } = useMonUsdPrice();

  const totalPnlMon = holdingsValueMon - holdingsCostBasisMon;
  const totalPnlPct =
    holdingsCostBasisMon > 0 ? (totalPnlMon / holdingsCostBasisMon) * 100 : 0;
  const isPositive = totalPnlMon >= 0;

  // Total portfolio = MON balance + holdings value
  const totalPortfolioMon = balanceMon + holdingsValueMon;
  const totalPortfolioUsd =
    monUsdPrice != null && monUsdPrice > 0
      ? totalPortfolioMon * monUsdPrice
      : null;

  return (
    <div
      className="flex flex-col gap-4 w-full"
      style={{
        background: "#000000",
        borderRadius: "24px",
        padding: "20px 24px",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet size={16} className="text-figma-green" />
          <span className="text-figma-white font-figma-bold text-figma-13">
            Portfolio
          </span>
        </div>
        {holdingsCount > 0 && (
          <span className="text-figma-muted text-figma-11">
            {holdingsCount} token{holdingsCount !== 1 ? "s" : ""} held
          </span>
        )}
      </div>

      {/* Total Value — hero number */}
      <div className="flex flex-col gap-1">
        <span className="text-figma-muted text-figma-11">Total Value</span>
        <div className="flex items-baseline gap-2">
          {isLoading || monLoading ? (
            <div className="h-8 w-32 bg-figma-surface rounded animate-pulse" />
          ) : (
            <>
              <span className="text-figma-white font-figma-bold text-figma-3xl">
                {totalPortfolioUsd != null
                  ? `$${formatNumber(totalPortfolioUsd)}`
                  : `${formatNumber(totalPortfolioMon)} MON`}
              </span>
              {totalPortfolioUsd != null && (
                <span className="text-figma-muted text-figma-13">
                  ({formatNumber(totalPortfolioMon)} MON)
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-figma-card-alt">
        {/* MON Balance */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <Coins size={12} className="text-figma-muted" />
            <span className="text-figma-muted text-figma-11">MON</span>
          </div>
          <span className="text-figma-white font-figma-bold text-figma-13">
            {monLoading ? "..." : `${formatNumber(monBalance(monFormatted))} MON`}
          </span>
        </div>

        {/* Holdings Value */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <Wallet size={12} className="text-figma-muted" />
            <span className="text-figma-muted text-figma-11">Holdings</span>
          </div>
          <span className="text-figma-white font-figma-bold text-figma-13">
            {isLoading
              ? "..."
              : monUsdPrice != null && monUsdPrice > 0
              ? `$${formatNumber(holdingsValueMon * monUsdPrice)}`
              : `${formatNumber(holdingsValueMon)} MON`}
          </span>
        </div>

        {/* P&L */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            {isPositive ? (
              <TrendingUp size={12} className="text-figma-green" />
            ) : (
              <TrendingDown size={12} className="text-red-400" />
            )}
            <span className="text-figma-muted text-figma-11">P&L</span>
          </div>
          <span
            className={`font-figma-bold text-figma-13 ${
              isPositive ? "text-figma-green" : "text-red-400"
            }`}
          >
            {isLoading
              ? "..."
              : `${isPositive ? "+" : ""}${formatNumber(totalPnlMon)} MON`}
            {!isLoading && holdingsCostBasisMon > 0 && (
              <span className="text-figma-muted text-figma-11 ml-1">
                ({isPositive ? "+" : ""}{totalPnlPct.toFixed(1)}%)
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                            */
/* ──────────────────────────────────────────────────────────────────────────────── */

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  if (n >= 1) return n.toFixed(2);
  if (n >= 0.001) return n.toFixed(4);
  return n.toFixed(6);
}

function monBalance(formatted: string): number {
  const n = parseFloat(formatted);
  return isNaN(n) ? 0 : n;
}