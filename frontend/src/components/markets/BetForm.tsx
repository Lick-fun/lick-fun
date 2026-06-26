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
  useResolveMarket,
  useRefundOneSidedMarket,
  useSweepProtocolFee,
  useFeeSwept,
} from "@/lib/wagmi/contracts";
import { Loader2, AlertCircle, Trophy, CheckCircle2, XCircle, Coins } from "lucide-react";

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
  totalYesMON?: bigint;
  totalNoMON?: bigint;
  // Optional token context (price/MC/progress) — populated when caller has
  // access to the decorated TokenEntity. All optional so existing call sites
  // continue to work unchanged.
  tokenSymbol?: string;
  tokenPrice?: number;
  tokenMarketCap?: number;
  tokenProgress?: number;
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
  totalYesMON = 0n,
  totalNoMON = 0n,
  tokenSymbol,
  tokenPrice,
  tokenMarketCap,
  tokenProgress,
}: BetFormProps) {
  const { isConnected } = useAccount();
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { betYes, isPending: isBettingYes } = useBetYes();
  const { betNo, isPending: isBettingNo } = useBetNo();
  const { claim, isPending: isClaiming } = useClaimWinnings();
  const { withdraw, isPending: isWithdrawing } = useWithdrawRefund();
  const { resolve, isPending: isResolving } = useResolveMarket();
  const { refund: cancelMarket, isPending: isCancelling } = useRefundOneSidedMarket();
  const { sweep, isPending: isSweeping } = useSweepProtocolFee();
  const { data: feeAlreadySwept } = useFeeSwept(resolved ? tokenId as `0x${string}` : undefined);

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

  // Resolve / cancel eligibility
  const hasBothSides = totalYesMON > 0n && totalNoMON > 0n;
  const canResolve = !resolved && !cancelled && bettingClosed && hasBothSides;
  // One-sided cancel: 7 days after betting closed, only one side has bets
  const REFUND_DELAY_SEC = 7 * 24 * 3600;
  const canCancelOneSided =
    !resolved &&
    !cancelled &&
    closeSec > 0 &&
    nowSec >= closeSec + REFUND_DELAY_SEC &&
    !hasBothSides &&
    (totalYesMON > 0n || totalNoMON > 0n);

  async function handleResolve() {
    if (!isConnected) return;
    setErrorMsg(null);
    try {
      await resolve(tokenId as `0x${string}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Resolve failed");
    }
  }

  async function handleCancelOneSided() {
    if (!isConnected) return;
    setErrorMsg(null);
    try {
      await cancelMarket(tokenId as `0x${string}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Cancel failed");
    }
  }

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

  async function handleSweep() {
    setErrorMsg(null);
    try {
      await sweep(tokenId as `0x${string}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Sweep failed");
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

        {/* Sweep fee button — resolved markets, fee not yet swept, anyone can call */}
        {resolved && !feeAlreadySwept && (
          <button
            onClick={handleSweep}
            disabled={isSweeping}
            className="w-full mt-3 py-2 rounded-lg font-semibold border border-figma-muted/30 text-figma-muted hover:text-figma-white hover:border-figma-muted/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs"
          >
            {isSweeping ? (
              <><Loader2 className="w-3 h-3 animate-spin" />Sweeping...</>
            ) : (
              <><Coins className="w-3 h-3" />Sweep Protocol Fee</>  
            )}
          </button>
        )}
        {resolved && feeAlreadySwept && (
          <p className="text-xs text-figma-muted text-center mt-3 flex items-center justify-center gap-1">
            <Coins className="w-3 h-3" /> Protocol fee swept
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

      {/* Token context header — only renders when caller passes token data */}
      {(tokenSymbol || tokenPrice !== undefined || tokenMarketCap !== undefined || tokenProgress !== undefined) && (
        <div className="rounded-lg bg-secondary p-3 mb-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-foreground truncate">
                {tokenName}
              </span>
              {tokenSymbol && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-figma-card-alt text-figma-muted shrink-0">
                  ${tokenSymbol}
                </span>
              )}
            </div>
            {tokenPrice !== undefined && (
              <div className="text-right shrink-0">
                <div className="text-sm font-mono text-foreground">
                  {tokenPrice.toFixed(6)} MON
                </div>
                <div className="text-[10px] text-figma-muted">
                  ${(tokenPrice * 0.4).toFixed(6)}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between text-[10px] text-figma-muted">
            {tokenMarketCap !== undefined && (
              <span>
                MC: {tokenMarketCap >= 1000
                  ? `${(tokenMarketCap / 1000).toFixed(2)}K`
                  : tokenMarketCap.toFixed(2)} MON
              </span>
            )}
            {tokenProgress !== undefined && (
              <span className="font-mono">
                {tokenProgress.toFixed(1)}% to graduation
              </span>
            )}
          </div>
          {tokenProgress !== undefined && (
            <div className="w-full h-1.5 rounded-full bg-figma-card-alt overflow-hidden">
              <div
                className="h-full rounded-full bg-figma-green transition-all"
                style={{ width: `${Math.min(100, Math.max(0, tokenProgress))}%` }}
              />
            </div>
          )}
          <p className="text-[10px] text-figma-muted leading-relaxed pt-1">
            Bet whether ${tokenSymbol ?? tokenName} reaches the graduation threshold on the bonding curve.
          </p>
        </div>
      )}

      {/* YES/NO pool split bar — visualizes pool proportions */}
      {(totalYesMON > 0n || totalNoMON > 0n) && (
        <div className="mb-4">
          <div className="flex justify-between text-[10px] text-figma-muted mb-1">
            <span className="text-figma-green font-semibold">
              YES {(Number(totalYesMON) / 1e18).toFixed(2)} MON
            </span>
            <span className="text-red-400 font-semibold">
              NO {(Number(totalNoMON) / 1e18).toFixed(2)} MON
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-red-500/20 overflow-hidden flex">
            <div
              className="h-full bg-figma-green/70 transition-all"
              style={{
                width: `${(() => {
                  const yes = Number(totalYesMON);
                  const no = Number(totalNoMON);
                  const total = yes + no;
                  return total > 0 ? (yes / total) * 100 : 50;
                })()}%`,
              }}
            />
            <div
              className="h-full bg-red-500/70 transition-all"
              style={{
                width: `${(() => {
                  const yes = Number(totalYesMON);
                  const no = Number(totalNoMON);
                  const total = yes + no;
                  return total > 0 ? (no / total) * 100 : 50;
                })()}%`,
              }}
            />
          </div>
        </div>
      )}

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
          <span className="text-muted-foreground">Est. payout</span>
          <span className="font-mono">
            {(() => {
              if (amountNum <= 0) return "—";
              // Parimutuel: winner gets proportional share of losing pool (net 2% fee).
              // NOTE: original stake is NOT returned — payout is gain only.
              const amtWei = BigInt(Math.floor(amountNum * 1e18));
              if (side === "yes" && totalYesMON > 0n) {
                const winnerPool = totalYesMON + amtWei;
                const losingPool = totalNoMON;
                const payout = (amtWei * losingPool * 98n) / (winnerPool * 100n);
                return `~${(Number(payout) / 1e18).toFixed(3)} MON`;
              } else if (side === "no" && totalNoMON > 0n) {
                const winnerPool = totalNoMON + amtWei;
                const losingPool = totalYesMON;
                const payout = (amtWei * losingPool * 98n) / (winnerPool * 100n);
                return `~${(Number(payout) / 1e18).toFixed(3)} MON`;
              }
              return "—";
            })()}
          </span>
        </div>
        <div className="text-[10px] text-figma-muted mt-1.5 leading-relaxed">
          Parimutuel — your stake is not returned. Payout = your share of the losing pool × 98%.
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

      {/* Resolve button — visible to anyone once betting window closes and both sides exist */}
      {canResolve && isConnected && (
        <button
          onClick={handleResolve}
          disabled={isResolving}
          className="w-full mt-3 py-2 rounded-lg font-semibold border border-figma-green/40 text-figma-green hover:bg-figma-green/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
        >
          {isResolving ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Resolving...</>
          ) : (
            <><CheckCircle2 className="w-4 h-4" />Resolve Market</>
          )}
        </button>
      )}

      {/* Cancel one-sided market — visible after 7-day delay with one side only */}
      {canCancelOneSided && isConnected && (
        <button
          onClick={handleCancelOneSided}
          disabled={isCancelling}
          className="w-full mt-3 py-2 rounded-lg font-semibold border border-figma-red/40 text-figma-red-soft hover:bg-figma-red/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
        >
          {isCancelling ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Cancelling...</>
          ) : (
            <><XCircle className="w-4 h-4" />Cancel One-Sided Market</>
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