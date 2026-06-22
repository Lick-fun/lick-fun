"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useAllTokens } from "@/lib/hooks/useData";
import { TokenCard } from "@/components/token/TokenCard";
import { TokenCardSkeleton } from "@/components/ui/Skeleton";
import { Search, Plus, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type SortKey = "newest" | "progress" | "volume";
type FilterKey = "all" | "live" | "graduated";

const FILTER_LABELS: Record<FilterKey, string> = {
  all: "All",
  live: "Live",
  graduated: "Graduated",
};
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest",   label: "Newest" },
  { key: "progress", label: "Progress" },
  { key: "volume",   label: "Volume" },
];

function getTokenDisplayName(name: string, id: string): string {
  if (name && name.trim()) return name;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

function getTokenDisplaySymbol(symbol: string): string {
  if (symbol && symbol.trim()) return symbol;
  return "???";
}

function formatMarketCap(mc: number): string {
  if (mc >= 1_000_000) return `$${(mc / 1_000_000).toFixed(2)}M`;
  if (mc >= 1_000) return `$${(mc / 1_000).toFixed(1)}K`;
  return `$${mc.toFixed(0)}`;
}

function formatVolume(totalBuy: bigint, totalSell: bigint): string {
  const total = Number(totalBuy + totalSell) / 1e18;
  if (total >= 1_000_000) return `${(total / 1_000_000).toFixed(1)}M`;
  if (total >= 1_000) return `${(total / 1_000).toFixed(1)}K`;
  return total.toFixed(2);
}

function formatTxCount(buyCount: number, sellCount: number): string {
  return (buyCount + sellCount).toString();
}

/**
 * Discover page — mirrors the working page.tsx pattern:
 *   - pl-sidebar offset via --sidebar-w token (no inline styles)
 *   - Real data from useAllTokens
 *   - TokenCardSkeleton placeholders
 *   - Empty state with CTA
 */
export default function DiscoverPage() {
  const { data: tokens = [], isLoading } = useAllTokens();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [filter, setFilter] = useState<FilterKey>("all");

  const filtered = useMemo(() => {
    return tokens
      .filter((t) => {
        if (filter === "graduated" && !t.graduated) return false;
        if (filter === "live" && t.graduated) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            t.name.toLowerCase().includes(q) ||
            t.symbol.toLowerCase().includes(q) ||
            t.creator.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        switch (sort) {
          case "newest":   return Number(b.createdAt - a.createdAt);
          case "progress": return b.progress - a.progress;
          case "volume":   return Number(b.totalBuyVolume - a.totalBuyVolume);
          default:         return 0;
        }
      });
  }, [tokens, search, sort, filter]);

  return (
    <div className="bg-figma-bg min-h-screen pl-sidebar pr-5 pb-20 lg:pb-10">
      {/* Page Header */}
      <div className="pt-8 mb-8">
        <h1 className="text-figma-3xl text-figma-white font-bold mb-1">
          Discover Tokens
        </h1>
        <p className="text-figma-sm text-figma-muted">
          Explore tokens launching on the Lick.fun bonding curve.
        </p>
      </div>

      {/* Search + Controls */}
      <div className="space-y-3 mb-8">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-figma-muted" />
          <input
            type="text"
            placeholder="Search by name, symbol, or creator address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-pill border border-figma-surface bg-figma-card text-figma-white text-sm placeholder:text-figma-muted focus:outline-none focus:border-figma-green transition-colors"
          />
        </div>

        {/* Filter + Sort row */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {/* Filter pills */}
          <div className="flex gap-1.5 p-1 rounded-pill bg-figma-surface border border-figma-card-alt">
            {(["all", "live", "graduated"] as FilterKey[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-1.5 rounded-pill text-sm font-medium transition-all",
                  filter === f
                    ? "bg-figma-green text-figma-bg"
                    : "text-figma-muted hover:text-figma-white"
                )}
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>

          {/* Sort segmented control */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-figma-muted" />
            <div className="flex gap-1 p-1 rounded-pill bg-figma-surface border border-figma-card-alt">
              {SORT_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSort(key)}
                  className={cn(
                    "px-3 py-1.5 rounded-pill text-xs font-medium transition-all",
                    sort === key
                      ? "bg-figma-card text-figma-white border border-figma-card-alt"
                      : "text-figma-muted hover:text-figma-white"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results count */}
      {!isLoading && (
        <p className="text-figma-xs text-figma-muted mb-4">
          {filtered.length} token{filtered.length !== 1 ? "s" : ""} found
        </p>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <TokenCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-figma-muted">
          <div className="text-figma-3xl mb-4">🔍</div>
          <p className="text-figma-lg text-figma-white font-medium mb-2">
            No tokens found
          </p>
          <p className="text-figma-sm mb-6">
            Try a different search or filter.
          </p>
          <Link
            href="/create"
            className="btn-lick text-sm inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create the first one
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((token) => (
            <Link
              key={token.id}
              href={`/token/${token.id}`}
              className="no-underline"
            >
              <TokenCard
                tokenAddress={token.id}
                tokenName={getTokenDisplayName(token.name, token.id)}
                symbol={getTokenDisplaySymbol(token.symbol)}
                description=""
                mc={formatMarketCap(token.price.marketCapMon)}
                percentage={`${token.progress.toFixed(0)}%`}
                volume={formatVolume(token.totalBuyVolume, token.totalSellVolume)}
                txCount={formatTxCount(token.buyCount, token.sellCount)}
                progress={token.progress}
              />
            </Link>
          ))}
        </div>
      )}

      {/* Mobile FAB */}
      <Link
        href="/create"
        className="md:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full gradient-lick flex items-center justify-center"
      >
        <Plus className="w-6 h-6 text-figma-bg" />
      </Link>
    </div>
  );
}