"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { TokenCard, TokenCardAnimated } from "@/components/token/TokenCard";
import { TokenAvatar } from "@/components/ui/TokenImage";
import { CreatorBadge } from "@/components/ui/CreatorBadge";
import {
  TokenCardSkeleton,
  TrendingSkeletonCard,
  TickerSkeletonCard,
} from "@/components/ui/Skeleton";
import {
  useAllTokens,
  useRecentTrades,
  useTokensMeta,
  useTokenPriceChanges,
  formatPriceChange,
} from "@/lib/hooks/useData";
import { useMonUsdPrice } from "@/lib/hooks/useMonUsdPrice";
import {
  formatMarketCapUsd,
  formatPriceMon,
  formatVolume,
  formatTxCount,
} from "@/lib/format";
import { FounderTokenBanner } from "@/components/home/FounderTokenBanner";
import { KNOWN_ADDRESS_LABELS } from "@/lib/knownAddresses";

type SortOption = "lastTrade" | "largestMC" | "newestCreated" | "highestReputation";

const TOKENS_PER_PAGE = 60; // 10 rows × 6 cols

/* ─── Display helpers ─────────────────────────────────────────────────────────── */

function formatTraderAddress(addr: string): string {
  return KNOWN_ADDRESS_LABELS[addr.toLowerCase()] ?? `${addr.slice(0, 6)}...${addr.slice(-4)}`;
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
  const { data: monUsdPrice } = useMonUsdPrice();
  const [activeSort, setActiveSort] = useState<SortOption>("largestMC");
  const [currentPage, setCurrentPage] = useState(1);

  /* Resolve any empty token names/symbols by reading them from the contract directly.
     This makes the trending cards, the buys/sells ticker, and the token grid below
     show real names instead of falling back to the contract address. */
  const tokensWithMeta = useTokensMeta(tokens);

  /* Fetch 24h percentage-change reference prices for all displayed tokens.
     We pass the current price map so the hook can compute the actual % change
     (oldPrice → currentPrice) instead of just storing the raw old price. */
  const tokenIdsForPriceChanges = useMemo(() => {
    return tokensWithMeta.map((t) => t.id);
  }, [tokensWithMeta]);

  const currentPricesMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tokensWithMeta) {
      m.set(t.id.toLowerCase(), t.price.monPerToken);
    }
    return m;
  }, [tokensWithMeta]);

  const { data: priceChangeMap = new Map<string, number>() } =
    useTokenPriceChanges(tokenIdsForPriceChanges, currentPricesMap);

  /* Recent trades can reference tokens outside the useAllTokens() result (which is
     capped at limit: 100). Build synthetic placeholders for those trade-only tokens
     so their names can also be resolved on-chain via useTokensMeta below. */
  const tradeOnlyTokens = useMemo(() => {
    const have = new Set(tokens.map((t) => t.id.toLowerCase()));
    const seen = new Set<string>();
    const out: { id: string; name: string; symbol: string }[] = [];
    for (const trade of recentTrades) {
      const id = trade.token_id.toLowerCase();
      if (!have.has(id) && !seen.has(id)) {
        seen.add(id);
        out.push({ id: trade.token_id, name: "", symbol: "" });
      }
    }
    return out;
  }, [tokens, recentTrades]);

  const tradeTokensWithMeta = useTokensMeta(tradeOnlyTokens);

  /* Changing the sort filter resets pagination back to page 1 */
  const handleSortChange = (key: SortOption) => {
    setActiveSort(key);
    setCurrentPage(1);
  };

  /* Top 6 by market cap for trending section */
  const trendingTokens = useMemo(() => {
    return [...tokensWithMeta]
      .sort((a, b) => b.price.marketCapMon - a.price.marketCapMon)
      .slice(0, 6);
  }, [tokensWithMeta]);

  /* Sorted token list for the grid */
  const sortedTokens = useMemo(() => {
    const list = [...tokensWithMeta];
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
  }, [tokensWithMeta, activeSort]);

  /* Pagination — slice the sorted list to the current page (60 tokens = 10 rows) */
  const totalPages = Math.max(1, Math.ceil(sortedTokens.length / TOKENS_PER_PAGE));
  const paginatedTokens = useMemo(() => {
    const start = (currentPage - 1) * TOKENS_PER_PAGE;
    return sortedTokens.slice(start, start + TOKENS_PER_PAGE);
  }, [sortedTokens, currentPage]);

  /* Token lookup map for the trade ticker.
     Merges entries from useAllTokens() (already includes on-chain name resolution)
     with entries from useTokensMeta(tradeOnlyTokens) (covers trades whose token
     falls outside the useAllTokens() limit: 100 cap). */
  const tokenMap = useMemo(() => {
    const map = new Map<string, { name: string; symbol: string; id: string }>();
    for (const t of tokensWithMeta) {
      map.set(t.id.toLowerCase(), { name: t.name, symbol: t.symbol, id: t.id });
    }
    for (const t of tradeTokensWithMeta) {
      const key = t.id.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { name: t.name, symbol: t.symbol, id: t.id });
      }
    }
    return map;
  }, [tokensWithMeta, tradeTokensWithMeta]);

  /* Sort button definitions */
  const sortButtons: { key: SortOption; label: string }[] = [
    { key: "lastTrade",         label: "Last Trade" },
    { key: "largestMC",         label: "Largest MC" },
    { key: "newestCreated",     label: "Newest Created" },
    { key: "highestReputation", label: "Highest Reputation" },
  ];

  /* True once the tokenMap multicall has resolved at least one name.
     Prevents the ticker from showing addresses during the brief async window. */
  const tickerReady = !tradesLoading && !isLoading && tokenMap.size > 0;

  return (
    <>
      {/* ── Buys & Sells Ticker — rendered OUTSIDE the padded page div so it
           can span the full viewport width regardless of parent overflow ── */}
      <div className="relative overflow-hidden mt-[17px] h-[58px] w-full bg-figma-bg">
        {!tickerReady ? (
          <div className="flex gap-2 px-5 items-center h-full">
            {Array.from({ length: 5 }).map((_, i) => (
              <TickerSkeletonCard key={i} />
            ))}
          </div>
        ) : recentTrades.length === 0 ? (
          <div className="flex items-center h-full px-5">
            <span className="text-figma-sm text-figma-muted font-medium">
              No trades yet
            </span>
          </div>
        ) : (
          <div className="ticker-track h-full items-center">
            {/* Render the list twice so the marquee loops seamlessly */}
            {[0, 1].map((dup) => (
              <div key={dup} className="flex gap-2 pr-2 shrink-0">
                {recentTrades.map((trade) => {
                  const tokenInfo = tokenMap.get(trade.token_id.toLowerCase());
                  const tokenName = tokenInfo?.name?.trim() || "";
                  const tokenLabel = getTokenDisplayName(tokenName, trade.token_id);
                  const monAmt = formatAmountMon(
                    trade.isBuy ? trade.amountIn : trade.amountOut
                  );
                  const amountLabel = `${monAmt} MON of ${tokenLabel}`;
                  const traderDisplay = formatTraderAddress(trade.trader);

                  return (
                    <Link
                      key={`${dup}-${trade.id}`}
                      href={`/token/${trade.token_id}`}
                      className={`flex items-center gap-2 px-3 shrink-0 w-[211px] h-[46px] rounded-pill no-underline cursor-pointer ${
                        trade.isBuy ? "pill-buy" : "pill-sell"
                      }`}
                    >
                      <TokenAvatar
                        tokenAddress={trade.token_id}
                        tokenName={tokenName}
                        size="sm"
                      />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-figma-xs text-figma-white font-medium truncate">
                          {traderDisplay}
                        </span>
                        <span className="text-figma-xs text-figma-white font-medium truncate">
                          {amountLabel}
                        </span>
                      </div>
                      <div
                        className={`flex items-center justify-center px-1 ml-auto shrink-0 w-[56px] h-[16px] rounded-[2.6px] ${
                          trade.isBuy ? "badge-buy" : "badge-sell"
                        }`}
                      >
                        <span className="text-figma-xs text-figma-white font-semibold">
                          {trade.isBuy ? "Bought" : "Sold"}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-[34px] gradient-fade-right pointer-events-none z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-[34px] gradient-fade-left pointer-events-none z-10" />
      </div>

    <div className="relative bg-figma-bg min-h-screen px-5 pb-20">

      {/* ── Founder Token Banner (pinned, centred, above Trending Now) ── */}
      <FounderTokenBanner
        tokens={tokensWithMeta}
        priceChangePct={
          process.env.NEXT_PUBLIC_FOUNDER_TOKEN_ADDRESS
            ? priceChangeMap.get(process.env.NEXT_PUBLIC_FOUNDER_TOKEN_ADDRESS.toLowerCase())
            : undefined
        }
      />

      {/* ── Trending Now Banner ── */}
      <div className="flex items-center justify-center gap-3 mt-[20px]">
        <span className="text-3xl">🔥</span>
        <span className="text-3xl text-figma-white font-bold tracking-wide">
          Trending Now
        </span>
      </div>

      {/* ── Trending Section ── */}
      {/* Trending cards row — same 6-col grid as Token Box Grid for column alignment */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-[11px] mt-[14px]">
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
          trendingTokens.map((token) => {
            const change = formatPriceChange(priceChangeMap.get(token.id.toLowerCase()));
            const priceLabel = formatPriceMon(token.price.monPerToken);

            return (
              <Link
                key={token.id}
                href={`/token/${token.id}`}
                className="no-underline"
              >
                <div className="flex flex-col items-center gap-[12px] cursor-pointer w-full bg-figma-purple rounded-panel px-[20px] pt-[14px] pb-[14px] relative overflow-hidden">
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 trending-card-overlay" />

                  {/* Token name + ticker */}
                  <div className="relative z-10 flex flex-col items-center gap-[2px] w-full">
                    <span className="text-figma-xl text-figma-white font-bold text-center truncate w-full">
                      {getTokenDisplayName(token.name, token.id)}
                    </span>
                    <span className="text-figma-sm text-figma-muted font-bold text-center">
                      (${getTokenDisplaySymbol(token.symbol)})
                    </span>
                  </div>

                  {/* Creator badge */}
                  {token.creator && (
                    <div className="relative z-10">
                      <CreatorBadge address={token.creator} />
                    </div>
                  )}

                  {/* Token avatar */}
                  <TokenAvatar
                    tokenAddress={token.id}
                    tokenName={getTokenDisplayName(token.name, token.id)}
                    size="3xl"
                  />

                  {/* LIVE price in MON */}
                  <span className="relative z-10 text-figma-2xl text-figma-white font-bold text-center">
                    {priceLabel}
                  </span>

                  {/* 24h percentage change badge */}
                  <span
                    className={`relative z-10 text-figma-sm font-bold text-center ${
                      change.isPositive
                        ? "text-green-400"
                        : change.isNegative
                        ? "text-red-500"
                        : "text-figma-white"
                    }`}
                  >
                    {change.isPositive && "▲ "}
                    {change.isNegative && "▼ "}
                    {change.text}
                  </span>

                  {/* TXNS / VOL */}
                  <span className="relative z-10 text-figma-sm text-figma-green font-medium text-center">
                    {formatTxCount(token.buyCount, token.sellCount)} Txns /{" "}
                    {formatVolume(token.totalBuyVolume, token.totalSellVolume)} 24h VOL
                  </span>

                  {/* MC Row */}
                  <div className="relative z-10 flex items-center justify-between w-full">
                    <span className="text-figma-lg text-figma-white font-bold">
                      MC: {formatMarketCapUsd(token.price.marketCapMon, monUsdPrice)}
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

                  {/* Bonding curve progress bar */}
                  <div className="relative z-10 w-full flex flex-col gap-[3px]">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-figma-xs text-figma-muted font-bold">Bonding</span>
                      <span className="text-figma-xs text-figma-white font-bold">{token.progress.toFixed(0)}%</span>
                    </div>
                    <div
                      className="w-full overflow-hidden"
                      style={{ height: "9px", borderRadius: "24px", background: "#1B1B1B" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${token.progress}%`,
                          minWidth: token.progress > 0 ? "4px" : "0",
                          background: "linear-gradient(90deg, #2CC054 0%, #70E000 100%)",
                          borderRadius: "24px",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* ── Sort / Filter Bar ── */}
      <div className="flex items-center gap-3 mt-[20px]">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-[11px] mt-[20px] pb-[60px]">
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
          paginatedTokens.map((token, i) => {
            const pct = priceChangeMap.get(token.id.toLowerCase());

            return (
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
                    mc={formatMarketCapUsd(token.price.marketCapMon, monUsdPrice)}
                    percentage={`${token.progress.toFixed(0)}%`}
                    volume={formatVolume(token.totalBuyVolume, token.totalSellVolume)}
                    txCount={formatTxCount(token.buyCount, token.sellCount)}
                    progress={token.progress}
                    priceMon={formatPriceMon(token.price.monPerToken)}
                    priceChangePct={pct}
                    creator={token.creator}
                  />
                ) : (
                  <TokenCard
                    tokenAddress={token.id}
                    tokenName={getTokenDisplayName(token.name, token.id)}
                    symbol={getTokenDisplaySymbol(token.symbol)}
                    description=""
                    mc={formatMarketCapUsd(token.price.marketCapMon, monUsdPrice)}
                    percentage={`${token.progress.toFixed(0)}%`}
                    volume={formatVolume(token.totalBuyVolume, token.totalSellVolume)}
                    txCount={formatTxCount(token.buyCount, token.sellCount)}
                    progress={token.progress}
                    priceMon={formatPriceMon(token.price.monPerToken)}
                    priceChangePct={pct}
                    creator={token.creator}
                  />
                )}
            </Link>
            );
          })
        )}
      </div>
    </div>
    </>
  );
}