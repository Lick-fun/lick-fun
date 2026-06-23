"use client";

import { cn } from "@/lib/utils";
import { TokenImage } from "@/components/ui/TokenImage";
import { formatPriceChange } from "@/lib/hooks/useData";

interface TokenCardProps {
  tokenAddress?: string;     // contract address — used for image lookup
  tokenName: string;
  symbol: string;
  description?: string;
  mc: string;
  percentage: string;
  volume: string;
  txCount: string;
  /** @deprecated Pass tokenAddress instead; kept for backwards compat */
  imageUrl?: string;
  progress?: number;
  isAnimated?: boolean;
  /** Live price per token in MON (optional) */
  priceMon?: string;
  /** Optional 24h percentage change number, e.g. +12.34 or -5.67 */
  priceChangePct?: number;
}

export function TokenCard({
  tokenAddress,
  tokenName,
  symbol,
  description = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.",
  mc,
  percentage,
  volume,
  txCount,
  imageUrl,
  progress = 65,
  isAnimated = false,
  priceMon,
  priceChangePct,
}: TokenCardProps) {
  const change = formatPriceChange(priceChangePct);

  return (
    <div
      className={cn(
        "flex flex-col gap-[10px] w-full p-[13px_18px]",
        isAnimated
          ? "border border-figma-purple"
          : "border border-black"
      )}
      style={{
        background: "#000000",
        borderRadius: "12px",
      }}
    >
      {/* Top row: image + name/desc */}
      <div className="flex gap-[15px] items-start">
        {/* Token image */}
        {tokenAddress ? (
          <TokenImage
            tokenAddress={tokenAddress}
            tokenName={tokenName}
            size="lg"
            directImageUrl={imageUrl}
          />
        ) : (
          <div
            className="w-[58px] h-[58px] shrink-0 overflow-hidden"
            style={{ borderRadius: "7px" }}
          >
            <div className="w-full h-full bg-figma-card-alt flex items-center justify-center text-xl font-bold text-white">
              {tokenName.slice(0, 2).toUpperCase()}
            </div>
          </div>
        )}

        {/* Name + Description */}
        <div className="flex flex-col gap-[3px] flex-1 min-w-0">
          <span
            className="text-figma-white font-figma-bold"
            style={{ fontSize: "14px", lineHeight: "1.2" }}
          >
            {tokenName}{" "}
            <span className="text-figma-muted font-figma-bold">(${symbol})</span>
          </span>
          <span
            className="text-figma-muted font-figma-regular truncate"
            style={{ fontSize: "10px", lineHeight: "1.3" }}
          >
            {description}
          </span>
        </div>
      </div>

      {/* Bottom row: metrics + progress */}
      <div className="flex flex-col gap-[5px]">
        {/* Stats row */}
        <div className="flex items-center justify-between w-full">
          {/* Left group: icon + % + MC */}
          <div className="flex items-center gap-[3px]">
            {/* mini icon */}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="5" cy="5" r="4.5" fill={isAnimated ? "#6E44D2" : "#2CC054"} />
            </svg>
            {/* Percentage */}
            <span className="text-figma-purple font-figma-bold" style={{ fontSize: "8px", lineHeight: "10px" }}>
              {percentage}
            </span>
            {/* MC */}
            <span className="text-figma-green font-figma-bold" style={{ fontSize: "8px", lineHeight: "10px" }}>
              MC: <span className="text-figma-white">{mc}</span>
            </span>
          </div>

          {/* Right: Txns / Vol */}
          <span className="text-figma-green font-figma-bold" style={{ fontSize: "8px", lineHeight: "10px" }}>
            {txCount} Txs / {volume} 24h VOL
          </span>
        </div>

        {/* LIVE price + 24h change */}
        {(priceMon || priceChangePct !== undefined) && (
          <div className="flex items-center justify-between w-full mt-[2px]">
            {priceMon ? (
              <span
                className="text-figma-white font-figma-bold"
                style={{ fontSize: "10px", lineHeight: "12px" }}
              >
                {priceMon}
              </span>
            ) : (
              <span />
            )}
            {priceChangePct !== undefined && (
              <span
                className={cn(
                  "font-figma-bold",
                  change.isPositive
                    ? "text-green-400"
                    : change.isNegative
                    ? "text-red-500"
                    : "text-figma-muted"
                )}
                style={{ fontSize: "10px", lineHeight: "12px" }}
              >
                {change.isPositive && "▲ "}
                {change.isNegative && "▼ "}
                {change.text}
              </span>
            )}
          </div>
        )}

        {/* Progress bar */}
        <div
          className="w-full overflow-hidden"
          style={{ height: "9px", borderRadius: "24px", background: "#1B1B1B" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: isAnimated
                ? "linear-gradient(90deg, #6E44D2 0%, #9B6FFF 100%)"
                : "linear-gradient(90deg, #2CC054 0%, #70E000 100%)",
              borderRadius: "24px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/** Animated variant with purple border */
export function TokenCardAnimated(props: TokenCardProps) {
  return <TokenCard {...props} isAnimated />;
}
