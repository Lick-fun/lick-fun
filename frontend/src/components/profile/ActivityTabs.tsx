"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatMarketCapUsd } from "@/lib/format";
import type { TradeEntity } from "@/lib/graphql/queries";
import type { DecoratedToken } from "@/lib/hooks/useData";

interface ActivityTabsProps {
  /** All trades by this user (from useTokenHoldings or useTradesByTrader) */
  trades: TradeEntity[];
  /** Tokens created by this user (for the "Creates" tab) */
  createdTokens: DecoratedToken[];
  isLoading: boolean;
  /** Current MON/USD price for USD conversion (optional) */
  monUsdPrice?: number | null;
}

/**
 * Tabbed activity feed for the profile page.
 * Tabs: All / Buys / Sells / Creates
 */
export function ActivityTabs({
  trades,
  createdTokens,
  isLoading,
  monUsdPrice,
}: ActivityTabsProps) {
  const [activeTab, setActiveTab] = useState("all");

  const buys = useMemo(() => trades.filter((t) => t.isBuy), [trades]);
  const sells = useMemo(() => trades.filter((t) => !t.isBuy), [trades]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="all" count={trades.length}>
          All
        </TabsTrigger>
        <TabsTrigger value="buys" count={buys.length}>
          Buys
        </TabsTrigger>
        <TabsTrigger value="sells" count={sells.length}>
          Sells
        </TabsTrigger>
        <TabsTrigger value="creates" count={createdTokens.length}>
          Creates
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all">
        <ActivityList
          trades={trades.slice(0, 20)}
          isLoading={isLoading}
          monUsdPrice={monUsdPrice}
        />
      </TabsContent>
      <TabsContent value="buys">
        <ActivityList
          trades={buys.slice(0, 20)}
          isLoading={isLoading}
          monUsdPrice={monUsdPrice}
        />
      </TabsContent>
      <TabsContent value="sells">
        <ActivityList
          trades={sells.slice(0, 20)}
          isLoading={isLoading}
          monUsdPrice={monUsdPrice}
        />
      </TabsContent>
      <TabsContent value="creates">
        <CreatedActivityList
          tokens={createdTokens.slice(0, 20)}
          isLoading={isLoading}
          monUsdPrice={monUsdPrice}
        />
      </TabsContent>
    </Tabs>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Trade Activity List                                                               */
/* ──────────────────────────────────────────────────────────────────────────────── */

function ActivityList({
  trades,
  isLoading,
  monUsdPrice,
}: {
  trades: TradeEntity[];
  isLoading: boolean;
  monUsdPrice?: number | null;
}) {
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
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-3.5 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 w-full py-10"
        style={{
          background: "#000000",
          borderRadius: "24px",
          padding: "20px",
        }}
      >
        <span className="text-figma-muted text-figma-13">No activity yet</span>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-1 w-full"
      style={{
        background: "#000000",
        borderRadius: "24px",
        padding: "12px 20px",
      }}
    >
      {trades.map((trade) => (
        <TradeRow
          key={trade.id}
          trade={trade}
          monUsdPrice={monUsdPrice}
        />
      ))}
    </div>
  );
}

function TradeRow({
  trade,
  monUsdPrice,
}: {
  trade: TradeEntity;
  monUsdPrice?: number | null;
}) {
  const name = trade.token?.name?.trim() || "Unknown";
  const symbol = trade.token?.symbol?.trim() || "???";
  const tokenId = trade.token_id;
  const monAmount = Number(trade.amountIn) / 1e18;
  const hasUsdPrice = monUsdPrice != null && monUsdPrice > 0;
  const usdAmount = monAmount * (monUsdPrice ?? 0);

  // USD primary, MON secondary (matches HoldingsList pattern). When no USD
  // price is available, fall back to MON as the primary value.
  const primaryValue = hasUsdPrice
    ? `$${formatUsd(usdAmount)}`
    : `${formatMon(monAmount)} MON`;
  const secondaryValue = hasUsdPrice ? `${formatMon(monAmount)} MON` : null;

  return (
    <Link
      href={`/token/${tokenId}`}
      className="flex items-center justify-between gap-3 p-2 -mx-2 rounded-lg hover:bg-figma-surface transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {trade.isBuy ? (
          <div className="w-8 h-8 rounded-full bg-figma-green/20 flex items-center justify-center shrink-0">
            <TrendingUp size={14} className="text-figma-green" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-red-400/20 flex items-center justify-center shrink-0">
            <TrendingDown size={14} className="text-red-400" />
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <span className="text-figma-white font-figma-bold text-figma-13 truncate">
            {trade.isBuy ? "Buy" : "Sell"} {name}
          </span>
          <span className="text-figma-muted text-figma-11 truncate">
            {symbol} · {timeAgo(trade.blockTimestamp)}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end shrink-0">
        <span className="text-figma-white font-figma-bold text-figma-13">
          {primaryValue}
        </span>
        {secondaryValue && (
          <span className="text-figma-muted text-figma-11">
            {secondaryValue}
          </span>
        )}
      </div>
    </Link>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Created Tokens Activity List                                                      */
/* ──────────────────────────────────────────────────────────────────────────────── */

function CreatedActivityList({
  tokens,
  isLoading,
  monUsdPrice,
}: {
  tokens: DecoratedToken[];
  isLoading: boolean;
  monUsdPrice?: number | null;
}) {
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
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-3.5 w-16" />
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
      className="flex flex-col gap-1 w-full"
      style={{
        background: "#000000",
        borderRadius: "24px",
        padding: "12px 20px",
      }}
    >
      {tokens.map((token) => (
        <Link
          key={token.id}
          href={`/token/${token.id}`}
          className="flex items-center justify-between gap-3 p-2 -mx-2 rounded-lg hover:bg-figma-surface transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-full bg-figma-purple/20 flex items-center justify-center shrink-0">
              <Sparkles size={14} className="text-figma-purple" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-figma-white font-figma-bold text-figma-13 truncate">
                Created {token.name?.trim() || "Unknown"}
              </span>
              <span className="text-figma-muted text-figma-11 truncate">
                {token.symbol?.trim() || "???"} · {timeAgo(token.createdAt)}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <span className="text-figma-white font-figma-bold text-figma-13">
              {formatMarketCapUsd(token.price.marketCapMon, monUsdPrice)}
            </span>
            <span className="text-figma-muted text-figma-11">MC</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                            */
/* ──────────────────────────────────────────────────────────────────────────────── */

function timeAgo(timestamp: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - Number(timestamp);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo ago`;
  return `${Math.floor(diff / 31536000)}y ago`;
}

function formatMon(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  if (amount >= 1) return amount.toFixed(2);
  return amount.toFixed(3);
}

/**
 * Format a USD value with adaptive precision. Mirrors the HoldingsList
 * formatNumber style: K/M suffixes for large values, extra precision for
 * small fractional amounts.
 */
function formatUsd(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(abs / 1_000).toFixed(2)}K`;
  if (abs >= 1) return abs.toFixed(2);
  if (abs >= 0.01) return abs.toFixed(4);
  return abs.toFixed(6);
}