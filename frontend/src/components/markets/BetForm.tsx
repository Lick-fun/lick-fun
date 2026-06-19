"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface BetFormProps {
  tokenName: string;
  tokenId: string;
  yesOdds: number;
  noOdds: number;
  resolved: boolean;
  userYesBet: bigint;
  userNoBet: bigint;
  claimed: boolean;
}

export function BetForm({
  tokenName,
  yesOdds,
  noOdds,
  resolved,
  userYesBet,
  userNoBet,
}: BetFormProps) {
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("");

  const amountNum = parseFloat(amount) || 0;
  const odds = side === "yes" ? yesOdds : noOdds;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h4 className="font-semibold text-foreground mb-4">
        Place Bet — {tokenName}
      </h4>

      {/* YES/NO Toggle */}
      <div className="flex rounded-lg bg-secondary p-1 mb-4">
        <button
          onClick={() => setSide("yes")}
          className={cn(
            "flex-1 py-2 rounded-md text-sm font-medium transition-all",
            side === "yes"
              ? "bg-green-500/20 text-green-400"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          YES ({yesOdds.toFixed(1)}%)
        </button>
        <button
          onClick={() => setSide("no")}
          className={cn(
            "flex-1 py-2 rounded-md text-sm font-medium transition-all",
            side === "no"
              ? "bg-red-500/20 text-red-400"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          NO ({noOdds.toFixed(1)}%)
        </button>
      </div>

      {/* Amount */}
      <div className="mb-4">
        <label className="text-xs text-muted-foreground mb-1 block">
          MON to bet
        </label>
        <div className="relative">
          <input
            type="number"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={resolved}
            className="w-full px-4 py-3 rounded-lg border border-border bg-secondary text-foreground text-lg font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-lick-orange/50 disabled:opacity-50"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            MON
          </span>
        </div>
      </div>

      {/* odds display */}
      <div className="rounded-lg bg-secondary p-3 mb-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Your side</span>
          <span className={side === "yes" ? "text-green-400" : "text-red-400"}>
            {side.toUpperCase()} — {odds.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-muted-foreground">Potential payout</span>
          <span className="font-mono">
            {amountNum > 0
              ? `${((amountNum * 100) / odds).toFixed(2)} MON`
              : "—"}
          </span>
        </div>
        {userYesBet > 0n && (
          <div className="flex justify-between mt-1 text-amber-400">
            <span>Your YES bet</span>
            <span>{Number(userYesBet) / 1e18} MON</span>
          </div>
        )}
        {userNoBet > 0n && (
          <div className="flex justify-between mt-1 text-amber-400">
            <span>Your NO bet</span>
            <span>{Number(userNoBet) / 1e18} MON</span>
          </div>
        )}
      </div>

      {/* Action */}
      <button
        disabled={resolved || amountNum <= 0}
        className="w-full py-3 rounded-lg font-semibold bg-lick-orange hover:bg-lick-orange-dark text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {resolved ? "Market Closed" : `Bet ${side.toUpperCase()}`}
      </button>
    </div>
  );
}