"use client";

import { useState } from "react";
import { useAllTokens } from "@/lib/hooks/useData";
import { TokenCard } from "@/components/token/TokenCard";
import { Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type SortKey = "newest" | "progress" | "volume";
type FilterKey = "all" | "live" | "graduated";

export default function DiscoverPage() {
  const tokens = useAllTokens();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [filter, setFilter] = useState<FilterKey>("all");

  const filtered = tokens
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
        case "newest":
          return Number(b.createdAt - a.createdAt);
        case "progress":
          return b.progress - a.progress;
        case "volume":
          return Number(b.totalBuyVolume - a.totalBuyVolume);
        default:
          return 0;
      }
    });

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Discover Tokens</h1>
        <p className="text-muted-foreground">
          Explore tokens launching on the Lick.fun bonding curve.
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, symbol, or creator..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-lick-orange/50 focus:border-lick-orange/30"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {(["all", "live", "graduated"] as FilterKey[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2.5 rounded-lg text-sm font-medium transition-all capitalize",
                filter === f
                  ? "bg-lick-orange text-black"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex gap-2">
          {([
            { key: "newest", label: "Newest" },
            { key: "progress", label: "Progress" },
            { key: "volume", label: "Volume" },
          ] as { key: SortKey; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={cn(
                "px-3 py-2.5 rounded-lg text-xs font-medium transition-all",
                sort === key
                  ? "bg-secondary text-foreground border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg mb-2">No tokens found</p>
          <p className="text-sm">Try a different search or filter.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((token) => (
            <TokenCard key={token.id} token={token} />
          ))}
        </div>
      )}
    </div>
  );
}