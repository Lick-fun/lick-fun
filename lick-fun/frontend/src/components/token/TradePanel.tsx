"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatMon, formatTokens } from "@/lib/hooks/useData";

interface TradePanelProps {
  tokenId: string;
  tokenSymbol: string;
  realMon: bigint;
  soldTokens: bigint;
  monPerToken: number;
  curveAddress?: string;
}

export function TradePanel({
  tokenId,
  tokenSymbol,
  realMon,
  soldTokens,
  monPerToken,
}: TradePanelProps) {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");

  const amountNum = parseFloat(amount) || 0;

  // Fee breakdown: 2% total (1% protocol + 1% creator)
  const feePercent = 2;
  const feeAmount = (amountNum * feePercent) / 100;
  const netAmount = amountNum - feeAmount;

  const estimatedTokens =
    tab === "buy" && monPerToken > 0 && netAmount > 0
      ? netAmount / monPerToken
      : 0;

  const estimatedMon =
    tab === "sell" && monPerToken > 0 && amountNum > 0
      ? amountNum * monPerToken * 0.98 // rough estimation with fees
      : 0;

  const slippage = 1; // 1% slippage tolerance

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-semibold text-foreground mb-4">Trade {tokenSymbol}</h3>

      {/* Buy/Sell Tabs */}
      <div className="flex rounded-lg bg-secondary p-1 mb-4">
        <button
          onClick={() => setTab("buy")}
          className={cn(
            "flex-1 py-2 rounded-md text-sm font-medium transition-all",
            tab === "buy"
              ? "bg-green-500/20 text-green-400"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Buy
        </button>
        <button
          onClick={() => setTab("sell")}
          className={cn(
            "flex-1 py-2 rounded-md text-sm font-medium transition-all",
            tab === "sell"
              ? "bg-red-500/20 text-red-400"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Sell
        </button>
      </div>

      {/* Input */}
      <div className="mb-3">
        <label className="text-xs text-muted-foreground mb-1 block">
          {tab === "buy" ? "MON to spend" : "Tokens to sell"}
        </label>
        <div className="relative">
          <input
            type="number"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-border bg-secondary text-foreground text-lg font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-lick-orange/50 focus:border-lick-orange/30"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {tab === "buy" ? "MON" : tokenSymbol}
          </span>
        </div>
      </div>

      {/* Output Preview */}
      {amountNum > 0 && (
        <div className="rounded-lg bg-secondary p-4 mb-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current Price</span>
            <span className="font-mono">
              {monPerToken.toFixed(8)} MON / {tokenSymbol}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fee ({feePercent}%)</span>
            <span className="font-mono text-red-400">
              -{feeAmount.toFixed(4)} MON
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Slippage Tolerance</span>
            <span className="font-mono">{slippage}%</span>
          </div>
          <div className="border-t border-border pt-2 flex justify-between font-semibold">
            <span>You {tab === "buy" ? "receive" : "get"}</span>
            <span className={tab === "buy" ? "text-green-400" : "text-red-400"}>
              {tab === "buy"
                ? `~${estimatedTokens.toFixed(2)} ${tokenSymbol}`
                : `~${estimatedMon.toFixed(4)} MON`}
            </span>
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        disabled={amountNum <= 0}
        className={cn(
          "w-full py-3 rounded-lg font-semibold transition-all",
          tab === "buy"
            ? "bg-green-500 hover:bg-green-600 text-black disabled:opacity-50 disabled:cursor-not-allowed"
            : "bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {tab === "buy" ? "Buy" : "Sell"} {tokenSymbol}
      </button>

      <p className="text-[10px] text-muted-foreground mt-3 text-center">
        Trades incur 1% protocol fee + 1% creator fee. Connect wallet to trade.
      </p>
    </div>
  );
}