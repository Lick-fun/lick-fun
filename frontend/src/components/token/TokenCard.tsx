"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatMon, formatTokens, formatTimeAgo, formatAddress } from "@/lib/hooks/useData";
import { GraduationCap, Clock, TrendingUp } from "lucide-react";

interface TokenCardProps {
  token: {
    id: string;
    name: string;
    symbol: string;
    creator: string;
    realMon: bigint;
    soldTokens: bigint;
    graduated: boolean;
    createdAt: bigint;
    progress: number;
    price: { monPerToken: number; marketCapMon: number };
    buyCount: number;
  };
}

export function TokenCard({ token }: TokenCardProps) {
  return (
    <Link
      href={`/token/${token.id}`}
      className="block rounded-xl border border-border bg-card p-5 card-hover group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-foreground group-hover:text-lick-orange-light transition-colors">
            {token.name}
          </h3>
          <p className="text-xs text-muted-foreground font-mono">${token.symbol}</p>
        </div>
        {token.graduated ? (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium">
            <GraduationCap className="w-3 h-3" />
            Graduated
          </span>
        ) : (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-lick-orange/10 border border-lick-orange/20 text-lick-orange-light text-xs font-medium">
            <TrendingUp className="w-3 h-3" />
            Live
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
          <span>{token.progress.toFixed(1)}% to graduate</span>
          <span>{formatMon(token.realMon)} / 100K MON</span>
        </div>
        <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              token.graduated
                ? "bg-green-500"
                : token.progress > 75
                  ? "bg-lick-orange"
                  : "bg-lick-orange/60"
            )}
            style={{ width: `${Math.min(token.progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTimeAgo(token.createdAt)} ago
        </span>
        <span>{token.buyCount} buys</span>
        <span className="text-foreground/70 font-mono">
          {formatAddress(token.creator)}
        </span>
      </div>
    </Link>
  );
}