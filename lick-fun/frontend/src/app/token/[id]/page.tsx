"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useToken, useTokenTrades, useMarket, formatMon, formatTimeAgo, formatAddress, computeReputation, reputationColor, tierColor, tierBg } from "@/lib/hooks/useData";
import { useProfile } from "@/lib/hooks/useData";
import { TradePanel } from "@/components/token/TradePanel";
import { CurveChart } from "@/components/token/CurveChart";
import { ArrowLeft, ExternalLink, GraduationCap, TrendingUp, Shield, User } from "lucide-react";

export default function TokenDetailPage() {
  const { id } = useParams<{ id: string }>();
  const token = useToken(id);
  const trades = useTokenTrades(id);
  const market = useMarket(id as string);

  if (!token) {
    return (
      <div className="max-w-6xl mx-auto text-center py-20">
        <h2 className="text-2xl font-bold mb-2">Token not found</h2>
        <Link href="/discover" className="text-lick-orange-light hover:underline">
          Back to Discover
        </Link>
      </div>
    );
  }

  const creatorProfile = useProfile(token.creator);
  const reputation = creatorProfile
    ? computeReputation(creatorProfile)
    : null;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back link */}
      <Link
        href="/discover"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Discover
      </Link>

      {/* Hero */}
      <section className="rounded-xl border border-border bg-card p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold">{token.name}</h1>
              <span className="text-xl text-muted-foreground font-mono">
                ${token.symbol}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {token.graduated ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium">
                  <GraduationCap className="w-3 h-3" />
                  Graduated
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-lick-orange/10 border border-lick-orange/20 text-lick-orange-light text-xs font-medium">
                  <TrendingUp className="w-3 h-3" />
                  Live
                </span>
              )}
              <Link
                href={`/profile/${token.creator}`}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <User className="w-3 h-3" />
                {formatAddress(token.creator)}
              </Link>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold font-mono">
              {token.price?.marketCapMon.toFixed(2) ?? "0.00"}
            </div>
            <div className="text-xs text-muted-foreground">Market Cap (MON)</div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-2">
          <div className="flex justify-between text-sm text-muted-foreground mb-1">
            <span>{token.progress.toFixed(1)}% to graduation</span>
            <span>{formatMon(token.realMon)} / 100K MON</span>
          </div>
          <div className="w-full h-3 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-lick-orange to-lick-orange-light"
              style={{ width: `${Math.min(token.progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
          <div>
            <div className="text-lg font-semibold font-mono">
              {token.price?.monPerToken.toFixed(8) ?? "0"}
            </div>
            <div className="text-xs text-muted-foreground">Price (MON)</div>
          </div>
          <div>
            <div className="text-lg font-semibold">{token.buyCount}</div>
            <div className="text-xs text-muted-foreground">Total Buys</div>
          </div>
          <div>
            <div className="text-lg font-semibold">{token.sellCount}</div>
            <div className="text-xs text-muted-foreground">Total Sells</div>
          </div>
          <div>
            <div className="text-lg font-semibold">{formatTimeAgo(token.createdAt)} ago</div>
            <div className="text-xs text-muted-foreground">Launched</div>
          </div>
        </div>
      </section>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Chart + Recent Trades */}
        <div className="lg:col-span-2 space-y-6">
          {/* Curve Chart */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold text-foreground mb-4">Bonding Curve</h3>
            <CurveChart trades={trades} graduated={token.graduated} realMon={token.realMon} />
          </div>

          {/* Recent Trades */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold text-foreground mb-4">Recent Trades</h3>
            {trades.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trades yet</p>
            ) : (
              <div className="space-y-2">
                {trades.slice(0, 20).map((trade) => (
                  <div
                    key={trade.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          trade.isBuy
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {trade.isBuy ? "Buy" : "Sell"}
                      </span>
                      <span className="text-muted-foreground font-mono text-xs">
                        {formatAddress(trade.trader)}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono">
                        {trade.isBuy
                          ? `${Number(trade.amountIn) / 1e18} MON → ${Number(trade.amountOut) / 1e18} ${token.symbol}`
                          : `${Number(trade.amountIn) / 1e18} ${token.symbol} → ${Number(trade.amountOut) / 1e18} MON`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTimeAgo(trade.blockTimestamp)} ago
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Trade Panel + Creator Info + Prediction */}
        <div className="space-y-6">
          {/* Trade Panel */}
          <TradePanel
            tokenId={token.id}
            tokenSymbol={token.symbol}
            realMon={token.realMon}
            soldTokens={token.soldTokens}
            monPerToken={token.price.monPerToken}
            curveAddress={token.curve}
          />

          {/* Creator Info */}
          {creatorProfile && reputation && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold text-foreground mb-3">Creator</h3>
              <Link
                href={`/profile/${token.creator}`}
                className="flex items-center gap-3 mb-2 group"
              >
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-sm font-medium group-hover:text-lick-orange-light transition-colors">
                    {formatAddress(token.creator)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={reputationColor(reputation.score)}>
                      {reputation.score}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded border ${tierBg(reputation.tier)} ${tierColor(reputation.tier)}`}
                    >
                      {reputation.tier}
                    </span>
                  </div>
                </div>
              </Link>
              <div className="flex flex-wrap gap-1 mt-2">
                {reputation.badges.slice(0, 4).map((badge) => (
                  <span
                    key={badge}
                    className="px-2 py-0.5 rounded-full bg-secondary text-xs text-muted-foreground"
                  >
                    {badge}
                  </span>
                ))}
                {reputation.badges.length > 4 && (
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-xs text-muted-foreground">
                    +{reputation.badges.length - 4}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Prediction Market Widget */}
          {market && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold text-foreground mb-3">Prediction Market</h3>
              <div className="flex gap-4 mb-3">
                <div className="flex-1 rounded-lg bg-green-500/5 border border-green-500/20 p-3 text-center">
                  <div className="text-green-400 text-lg font-bold">
                    {market.odds.yesOdds.toFixed(1)}%
                  </div>
                  <div className="text-xs text-green-400/70">YES</div>
                </div>
                <div className="flex-1 rounded-lg bg-red-500/5 border border-red-500/20 p-3 text-center">
                  <div className="text-red-400 text-lg font-bold">
                    {market.odds.noOdds.toFixed(1)}%
                  </div>
                  <div className="text-xs text-red-400/70">NO</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Total Pool: {Number(market.totalYesMON + market.totalNoMON) / 1e18} MON
                {market.resolved && (
                  <span className="ml-2 text-green-400">
                    • Resolved: {market.outcome ? "Graduated ✅" : "Didn't graduate ❌"}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}