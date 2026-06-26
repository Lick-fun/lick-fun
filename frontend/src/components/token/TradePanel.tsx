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
  realMon?: bigint;
  soldTokens?: bigint;
  monPerToken: number;
  curveAddress?: string;
}

export function TradePanel({
  tokenId,
  tokenSymbol,
  realMon: _realMon,
  soldTokens: _soldTokens,
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

  const [slippage, setSlippage] = useState(10); // default 10%
  const [slippageOpen, setSlippageOpen] = useState(false);
  const [slippageCustom, setSlippageCustom] = useState("");

  const isLoading = isBuying || isSelling || sellStep !== "idle";

  const canTrade =
    isConnected &&
    !!curveAddress &&
    amountNum > 0 &&
    !isLoading;

  /* ── Formatted balance strings ── */
  const monBalanceNum = monBalance ? Number(formatEther(monBalance.value)) : 0;
  // Display-only: safe to round for UI, never used in transactions.
  const tokenBalanceNum = Number(tokenBalance) / 1e18;

  function handleMax() {
    if (tab === "buy") {
      // Leave a small buffer for gas
      const maxMon = Math.max(0, monBalanceNum - 0.01);
      setAmount(maxMon > 0 ? maxMon.toFixed(4) : "");
    } else {
      // Use formatEther to preserve full wei precision — never round-trip through float.
      // Float rounding (e.g. 262779.949999... → "262779.95") can produce 1 wei MORE than
      // the actual balance, causing transferFrom to revert in BondingCurve.sell().
      setAmount(tokenBalance > 0n ? formatEther(tokenBalance) : "");
    }
  }

  async function handleTrade() {
    if (!curveAddress || amountNum <= 0) return;
    try {
      // Apply slippage tolerance to minimum output
      const slippageMultiplier = (100 - slippage) / 100;
      if (tab === "buy") {
        // For buy: minTokensOut = estimatedTokens * (1 - slippage)
        const minTokensOut = estimatedTokens > 0
          ? parseEther((estimatedTokens * slippageMultiplier).toFixed(18))
          : 0n;
        await buy(
          curveAddress as `0x${string}`,
          parseEther(amount),
          minTokensOut
        );
      } else {
        /* Sell: approve first, then sell */
        const tokensInWei = parseEther(amount);

        // For sell: minMonOut = estimatedMon * (1 - slippage)
        const minMonOut = estimatedMon > 0
          ? parseEther((estimatedMon * slippageMultiplier).toFixed(18))
          : 0n;

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
          minMonOut
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

  /* Quick-select amounts (MON for buy, tokens for sell) */
  const BUY_PRESETS = [50, 500, 2000, 5000];

  return (
    <div className="rounded-xl border border-figma-card bg-figma-card overflow-hidden">
      {/* Buy / Sell toggle — full-width, prominent */}
      <div className="grid grid-cols-2">
        <button
          onClick={() => { setTab("buy"); setAmount(""); }}
          className={cn(
            "py-3 text-sm font-bold transition-all",
            tab === "buy"
              ? "bg-figma-green text-black"
              : "bg-figma-surface text-figma-muted hover:text-figma-white"
          )}
        >
          Buy
        </button>
        <button
          onClick={() => { setTab("sell"); setAmount(""); }}
          className={cn(
            "py-3 text-sm font-bold transition-all",
            tab === "sell"
              ? "bg-red-500 text-white"
              : "bg-figma-surface text-figma-muted hover:text-figma-white"
          )}
        >
          Sell
        </button>
      </div>

      <div className="p-4">
        {/* Balance */}
        {isConnected && (
          <div className="flex items-center justify-between mb-2 text-xs">
            <div className="flex items-center gap-1 text-figma-muted">
              <Wallet className="w-3 h-3" />
              <span>Balance:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-figma-white font-mono">
                {tab === "buy"
                  ? `${monBalanceNum.toFixed(2)} MON`
                  : `${tokenBalanceNum >= 1_000_000
                      ? `${(tokenBalanceNum / 1_000_000).toFixed(2)}M`
                      : tokenBalanceNum >= 1_000
                      ? `${(tokenBalanceNum / 1_000).toFixed(2)}K`
                      : tokenBalanceNum.toFixed(2)
                    } ${tokenSymbol}`
                }
              </span>
            </div>
          </div>
        )}

        {/* Amount input */}
        <div className="relative mb-3">
          <input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isLoading || !isConnected}
            className="w-full px-4 py-3 rounded-lg border border-figma-surface bg-figma-bg text-figma-white text-base font-mono placeholder:text-figma-muted focus:outline-none focus:border-figma-green transition-colors disabled:opacity-60"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button
              onClick={handleMax}
              disabled={isLoading || !isConnected}
              className="text-[10px] text-figma-green hover:text-figma-green/80 font-bold transition-colors disabled:opacity-50"
            >
              MAX
            </button>
            <span className="text-xs text-figma-muted font-mono">
              {tab === "buy" ? "MON" : tokenSymbol}
            </span>
          </div>
        </div>

        {/* Quick-select presets (buy only) */}
        {tab === "buy" && (
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {BUY_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setAmount(String(preset))}
                disabled={isLoading || !isConnected}
                className={cn(
                  "py-1.5 rounded text-xs font-semibold border transition-all disabled:opacity-50",
                  amount === String(preset)
                    ? "border-figma-green bg-figma-green/10 text-figma-green"
                    : "border-figma-surface bg-figma-surface text-figma-muted hover:text-figma-white hover:border-figma-surface/80"
                )}
              >
                {preset >= 1000 ? `${preset / 1000}K` : preset}
              </button>
            ))}
          </div>
        )}

        {/* Expected / preview */}
        {amountNum > 0 && isConnected && (
          <div className="rounded-lg bg-figma-surface px-3 py-2 mb-3 space-y-1 text-xs">
            <div className="flex justify-between text-figma-muted">
              <span>Expected</span>
              <span className="font-mono text-figma-white">
                {tab === "buy"
                  ? `${estimatedTokens.toFixed(0)} ${tokenSymbol}`
                  : `${estimatedMon.toFixed(4)} MON`}
              </span>
            </div>
            <div className="flex justify-between items-center text-figma-muted">
              <span>Slippage</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSlippageOpen(!slippageOpen)}
                  className="text-figma-green hover:opacity-80 font-mono font-semibold transition-opacity"
                >
                  {slippage}%
                </button>
                {slippageOpen && (
                  <div className="absolute right-0 top-full mt-1 z-10 rounded-lg border border-figma-surface bg-figma-card p-2 shadow-lg min-w-[140px]">
                    <div className="flex gap-1 mb-2">
                      {[1, 5, 10].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setSlippage(preset);
                            setSlippageOpen(false);
                          }}
                          className={cn(
                            "flex-1 py-1 rounded text-xs font-semibold transition-all",
                            slippage === preset
                              ? "bg-figma-green text-black"
                              : "bg-figma-surface text-figma-muted hover:text-figma-white"
                          )}
                        >
                          {preset}%
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder="Custom"
                        value={slippageCustom}
                        onChange={(e) => setSlippageCustom(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const val = parseFloat(slippageCustom);
                            if (Number.isFinite(val) && val > 0 && val <= 50) {
                              setSlippage(val);
                              setSlippageOpen(false);
                              setSlippageCustom("");
                            }
                          }
                        }}
                        className="flex-1 px-2 py-1 rounded bg-figma-bg border border-figma-surface text-figma-white text-xs font-mono placeholder:text-figma-muted focus:outline-none focus:border-figma-green"
                      />
                      <span className="text-xs text-figma-muted">%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sell step indicator */}
        {tab === "sell" && sellStep !== "idle" && (
          <div className="flex items-center gap-2 rounded-lg bg-figma-surface px-3 py-2 mb-3 text-xs text-figma-muted">
            <span className={cn("w-1.5 h-1.5 rounded-full", sellStep === "approving" ? "bg-figma-green animate-pulse" : "bg-figma-surface")} />
            <span className={sellStep === "approving" ? "text-figma-white" : "text-figma-muted"}>1. Approve</span>
            <span className="mx-1">→</span>
            <span className={cn("w-1.5 h-1.5 rounded-full", sellStep === "selling" ? "bg-red-500 animate-pulse" : "bg-figma-surface")} />
            <span className={sellStep === "selling" ? "text-figma-white" : "text-figma-muted"}>2. Sell</span>
          </div>
        )}

        {/* Action button / connect wallet */}
        {!isConnected ? (
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        ) : !curveAddress ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-xs text-red-400">Curve address unavailable</p>
          </div>
        ) : (
          <button
            disabled={!canTrade}
            onClick={handleTrade}
            className={cn(
              "w-full py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2",
              tab === "buy"
                ? "bg-figma-green text-black hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                : "bg-red-500 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {buttonLabel()}
          </button>
        )}

        <p className="text-[10px] text-figma-muted mt-2 text-center">
          2% fee · {tab === "sell" ? "2 tx (approve + sell)" : "1 tx"}
        </p>
      </div>
    </div>
  );
}
