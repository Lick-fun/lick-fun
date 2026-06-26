"use client";

import Link from "next/link";
import { TokenAvatar } from "@/components/ui/TokenImage";
import type { DecoratedToken } from "@/lib/hooks/useData";
import { useMonUsdPrice } from "@/lib/hooks/useMonUsdPrice";

interface FounderTokenBannerProps {
  /** All tokens from the indexer (already decorated with price/progress) */
  tokens: DecoratedToken[];
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
 * Featured "Founder Token" banner — pinned between the trending section and
 * the sort/filter bar on the home page. Reads the address from
 * NEXT_PUBLIC_FOUNDER_TOKEN_ADDRESS. If unset or the token isn't found, renders
 * nothing.
 */
export function FounderTokenBanner({ tokens }: FounderTokenBannerProps) {
  const address = process.env.NEXT_PUBLIC_FOUNDER_TOKEN_ADDRESS;
  const { data: monUsdPrice } = useMonUsdPrice();

  if (!address) return null;

  const token = tokens.find(
    (t) => t.id.toLowerCase() === address.toLowerCase()
  );
  if (!token) return null;

  const mcUsd =
    monUsdPrice != null ? token.price.marketCapMon * monUsdPrice : null;

  return (
    <div className="flex justify-center mt-[24px]">
      <Link
        href={`/token/${token.id}`}
        className="no-underline w-full max-w-[1100px]"
      >
        <div className="flex items-center gap-4 px-6 py-4 rounded-panel bg-gradient-to-r from-figma-purple/40 via-figma-purple/20 to-figma-purple/40 border border-figma-purple cursor-pointer hover:border-figma-green transition-colors">
          {/* Avatar */}
          <TokenAvatar
            tokenAddress={token.id}
            tokenName={token.name}
            size="lg"
          />

          {/* Name + symbol */}
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-figma-xl text-figma-white font-bold truncate">
                {token.name?.trim() || `${token.id.slice(0, 6)}…${token.id.slice(-4)}`}
              </span>
              <span className="text-figma-sm text-figma-muted font-medium">
                ${token.symbol?.trim() || "???"}
              </span>
              <span className="text-figma-xs px-2 py-0.5 rounded-pill bg-figma-green/20 text-figma-green font-semibold">
                ⭐ Founder
              </span>
            </div>
            <span className="text-figma-sm text-figma-muted font-medium">
              {formatPriceMon(token.price.monPerToken)}
              {mcUsd != null && (
                <span className="ml-2 text-figma-white">
                  MC: {formatMarketCap(mcUsd)}
                </span>
              )}
            </span>
          </div>

          {/* CTA */}
          <div className="flex items-center justify-center h-[36px] px-5 rounded-pill bg-figma-green text-figma-bg font-semibold shrink-0">
            Trade
          </div>
        </div>
      </Link>
    </div>
  );
}