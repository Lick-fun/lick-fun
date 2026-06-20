"use client";

import { useState, FormEvent } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useCreateToken, type FeePresetKey, type DevLockTier } from "@/lib/hooks/useCreateToken";
import { Loader2, CheckCircle2, AlertCircle, Rocket } from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Static option data                                                               */
/* ──────────────────────────────────────────────────────────────────────────────── */

const FEE_PRESETS: { key: FeePresetKey & string; label: string; description: string }[] = [
  {
    key: "DEFAULT",
    label: "Standard",
    description: "Creator fees go directly to your wallet.",
  },
  {
    key: "ECOSYSTEM",
    label: "Ecosystem",
    description: "Creator fees are split via FeeRouter to support the ecosystem.",
  },
];

const DEV_LOCK_TIERS: { key: DevLockTier; label: string; lpLock: string; devVest: string; badge: string }[] = [
  {
    key: "LIGHT",
    label: "Light",
    lpLock: "90 days",
    devVest: "365 days",
    badge: "🌱",
  },
  {
    key: "STANDARD",
    label: "Standard",
    lpLock: "180 days",
    devVest: "180 days",
    badge: "⚡",
  },
  {
    key: "DIAMOND",
    label: "Diamond",
    lpLock: "365 days",
    devVest: "90 days",
    badge: "💎",
  },
];

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Page                                                                             */
/* ──────────────────────────────────────────────────────────────────────────────── */

export default function CreateTokenPage() {
  const { isConnected } = useAccount();

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [preset, setPreset] = useState<FeePresetKey>("DEFAULT");
  const [tier, setTier] = useState<DevLockTier>("LIGHT");

  const { createToken, isPending, isConfirming, isSuccess, tokenAddress, txHash, error, reset } =
    useCreateToken();

  const isLoading = isPending || isConfirming;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !symbol.trim()) return;
    try {
      await createToken({ name: name.trim(), symbol: symbol.trim().toUpperCase(), preset, tier });
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
            You need a connected wallet to deploy a token. Creation costs{" "}
            <span className="text-foreground font-medium">10 MON</span>.
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
          Launch your token on the Lick.fun bonding curve. Costs{" "}
          <span className="text-foreground font-medium">10 MON</span>.
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

        {/* Fee Preset Card */}
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Fee Preset
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {FEE_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPreset(p.key)}
                disabled={isLoading}
                className={cn(
                  "flex flex-col gap-1 p-4 rounded-lg border text-left transition-all disabled:opacity-50",
                  preset === p.key
                    ? "border-lick-orange bg-lick-orange/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-lick-orange/40 hover:text-foreground"
                )}
              >
                <span className="font-semibold text-sm">{p.label}</span>
                <span className="text-xs leading-snug">{p.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dev Lock Tier Card */}
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Dev Lock Tier
            </h2>
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              Informational
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {DEV_LOCK_TIERS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTier(t.key)}
                disabled={isLoading}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-lg border text-center transition-all disabled:opacity-50",
                  tier === t.key
                    ? "border-lick-orange bg-lick-orange/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-lick-orange/40 hover:text-foreground"
                )}
              >
                <span className="text-2xl">{t.badge}</span>
                <span className="font-semibold text-sm">{t.label}</span>
                <div className="text-xs leading-snug space-y-0.5">
                  <p>LP lock: {t.lpLock}</p>
                  <p>Dev vest: {t.devVest}</p>
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Dev lock tier selection is coming soon. All tokens currently use Light tier vesting.
          </p>
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
              Create Token — 10 MON
            </>
          )}
        </button>
      </form>
    </div>
  );
}
