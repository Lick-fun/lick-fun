"use client";

import { useState, FormEvent, useEffect } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCreateToken } from "@/lib/hooks/useCreateToken";
import { Loader2, CheckCircle2, AlertCircle, Rocket } from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Page                                                                             */
/* ──────────────────────────────────────────────────────────────────────────────── */

export default function CreateTokenPage() {
  const { isConnected } = useAccount();

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");

  const { createToken, isPending, isConfirming, isSuccess, tokenAddress, txHash, error, reset } =
    useCreateToken();

  const router = useRouter();

  // Auto-redirect to the token's live data page once creation is confirmed
  useEffect(() => {
    if (isSuccess && tokenAddress) {
      router.push(`/token/${tokenAddress}`);
    }
  }, [isSuccess, tokenAddress, router]);

  const isLoading = isPending || isConfirming;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !symbol.trim()) return;
    try {
      await createToken({ name: name.trim(), symbol: symbol.trim().toUpperCase() });
    } catch {
      // error is captured in hook state
    }
  };

  /* ── Disconnected state ── */
  if (!isConnected) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Token</h1>
          <p className="text-muted-foreground">
            Launch your token on the Lick.fun bonding curve.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-10 flex flex-col items-center gap-4 text-center">
          <Rocket className="w-12 h-12 text-lick-orange opacity-80" />
          <h2 className="text-xl font-semibold">Connect your wallet to continue</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            You need a connected wallet to deploy a token on the bonding curve.
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  /* ── Success state ── */
  if (isSuccess && tokenAddress) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Token</h1>
          <p className="text-muted-foreground">
            Launch your token on the Lick.fun bonding curve.
          </p>
        </div>
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-10 flex flex-col items-center gap-5 text-center">
          <CheckCircle2 className="w-14 h-14 text-green-400" />
          <div>
            <h2 className="text-2xl font-bold text-green-400 mb-1">Token Created! 🎉</h2>
            <p className="text-sm text-muted-foreground">
              Your token is live on the bonding curve.
            </p>
          </div>
          <div className="w-full rounded-lg border border-border bg-card p-4 text-left">
            <p className="text-xs text-muted-foreground mb-1">Token Address</p>
            <p className="font-mono text-sm text-foreground break-all">{tokenAddress}</p>
          </div>
          {txHash && (
            <div className="w-full rounded-lg border border-border bg-card p-4 text-left">
              <p className="text-xs text-muted-foreground mb-1">Transaction</p>
              <p className="font-mono text-xs text-foreground break-all">{txHash}</p>
            </div>
          )}
          <div className="flex gap-3 w-full">
            <Link
              href={`/token/${tokenAddress}`}
              className="flex-1 py-3 rounded-lg bg-lick-orange text-black font-semibold text-sm text-center hover:bg-lick-orange-light transition-colors"
            >
              View Token →
            </Link>
            <button
              onClick={reset}
              className="flex-1 py-3 rounded-lg border border-border bg-card text-foreground font-semibold text-sm hover:bg-secondary transition-colors"
            >
              Create Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Form state ── */
  return (
    <div className="max-w-lg mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create Token</h1>
        <p className="text-muted-foreground">
          Launch your token on the Lick.fun bonding curve.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Token Details Card */}
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Token Details
          </h2>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="token-name" className="text-sm font-medium text-foreground">
              Token Name
            </label>
            <input
              id="token-name"
              type="text"
              placeholder="e.g. Lick Coin"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              maxLength={64}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-lick-orange/50 focus:border-lick-orange/30 disabled:opacity-50"
            />
          </div>

          {/* Symbol */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="token-symbol" className="text-sm font-medium text-foreground">
              Token Symbol
            </label>
            <input
              id="token-symbol"
              type="text"
              placeholder="e.g. LICK"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              disabled={isLoading}
              maxLength={8}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-lick-orange/50 focus:border-lick-orange/30 disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground">Max 8 characters, auto-uppercased.</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive break-all">
              {error.message.length > 200 ? error.message.slice(0, 200) + "…" : error.message}
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || !name.trim() || !symbol.trim()}
          className={cn(
            "w-full py-3.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2",
            isLoading || !name.trim() || !symbol.trim()
              ? "bg-lick-orange/40 text-black/60 cursor-not-allowed"
              : "bg-lick-orange text-black hover:bg-lick-orange-light active:scale-[0.98]"
          )}
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Confirm in wallet…
            </>
          ) : isConfirming ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Confirming transaction…
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4" />
              Create Token
            </>
          )}
        </button>
      </form>
    </div>
  );
}