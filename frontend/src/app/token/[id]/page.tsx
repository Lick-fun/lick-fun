"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useToken, useTokenTradesMerged, useMarket, useProfile, useTokenMeta,
  useTokenPriceBars,
  formatTimeAgo, formatAddress,
  computeReputation,
} from "@/lib/hooks/useData";
import { useTokenPair } from "@/lib/wagmi/contracts";
import { TradePanel } from "@/components/token/TradePanel";

// PriceChart uses lightweight-charts which accesses window — must be client-only
const PriceChart = dynamic(
  () => import("@/components/token/PriceChart").then((m) => m.PriceChart),
  { ssr: false }
);
import { LoadingSpinner, ErrorState } from "@/components/ui/LoadingSpinner";
import { TokenImage } from "@/components/ui/TokenImage";
import { useTokenIpfsMeta } from "@/lib/hooks/useTokenImage";
import { useMonUsdPrice } from "@/lib/hooks/useMonUsdPrice";
import { ArrowLeft, GraduationCap, TrendingUp, Copy, Check, Globe, Send, Droplets, Flame, User, Gift } from "lucide-react";
import { BetForm } from "@/components/markets/BetForm";
import { cn } from "@/lib/utils";
import { useFeeConfig } from "@/lib/hooks/useFeeConfig";
import { FeeOverviewModal } from "@/components/token/FeeOverviewModal";
import { CreatorBadge } from "@/components/ui/CreatorBadge";
import { useTokenHolders } from "@/lib/hooks/useTokenHolders";

