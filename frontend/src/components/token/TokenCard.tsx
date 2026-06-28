"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { TokenImage } from "@/components/ui/TokenImage";
import { CreatorBadge } from "@/components/ui/CreatorBadge";
import { formatPriceChange } from "@/lib/hooks/useData";
import { useTokenIpfsMeta } from "@/lib/hooks/useTokenImage";

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
  /** Creator wallet address — shows avatar + name below token name */
  creator?: string;
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
  progress = 0,
  isAnimated = false,
  priceMon,
  priceChangePct,
  creator,
}: TokenCardProps) {
  const change = formatPriceChange(priceChangePct);

  // Fetch IPFS metadata for social links (TG / X / Web) — cached 10 min
  const { data: ipfsMeta } = useTokenIpfsMeta(tokenAddress);

  // Flash green/red when price or MC updates
  const [priceFlash, setPriceFlash] = useState<"up" | "down" | null>(null);
  const prevPriceMon = useRef<string | undefined>(priceMon);
  const prevMc = useRef<string>(mc);

  useEffect(() => {
    if (prevPriceMon.current !== undefined && priceMon !== undefined && priceMon !== prevPriceMon.current) {
      const direction = priceMon > prevPriceMon.current ? "up" : "down";
      setPriceFlash(direction);
      const t = setTimeout(() => setPriceFlash(null), 800);
      prevPriceMon.current = priceMon;
      return () => clearTimeout(t);
    }
    prevPriceMon.current = priceMon;
  }, [priceMon]);

  useEffect(() => {
    if (mc !== prevMc.current) {
      prevMc.current = mc;
    }
  }, [mc]);

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

        {/* Name + Description + Creator + Socials */}
        <div className="flex flex-col gap-[3px] flex-1 min-w-0">
          <span
            className="text-figma-white font-figma-bold"
            style={{ fontSize: "14px", lineHeight: "1.2" }}
          >
            {tokenName}{" "}
            <span className="text-figma-muted font-figma-bold">(${symbol})</span>
          </span>

          {/* Creator badge (avatar + name) */}
          {creator && <CreatorBadge address={creator} />}

          <span
            className="text-figma-muted font-figma-regular truncate"
            style={{ fontSize: "10px", lineHeight: "1.3" }}
          >
            {description}
          </span>

          {/* Social links (TG / X / Web) — icon-only, only renders if any exist */}
          {(ipfsMeta?.telegram || ipfsMeta?.twitter || ipfsMeta?.website) && (
            <div className="flex items-center gap-[4px] mt-[2px]">
              {ipfsMeta.telegram && (
                <a
                  href={ipfsMeta.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Telegram"
                  className="inline-flex items-center justify-center text-figma-muted hover:text-figma-white transition-colors"
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "4px",
                    background: "#1B1B1B",
                  }}
                >
                  <Send style={{ width: "10px", height: "10px" }} />
                </a>
              )}
              {ipfsMeta.twitter && (
                <a
                  href={ipfsMeta.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Twitter / X"
                  className="inline-flex items-center justify-center text-figma-muted hover:text-figma-white transition-colors"
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "4px",
                    background: "#1B1B1B",
                  }}
                >
                  <svg
                    style={{ width: "10px", height: "10px" }}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.26 5.632 5.905-5.632Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              )}
              {ipfsMeta.website && (
                <a
                  href={ipfsMeta.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Website"
                  className="inline-flex items-center justify-center text-figma-muted hover:text-figma-white transition-colors"
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "4px",
                    background: "#1B1B1B",
                  }}
                >
                  <Globe style={{ width: "10px", height: "10px" }} />
                </a>
              )}
            </div>
          )}
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
              <circle cx="5" cy="5" r="4.5" fill="#2CC054" />
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
                className={cn(
                  "font-figma-bold transition-colors duration-300",
                  priceFlash === "up" ? "text-green-400" : priceFlash === "down" ? "text-red-500" : "text-figma-white"
                )}
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
              minWidth: progress > 0 ? "4px" : "0",
              background: "linear-gradient(90deg, #2CC054 0%, #70E000 100%)",
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
