"use client";

import { useParams } from "next/navigation";
import { Search, Copy, Check, ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";
import { TokenImage } from "@/components/ui/TokenImage";
import { TierBadge } from "@/components/reputation/TierBadge";
import { ReputationScore } from "@/components/reputation/ReputationScore";
import { BadgeGrid } from "@/components/reputation/BadgeGrid";
import { useProfile, useTokensByCreator, useRecentTrades } from "@/lib/hooks/useData";
import { useReputation } from "@/lib/hooks/useReputation";

function formatMon(amount: bigint): string {
  const mon = Number(amount) / 1e18;
  if (mon >= 1000) return `${(mon / 1000).toFixed(2)}K`;
  if (mon >= 1) return mon.toFixed(2);
  return mon.toFixed(3);
}

function formatAmount(amount: bigint): string {
  const num = Number(amount) / 1e18;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(0);
}

function timeAgo(timestamp: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - Number(timestamp);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ProfilePage() {
  const { address } = useParams<{ address: string }>();
  const addr = (address as string) ?? "";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { data: profile, isLoading: profileLoading } = useProfile(addr);
  const { data: tokens = [], isLoading: tokensLoading } = useTokensByCreator(addr);
  const { data: recentTrades = [] } = useRecentTrades(50);
  const { data: reputation, isLoading: repLoading } = useReputation(addr);

  // Filter trades where this address is the trader
  const userTrades = recentTrades.filter(
    (t) => t.trader.toLowerCase() === addr.toLowerCase()
  ).slice(0, 5);

  const isLoading = profileLoading || tokensLoading || repLoading;

  return (
    <div className="relative bg-figma-bg min-h-screen px-5 pb-20">
      {/* ── Profile Card ── */}
      <div
        className="flex flex-col items-end gap-[18px] mt-8"
        style={{
          width: "709px",
          background: "#000000",
          borderRadius: "34px",
          padding: "26px 37px 25px",
        }}
      >
        {/* Top row: Avatar + Welcome */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-[23px]">
            {/* Avatar */}
            <div className="w-[49px] h-[49px] rounded-full bg-figma-purple flex items-center justify-center text-white font-bold text-lg shrink-0">
              {addr.slice(2, 4).toUpperCase()}
            </div>
            {/* Welcome + Username */}
            <div className="flex flex-col gap-[6px]">
              <span className="text-figma-white font-figma-regular text-figma-13">Welcome Back</span>
              <span className="text-figma-white font-figma-bold text-figma-16">
                @{addr.slice(0, 8)}...
              </span>
            </div>
          </div>

          {/* Tier Badge */}
          {reputation && (
            <TierBadge tier={reputation.tier} size="md" />
          )}
        </div>

        {/* Address + Copy */}
        <div className="flex items-center gap-[10px] w-full">
          <span className="text-figma-muted font-figma-regular text-figma-13">
            {addr.slice(0, 6)}...{addr.slice(-4)}
          </span>
          <button
            onClick={handleCopy}
            className="text-figma-muted hover:text-figma-white transition-colors"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <a
            href={`https://testnet.monadexplorer.com/address/${addr}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-figma-muted hover:text-figma-white transition-colors"
          >
            <ExternalLink size={14} />
          </a>
        </div>

        {/* Reputation Score */}
        {reputation && (
          <div className="w-full pt-2">
            <ReputationScore score={reputation.reputation} />
          </div>
        )}

        {/* Stats Row */}
        <div className="flex items-center justify-between w-full pt-2">
          <div className="flex flex-col gap-[4px]">
            <span className="text-figma-muted font-figma-regular text-figma-11">Tokens</span>
            <span className="text-figma-white font-figma-bold text-figma-16">
              {profile?.tokenCount ?? 0}
            </span>
          </div>
          <div className="flex flex-col gap-[4px]">
            <span className="text-figma-muted font-figma-regular text-figma-11">Graduated</span>
            <span className="text-figma-white font-figma-bold text-figma-16">
              {profile?.graduatedCount ?? 0}
            </span>
          </div>
          <div className="flex flex-col gap-[4px]">
            <span className="text-figma-muted font-figma-regular text-figma-11">Buy Vol</span>
            <span className="text-figma-white font-figma-bold text-figma-16">
              {profile ? formatMon(profile.totalBuyVolume) : "0"} MON
            </span>
          </div>
          <div className="flex flex-col gap-[4px]">
            <span className="text-figma-muted font-figma-regular text-figma-11">Sell Vol</span>
            <span className="text-figma-white font-figma-bold text-figma-16">
              {profile ? formatMon(profile.totalSellVolume) : "0"} MON
            </span>
          </div>
        </div>
      </div>

      {/* ── Badges Section ── */}
      {reputation && reputation.badges.length > 0 && (
        <div className="mt-6" style={{ width: "709px" }}>
          <h2 className="text-figma-white font-figma-bold text-figma-16 mb-3">
            Achievements
          </h2>
          <BadgeGrid earned={reputation.badges} />
        </div>
      )}

      {/* ── Holdings (Tokens Created) ── */}
      <div className="mt-6" style={{ width: "709px" }}>
        <h2 className="text-figma-white font-figma-bold text-figma-16 mb-3">
          Tokens Created
        </h2>
        <div
          className="flex flex-col gap-[10px]"
          style={{
            background: "#000000",
            borderRadius: "24px",
            padding: "20px",
          }}
        >
          {tokensLoading ? (
            <div className="text-figma-muted text-figma-13 py-4 text-center">
              Loading tokens...
            </div>
          ) : tokens.length === 0 ? (
            <div className="text-figma-muted text-figma-13 py-4 text-center">
              No tokens created yet
            </div>
          ) : (
            tokens.slice(0, 6).map((token) => (
              <div
                key={token.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-[12px]">
                  <TokenImage
                    tokenAddress={token.id}
                    tokenName={token.symbol}
                    size="sm"
                  />
                  <div className="flex flex-col">
                    <span className="text-figma-white font-figma-bold text-figma-13">
                      {token.name}
                    </span>
                    <span className="text-figma-muted font-figma-regular text-figma-11">
                      {token.symbol}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-figma-white font-figma-bold text-figma-13">
                    {formatMon(token.realMon)} MON
                  </span>
                  <span className="text-figma-muted font-figma-regular text-figma-11">
                    {token.graduated ? "Graduated" : `${token.buyCount + token.sellCount} trades`}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Recent Transactions ── */}
      <div className="mt-6" style={{ width: "709px" }}>
        <h2 className="text-figma-white font-figma-bold text-figma-16 mb-3">
          Recent Activity
        </h2>
        <div
          className="flex flex-col gap-[10px]"
          style={{
            background: "#000000",
            borderRadius: "24px",
            padding: "20px",
          }}
        >
          {userTrades.length === 0 ? (
            <div className="text-figma-muted text-figma-13 py-4 text-center">
              No recent transactions
            </div>
          ) : (
            userTrades.map((trade) => {
              const token = tokens.find((t) => t.id === trade.token_id);
              return (
                <div
                  key={trade.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-[12px]">
                    {trade.isBuy ? (
                      <TrendingUp size={16} className="text-green-400" />
                    ) : (
                      <TrendingDown size={16} className="text-red-400" />
                    )}
                    <div className="flex flex-col">
                      <span className="text-figma-white font-figma-bold text-figma-13">
                        {trade.isBuy ? "Buy" : "Sell"} {token?.symbol ?? "Token"}
                      </span>
                      <span className="text-figma-muted font-figma-regular text-figma-11">
                        {timeAgo(trade.blockTimestamp)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-figma-white font-figma-bold text-figma-13">
                      {formatAmount(trade.amountIn)} MON
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-figma-muted text-figma-13 mt-4 text-center">
          Loading profile data...
        </div>
      )}
    </div>
  );
}