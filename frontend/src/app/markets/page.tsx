"use client";

import { useState } from "react";
import Link from "next/link";
import { useAllMarkets, formatMon, formatTimeAgo } from "@/lib/hooks/useData";
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
      <div className="max-w-6xl mx-auto">
        <LoadingSpinner label="Loading markets..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
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
    <div className="max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Prediction Markets</h1>
        <p className="text-muted-foreground">
          Bet on whether tokens will graduate. Yes/No binary outcome markets.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Active Markets */}
        <div className="lg:col-span-1 space-y-6">
          {/* Active Markets List */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold text-foreground mb-4">
              Active Markets ({active.length})
            </h3>
            {active.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active markets</p>
            ) : (
              <div className="space-y-3">
                {active.map((m) => (
                  <button
                    key={m.tokenId}
                    onClick={() => setSelectedTokenId(m.tokenId)}
                    className={`w-full text-left rounded-lg border p-4 transition-all ${
                      selectedTokenId === m.tokenId
                        ? "border-lick-orange/50 bg-lick-orange/5"
                        : "border-border hover:border-lick-orange/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        {m.token?.name ?? m.tokenName}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {m.token?.createdAt
                          ? formatTimeAgo(m.token.createdAt)
                          : "—"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 rounded bg-green-500/10 px-2 py-1 text-center">
                        <div className="text-green-400 text-xs font-bold">
                          YES {m.odds.yesOdds.toFixed(0)}%
                        </div>
                      </div>
                      <div className="flex-1 rounded bg-red-500/10 px-2 py-1 text-center">
                        <div className="text-red-400 text-xs font-bold">
                          NO {m.odds.noOdds.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Pool: {Number(m.totalPool) / 1e18} MON
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Resolved Markets */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold text-foreground mb-4">
              Resolved ({resolved.length})
            </h3>
            {resolved.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No resolved markets yet
              </p>
            ) : (
              <div className="space-y-2">
                {resolved.map((m) => (
                  <div
                    key={m.tokenId}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {m.token?.name ?? m.tokenName}
                      </span>
                      {m.outcome ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
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
            <div className="rounded-xl border border-border bg-card p-5 text-center text-muted-foreground">
              <TrendingUp className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a market to place a bet</p>
            </div>
          )}
        </div>

        {/* Right: Leaderboard */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Top Predictors
            </h3>
            {leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((m, i) => (
                  <div
                    key={m.tokenId}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-5">
                        {i + 1}
                      </span>
                      <span className="text-sm">
                        {m.token?.name ?? m.tokenName}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
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
