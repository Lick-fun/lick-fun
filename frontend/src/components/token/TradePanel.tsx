"use client";

import { useState } from "react";
import { useAccount, useBalance, useReadContract, useWriteContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseEther, formatEther } from "viem";
import { cn } from "@/lib/utils";
import {
  useBuyToken,
  useSellToken,
  useDexBuy,
  useDexSell,
  useMigrateLiquidity,
  useGetAmountOut,
  usePairReserves,
  getDexAmountOut,
  LICK_ROUTER_ADDRESS,
  ERC20ABI,
} from "@/lib/wagmi/contracts";
import { Loader2, AlertCircle, Wallet, GraduationCap, ArrowRightLeft } from "lucide-react";

interface TradePanelProps {
  tokenId: string;
  tokenSymbol: string;
  realMon?: bigint;
  soldTokens?: bigint;
  monPerToken: number;
  curveAddress?: string;
  /** Whether the bonding curve has graduated. */
  graduated?: boolean;
  /** DEX pair address — set after migrateLiquidity is called. */
  pairAddress?: `0x${string}`;
}

export function TradePanel({
  tokenId,
  tokenSymbol,
  realMon: _realMon,
  soldTokens: _soldTokens,
  monPerToken,
  curveAddress,
  graduated = false,
  pairAddress,
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

  /* ── Write hooks ── */
  const { writeContractAsync: approveAsync } = useWriteContract();
  const { buy, isPending: isBuying } = useBuyToken();
  const { sell, isPending: isSelling } = useSellToken();
  const { dexBuy, isPending: isDexBuying } = useDexBuy();
  const { dexSell, isPending: isDexSelling } = useDexSell();
  const { migrate, isPending: isMigrating } = useMigrateLiquidity();

  /* ── On-chain quotes ── */
  const amountNum = parseFloat(amount) || 0;
  const amountWei = amount ? parseEther(amount) : 0n;

  // Curve: on-chain quote via BondingCurve.getAmountOut (replaces float * 0.98)
  const { data: curveAmountOutRaw } = useGetAmountOut(
    (curveAddress ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
    amountWei,
    tab === "buy"
  );
  const curveAmountOut = (curveAmountOutRaw as bigint) ?? 0n;

  /* ── DEX reserves + quote ── */
  const { reserveWmon, reserveToken, dexPriceMonPerToken } = usePairReserves(
    pairAddress,
    tokenId as `0x${string}`
  );

  const dexAmountOut: bigint =
    graduated && pairAddress && amountWei > 0n
      ? tab === "buy"
        ? getDexAmountOut(amountWei, reserveWmon, reserveToken)
        : getDexAmountOut(amountWei, reserveToken, reserveWmon)
      : 0n;

  /* ── Price + display estimates ── */
  const priceMonPerToken = graduated && pairAddress ? dexPriceMonPerToken : monPerToken;

  const estimatedTokens = graduated && pairAddress
    ? Number(dexAmountOut) / 1e18
    : Number(curveAmountOut) / 1e18;

  const estimatedMon = graduated && pairAddress
    ? Number(dexAmountOut) / 1e18
    : Number(curveAmountOut) / 1e18;

  const [slippage, setSlippage] = useState(10);
  const [slippageOpen, setSlippageOpen] = useState(false);
  const [slippageCustom, setSlippageCustom] = useState("");

  /* ── State flags ── */
  const isLoading =
    isBuying || isSelling || isDexBuying || isDexSelling || isMigrating || sellStep !== "idle";

  // Graduated but pair not yet migrated
  const needsMigration =
    graduated &&
    (!pairAddress ||
      pairAddress === "0x0000000000000000000000000000000000000000" ||
      pairAddress === "0x0000000000000000000000000000000000000001");

  const canTrade =
    isConnected &&
    !needsMigration &&
    (graduated ? !!pairAddress : !!curveAddress) &&
    amountNum > 0 &&
    !isLoading;

  /* ── Formatted balances ── */
  const monBalanceNum = monBalance ? Number(formatEther(monBalance.value)) : 0;
  const tokenBalanceNum = Number(tokenBalance) / 1e18;

  function handleMax() {
    if (tab === "buy") {
      const maxMon = Math.max(0, monBalanceNum - 0.01);
      setAmount(maxMon > 0 ? maxMon.toFixed(4) : "");
    } else {
      // Use formatEther to avoid float rounding that could cause 1-wei revert
      setAmount(tokenBalance > 0n ? formatEther(tokenBalance) : "");
    }
  }

  async function handleMigrate() {
    try {
      await migrate(tokenId as `0x${string}`);
    } catch {
      // surface via wagmi error handling in providers
    }
  }

  async function handleTrade() {
    if (amountNum <= 0) return;
    const slippageMultiplier = (100 - slippage) / 100;
    try {
      if (graduated && pairAddress) {
        /* ── DEX swap path ── */
        if (tab === "buy") {
          const amountOutMin = dexAmountOut > 0n
            ? BigInt(Math.floor(Number(dexAmountOut) * slippageMultiplier))
            : 0n;
          await dexBuy(tokenId as `0x${string}`, amountWei, amountOutMin, address!);
        } else {
          const amountOutMin = dexAmountOut > 0n
            ? BigInt(Math.floor(Number(dexAmountOut) * slippageMultiplier))
            : 0n;
          setSellStep("approving");
          await approveAsync({
            address: tokenId as `0x${string}`,
            abi: ERC20ABI,
            functionName: "approve",
            args: [LICK_ROUTER_ADDRESS, amountWei],
          });
          setSellStep("selling");
          await dexSell(tokenId as `0x${string}`, amountWei, amountOutMin, address!);
          setSellStep("idle");
        }
      } else if (curveAddress) {
        /* ── Curve swap path ── */
        if (tab === "buy") {
          const minTokensOut = curveAmountOut > 0n
            ? BigInt(Math.floor(Number(curveAmountOut) * slippageMultiplier))
            : 0n;
          await buy(curveAddress as `0x${string}`, amountWei, minTokensOut);
        } else {
          const minMonOut = curveAmountOut > 0n
            ? BigInt(Math.floor(Number(curveAmountOut) * slippageMultiplier))
            : 0n;
          setSellStep("approving");
          await approveAsync({
            address: tokenId as `0x${string}`,
            abi: ERC20ABI,
            functionName: "approve",
            args: [curveAddress as `0x${string}`, amountWei],
          });
          setSellStep("selling");
          await sell(curveAddress as `0x${string}`, amountWei, minMonOut);
          setSellStep("idle");
        }
      }
    } catch {
      setSellStep("idle");
    }
  }

  /* ── Button label ── */
  function buttonLabel() {
    if (sellStep === "approving") return (
      <><Loader2 className="w-4 h-4 animate-spin" /> Approving {tokenSymbol}...</>
    );
    if (sellStep === "selling" || isSelling || isDexSelling) return (
      <><Loader2 className="w-4 h-4 animate-spin" /> Selling...</>
    );
    if (isBuying || isDexBuying) return (
      <><Loader2 className="w-4 h-4 animate-spin" /> Buying...</>
    );
    return <>{tab === "buy" ? "Buy" : "Sell"} {tokenSymbol}</>;
  }

  const BUY_PRESETS = [50, 500, 2000, 5000];

  /* ── Graduated but not yet migrated: show migration CTA ── */
  if (needsMigration) {
    return (
      <div className="rounded-xl border border-purple-500/30 bg-figma-card overflow-hidden">
        <div className="p-5 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-purple-400">
            <GraduationCap className="w-5 h-5" />
            <span className="font-bold text-sm">Token Graduated!</span>
          </div>
          <p className="text-xs text-figma-muted leading-relaxed">
            Liquidity is ready to migrate to the DEX. Click below to finalize on-chain
            — this only needs to happen once.
          </p>
          {isConnected ? (
            <button
              onClick={handleMigrate}
              disabled={isMigrating}
              className="w-full py-3 rounded-lg font-bold text-sm bg-purple-500 hover:bg-purple-400 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isMigrating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Migrating...</>
              ) : (
                <><ArrowRightLeft className="w-4 h-4" /> Finalize Graduation</>
              )}
            </button>
          ) : (
            <div className="flex justify-center"><ConnectButton /></div>
          )}
          <p className="text-[10px] text-figma-muted">
            Anyone can trigger migration — it&apos;s permissionless
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-figma-card bg-figma-card overflow-hidden">
      {/* DEX badge when graduated */}
      {graduated && pairAddress && (
        <div className="flex items-center justify-center gap-1.5 py-1.5 bg-purple-500/10 border-b border-purple-500/20">
          <ArrowRightLeft className="w-3 h-3 text-purple-400" />
          <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wide">
            DEX — 0.25% LP fee
          </span>
        </div>
      )}

      {/* Buy / Sell toggle */}
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
            {priceMonPerToken > 0 && (
              <div className="flex justify-between text-figma-muted">
                <span>Price</span>
                <span className="font-mono text-figma-white">
                  {priceMonPerToken < 0.000001
                    ? priceMonPerToken.toExponential(4)
                    : priceMonPerToken.toFixed(8)} MON
                </span>
              </div>
            )}
            <div className="flex justify-between text-figma-muted">
              <span>Expected</span>
              <span className="font-mono text-figma-white">
                {tab === "buy"
                  ? `${estimatedTokens >= 1_000_000
                      ? `${(estimatedTokens / 1_000_000).toFixed(2)}M`
                      : estimatedTokens >= 1_000
                      ? `${(estimatedTokens / 1_000).toFixed(2)}K`
                      : estimatedTokens.toFixed(2)
                    } ${tokenSymbol}`
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
        ) : !curveAddress && !pairAddress ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-xs text-red-400">Trading address unavailable</p>
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
          {graduated && pairAddress
            ? `0.25% DEX fee · ${tab === "sell" ? "2 tx (approve + sell)" : "1 tx"}`
            : `2% fee · ${tab === "sell" ? "2 tx (approve + sell)" : "1 tx"}`}
        </p>
      </div>
    </div>
  );
}
