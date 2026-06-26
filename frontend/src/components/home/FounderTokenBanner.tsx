"use client";

import Link from "next/link";
import { TokenAvatar } from "@/components/ui/TokenImage";
import {
  formatMarketCapUsd,
  formatPriceChange,
  formatTxCount,
  formatVolume,
  type DecoratedToken,
} from "@/lib/hooks/useData";
import { useMonUsdPrice } from "@/lib/hooks/useMonUsdPrice";

interface FounderTokenBannerProps {
  /** All tokens from the indexer (already decorated with price/progress) */
  tokens: DecoratedToken[];
  /** 24h price change % for the founder token (live mode only) */
  priceChangePct?: number;
}

function formatMarketCap(mc: number): string {
  if (mc >= 1_000_000) return `$${(mc / 1_000_000).toFixed(2)}M`;
  if (mc >= 1_000) return `$${(mc / 1_000).toFixed(1)}K`;
  return `$${mc.toFixed(0)}`;
}

function formatPriceMon(monPerToken: number): string {
  if (monPerToken === 0) return "0 MON";
  if (monPerToken >= 1) return `${monPerToken.toFixed(4)} MON`;
  if (monPerToken >= 0.001) return `${monPerToken.toFixed(6)} MON`;
  if (monPerToken >= 0.000_001) return `${monPerToken.toFixed(9)} MON`;
  return `${monPerToken.toFixed(12)} MON`;
}

/**
 * Featured "Founder Token" banner — pinned above the "🔥 Trending Now"
 * section on the home page. Reads the address from
 * NEXT_PUBLIC_FOUNDER_TOKEN_ADDRESS.
 *
 * Layout mirrors a trending card (vertical, centred) but spans full width
 * (max-w-[1100px]) so it reads as a featured/pinned slot. All visuals are
 * present in both placeholder and live modes — only the data differs.
 *
 * - If the address is set AND the token is found in the indexer → renders the
 *   live, clickable banner with real data.
 * - Otherwise → renders a muted placeholder with the same layout, ready to be
 *   hooked up at mainnet.
 */
export function FounderTokenBanner({ tokens, priceChangePct }: FounderTokenBannerProps) {
  const address = process.env.NEXT_PUBLIC_FOUNDER_TOKEN_ADDRESS;
  const { data: monUsdPrice } = useMonUsdPrice();

  const token = address
    ? tokens.find((t) => t.id.toLowerCase() === address.toLowerCase())
    : undefined;

  const isPlaceholder = !address || !token;

  // ── Placeholder data (no address set, or token not yet indexed) ─────────
  const displayName = isPlaceholder
    ? "Founder Token"
    : token!.name?.trim() || `${token!.id.slice(0, 6)}…${token!.id.slice(-4)}`;
  const displaySymbol = isPlaceholder ? "FOUNDER" : token!.symbol?.trim() || "???";
  const priceLabel = isPlaceholder
    ? "0.000000 MON"
    : formatPriceMon(token!.price.monPerToken);
  const change = isPlaceholder
    ? { text: "— 0.00%", isPositive: false, isNegative: false }
    : formatPriceChange(priceChangePct);
  const txnsLabel = isPlaceholder
    ? "0 Txns / 0 24h VOL"
    : `${formatTxCount(token!.buyCount, token!.sellCount)} Txns / ${formatVolume(token!.totalBuyVolume, token!.totalSellVolume)} 24h VOL`;
  const mcLabel = isPlaceholder
    ? "MC: $0"
    : `MC: ${formatMarketCapUsd(token!.price.marketCapMon, monUsdPrice)}`;
  const progress = isPlaceholder ? 0 : token!.progress;

  const inner = (
    <div className="flex flex-col items-center gap-[12px] cursor-pointer w-full bg-figma-purple rounded-panel px-[20px] pt-[14px] pb-[14px] relative overflow-hidden">
      {/* Gradient overlay */}
      <div className="absolute inset-0 trending-card-overlay" />

      {/* Token name + ticker */}
      <div className="relative z-10 flex flex-col items-center gap-[2px] w-full">
        <span className="text-figma-xl text-figma-white font-bold text-center truncate w-full">
          {displayName}
        </span>
        <span className="text-figma-sm text-figma-muted font-bold text-center">
          (${displaySymbol})
        </span>
      </div>

      {/* Founder badge */}
      <div className="relative z-10 flex items-center gap-2">
        <span className="text-figma-xs px-2 py-0.5 rounded-pill bg-figma-green/20 text-figma-green font-semibold">
          ⭐ Founder
        </span>
      </div>

      {/* Token avatar (placeholder = locked circle, live = real avatar) */}
      {isPlaceholder ? (
        <div className="relative z-10 flex items-center justify-center w-[120px] h-[120px] rounded-full bg-figma-bg/60 border border-figma-purple/40">
          <span className="text-4xl">🔒</span>
        </div>
      ) : (
        <TokenAvatar
          tokenAddress={token!.id}
          tokenName={displayName}
          size="3xl"
        />
      )}

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
            : "text-figma-muted"
        }`}
      >
        {change.isPositive && "▲ "}
        {change.isNegative && "▼ "}
        {change.text}
      </span>

      {/* TXNS / VOL */}
      <span className="relative z-10 text-figma-sm text-figma-green font-medium text-center">
        {txnsLabel}
      </span>

      {/* MC Row */}
      <div className="relative z-10 flex items-center justify-between w-full">
        <span className="text-figma-lg text-figma-white font-bold">
          {mcLabel}
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
          <span className="text-figma-xs text-figma-white font-bold">{progress.toFixed(0)}%</span>
        </div>
        <div
          className="w-full overflow-hidden"
          style={{ height: "9px", borderRadius: "24px", background: "#1B1B1B" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #6E44D2 0%, #9B6FFF 100%)",
              borderRadius: "24px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>
    </div>
  );

  // ── Placeholder (non-clickable) ─────────────────────────────────────────
  if (isPlaceholder) {
    return (
      <div className="flex justify-center mt-[24px]">
        <div className="w-full max-w-[1100px] border border-figma-purple/50 rounded-panel">
          {inner}
        </div>
      </div>
    );
  }

  // ── Live banner (clickable, links to token page) ────────────────────────
  return (
    <div className="flex justify-center mt-[24px]">
      <Link
        href={`/token/${token!.id}`}
        className="no-underline w-full max-w-[1100px] hover:border-figma-green transition-colors"
      >
        {inner}
      </Link>
    </div>
  );
}