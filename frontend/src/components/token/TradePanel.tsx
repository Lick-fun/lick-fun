"use client";

import { useState } from "react";
import { useAccount, useBalance, useReadContract, useWriteContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseEther, formatEther } from "viem";
import { cn } from "@/lib/utils";
import { useBuyToken, useSellToken, ERC20ABI } from "@/lib/wagmi/contracts";
import { Loader2, AlertCircle, Wallet } from "lucide-react";

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
  curveAddress,
}: TradePanelProps) {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [sellStep, setSellStep] = useState<"idle" | "approving" | "selling">("idle");

  /* ── Balances ── */
  const { data: monBalance } = useBalance({
    address,
    query: { enabled: !!address },
  });

  const { data: tokenBalanceRaw } = useReadContract({
    address: tokenId as `0x${string}`,
    abi: ERC20ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!tokenId },
  });
  const tokenBalance = (tokenBalanceRaw as bigint) ?? 0n;

  /* ── Approve write (for sell flow) ── */
  const { writeContractAsync: approveAsync } = useWriteContract();

  /* ── Trade hooks ── */
  const { buy, isPending: isBuying } = useBuyToken();
  const { sell, isPending: isSelling } = useSellToken();

  const amountNum = parseFloat(amount) || 0;

  /* Fee breakdown: 2% total (1% protocol + 1% creator) */
  const feePercent = 2;
  const feeAmount = (amountNum * feePercent) / 100;
  const netAmount = amountNum - feeAmount;

  const estimatedTokens =
    tab === "buy" && monPerToken > 0 && netAmount > 0
      ? netAmount / monPerToken
      : 0;

  const estimatedMon =
    tab === "sell" && monPerToken > 0 && amountNum > 0
      ? amountNum * monPerToken * 0.98
      : 0;

  const slippage = 1;

  const isLoading = isBuying || isSelling || sellStep !== "idle";

  const canTrade =
    isConnected &&
    !!curveAddress &&
    amountNum > 0 &&
    !isLoading;

  /* ── Formatted balance strings ── */
  const monBalanceNum = monBalance ? Number(formatEther(monBalance.value)) : 0;
  const tokenBalanceNum = Number(tokenBalance) / 1e18;

  function handleMax() {
    if (tab === "buy") {
      // Leave a small buffer for gas
      const maxMon = Math.max(0, monBalanceNum - 0.01);
      setAmount(maxMon > 0 ? maxMon.toFixed(4) : "");
    } else {
      setAmount(tokenBalanceNum > 0 ? tokenBalanceNum.toFixed(2) : "");
    }
  }

  async function handleTrade() {
    if (!curveAddress || amountNum <= 0) return;
    try {
      if (tab === "buy") {
        await buy(
          curveAddress as `0x${string}`,
          parseEther(amount),
          0n /* minTokensOut */
        );
      } else {
        /* Sell: approve first, then sell */
        const tokensInWei = parseEther(amount);

        setSellStep("approving");
        await approveAsync({
          address: tokenId as `0x${string}`,
          abi: ERC20ABI,
          functionName: "approve",
          args: [curveAddress as `0x${string}`, tokensInWei],
        });

        setSellStep("selling");
        await sell(
          curveAddress as `0x${string}`,
          tokensInWei,
          0n /* minMonOut */
        );

        setSellStep("idle");
      }
    } catch {
      setSellStep("idle");
      // errors surface via wagmi's onError handler in providers
    }
  }

  /* ── Button label ── */
  function buttonLabel() {
    if (sellStep === "approving") return (
      <><Loader2 className="w-4 h-4 animate-spin" /> Approving {tokenSymbol}...</>
    );
    if (sellStep === "selling" || isSelling) return (
      <><Loader2 className="w-4 h-4 animate-spin" /> Selling...</>
    );
    if (isBuying) return (
      <><Loader2 className="w-4 h-4 animate-spin" /> Buying...</>
    );
    return <>{tab === "buy" ? "Buy" : "Sell"} {tokenSymbol}</>;
  }

  return (
    <div className="rounded-card border border-figma-card bg-figma-card p-5">
      <h3 className="text-figma-md text-figma-white font-semibold mb-4">
        Trade {tokenSymbol}
      </h3>

      {/* Buy/Sell Tabs */}
      <div className="flex rounded-pill bg-figma-surface p-1 mb-4">
        <button
          onClick={() => { setTab("buy"); setAmount(""); }}
          className={cn(
            "flex-1 py-2 rounded-pill text-figma-sm font-medium transition-all",
            tab === "buy"
              ? "bg-figma-green/20 text-figma-green"
              : "text-figma-muted hover:text-figma-white"
          )}
        >
          Buy
        </button>
        <button
          onClick={() => { setTab("sell"); setAmount(""); }}
          className={cn(
            "flex-1 py-2 rounded-pill text-figma-sm font-medium transition-all",
            tab === "sell"
              ? "bg-figma-red/20 text-figma-red-soft"
              : "text-figma-muted hover:text-figma-white"
          )}
        >
          Sell
        </button>
      </div>

      {/* Disconnected state — show connect button instead of input */}
      {!isConnected ? (
        <div className="text-center py-6">
          <p className="text-figma-sm text-figma-muted mb-4">
            Connect your wallet to trade
          </p>
          <ConnectButton />
        </div>
      ) : !curveAddress ? (
        /* No curve address yet (token not deployed) */
        <div className="flex items-center gap-2 rounded-pill border border-figma-red/40 bg-figma-red/10 p-4">
          <AlertCircle className="w-4 h-4 text-figma-red shrink-0" />
          <p className="text-figma-sm text-figma-red">
            Curve address unavailable for this token
          </p>
        </div>
      ) : (
        <>
          {/* Wallet Balances */}
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-1.5 text-figma-xs text-figma-muted">
              <Wallet className="w-3.5 h-3.5" />
              <span>
                {tab === "buy"
                  ? `${monBalanceNum.toFixed(4)} MON`
                  : `${tokenBalanceNum >= 1_000_000
                      ? `${(tokenBalanceNum / 1_000_000).toFixed(2)}M`
                      : tokenBalanceNum >= 1_000
                      ? `${(tokenBalanceNum / 1_000).toFixed(2)}K`
                      : tokenBalanceNum.toFixed(2)
                    } ${tokenSymbol}`
                }
              </span>
            </div>
            <button
              onClick={handleMax}
              disabled={isLoading}
              className="text-figma-xs text-figma-green hover:text-figma-green/80 font-semibold transition-colors disabled:opacity-50"
            >
              MAX
            </button>
          </div>

          {/* Input */}
          <div className="mb-3">
            <label className="text-figma-xs text-figma-muted mb-1 block">
              {tab === "buy" ? "MON to spend" : "Tokens to sell"}
            </label>
            <div className="relative">
              <input
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-pill border border-figma-surface bg-figma-bg text-figma-white text-figma-lg font-mono placeholder:text-figma-muted focus:outline-none focus:border-figma-green transition-colors disabled:opacity-50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-figma-sm text-figma-muted">
                {tab === "buy" ? "MON" : tokenSymbol}
              </span>
            </div>
          </div>

          {/* Output Preview */}
          {amountNum > 0 && (
            <div className="rounded-pill bg-figma-surface p-4 mb-4 space-y-2 text-figma-sm">
              <div className="flex justify-between">
                <span className="text-figma-muted">Current Price</span>
                <span className="font-mono text-figma-white">
                  {monPerToken.toFixed(8)} MON / {tokenSymbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-figma-muted">Fee ({feePercent}%)</span>
                <span className="font-mono text-figma-red-soft">
                  -{feeAmount.toFixed(4)} MON
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-figma-muted">Slippage Tolerance</span>
                <span className="font-mono text-figma-muted">{slippage}%</span>
              </div>
              <div className="border-t border-figma-card-alt pt-2 flex justify-between font-semibold">
                <span className="text-figma-white">You {tab === "buy" ? "receive" : "get"}</span>
                <span className={tab === "buy" ? "text-figma-green" : "text-figma-red-soft"}>
                  {tab === "buy"
                    ? `~${estimatedTokens.toFixed(2)} ${tokenSymbol}`
                    : `~${estimatedMon.toFixed(4)} MON`}
                </span>
              </div>
            </div>
          )}

          {/* Sell step indicator */}
          {tab === "sell" && sellStep !== "idle" && (
            <div className="flex items-center gap-2 rounded-pill bg-figma-surface px-4 py-2 mb-3 text-figma-xs text-figma-muted">
              <span className={cn("w-2 h-2 rounded-full", sellStep === "approving" ? "bg-figma-green animate-pulse" : "bg-figma-surface-alt")} />
              <span className={sellStep === "approving" ? "text-figma-white" : "text-figma-muted"}>1. Approve</span>
              <span className="mx-1">→</span>
              <span className={cn("w-2 h-2 rounded-full", sellStep === "selling" ? "bg-figma-red animate-pulse" : "bg-figma-surface-alt")} />
              <span className={sellStep === "selling" ? "text-figma-white" : "text-figma-muted"}>2. Sell</span>
            </div>
          )}

          {/* Action Button */}
          <button
            disabled={!canTrade}
            onClick={handleTrade}
            className={cn(
              "w-full py-3 rounded-pill font-semibold transition-all flex items-center justify-center gap-2",
              tab === "buy"
                ? "bg-figma-green text-figma-bg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                : "bg-figma-red text-figma-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {buttonLabel()}
          </button>

          <p className="text-[10px] text-figma-muted mt-3 text-center">
            Trades incur 1% protocol fee + 1% creator fee.
            {tab === "sell" && " Selling requires 2 wallet confirmations (approve + sell)."}
          </p>
        </>
      )}
    </div>
  );
}
