"use client";

import { useState, useEffect, useMemo } from "react";
import { useAllMarkets, useTokensMeta } from "@/lib/hooks/useData";
import { BetForm } from "@/components/markets/BetForm";
import { LoadingSpinner, ErrorState } from "@/components/ui/LoadingSpinner";
import {
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SortKey = "pool" | "closes" | "newest";

export default function MarketsPage() {
  const { data: markets = [], isLoading, error } = useAllMarkets();
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("pool");

  /* Resolve any empty token names/symbols by reading them from the contract
     directly. The indexer may have stored empty strings if the name/symbol
     read at launch time failed. */
  const tokenStubs = useMemo(
    () =>
      markets.map((m) => ({
        id: m.tokenId,
        name: m.token?.name ?? m.tokenName ?? "",
        symbol: m.token?.symbol ?? m.tokenSymbol ?? "",
      })),
    [markets]
  );
  const resolvedTokens = useTokensMeta(tokenStubs);
  const resolvedById = useMemo(() => {
    const map = new Map<string, { name: string; symbol: string }>();
    for (const t of resolvedTokens) {
      map.set(t.id.toLowerCase(), { name: t.name, symbol: t.symbol });
    }
    return map;
  }, [resolvedTokens]);

  /** Resolve a market's display name with on-chain fallback. */
  function marketName(m: { tokenId: string; token?: { name?: string } | null; tokenName?: string }): string {
    const resolved = resolvedById.get(m.tokenId.toLowerCase());
    const name =
      m.token?.name?.trim() ||
      resolved?.name?.trim() ||
      m.tokenName?.trim() ||
      "";
    if (name) return name;
    return `${m.tokenId.slice(0, 6)}…${m.tokenId.slice(-4)}`;
  }

  /** Resolve a market's display symbol with on-chain fallback. */
  function marketSymbol(m: { tokenId: string; token?: { symbol?: string } | null; tokenSymbol?: string }): string {
    const resolved = resolvedById.get(m.tokenId.toLowerCase());
    return (
      m.token?.symbol?.trim() ||
      resolved?.symbol?.trim() ||
      m.tokenSymbol?.trim() ||
      ""
    );
  }

  // Live clock so betting-window countdowns tick in real time
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  // Page-level stats (must be called unconditionally — before any early returns)
  const totalLockedMon = useMemo(
    () =>
      markets.reduce(
        (sum, m) => sum + Number(m.totalYesMON + m.totalNoMON) / 1e18,
        0
      ),
    [markets]
  );
  const openPositions = useMemo(
    () =>
      markets.reduce(
        (sum, m) =>
          sum +
          (m.userYesBet > 0n ? 1 : 0) +
          (m.userNoBet > 0n ? 1 : 0),
        0
      ),
    [markets]
  );

  const active = markets.filter((m) => !m.resolved && !m.cancelled);
  const resolved = markets.filter((m) => m.resolved);
  const cancelled = markets.filter((m) => m.cancelled);
  const selected = markets.find((m) => m.tokenId === selectedTokenId);

  // Sort active markets by selected key
  const sortedActive = useMemo(() => {
    const arr = [...active];
    if (sortKey === "pool") {
      arr.sort(
        (a, b) =>
          Number(b.totalYesMON + b.totalNoMON) -
          Number(a.totalYesMON + a.totalNoMON)
      );
    } else if (sortKey === "closes") {
      arr.sort((a, b) => Number(a.closeTime) - Number(b.closeTime));
    } else if (sortKey === "newest") {
      arr.sort((a, b) => Number(b.closeTime) - Number(a.closeTime));
    }
    return arr;
  }, [active, sortKey]);

  const leaderboard = [...markets]
    .sort(
      (a, b) =>
        Number(b.totalYesMON + b.totalNoMON) -
        Number(a.totalYesMON + a.totalNoMON)
    )
    .slice(0, 10);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-5">
        <LoadingSpinner label="Loading markets..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-5">
        <ErrorState message={(error as Error).message} />
      </div>
    );
  }

  return (
    <div className="bg-figma-bg min-h-screen px-5 pb-20">
      {/* Page Header */}
      <div className="pt-8 mb-6">
        <h1 className="text-figma-3xl text-figma-white font-bold mb-2">
          Prediction Markets
        </h1>
        <p className="text-figma-md text-figma-muted">
          Bet on whether tokens will graduate. Yes/No binary outcome markets.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-card border border-figma-card bg-figma-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wide text-figma-muted mb-1">
            Active Markets
          </div>
          <div className="text-figma-xl text-figma-white font-bold font-mono">
            {active.length}
          </div>
        </div>
        <div className="rounded-card border border-figma-card bg-figma-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wide text-figma-muted mb-1">
            Total Locked
          </div>
          <div className="text-figma-xl text-figma-white font-bold font-mono">
            {totalLockedMon >= 1000
              ? `${(totalLockedMon / 1000).toFixed(2)}K`
              : totalLockedMon.toFixed(2)}{" "}
            <span className="text-figma-sm text-figma-muted font-normal">MON</span>
          </div>
        </div>
        <div className="rounded-card border border-figma-card bg-figma-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wide text-figma-muted mb-1">
            Your Positions
          </div>
          <div className="text-figma-xl text-figma-white font-bold font-mono">
            {openPositions}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Active Markets */}
        <div className="lg:col-span-1 space-y-6">
          {/* Active Markets List */}
          <div className="rounded-card border border-figma-card bg-figma-card p-5">
            <h3 className="text-figma-md text-figma-white font-semibold mb-4">
              Active Markets ({active.length})
            </h3>

            {/* Sort controls */}
            {active.length > 1 && (
              <div className="flex gap-1 mb-4 rounded-lg bg-secondary p-1">
                {(
                  [
                    { key: "pool", label: "Largest Pool" },
                    { key: "closes", label: "Closes Soonest" },
                    { key: "newest", label: "Newest" },
                  ] as { key: SortKey; label: string }[]
                ).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setSortKey(opt.key)}
                    className={cn(
                      "flex-1 py-1.5 rounded-md text-[10px] font-medium transition-all",
                      sortKey === opt.key
                        ? "bg-figma-card-alt text-figma-white"
                        : "text-figma-muted hover:text-figma-white"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {sortedActive.length === 0 ? (
              <p className="text-figma-sm text-figma-muted">No active markets</p>
            ) : (
              <div className="space-y-3">
                {sortedActive.map((m) => {
                  const closeSec = Number(m.closeTime);
                  const secondsLeft = closeSec > 0 ? closeSec - nowSec : 0;
                  const bettingClosed = closeSec > 0 && secondsLeft <= 0;
                  const hasBothSides = m.totalYesMON > 0n && m.totalNoMON > 0n;
                  const hasOneSide =
                    !hasBothSides && (m.totalYesMON > 0n || m.totalNoMON > 0n);
                  const statusColor = bettingClosed
                    ? "bg-red-400"
                    : hasBothSides
                      ? "bg-figma-green"
                      : hasOneSide
                        ? "bg-amber-400"
                        : "bg-figma-muted";
                  const tokenPrice = m.token?.price?.monPerToken;
                  const tokenMc = m.token?.price?.marketCapMon;
                  const tokenProgress = m.token?.progress;
                  const symbol = marketSymbol(m);
                  return (
                    <button
                      key={m.tokenId}
                      onClick={() => setSelectedTokenId(m.tokenId)}
                      className={`w-full text-left rounded-pill border p-4 transition-all ${
                        selectedTokenId === m.tokenId
                          ? "border-figma-green/50 bg-figma-green/5"
                          : "border-figma-surface hover:border-figma-card-alt"
                      }`}
                    >
                      {/* Row 1: status dot + name + symbol + countdown */}
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={cn(
                              "w-2 h-2 rounded-full shrink-0",
                              statusColor
                            )}
                          />
                          <span className="font-medium text-figma-sm text-figma-white truncate">
                            {marketName(m)}
                          </span>
                          {symbol && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-figma-card-alt text-figma-muted shrink-0">
                              ${symbol}
                            </span>
                          )}
                        </div>
                        <span className="text-figma-xs text-figma-muted flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          {bettingClosed
                            ? "Closed"
                            : secondsLeft > 0
                              ? `${Math.floor(secondsLeft / 3600)}h ${Math.floor((secondsLeft % 3600) / 60)}m`
                              : "—"}
                        </span>
                      </div>

                      {/* Row 2: price + MC */}
                      {(tokenPrice !== undefined || tokenMc !== undefined) && (
                        <div className="flex items-center justify-between text-[10px] text-figma-muted mb-2">
                          {tokenPrice !== undefined && (
                            <span className="font-mono">
                              {tokenPrice.toFixed(6)} MON
                            </span>
                          )}
                          {tokenMc !== undefined && (
                            <span className="font-mono">
                              MC {tokenMc >= 1000
                                ? `${(tokenMc / 1000).toFixed(1)}K`
                                : tokenMc.toFixed(0)} MON
                            </span>
                          )}
                        </div>
                      )}

                      {/* Row 3: progress bar */}
                      {tokenProgress !== undefined && (
                        <div className="mb-2">
                          <div className="w-full h-1 rounded-full bg-figma-card-alt overflow-hidden">
                            <div
                              className="h-full rounded-full bg-figma-green transition-all"
                              style={{
                                width: `${Math.min(100, Math.max(0, tokenProgress))}%`,
                              }}
                            />
                          </div>
                          <div className="text-[9px] text-figma-muted mt-0.5 text-right font-mono">
                            {tokenProgress.toFixed(1)}% to graduation
                          </div>
                        </div>
                      )}

                      {/* Row 4: YES/NO odds */}
                      <div className="flex gap-2 mb-2">
                        <div className="flex-1 rounded-pill bg-figma-green/10 px-2 py-1 text-center">
                          <div className="text-figma-green-soft text-figma-xs font-bold">
                            YES {m.odds.yesOdds.toFixed(0)}%
                          </div>
                        </div>
                        <div className="flex-1 rounded-pill bg-figma-red/10 px-2 py-1 text-center">
                          <div className="text-figma-red-soft text-figma-xs font-bold">
                            NO {m.odds.noOdds.toFixed(0)}%
                          </div>
                        </div>
                      </div>

                      {/* Row 5: pool */}
                      <div className="text-figma-xs text-figma-muted">
                        Pool: {(Number(m.totalPool) / 1e18).toFixed(2)} MON
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resolved Markets */}
          <div className="rounded-card border border-figma-card bg-figma-card p-5">
            <h3 className="text-figma-md text-figma-white font-semibold mb-4">
              Resolved ({resolved.length})
            </h3>
            {resolved.length === 0 ? (
              <p className="text-figma-sm text-figma-muted">
                No resolved markets yet
              </p>
            ) : (
              <div className="space-y-2">
                {resolved.map((m) => {
                  const symbol = marketSymbol(m);
                  return (
                    <div
                      key={m.tokenId}
                      className="rounded-pill border border-figma-surface p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-figma-sm text-figma-white font-medium truncate">
                            {marketName(m)}
                          </span>
                          {symbol && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-figma-card-alt text-figma-muted shrink-0">
                              ${symbol}
                            </span>
                          )}
                          {m.outcome ? (
                            <CheckCircle className="w-4 h-4 text-figma-green-soft shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-figma-red-soft shrink-0" />
                          )}
                        </div>
                        <span className="text-figma-xs text-figma-muted shrink-0">
                          {m.outcome ? "Graduated" : "Didn't"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 rounded bg-figma-green/10 px-2 py-1 text-center">
                          <div className="text-[9px] text-figma-muted">YES</div>
                          <div className="text-figma-xs text-figma-green-soft font-mono font-bold">
                            {(Number(m.totalYesMON) / 1e18).toFixed(2)}
                          </div>
                        </div>
                        <div className="flex-1 rounded bg-figma-red/10 px-2 py-1 text-center">
                          <div className="text-[9px] text-figma-muted">NO</div>
                          <div className="text-figma-xs text-figma-red-soft font-mono font-bold">
                            {(Number(m.totalNoMON) / 1e18).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cancelled Markets */}
          {cancelled.length > 0 && (
            <div className="rounded-card border border-figma-card bg-figma-card p-5">
              <h3 className="text-figma-md text-figma-white font-semibold mb-4">
                Cancelled ({cancelled.length})
              </h3>
              <div className="space-y-2">
                {cancelled.map((m) => (
                  <button
                    key={m.tokenId}
                    onClick={() => setSelectedTokenId(m.tokenId)}
                    className={`w-full text-left flex items-center justify-between rounded-pill border p-3 transition-all ${
                      selectedTokenId === m.tokenId
                        ? "border-figma-green/50 bg-figma-green/5"
                        : "border-figma-surface hover:border-figma-card-alt"
                    }`}
                  >
                    <span className="text-figma-sm text-figma-white font-medium">
                      {marketName(m)}
                    </span>
                    <span className="text-figma-xs text-figma-muted">
                      Refundable
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center: Bet Form */}
        <div className="lg:col-span-1 space-y-6">
          {selected ? (
            <BetForm
              tokenName={marketName(selected)}
              tokenId={selected.tokenId}
              yesOdds={selected.odds.yesOdds}
              noOdds={selected.odds.noOdds}
              resolved={selected.resolved}
              cancelled={selected.cancelled}
              outcome={selected.outcome}
              closeTime={selected.closeTime}
              userYesBet={selected.userYesBet}
              userNoBet={selected.userNoBet}
              claimed={selected.claimed}
              totalYesMON={selected.totalYesMON}
              totalNoMON={selected.totalNoMON}
              tokenSymbol={selected.token?.symbol ?? selected.tokenSymbol}
              tokenPrice={selected.token?.price?.monPerToken}
              tokenMarketCap={selected.token?.price?.marketCapMon}
              tokenProgress={selected.token?.progress}
            />
          ) : (
            <div className="rounded-card border border-figma-card bg-figma-card p-5 text-center text-figma-muted">
              <TrendingUp className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-figma-sm mb-2">Select a market to place a bet</p>
              <p className="text-figma-xs text-figma-muted/70 leading-relaxed">
                Each market is a binary bet on whether a token will reach the
                graduation threshold on its bonding curve. Winners split the
                losing pool (minus 2% fee).
              </p>
            </div>
          )}
        </div>

        {/* Right: Biggest Pools */}
        <div className="lg:col-span-1">
          <div className="rounded-card border border-figma-card bg-figma-card p-5">
            <h3 className="text-figma-md text-figma-white font-semibold mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-figma-green-soft" />
              Biggest Pools
            </h3>
            {leaderboard.length === 0 ? (
              <p className="text-figma-sm text-figma-muted">No data yet</p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((m, i) => {
                  const symbol = m.token?.symbol ?? m.tokenSymbol;
                  const tokenPrice = m.token?.price?.monPerToken;
                  const tokenMc = m.token?.price?.marketCapMon;
                  return (
                    <div
                      key={m.tokenId}
                      className="flex items-center justify-between py-2 border-b border-figma-surface last:border-0 gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-figma-xs font-bold text-figma-muted w-5 shrink-0">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-figma-sm text-figma-white truncate">
                            {m.token?.name ?? m.tokenName}
                          </div>
                          {(symbol || tokenPrice !== undefined || tokenMc !== undefined) && (
                            <div className="flex items-center gap-2 text-[10px] text-figma-muted">
                              {symbol && <span className="font-mono">${symbol}</span>}
                              {tokenPrice !== undefined && (
                                <span className="font-mono">
                                  {tokenPrice.toFixed(6)}
                                </span>
                              )}
                              {tokenMc !== undefined && (
                                <span className="font-mono">
                                  MC {tokenMc >= 1000
                                    ? `${(tokenMc / 1000).toFixed(1)}K`
                                    : tokenMc.toFixed(0)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-figma-xs text-figma-muted font-mono shrink-0">
                        {(Number(m.totalPool) / 1e18).toFixed(2)} MON
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}