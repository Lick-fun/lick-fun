"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { TokenCard, TokenCardAnimated } from "@/components/token/TokenCard";
import { TokenAvatar } from "@/components/ui/TokenImage";
import {
  TokenCardSkeleton,
  TrendingSkeletonCard,
  TickerSkeletonCard,
} from "@/components/ui/Skeleton";
import { useAllTokens, useRecentTrades } from "@/lib/hooks/useData";

type SortOption = "lastTrade" | "largestMC" | "newestCreated" | "highestReputation";

const TOKENS_PER_PAGE = 60; // 10 rows × 6 cols

/* ─── Display helpers ─────────────────────────────────────────────────────────── */

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

function formatTraderAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatAmountMon(wei: bigint): string {
  const num = Number(wei) / 1e18;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  if (num >= 1) return num.toFixed(3);
  return num.toFixed(6);
}

function getTokenDisplayName(name: string, id: string): string {
  if (name && name.trim()) return name;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

function getTokenDisplaySymbol(symbol: string): string {
  if (symbol && symbol.trim()) return symbol;
  return "???";
}

/* ─── Page ────────────────────────────────────────────────────────────────────── */

export default function HomePage() {
  const { data: tokens = [], isLoading } = useAllTokens();
  const { data: recentTrades = [], isLoading: tradesLoading } = useRecentTrades(10);
  const [activeSort, setActiveSort] = useState<SortOption>("largestMC");
  const [currentPage, setCurrentPage] = useState(1);

  /* Changing the sort filter resets pagination back to page 1 */
  const handleSortChange = (key: SortOption) => {
    setActiveSort(key);
    setCurrentPage(1);
  };

  /* Top 6 by market cap for trending section */
  const trendingTokens = useMemo(() => {
    return [...tokens]
      .sort((a, b) => b.price.marketCapMon - a.price.marketCapMon)
      .slice(0, 6);
  }, [tokens]);

  /* Sorted token list for the grid */
  const sortedTokens = useMemo(() => {
    const list = [...tokens];
    switch (activeSort) {
      case "lastTrade":
        return list.sort(
          (a, b) => (b.buyCount + b.sellCount) - (a.buyCount + a.sellCount)
        );
      case "largestMC":
        return list.sort(
          (a, b) => b.price.marketCapMon - a.price.marketCapMon
        );
      case "newestCreated":
        return list.sort((a, b) => Number(b.createdAt - a.createdAt));
      case "highestReputation":
        return list.sort((a, b) => {
          const aVol = Number(a.totalBuyVolume + a.totalSellVolume);
          const bVol = Number(b.totalBuyVolume + b.totalSellVolume);
          return bVol - aVol;
        });
      default:
        return list;
    }
  }, [tokens, activeSort]);

  /* Pagination — slice the sorted list to the current page (60 tokens = 10 rows) */
  const totalPages = Math.max(1, Math.ceil(sortedTokens.length / TOKENS_PER_PAGE));
  const paginatedTokens = useMemo(() => {
    const start = (currentPage - 1) * TOKENS_PER_PAGE;
    return sortedTokens.slice(start, start + TOKENS_PER_PAGE);
  }, [sortedTokens, currentPage]);

  /* Token lookup map for the trade ticker */
  const tokenMap = useMemo(() => {
    const map = new Map<string, { name: string; symbol: string; id: string }>();
    for (const t of tokens) {
      map.set(t.id.toLowerCase(), { name: t.name, symbol: t.symbol, id: t.id });
    }
    return map;
  }, [tokens]);

  /* Sort button definitions */
  const sortButtons: { key: SortOption; label: string }[] = [
    { key: "lastTrade",         label: "Last Trade" },
    { key: "largestMC",         label: "Largest MC" },
    { key: "newestCreated",     label: "Newest Created" },
    { key: "highestReputation", label: "Highest Reputation" },
  ];

  return (
    <div className="relative bg-figma-bg min-h-screen px-5 pb-20">
      {/* ── Lick.fun Banner Placeholder ── */}
      <div className="pt-6">
        <div className="flex items-center justify-center w-full h-[80px] rounded-panel border-2 border-dashed border-figma-green/40 bg-figma-green/5">
          <span className="text-figma-3xl text-figma-green font-bold tracking-widest opacity-60">
            Lick.fun
          </span>
        </div>
      </div>

      {/* ── Buys & Sells Ticker ── */}
      <div className="flex overflow-hidden relative mt-[17px] h-[58px]">
        <div className="flex gap-0 overflow-hidden ml-2 mt-[6px]">
          {tradesLoading ? (
            Array.from({ length: 5 }).map((_, i) => <TickerSkeletonCard key={i} />)
          ) : recentTrades.length === 0 ? (
            <div className="flex items-center h-[46px] ml-2">
              <span className="text-figma-sm text-figma-muted font-medium">
                No trades yet
              </span>
            </div>
          ) : (
            recentTrades.map((trade) => {
              const tokenInfo = tokenMap.get(trade.token_id.toLowerCase());
              const tokenLabel = tokenInfo
                ? getTokenDisplayName(tokenInfo.name, trade.token_id)
                : `${trade.token_id.slice(0, 6)}…`;
              const monAmt = formatAmountMon(trade.isBuy ? trade.amountIn : trade.amountOut);
              const amountLabel = `${monAmt} MON of ${tokenLabel}`;
              const traderDisplay = formatTraderAddress(trade.trader);

              return (
                <div
                  key={trade.id}
                  className={`flex items-center gap-2 px-3 shrink-0 w-[211px] h-[46px] rounded-pill ${
                    trade.isBuy ? "pill-buy" : "pill-sell"
                  }`}
                >
                  {/* Token avatar (small, circular) */}
                  <TokenAvatar
                    tokenAddress={trade.token_id}
                    tokenName={tokenInfo?.name}
                    size="sm"
                  />
                  {/* Info */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-figma-xs text-figma-white font-medium truncate">
                      {traderDisplay}
                    </span>
                    <span className="text-figma-xs text-figma-white font-medium truncate">
                      {amountLabel}
                    </span>
                  </div>
                  {/* Badge */}
                  <div
                    className={`flex items-center justify-center px-1 ml-auto shrink-0 w-[56px] h-[16px] rounded-[2.6px] ${
                      trade.isBuy ? "badge-buy" : "badge-sell"
                    }`}
                  >
                    <span className="text-figma-xs text-figma-white font-semibold">
                      {trade.isBuy ? "Bought" : "Sold"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-[34px] gradient-fade-right pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-[34px] gradient-fade-left pointer-events-none" />
      </div>

      {/* ── Trending Section ── */}
      {/* Trending cards row — same 6-col grid as Token Box Grid for column alignment */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-[11px] mt-[25px]">
        {isLoading ? (
          <>
            <TrendingSkeletonCard />
            <TrendingSkeletonCard />
            <TrendingSkeletonCard />
            <TrendingSkeletonCard />
            <TrendingSkeletonCard />
            <TrendingSkeletonCard />
          </>
        ) : trendingTokens.length === 0 ? (
          <span className="text-figma-sm text-figma-muted font-medium">
            No tokens yet
          </span>
        ) : (
          trendingTokens.map((token) => (
            <Link
              key={token.id}
              href={`/token/${token.id}`}
              className="no-underline"
            >
              <div className="flex flex-col items-center gap-[45px] cursor-pointer w-full h-[343px] bg-figma-purple rounded-panel px-[25px] pt-[60px] pb-[16px] relative overflow-hidden">
                {/* Gradient overlay */}
                <div className="absolute inset-0 trending-card-overlay" />

                {/* Token avatar — uses IPFS image or gradient placeholder */}
                <TokenAvatar
                  tokenAddress={token.id}
                  tokenName={getTokenDisplayName(token.name, token.id)}
                  size="3xl"
                />
                {/* Token name */}
                <span className="text-figma-2xl text-figma-white font-bold text-center">
                  {getTokenDisplayName(token.name, token.id)}
                </span>
                {/* TXNS / VOL */}
                <span className="text-figma-sm text-figma-green font-medium text-center">
                  {formatTxCount(token.buyCount, token.sellCount)} Txns /{" "}
                  {formatVolume(token.totalBuyVolume, token.totalSellVolume)} 24h VOL
                </span>
                {/* MC Row */}
                <div className="flex items-center justify-between w-full">
                  <span className="text-figma-lg text-figma-white font-bold">
                    MC: {formatMarketCap(token.price.marketCapMon)}
                  </span>
                  <svg width="54" height="23" viewBox="0 0 54 23" fill="none">
                    <path
                      d="M1 22L12 5L22 18L35 1L48 14L53 8"
                      stroke="#2CC054"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* ── Sort / Filter Bar ── */}
      <div className="flex items-center gap-3 mt-[99px]">
        {sortButtons.map(({ key, label }) => {
          const isActive = activeSort === key;
          return (
            <button
              key={key}
              onClick={() => handleSortChange(key)}
              className={`flex items-center gap-2 h-[31px] px-[18px] rounded-pill border-0 outline-none cursor-pointer transition-colors ${
                isActive
                  ? "bg-figma-green text-figma-bg"
                  : "bg-figma-surface text-figma-white"
              }`}
            >
              <span className="text-figma-sm font-medium whitespace-nowrap">
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Pagination Row (Prev / Next) — only shown when more than 1 page ── */}
      {totalPages > 1 && (
        <div className="flex items-center gap-3 mt-[18px]">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center justify-center h-[31px] px-[18px] rounded-pill border-0 outline-none cursor-pointer transition-colors bg-figma-surface text-figma-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-figma-surface/80"
          >
            <span className="text-figma-sm font-medium whitespace-nowrap">
              ← Prev
            </span>
          </button>
          <span className="text-figma-sm text-figma-muted font-medium px-2">
            Page {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center justify-center h-[31px] px-[18px] rounded-pill border-0 outline-none cursor-pointer transition-colors bg-figma-surface text-figma-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-figma-surface/80"
          >
            <span className="text-figma-sm font-medium whitespace-nowrap">
              Next →
            </span>
          </button>
        </div>
      )}

      {/* ── Token Box Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-[11px] mt-[30px] pb-[60px]">
        {isLoading ? (
          <>
            {Array.from({ length: 18 }).map((_, i) => (
              <TokenCardSkeleton key={i} />
            ))}
          </>
        ) : sortedTokens.length === 0 ? (
          <div className="col-span-6 flex items-center justify-center h-[200px]">
            <span className="text-figma-lg text-figma-muted font-medium">
              No tokens launched yet
            </span>
          </div>
        ) : (
          paginatedTokens.map((token, i) => (
            <Link
              key={token.id}
              href={`/token/${token.id}`}
              className="no-underline"
            >
              {i === 0 ? (
                <TokenCardAnimated
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
              ) : (
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
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}