"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseEther } from "viem";
import { cn } from "@/lib/utils";
import {
  useBetYes,
  useBetNo,
  useClaimWinnings,
  useWithdrawRefund,
} from "@/lib/wagmi/contracts";
import { Loader2, AlertCircle, Trophy } from "lucide-react";

interface BetFormProps {
  tokenName: string;
  tokenId: string;
  yesOdds: number;
  noOdds: number;
  resolved: boolean;
  cancelled: boolean;
  outcome: boolean;
  closeTime: bigint;
  userYesBet: bigint;
  userNoBet: bigint;
  claimed: boolean;
}

export function BetForm({
  tokenName,
  tokenId,
  yesOdds,
  noOdds,
  resolved,
  cancelled,
  outcome,
  closeTime,
  userYesBet,
  userNoBet,
  claimed,
}: BetFormProps) {
  const { isConnected } = useAccount();
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { betYes, isPending: isBettingYes } = useBetYes();
  const { betNo, isPending: isBettingNo } = useBetNo();
  const { claim, isPending: isClaiming } = useClaimWinnings();
  const { withdraw, isPending: isWithdrawing } = useWithdrawRefund();

  const isBetting = isBettingYes || isBettingNo;

  const amountNum = parseFloat(amount) || 0;
  const odds = side === "yes" ? yesOdds : noOdds;

  // Live countdown — re-evaluates every second so the betting window closes
  // in real time without requiring a page reload.
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  const closeSec = Number(closeTime);
  const bettingClosed = closeSec > 0 && nowSec >= closeSec;

  // Reset error when inputs change
  useEffect(() => {
    setErrorMsg(null);
  }, [side, amount]);

  // Determine if the connected wallet won
  const userWon =
    resolved &&
    ((outcome && userYesBet > 0n) || (!outcome && userNoBet > 0n));
  const canClaim = userWon && !claimed;

  async function handleBet() {
    if (!isConnected || amountNum <= 0) return;
    setErrorMsg(null);
    try {
      const valueWei = parseEther(amount);
      if (side === "yes") {
        await betYes(tokenId as `0x${string}`, valueWei);
      } else {
        await betNo(tokenId as `0x${string}`, valueWei);
      }
      setAmount("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Bet failed");
    }
  }

  async function handleClaim() {
    if (!isConnected) return;
    setErrorMsg(null);
    try {
      await claim(tokenId as `0x${string}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Claim failed");
    }
  }

  async function handleWithdraw() {
    if (!isConnected) return;
    setErrorMsg(null);
    try {
      await withdraw(tokenId as `0x${string}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Withdraw failed");
    }
  }

  // ── Render: cancelled market ──────────────────────────────────────────────
  if (cancelled) {
    const hasBet = userYesBet > 0n || userNoBet > 0n;
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <h4 className="font-semibold text-foreground mb-4">
          Cancelled Market — {tokenName}
        </h4>
        <p className="text-sm text-muted-foreground mb-4">
          This market was cancelled (one-sided). You can withdraw your original
          stake.
        </p>
        {hasBet ? (
          <button
            onClick={handleWithdraw}
            disabled={!isConnected || isWithdrawing}
            className="w-full py-3 rounded-lg font-semibold bg-figma-amber hover:bg-figma-amber/80 text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isWithdrawing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Withdrawing...
              </>
            ) : (
              `Withdraw ${Number(userYesBet + userNoBet) / 1e18} MON`
            )}
          </button>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-3">
            You have no bet in this market.
          </p>
        )}
        {errorMsg && (
          <p className="text-xs text-red-400 mt-3 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errorMsg}
          </p>
        )}
      </div>
    );
  }

  // ── Render: resolved market ───────────────────────────────────────────────
  if (resolved) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <h4 className="font-semibold text-foreground mb-4">
          Resolved Market — {tokenName}
        </h4>
        <div className="rounded-lg bg-secondary p-3 mb-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Outcome</span>
            <span className={outcome ? "text-green-400" : "text-red-400"}>
              {outcome ? "Graduated (YES wins)" : "Didn't graduate (NO wins)"}
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
          {claimed && (
            <div className="flex justify-between mt-1 text-green-400">
              <span>Status</span>
              <span>Winnings claimed</span>
            </div>
          )}
        </div>

        {!isConnected ? (
          <ConnectButton />
        ) : canClaim ? (
          <button
            onClick={handleClaim}
            disabled={isClaiming}
            className="w-full py-3 rounded-lg font-semibold bg-figma-green hover:bg-figma-green/80 text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isClaiming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Claiming...
              </>
            ) : (
              <>
                <Trophy className="w-4 h-4" />
                Claim Winnings
              </>
            )}
          </button>
        ) : userWon && claimed ? (
          <p className="text-sm text-green-400 text-center py-3">
            Winnings already claimed
          </p>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-3">
            You didn't bet on the winning side.
          </p>
        )}

        {errorMsg && (
          <p className="text-xs text-red-400 mt-3 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errorMsg}
          </p>
        )}
      </div>
    );
  }

  // ── Render: active market ─────────────────────────────────────────────────
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
            disabled={!isConnected || bettingClosed || isBetting}
            className="w-full px-4 py-3 rounded-lg border border-border bg-secondary text-foreground text-lg font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-figma-green/50 disabled:opacity-50"
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
            {amountNum > 0 && odds > 0
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
        {bettingClosed && (
          <div className="flex justify-between mt-1 text-red-400">
            <span>Betting window</span>
            <span>Closed</span>
          </div>
        )}
      </div>

      {/* Action */}
      {!isConnected ? (
        <ConnectButton />
      ) : (
        <button
          onClick={handleBet}
          disabled={bettingClosed || amountNum <= 0 || isBetting}
          className="w-full py-3 rounded-lg font-semibold bg-figma-green hover:bg-figma-green/80 text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isBetting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Confirming...
            </>
          ) : bettingClosed ? (
            "Betting Closed"
          ) : (
            `Bet ${side.toUpperCase()}`
          )}
        </button>
      )}

      {errorMsg && (
        <p className="text-xs text-red-400 mt-3 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {errorMsg}
        </p>
      )}
    </div>
  );
}