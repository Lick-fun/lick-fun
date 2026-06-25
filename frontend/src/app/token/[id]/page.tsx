"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useToken, useTokenTrades, useMarket, useProfile, useTokenMeta,
  formatMon, formatTimeAgo, formatAddress,
  computeReputation, reputationColor,
} from "@/lib/hooks/useData";
import { TradePanel } from "@/components/token/TradePanel";
import { CurveChart } from "@/components/token/CurveChart";
import { LoadingSpinner, ErrorState } from "@/components/ui/LoadingSpinner";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TierBadge } from "@/components/ui/Badge";
import { TokenImage } from "@/components/ui/TokenImage";
import { useState } from "react";
import { ArrowLeft, GraduationCap, TrendingUp, Shield, User, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { BetForm } from "@/components/markets/BetForm";

export default function TokenDetailPage() {
  const { id } = useParams<{ id: string }>();
  const tokenId = (id as string) ?? "";
  const [showBetForm, setShowBetForm] = useState(false);

  const { data: token, isLoading: tokenLoading, error: tokenError, refetch: refetchToken } = useToken(tokenId);
  const { data: trades = [], isLoading: tradesLoading } = useTokenTrades(tokenId);
  const { data: market } = useMarket(tokenId);
  const creatorAddress = token?.creator ?? "";
  const { data: creatorProfile, isLoading: profileLoading } = useProfile(creatorAddress);
  const reputation = creatorProfile ? computeReputation(creatorProfile) : null;
  const { name: tokenName, symbol: tokenSymbol } = useTokenMeta(tokenId, token?.name ?? "", token?.symbol ?? "");

  if (tokenLoading || tradesLoading || profileLoading) {
    return <div className="max-w-6xl mx-auto pl-sidebar pr-5"><LoadingSpinner label="Loading token..." /></div>;
  }
  if (tokenError) {
    return <div className="max-w-6xl mx-auto pl-sidebar pr-5"><ErrorState message={(tokenError as Error).message} onRetry={() => refetchToken()} /></div>;
  }
  if (!token) {
    return (
      <div className="max-w-6xl mx-auto pl-sidebar pr-5 text-center py-20">
        <h2 className="text-figma-2xl text-figma-white font-bold mb-2">Token not found</h2>
        <Link href="/discover" className="text-figma-green hover:underline">Back to Discover</Link>
      </div>
    );
  }

  const displayName = tokenName || token.id.slice(0, 10) + "...";
  const displaySymbol = tokenSymbol || "???";
  const volume = Number(token.totalBuyVolume + token.totalSellVolume) / 1e18;
  const volStr = volume >= 1000 ? `${(volume / 1000).toFixed(1)}K` : volume.toFixed(2);

  return (
    <div className="max-w-6xl mx-auto pl-sidebar pr-5 pb-20">
      {/* Back */}
      <Link href="/discover" className="inline-flex items-center gap-1.5 text-figma-sm text-figma-muted hover:text-figma-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Discover
      </Link>

      {/* Token header */}
      <div className="rounded-card border border-figma-card bg-figma-card p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-5">
          {/* Left: image + name/creator */}
          <div className="flex items-start gap-4">
            {/* Hero image */}
            <TokenImage
              tokenAddress={tokenId}
              tokenName={displayName}
              size="2xl"
              className="shrink-0"
            />
            {/* Name + badges */}
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-figma-3xl text-figma-white font-bold">{displayName}</h1>
                <span className="text-figma-lg text-figma-muted font-mono">${displaySymbol}</span>
                {token.graduated ? (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-figma-green-soft/10 border border-figma-green-soft/30 text-figma-green-soft text-figma-xs font-semibold">
                    <GraduationCap className="w-3.5 h-3.5" /> Graduated
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-figma-green/10 border border-figma-green/20 text-figma-green text-figma-xs font-semibold">
                    <TrendingUp className="w-3.5 h-3.5" /> Live
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={`/profile/${token.creator}`} className="flex items-center gap-1.5 text-figma-sm text-figma-muted hover:text-figma-white transition-colors">
                  <User className="w-3.5 h-3.5" />
                  {formatAddress(token.creator)}
                </Link>
                {reputation && <TierBadge tier={reputation.tier} size="sm" />}
              </div>
            </div>
          </div>

          {/* Right: price */}
          <div className="text-right shrink-0">
            <div className="text-figma-3xl text-figma-white font-bold font-mono">
              {token.price?.marketCapMon.toFixed(1) ?? "0"}
            </div>
            <div className="text-figma-xs text-figma-muted">Market Cap (MON)</div>
            <div className="text-figma-sm text-figma-muted font-mono mt-1">
              {token.price?.monPerToken.toFixed(8)} MON/token
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-figma-sm text-figma-muted mb-2">
            <span className="font-medium">{token.progress.toFixed(1)}% to graduation</span>
            <span>{formatMon(token.realMon)} / 100K MON</span>
          </div>
          <ProgressBar value={token.progress} height="lg" graduated={token.graduated} showLabel />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-figma-surface">
          {[
            { label: "Price (MON)",  value: token.price?.monPerToken.toFixed(8) ?? "0", mono: true },
            { label: "Total Buys",   value: token.buyCount.toString() },
            { label: "Total Sells",  value: token.sellCount.toString() },
            { label: "Volume (MON)", value: volStr, mono: true },
            { label: "Launched",     value: `${formatTimeAgo(token.createdAt)} ago` },
          ].map((s) => (
            <div key={s.label}>
              <div className={`text-figma-md text-figma-white font-semibold ${s.mono ? "font-mono" : ""}`}>{s.value}</div>
              <div className="text-figma-xs text-figma-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Content grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Chart + Trades */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart */}
          <div className="rounded-card border border-figma-card bg-figma-card p-5">
            <h3 className="text-figma-md text-figma-white font-semibold mb-4">Bonding Curve</h3>
            <CurveChart trades={trades} graduated={token.graduated} realMon={token.realMon} />
          </div>

          {/* Recent Trades */}
          <div className="rounded-card border border-figma-card bg-figma-card p-5">
            <h3 className="text-figma-md text-figma-white font-semibold mb-4">Recent Trades</h3>
            {trades.length === 0 ? (
              <p className="text-figma-sm text-figma-muted py-4 text-center">No trades yet — be the first!</p>
            ) : (
              <div className="space-y-1 max-h-80 overflow-y-auto scrollbar-thin">
                {trades.slice(0, 30).map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between py-2.5 px-3 rounded-pill hover:bg-figma-surface/40 transition-colors text-figma-sm">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-figma-xs font-semibold ${trade.isBuy ? "bg-figma-green/15 text-figma-green" : "bg-figma-red/15 text-figma-red-soft"}`}>
                        {trade.isBuy ? "BUY" : "SELL"}
                      </span>
                      <span className="text-figma-muted font-mono text-figma-xs">{formatAddress(trade.trader)}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-figma-xs text-figma-white">
                        {trade.isBuy
                          ? `${(Number(trade.amountIn) / 1e18).toFixed(3)} MON → ${(Number(trade.amountOut) / 1e18).toFixed(0)} ${displaySymbol}`
                          : `${(Number(trade.amountIn) / 1e18).toFixed(0)} ${displaySymbol} → ${(Number(trade.amountOut) / 1e18).toFixed(3)} MON`}
                      </div>
                      <div className="text-[10px] text-figma-muted">{formatTimeAgo(trade.blockTimestamp)} ago</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Trade Panel + Creator + Market */}
        <div className="space-y-6">
          <TradePanel
            tokenId={token.id}
            tokenSymbol={displaySymbol}
            realMon={token.realMon}
            soldTokens={token.soldTokens}
            monPerToken={token.price.monPerToken}
            curveAddress={token.curve}
          />

          {/* Creator Info */}
          {creatorProfile && reputation && (
            <div className="rounded-card border border-figma-card bg-figma-card p-5">
              <h3 className="text-figma-md text-figma-white font-semibold mb-4">Creator</h3>
              <Link href={`/profile/${token.creator}`} className="flex items-center gap-3 mb-4 group">
                <div className="w-10 h-10 rounded-full gradient-lick flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-figma-bg" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-figma-sm text-figma-white font-medium group-hover:text-figma-green transition-colors font-mono">
                    {formatAddress(token.creator)}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-figma-sm font-bold ${reputationColor(reputation.score)}`}>{reputation.score}</span>
                    <span className="text-figma-xs text-figma-muted">/ 100</span>
                    <TierBadge tier={reputation.tier} size="sm" />
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-figma-muted group-hover:text-figma-green transition-colors shrink-0" />
              </Link>
              {reputation.badges.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {reputation.badges.slice(0, 4).map((badge) => (
                    <span key={badge} className="px-2 py-0.5 rounded-full bg-figma-surface text-figma-xs text-figma-muted border border-figma-card-alt">
                      {badge}
                    </span>
                  ))}
                  {reputation.badges.length > 4 && (
                    <span className="px-2 py-0.5 rounded-full bg-figma-surface text-figma-xs text-figma-muted border border-figma-card-alt">
                      +{reputation.badges.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Prediction Market */}
          {market && (
            <div className="rounded-card border border-figma-card bg-figma-card p-5">
              {/* Header — always visible */}
              <button
                onClick={() => setShowBetForm((v) => !v)}
                className="w-full flex items-center justify-between mb-4 group"
              >
                <h3 className="text-figma-md text-figma-white font-semibold">Prediction Market</h3>
                {showBetForm
                  ? <ChevronUp className="w-4 h-4 text-figma-muted group-hover:text-figma-white transition-colors" />
                  : <ChevronDown className="w-4 h-4 text-figma-muted group-hover:text-figma-white transition-colors" />
                }
              </button>

              {/* Compact odds bar — always visible */}
              <div className="mb-3">
                <div className="flex justify-between text-figma-xs text-figma-muted mb-1.5">
                  <span className="text-figma-green font-semibold">YES {market.odds.yesOdds.toFixed(0)}%</span>
                  <span className="text-figma-red-soft font-semibold">NO {market.odds.noOdds.toFixed(0)}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-figma-red/20 overflow-hidden">
                  <div className="h-full rounded-full bg-figma-green/60 transition-all" style={{ width: `${market.odds.yesOdds}%` }} />
                </div>
              </div>
              <div className="text-figma-xs text-figma-muted mb-3">
                Pool: {(Number(market.totalYesMON + market.totalNoMON) / 1e18).toFixed(2)} MON
                {market.resolved && (
                  <span className="ml-2 text-figma-green-soft">
                    • {market.outcome ? "Graduated ✅" : "Didn't graduate ❌"}
                  </span>
                )}
              </div>

              {/* Expandable full BetForm */}
              {showBetForm && (
                <div className="border-t border-figma-surface pt-4">
                  <BetForm
                    tokenName={tokenName || displayName}
                    tokenId={tokenId}
                    yesOdds={market.odds.yesOdds}
                    noOdds={market.odds.noOdds}
                    resolved={market.resolved}
                    cancelled={market.cancelled}
                    outcome={market.outcome}
                    closeTime={market.closeTime}
                    userYesBet={market.userYesBet}
                    userNoBet={market.userNoBet}
                    claimed={market.claimed}
                    totalYesMON={market.totalYesMON}
                    totalNoMON={market.totalNoMON}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}