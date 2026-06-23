"use client";

import { useState } from "react";
import { useAllMarkets, formatTimeAgo } from "@/lib/hooks/useData";
import { BetForm } from "@/components/markets/BetForm";
import { LoadingSpinner, ErrorState } from "@/components/ui/LoadingSpinner";
import {
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Trophy,
} from "lucide-react";

export default function MarketsPage() {
  const { data: markets = [], isLoading, error } = useAllMarkets();
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);

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

  const active = markets.filter((m) => !m.resolved);
  const resolved = markets.filter((m) => m.resolved);
  const selected = markets.find((m) => m.tokenId === selectedTokenId);

  const leaderboard = [...markets]
    .sort(
      (a, b) =>
        Number(b.totalYesMON + b.totalNoMON) -
        Number(a.totalYesMON + a.totalNoMON)
    )
    .slice(0, 10);

  return (
    <div className="bg-figma-bg min-h-screen px-5 pb-20">
      {/* Page Header */}
      <div className="pt-8 mb-8">
        <h1 className="text-figma-3xl text-figma-white font-bold mb-2">
          Prediction Markets
        </h1>
        <p className="text-figma-md text-figma-muted">
          Bet on whether tokens will graduate. Yes/No binary outcome markets.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Active Markets */}
        <div className="lg:col-span-1 space-y-6">
          {/* Active Markets List */}
          <div className="rounded-card border border-figma-card bg-figma-card p-5">
            <h3 className="text-figma-md text-figma-white font-semibold mb-4">
              Active Markets ({active.length})
            </h3>
            {active.length === 0 ? (
              <p className="text-figma-sm text-figma-muted">No active markets</p>
            ) : (
              <div className="space-y-3">
                {active.map((m) => (
                  <button
                    key={m.tokenId}
                    onClick={() => setSelectedTokenId(m.tokenId)}
                    className={`w-full text-left rounded-pill border p-4 transition-all ${
                      selectedTokenId === m.tokenId
                        ? "border-figma-green/50 bg-figma-green/5"
                        : "border-figma-surface hover:border-figma-card-alt"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-figma-sm text-figma-white">
                        {m.token?.name ?? m.tokenName}
                      </span>
                      <span className="text-figma-xs text-figma-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {m.token?.createdAt
                          ? formatTimeAgo(m.token.createdAt)
                          : "—"}
                      </span>
                    </div>
                    <div className="flex gap-2">
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
                    <div className="text-figma-xs text-figma-muted mt-2">
                      Pool: {Number(m.totalPool) / 1e18} MON
                    </div>
                  </button>
                ))}
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
                {resolved.map((m) => (
                  <div
                    key={m.tokenId}
                    className="flex items-center justify-between rounded-pill border border-figma-surface p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-figma-sm text-figma-white font-medium">
                        {m.token?.name ?? m.tokenName}
                      </span>
                      {m.outcome ? (
                        <CheckCircle className="w-4 h-4 text-figma-green-soft" />
                      ) : (
                        <XCircle className="w-4 h-4 text-figma-red-soft" />
                      )}
                    </div>
                    <span className="text-figma-xs text-figma-muted">
                      {m.outcome ? "Graduated" : "Didn't"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center: Bet Form */}
        <div className="lg:col-span-1 space-y-6">
          {selected ? (
            <BetForm
              tokenName={selected.token?.name ?? selected.tokenName}
              tokenId={selected.tokenId}
              yesOdds={selected.odds.yesOdds}
              noOdds={selected.odds.noOdds}
              resolved={selected.resolved}
              userYesBet={selected.userYesBet}
              userNoBet={selected.userNoBet}
              claimed={selected.claimed}
            />
          ) : (
            <div className="rounded-card border border-figma-card bg-figma-card p-5 text-center text-figma-muted">
              <TrendingUp className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-figma-sm">Select a market to place a bet</p>
            </div>
          )}
        </div>

        {/* Right: Leaderboard */}
        <div className="lg:col-span-1">
          <div className="rounded-card border border-figma-card bg-figma-card p-5">
            <h3 className="text-figma-md text-figma-white font-semibold mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-figma-green-soft" />
              Top Predictors
            </h3>
            {leaderboard.length === 0 ? (
              <p className="text-figma-sm text-figma-muted">No data yet</p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((m, i) => (
                  <div
                    key={m.tokenId}
                    className="flex items-center justify-between py-2 border-b border-figma-surface last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-figma-xs font-bold text-figma-muted w-5">
                        {i + 1}
                      </span>
                      <span className="text-figma-sm text-figma-white">
                        {m.token?.name ?? m.tokenName}
                      </span>
                    </div>
                    <span className="text-figma-xs text-figma-muted font-mono">
                      {Number(m.totalPool) / 1e18} MON pool
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}