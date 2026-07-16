"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Globe, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { TokenImage } from "@/components/ui/TokenImage";
import { CreatorBadge } from "@/components/ui/CreatorBadge";
import { formatPriceChange } from "@/lib/hooks/useData";
import { useTokenIpfsMeta } from "@/lib/hooks/useTokenImage";

interface TokenCardProps {
  tokenAddress?: string;
  tokenName: string;
  symbol: string;
  description?: string;
  mc: string;
  percentage: string;
  volume: string;
  txCount: string;
  imageUrl?: string;
  progress?: number;
  isAnimated?: boolean;
  priceMon?: string;
  priceChangePct?: number;
  creator?: string;
}

export function TokenCard({ tokenAddress, tokenName, symbol, description = "Fresh from the meme lake.", mc, percentage, volume, txCount, imageUrl, progress = 0, isAnimated = false, priceMon, priceChangePct, creator }: TokenCardProps) {
  const change = formatPriceChange(priceChangePct);
  const { data: ipfsMeta } = useTokenIpfsMeta(tokenAddress);
  const [priceFlash, setPriceFlash] = useState<"up" | "down" | null>(null);
  const prevPrice = useRef(priceMon);

  useEffect(() => {
    if (prevPrice.current && priceMon && priceMon !== prevPrice.current) {
      setPriceFlash(priceMon > prevPrice.current ? "up" : "down");
      const timer = setTimeout(() => setPriceFlash(null), 800);
      prevPrice.current = priceMon;
      return () => clearTimeout(timer);
    }
    prevPrice.current = priceMon;
  }, [priceMon]);

  return (
    <article className={cn("group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-figma-card p-3.5 transition-all duration-300 hover:-translate-y-1 hover:border-figma-purple/60 hover:shadow-glow-purple", isAnimated ? "border-figma-purple/60 shadow-glow-purple-sm" : "border-figma-purple/15")}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-figma-purple/70 to-transparent" />
      <div className="flex items-start gap-3">
        <div className="relative shrink-0 overflow-hidden rounded-xl ring-1 ring-figma-purple/20 transition-transform group-hover:scale-[1.03]">
          {tokenAddress ? (
            <TokenImage tokenAddress={tokenAddress} tokenName={tokenName} size="lg" directImageUrl={imageUrl} />
          ) : (
            <div className="flex size-[58px] items-center justify-center bg-figma-card-alt text-lg font-black text-figma-purple-soft">{tokenName.slice(0, 2).toUpperCase()}</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-display text-sm font-extrabold text-figma-white">{tokenName}</h3>
              <p className="text-[11px] font-bold uppercase tracking-wide text-figma-purple-soft">${symbol}</p>
            </div>
            <span className={cn("rounded-md px-1.5 py-1 text-[10px] font-extrabold", change.isPositive ? "bg-figma-green/10 text-figma-green" : change.isNegative ? "bg-figma-red/10 text-figma-red-soft" : "bg-figma-surface text-figma-muted")}>
              {change.isPositive ? "+" : ""}{change.text}
            </span>
          </div>
          {creator && <div className="mt-1"><CreatorBadge address={creator} /></div>}
          <p className="mt-1 line-clamp-1 text-[11px] leading-relaxed text-figma-muted">{description}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-figma-purple/10 bg-figma-bg/60 p-2.5">
        <div><p className="text-[9px] font-bold uppercase tracking-wider text-figma-muted">Market cap</p><p className="mt-0.5 text-xs font-extrabold text-figma-white">{mc}</p></div>
        <div className="text-right"><p className="text-[9px] font-bold uppercase tracking-wider text-figma-muted">24h volume</p><p className="mt-0.5 text-xs font-extrabold text-figma-white">{volume}</p></div>
        {priceMon && <div className="col-span-2 flex items-center justify-between border-t border-figma-purple/10 pt-2"><span className="text-[9px] font-bold uppercase tracking-wider text-figma-muted">Price</span><span className={cn("text-[11px] font-bold transition-colors", priceFlash === "up" ? "text-figma-green" : priceFlash === "down" ? "text-figma-red" : "text-figma-white")}>{priceMon}</span></div>}
      </div>

      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold"><span className="text-figma-muted">Bonding curve</span><span className="text-figma-purple-soft">{percentage || `${Math.round(progress)}%`}</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-figma-surface"><div className="h-full rounded-full bg-figma-purple shadow-glow-purple-sm transition-all" style={{ width: `${Math.max(0, Math.min(100, progress))}%`, minWidth: progress > 0 ? 4 : 0 }} /></div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-figma-purple/10 pt-3">
        <span className="text-[10px] font-semibold text-figma-muted">{txCount} txs</span>
        <div className="flex items-center gap-1.5">
          {ipfsMeta?.telegram && <SocialButton label="Telegram" onClick={() => window.open(ipfsMeta.telegram, "_blank", "noopener,noreferrer")}><Send className="size-3" /></SocialButton>}
          {ipfsMeta?.website && <SocialButton label="Website" onClick={() => window.open(ipfsMeta.website, "_blank", "noopener,noreferrer")}><Globe className="size-3" /></SocialButton>}
          <span className="flex size-7 items-center justify-center rounded-lg bg-figma-purple/10 text-figma-purple-soft transition-colors group-hover:bg-figma-purple group-hover:text-figma-white"><ArrowUpRight className="size-3.5" /></span>
        </div>
      </div>
    </article>
  );
}

function SocialButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onClick(); }} className="flex size-7 items-center justify-center rounded-lg bg-figma-surface text-figma-muted transition-colors hover:text-figma-white">{children}</button>;
}

export function TokenCardAnimated(props: TokenCardProps) { return <TokenCard {...props} isAnimated />; }