export default function TokenDetailPage() {
  const { id } = useParams<{ id: string }>();
  const tokenId = (id as string) ?? "";
  const [showBetForm, setShowBetForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showFeeOverview, setShowFeeOverview] = useState(false);

  // Live clock for prediction market countdown
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const intervalId = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(intervalId);
  }, []);

  const { data: token, isLoading: tokenLoading, error: tokenError, refetch: refetchToken } = useToken(tokenId);
  // useTokenTradesMerged: indexer trades + RPC supplement (catches any missed events)
  const {
    data: trades = [],
    isLoading: tradesLoading,
    gapCount,
  } = useTokenTradesMerged(tokenId, token?.curve, token?.startBlock);
  const { data: market } = useMarket(tokenId);
  const creatorAddress = token?.creator ?? "";
  const { data: creatorProfile } = useProfile(creatorAddress);
  const reputation = creatorProfile ? computeReputation(creatorProfile) : null;
  const { name: tokenName, symbol: tokenSymbol } = useTokenMeta(tokenId, token?.name ?? "", token?.symbol ?? "");
  const { bars, resolution, setResolution, isLoading: barsLoading } = useTokenPriceBars(tokenId);
  const { data: ipfsMeta } = useTokenIpfsMeta(tokenId);
  const { data: monUsdPrice } = useMonUsdPrice();
  const { config: feeConfig } = useFeeConfig(tokenId);
  // DEX pair: checks GraduationRouter.tokenToPair — polls every 5s
  const { pairAddress } = useTokenPair(tokenId as `0x${string}`);

  // Extract unique trader addresses from the merged trade list
  // (indexer + RPC gap-fill) so wallets missed by the indexer are still
  // checked for current balances via the holders multicall.
  const extraTraderAddresses = useMemo(() => {
    const seen = new Set<string>();
    for (const t of trades) seen.add(t.trader.toLowerCase());
    // Also include the token creator (dev wallet) — they may hold tokens
    // from a CurveLaunch mint or post-launch distribution, even if they
    // never appeared as a trader in the indexer.
    if (creatorAddress) seen.add(creatorAddress.toLowerCase());
    return Array.from(seen);
  }, [trades, creatorAddress]);

  const { holders, isLoading: holdersLoading } = useTokenHolders(
    tokenId,
    token?.soldTokens,
    token?.realMon,
    monUsdPrice,
    extraTraderAddresses
  );

  // Activity tab: "trades" | "holders"
  const [activityTab, setActivityTab] = useState<"trades" | "holders">("trades");

  // Price flash effect
  const [priceFlash, setPriceFlash] = useState<"up" | "down" | null>(null);
  const prevPrice = useRef<number | null>(null);
  useEffect(() => {
    const current = token?.price?.monPerToken ?? null;
    if (current !== null && prevPrice.current !== null && current !== prevPrice.current) {
      setPriceFlash(current > prevPrice.current ? "up" : "down");
      const t = setTimeout(() => setPriceFlash(null), 1200);
      prevPrice.current = current;
      return () => clearTimeout(t);
    }
    if (current !== null) prevPrice.current = current;
  }, [token?.price?.monPerToken]);

  // Volume stats
  const volumeMon = useMemo(() => {
    if (!token) return 0;
    return Number(token.totalBuyVolume + token.totalSellVolume) / 1e18;
  }, [token]);
  const buyVolMon = token ? Number(token.totalBuyVolume) / 1e18 : 0;
  const sellVolMon = token ? Number(token.totalSellVolume) / 1e18 : 0;

  function formatVol(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toFixed(2);
  }

  async function copyAddress() {
    await navigator.clipboard.writeText(tokenId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (tokenLoading || tradesLoading) {
    return <div className="max-w-7xl mx-auto pl-sidebar pr-5"><LoadingSpinner label="Loading token..." /></div>;
  }
  if (tokenError) {
    return <div className="max-w-7xl mx-auto pl-sidebar pr-5"><ErrorState message={(tokenError as Error).message} onRetry={() => refetchToken()} /></div>;
  }
  if (!token) {
    return (
      <div className="max-w-7xl mx-auto pl-sidebar pr-5 text-center py-20">
        <h2 className="text-figma-2xl text-figma-white font-bold mb-2">Token not found</h2>
        <Link href="/discover" className="text-figma-green hover:underline">Back to Discover</Link>
      </div>
    );
  }

  const displayName = tokenName || token.id.slice(0, 10) + "...";
  const displaySymbol = tokenSymbol || "???";
  const shortAddr = `${tokenId.slice(0, 6)}...${tokenId.slice(-4)}`;
  const founderTokenAddress = process.env.NEXT_PUBLIC_FOUNDER_TOKEN_ADDRESS;
  const isFounderToken = !!founderTokenAddress && tokenId.toLowerCase() === founderTokenAddress.toLowerCase();

  return (
    <div className="max-w-7xl mx-auto pl-sidebar pr-4 pb-20">
      {/* Back */}
      <Link href="/discover" className="inline-flex items-center gap-1.5 text-figma-xs text-figma-muted hover:text-figma-white mb-3 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </Link>

      {/* ── Two-column layout ── */}
      <div className="flex gap-4 items-start">

        {/* ────────── LEFT COLUMN ────────── */}
        <div className="flex-1 min-w-0 space-y-3">

          {/* Token header card */}
          <div className="rounded-xl border border-figma-card bg-figma-card p-4">
            <div className="flex items-start gap-3">
              <TokenImage
                tokenAddress={tokenId}
                tokenName={displayName}
                size="xl"
                className="shrink-0 rounded-xl"
              />
              <div className="flex-1 min-w-0">
                {/* Name row */}
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="px-2 py-0.5 rounded bg-figma-surface text-figma-white text-xs font-bold font-mono">
                    {displaySymbol}
                  </span>
                  <button
                    onClick={copyAddress}
                    className="flex items-center gap-1 text-xs text-figma-muted hover:text-figma-white transition-colors font-mono"
                  >
                    {shortAddr}
                    {copied ? <Check className="w-3 h-3 text-figma-green" /> : <Copy className="w-3 h-3" />}
                  </button>
                  {token.graduated ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-semibold">
                      <GraduationCap className="w-3 h-3" /> Graduated
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-figma-green/10 border border-figma-green/20 text-figma-green text-[10px] font-semibold">
                      <TrendingUp className="w-3 h-3" /> Live
                    </span>
                  )}
                </div>

                {/* Full name */}
                <h1 className="text-lg font-bold text-figma-white leading-tight mb-1">{displayName}</h1>

                {/* Creator + time */}
                <div className="flex items-center gap-2 text-xs text-figma-muted flex-wrap">
                  <Link href={`/profile/${token.creator}`} className="hover:text-figma-white transition-colors font-mono">
                    {formatAddress(token.creator)}
                  </Link>
                  <span>·</span>
                  <span>{formatTimeAgo(token.createdAt)} ago</span>
                  {reputation && (
                    <>
                      <span>·</span>
                      <span className="text-figma-green font-semibold">Rep {reputation.score}</span>
                    </>
                  )}
                </div>

                {/* Fee structure badges + Fee Overview button */}
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  {feeConfig && feeConfig.lpSupportBps > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-semibold">
                      <Droplets className="w-2.5 h-2.5" />
                      LP Support {(feeConfig.lpSupportBps / 100).toFixed(0)}%
                    </span>
                  )}
                  {feeConfig && feeConfig.creatorShareBps > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-figma-purple/10 border border-figma-purple/20 text-figma-purple-soft text-[10px] font-semibold">
                      <User className="w-2.5 h-2.5" />
                      Creator {(feeConfig.creatorShareBps / 100).toFixed(0)}%
                    </span>
                  )}
                  {feeConfig && feeConfig.buybackBurnBps > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-semibold">
                      <Flame className="w-2.5 h-2.5" />
                      Buyback &amp; Burn {(feeConfig.buybackBurnBps / 100).toFixed(0)}%
                    </span>
                  )}
                  {feeConfig && feeConfig.giftBps > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-figma-purple-soft/10 border border-figma-purple-soft/20 text-figma-purple-soft text-[10px] font-semibold">
                      <Gift className="w-2.5 h-2.5" />
                      Gift {(feeConfig.giftBps / 100).toFixed(0)}%
                    </span>
                  )}
                  <button
                    onClick={() => setShowFeeOverview(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-figma-surface bg-figma-surface/50 hover:bg-figma-surface text-figma-muted hover:text-figma-white text-[10px] font-semibold transition-all"
                  >
                    📊 Fee Overview
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Founder burn notice — only shown on the founder token page */}
          {isFounderToken && (
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 px-4 py-3 flex items-center gap-3">
              <span className="text-lg">🔥</span>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-figma-white font-semibold">Dev wallet sent to burn address</span>
              </div>
              <a
                href="https://monadvision.com/tx/0x4c34c6facbe1e662d6940a8da22764e86d28f083a54bb6633518e6a3b14f6d05"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-orange-500/40 bg-orange-500/10 text-orange-400 hover:text-orange-300 hover:border-orange-400/60 text-[11px] font-semibold transition-colors no-underline"
              >
                View Tx ↗
              </a>
            </div>
          )}

          {/* Chart card */}
          <div className="rounded-xl border border-figma-card bg-figma-card p-0 overflow-hidden">
            <div className="p-4 pt-3">
              <PriceChart
                bars={bars}
                resolution={resolution}
                setResolution={setResolution}
                isLoading={barsLoading}
                tokenSymbol={displaySymbol}
                tokenName={displayName}
                monUsdPrice={monUsdPrice ?? undefined}
              />
            </div>
          </div>

          {/* Trades / Holders section */}
          <div className="rounded-xl border border-figma-card bg-figma-card overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-center gap-0 border-b border-figma-surface">
              <button
                onClick={() => setActivityTab("trades")}
                className={[
                  "px-4 py-3 text-xs font-semibold transition-colors border-b-2 -mb-px flex items-center gap-1.5",
                  activityTab === "trades"
                    ? "text-figma-white border-figma-green"
                    : "text-figma-muted border-transparent hover:text-figma-white",
                ].join(" ")}
              >
                Trades
                {gapCount > 0 && (
                  <span
                    title={`${gapCount} trade${gapCount === 1 ? "" : "s"} recovered from chain (indexer gap)`}
                    className="px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-[9px] font-bold"
                  >
                    +{gapCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActivityTab("holders")}
                className={[
                  "px-4 py-3 text-xs font-semibold transition-colors border-b-2 -mb-px",
                  activityTab === "holders"
                    ? "text-figma-white border-figma-green"
                    : "text-figma-muted border-transparent hover:text-figma-white",
                ].join(" ")}
              >
                Holders
                {holders.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-figma-surface text-figma-muted text-[9px] font-bold">
                    {holders.length}
                  </span>
                )}
              </button>
            </div>

            {activityTab === "trades" ? (
              /* ── TRADES ── */
              trades.length === 0 ? (
                <p className="text-xs text-figma-muted py-8 text-center">No trades yet — be the first!</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-figma-muted border-b border-figma-surface/50">
                        <th className="text-left px-4 py-2 font-medium">Account</th>
                        <th className="text-left px-4 py-2 font-medium">Type</th>
                        <th className="text-right px-4 py-2 font-medium">MON</th>
                        <th className="text-right px-4 py-2 font-medium">USD</th>
                        <th className="text-right px-4 py-2 font-medium">{displaySymbol}</th>
                        <th className="text-right px-4 py-2 font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.slice(0, 40).map((trade) => {
                        const isDev = !!creatorAddress && trade.trader.toLowerCase() === creatorAddress.toLowerCase();
                        const monAmt = Number(trade.isBuy ? trade.amountIn : trade.amountOut) / 1e18;
                        const usdAmt = monUsdPrice != null ? monAmt * monUsdPrice : null;
                        return (
                          <tr
                            key={trade.id}
                            className={cn(
                              "border-b border-figma-surface/30 hover:bg-figma-surface/20 transition-colors",
                              isDev && "bg-yellow-500/5"
                            )}
                          >
                            <td className="px-4 py-2.5">
                              <CreatorBadge address={trade.trader} />
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${trade.isBuy ? "bg-figma-green/15 text-figma-green" : "bg-red-500/15 text-red-400"}`}>
                                  {trade.isBuy ? "BUY" : "SELL"}
                                </span>
                                {isDev && (
                                  <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-yellow-500/20 text-yellow-400">
                                    Dev
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-figma-white">
                              {monAmt.toFixed(3)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-figma-muted">
                              {usdAmt != null ? `$${usdAmt.toFixed(2)}` : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-figma-muted">
                              {trade.isBuy
                                ? (Number(trade.amountOut) / 1e18).toFixed(0)
                                : (Number(trade.amountIn) / 1e18).toFixed(0)}
                            </td>
                            <td className="px-4 py-2.5 text-right text-figma-muted">
                              {formatTimeAgo(trade.blockTimestamp)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              /* ── HOLDERS ── */
              holdersLoading ? (
                <div className="py-8 flex justify-center">
                  <div className="w-5 h-5 border-2 border-figma-green/30 border-t-figma-green rounded-full animate-spin" />
                </div>
              ) : holders.length === 0 ? (
                <p className="text-xs text-figma-muted py-8 text-center">No holders found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-figma-muted border-b border-figma-surface/50">
                        <th className="text-left px-4 py-2 font-medium">#</th>
                        <th className="text-left px-4 py-2 font-medium">Holder</th>
                        <th className="text-right px-4 py-2 font-medium">Balance</th>
                        <th className="text-right px-4 py-2 font-medium">Value</th>
                        <th className="text-right px-4 py-2 font-medium">% Supply</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holders.map((holder, i) => {
                        const isDevHolder = !!creatorAddress && holder.address.toLowerCase() === creatorAddress.toLowerCase();
                        return (
                          <tr
                            key={holder.address}
                            className={cn(
                              "border-b border-figma-surface/30 hover:bg-figma-surface/20 transition-colors",
                              isDevHolder && "bg-yellow-500/5"
                            )}
                          >
                            <td className="px-4 py-2.5 text-figma-muted font-mono">{i + 1}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <CreatorBadge address={holder.address} />
                                {isDevHolder && (
                                  <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-yellow-500/20 text-yellow-400">
                                    Dev
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-figma-white">
                              {holder.balanceFormatted >= 1_000_000
                                ? `${(holder.balanceFormatted / 1_000_000).toFixed(2)}M`
                                : holder.balanceFormatted >= 1_000
                                  ? `${(holder.balanceFormatted / 1_000).toFixed(2)}K`
                                  : holder.balanceFormatted.toFixed(2)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-figma-muted">
                              {holder.valueUsd != null
                                ? `$${holder.valueUsd.toFixed(2)}`
                                : `${holder.valueMonFormatted.toFixed(3)} MON`}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <span
                                className={cn(
                                  "font-semibold",
                                  holder.pctOfSupply >= 10
                                    ? "text-red-400"
                                    : holder.pctOfSupply >= 5
                                      ? "text-yellow-400"
                                      : "text-figma-muted"
                                )}
                              >
                                {holder.pctOfSupply.toFixed(2)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>

        {/* ────────── RIGHT COLUMN ────────── */}
        <div className="w-[340px] shrink-0 space-y-3">

          {/* Trade panel */}
          <TradePanel
            tokenId={token.id}
            tokenSymbol={displaySymbol}
            realMon={token.realMon}
            soldTokens={token.soldTokens}
            monPerToken={token.price.monPerToken}
            curveAddress={token.curve}
            graduated={token.graduated}
            pairAddress={pairAddress}
          />

          {/* Bonding Curve progress */}
          <div className="rounded-xl border border-figma-card bg-figma-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-figma-white">Bonding Curve</span>
              <span className="text-xs text-figma-green font-bold">{token.progress.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-figma-surface overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${token.graduated ? "bg-purple-500" : "bg-figma-green"}`}
                style={{ width: `${Math.min(token.progress, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-figma-muted mt-2">
              {token.graduated
                ? "This token has graduated to DEX trading."
                : `${(Number(token.realMon) / 1e18).toFixed(1)} / 100,000 MON raised to graduation.`}
            </p>
          </div>

          {/* Token information */}
          <div className="rounded-xl border border-figma-card bg-figma-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-figma-white">Information</span>
              <div className="flex items-center gap-1 text-xs text-figma-muted">
                <TokenImage tokenAddress={tokenId} tokenName={displayName} size="xs" className="rounded-full" />
                <span className="font-mono">{displaySymbol}</span>
              </div>
            </div>

            {/* Description */}
            {ipfsMeta?.description && (
              <p className="text-xs text-figma-muted leading-relaxed mb-3">
                {ipfsMeta.description}
              </p>
            )}

            {/* Social links */}
            {(ipfsMeta?.telegram || ipfsMeta?.twitter || ipfsMeta?.website) && (
              <div className="flex items-center gap-2 mb-3">
                {ipfsMeta.telegram && (
                  <a
                    href={ipfsMeta.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-figma-surface hover:bg-figma-surface/80 transition-colors text-figma-muted hover:text-figma-white text-xs"
                  >
                    <Send className="w-3 h-3" />
                    <span>TG</span>
                  </a>
                )}
                {ipfsMeta.twitter && (
                  <a
                    href={ipfsMeta.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-figma-surface hover:bg-figma-surface/80 transition-colors text-figma-muted hover:text-figma-white text-xs"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.26 5.632 5.905-5.632Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    <span>X</span>
                  </a>
                )}
                {ipfsMeta.website && (
                  <a
                    href={ipfsMeta.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-figma-surface hover:bg-figma-surface/80 transition-colors text-figma-muted hover:text-figma-white text-xs"
                  >
                    <Globe className="w-3 h-3" />
                    <span>Web</span>
                  </a>
                )}
              </div>
            )}

            {/* Price stats grid */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-figma-surface rounded-lg p-2 text-center">
                <div className="text-[9px] text-figma-muted uppercase tracking-wide mb-0.5">Price USD</div>
                <div className="text-xs font-bold text-figma-white font-mono">
                  {monUsdPrice != null
                    ? `$${(token.price?.monPerToken * monUsdPrice).toFixed(6)}`
                    : `${token.price?.monPerToken.toFixed(6)} MON`}
                </div>
              </div>
              <div className="bg-figma-surface rounded-lg p-2 text-center">
                <div className="text-[9px] text-figma-muted uppercase tracking-wide mb-0.5">Price MON</div>
                <div className="text-xs font-bold text-figma-white font-mono">
                  {token.price?.monPerToken.toFixed(6)}
                </div>
              </div>
              <div className="bg-figma-surface rounded-lg p-2 text-center">
                <div className="text-[9px] text-figma-muted uppercase tracking-wide mb-0.5">Mkt Cap</div>
                <div
                  className={[
                    "text-xs font-bold font-mono transition-colors duration-500",
                    priceFlash === "up" ? "text-figma-green" : priceFlash === "down" ? "text-red-400" : "text-figma-white",
                  ].join(" ")}
                >
                  {token.price?.marketCapMon.toFixed(0)} MON
                </div>
              </div>
            </div>

            {/* Volume / trade stats */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs border-t border-figma-surface pt-3 mb-2">
              <div>
                <div className="text-figma-muted text-[9px] uppercase tracking-wide mb-0.5">TXNS</div>
                <div className="text-figma-white font-semibold">{token.buyCount + token.sellCount}</div>
              </div>
              <div>
                <div className="text-figma-green text-[9px] uppercase tracking-wide mb-0.5">BUYS</div>
                <div className="text-figma-green font-semibold">{token.buyCount}</div>
              </div>
              <div>
                <div className="text-red-400 text-[9px] uppercase tracking-wide mb-0.5">SELLS</div>
                <div className="text-red-400 font-semibold">{token.sellCount}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs border-t border-figma-surface pt-2">
              <div>
                <div className="text-figma-muted text-[9px] uppercase tracking-wide mb-0.5">VOLUME</div>
                <div className="text-figma-white font-semibold">{formatVol(volumeMon)}</div>
              </div>
              <div>
                <div className="text-figma-green text-[9px] uppercase tracking-wide mb-0.5">BUY VOL</div>
                <div className="text-figma-green font-semibold">{formatVol(buyVolMon)}</div>
              </div>
              <div>
                <div className="text-red-400 text-[9px] uppercase tracking-wide mb-0.5">SELL VOL</div>
                <div className="text-red-400 font-semibold">{formatVol(sellVolMon)}</div>
              </div>
            </div>

            {/* Launched */}
            <div className="mt-3 pt-2 border-t border-figma-surface text-[10px] text-figma-muted flex justify-between">
              <span>Launched {formatTimeAgo(token.createdAt)} ago</span>
              <span>{token.uniqueBuyerCount} unique buyers</span>
            </div>
          </div>

          {/* Prediction Market */}
          {market && (
            <div className="rounded-xl border border-figma-card bg-figma-card p-4">
              <button
                onClick={() => setShowBetForm((v) => !v)}
                className="w-full flex items-center justify-between mb-3 group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-figma-white">Prediction Market</span>
                  {/* Status badge */}
                  <span
                    className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded font-semibold",
                      market.cancelled
                        ? "bg-figma-muted/20 text-figma-muted"
                        : market.resolved
                          ? market.outcome
                            ? "bg-figma-green/20 text-figma-green-soft"
                            : "bg-red-500/20 text-red-400"
                          : "bg-figma-green/20 text-figma-green-soft"
                    )}
                  >
                    {market.cancelled
                      ? "Cancelled"
                      : market.resolved
                        ? market.outcome
                          ? "Graduated"
                          : "Didn't"
                        : "Active"}
                  </span>
                </div>
                <span className="text-[10px] text-figma-muted group-hover:text-figma-white transition-colors">
                  {showBetForm ? "▲ Hide" : "▼ Show"}
                </span>
              </button>

              <div className="mb-2">
                <div className="flex justify-between text-[10px] text-figma-muted mb-1">
                  <span className="text-figma-green font-semibold">YES {market.odds.yesOdds.toFixed(0)}%</span>
                  <span className="text-red-400 font-semibold">NO {market.odds.noOdds.toFixed(0)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-red-500/20 overflow-hidden">
                  <div className="h-full rounded-full bg-figma-green/60 transition-all" style={{ width: `${market.odds.yesOdds}%` }} />
                </div>
              </div>
              <div className="text-[10px] text-figma-muted mb-2">
                Pool: {(Number(market.totalYesMON + market.totalNoMON) / 1e18).toFixed(2)} MON
                {!market.resolved && !market.cancelled && Number(market.closeTime) > 0 && (
                  <span className="ml-2">
                    · {(() => {
                      const secondsLeft = Number(market.closeTime) - nowSec;
                      if (secondsLeft <= 0) return "Betting closed";
                      return `Closes in ${Math.floor(secondsLeft / 3600)}h ${Math.floor((secondsLeft % 3600) / 60)}m`;
                    })()}
                  </span>
                )}
                {market.resolved && (
                  <span className="ml-2 text-figma-green-soft">
                    · {market.outcome ? "Graduated ✅" : "Didn't graduate ❌"}
                  </span>
                )}
              </div>

              {showBetForm && (
                <div className="border-t border-figma-surface pt-3">
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
                    tokenSymbol={tokenSymbol}
                    tokenPrice={token?.price?.monPerToken}
                    tokenMarketCap={token?.price?.marketCapMon}
                    tokenProgress={token?.progress}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fee Overview Modal */}
      {showFeeOverview && (
        <FeeOverviewModal
          tokenId={tokenId}
          tokenSymbol={displaySymbol}
          monUsdPrice={monUsdPrice}
          onClose={() => setShowFeeOverview(false)}
        />
      )}
    </div>
  );
}