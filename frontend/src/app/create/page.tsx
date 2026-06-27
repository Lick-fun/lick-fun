"use client";

import { useState, type FormEvent, useEffect, useRef, useCallback, useMemo } from "react";
import { useAccount, useBalance } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { parseEther, formatEther } from "viem";
import { cn } from "@/lib/utils";
import { useCreateToken } from "@/lib/hooks/useCreateToken";
import {
  FeeConfigSelector,
  type CustomFeeConfig,
} from "@/components/fee/FeeConfigSelector";
import {
  estimateDevBuyTokens,
  formatTokens,
} from "@/lib/wagmi/contracts";
import {
  Loader2, CheckCircle2, AlertCircle, Rocket, ArrowRight,
  Coins, Info, Upload, X, ImageIcon, Link2, TrendingUp, Wallet,
} from "lucide-react";

const MAX_IMAGE_SIZE_MB = 10;
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
];

/** Lightweight URL prefix validators for social links (nad.fun pattern). */
function validateSocial(
  value: string,
  prefix: string,
): string | null {
  if (!value.trim()) return null; // optional
  if (!value.trim().startsWith(prefix)) {
    return `Must start with ${prefix}`;
  }
  return null;
}

export default function CreateTokenPage() {
  const { isConnected, address } = useAccount();
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Social links (optional)
  const [telegram, setTelegram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [website, setWebsite] = useState("");

  // Fee config (custom split — all users)
  const [customFee, setCustomFee] = useState<CustomFeeConfig>({
    burnBps: 1000,
    lpBps: 8000,
    creatorBps: 1000,
    giftBps: 0,
    giftRecipient: "",
  });
  const [feeValid, setFeeValid] = useState(true);

  // Dev purchase (optional creator pre-buy — exempt from anti-sniping)
  const [devBuyAmount, setDevBuyAmount] = useState<string>("");

  const {
    createToken, isPending, isConfirming, isSuccess,
    tokenAddress, txHash, error, reset, uploadStatus, step,
  } = useCreateToken();
  const router = useRouter();

  // Connected wallet's native MON balance (for the dev-purchase row).
  const { data: monBalance } = useBalance({ address });
  const walletMonDisplay = useMemo(() => {
    if (!monBalance) return null;
    const n = Number(formatEther(monBalance.value));
    if (!Number.isFinite(n)) return null;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(2)}k`;
    if (n >= 1) return n.toFixed(3);
    return n.toFixed(4);
  }, [monBalance]);

  // Social link validation
  const telegramError = validateSocial(telegram, "https://t.me/");
  const twitterError = validateSocial(twitter, "https://x.com/");
  const websiteError = validateSocial(website, "https://");
  const socialsValid = !telegramError && !twitterError && !websiteError;

  // Dev buy amount validation (optional — empty string means no dev buy)
  const devBuyTrimmed = devBuyAmount.trim();
  let devBuyError: string | null = null;
  let devBuyMonFloat = 0;
  if (devBuyTrimmed) {
    const n = Number(devBuyTrimmed);
    if (!Number.isFinite(n) || n <= 0) {
      devBuyError = "Enter a positive number, or leave blank to skip";
    } else if (n > 100_000) {
      devBuyError = "Maximum 100,000 MON per dev buy";
    } else {
      devBuyMonFloat = n;
    }
  }
  const devBuyValid = devBuyError === null;

  // Estimated tokens the dev will receive (only meaningful when amount is set)
  const estimatedDevBuyTokens = useMemo(() => {
    if (!devBuyValid || devBuyMonFloat <= 0) return null;
    try {
      return estimateDevBuyTokens(parseEther(devBuyTrimmed));
    } catch {
      return null;
    }
  }, [devBuyValid, devBuyMonFloat, devBuyTrimmed]);

  const handleFeeChange = useCallback(
    (config: CustomFeeConfig, isValid: boolean) => {
      setCustomFee(config);
      setFeeValid(isValid);
    },
    [],
  );

  useEffect(() => {
    if (isSuccess && tokenAddress) {
      router.push(`/token/${tokenAddress}`);
    }
  }, [isSuccess, tokenAddress, router]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const isLoading = isPending || isConfirming || uploadStatus === "uploading";

  const validateAndSetImage = useCallback((file: File) => {
    setImageError(null);
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageError("Unsupported format. Use JPG, PNG, GIF, WebP, or SVG.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      setImageError(`Image must be under ${MAX_IMAGE_SIZE_MB} MB.`);
      return;
    }
    setImageFile(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(file));
  }, [imagePreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetImage(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetImage(file);
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // All required fields present + valid for submission.
  const formComplete =
    !!name.trim() &&
    !!symbol.trim() &&
    !!description.trim() &&
    !!imageFile &&
    socialsValid &&
    feeValid &&
    devBuyValid;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // Enforce all required fields + a token image.
    if (!name.trim() || !symbol.trim() || !description.trim()) return;
    if (!imageFile) {
      setImageError("Token image is required.");
      return;
    }
    if (!socialsValid || !feeValid) return;
    if (!devBuyValid) return;
    try {
      await createToken({
        name: name.trim(),
        symbol: symbol.trim().toUpperCase(),
        description: description.trim(),
        imageFile,
        telegram: telegram.trim() || undefined,
        twitter: twitter.trim() || undefined,
        website: website.trim() || undefined,
        customFeeConfig: customFee,
        devBuyAmountMon: devBuyMonFloat > 0 ? devBuyTrimmed : "",
      });
    } catch (err) {
      console.error("[CreateToken] handleSubmit error:", err);
      // error is captured in hook state and displayed in the UI
    }
  };

  // uploadLabel is reserved for future use
  void uploadStatus;

  /* ── Disconnected ── */
  if (!isConnected) {
    return (
      <div className="max-w-lg mx-auto px-5">
        <div className="mb-8 pt-8">
          <h1 className="text-figma-3xl text-figma-white font-bold mb-1">
            Create Token
          </h1>
          <p className="text-figma-sm text-figma-muted">
            Launch your token on the Lick.fun bonding curve.
          </p>
        </div>
        <div className="rounded-card border border-figma-card bg-figma-card p-10 flex flex-col items-center gap-5 text-center">
          <div className="w-16 h-16 rounded-card gradient-lick flex items-center justify-center">
            <Rocket className="w-8 h-8 text-figma-bg" />
          </div>
          <div>
            <h2 className="text-figma-xl text-figma-white font-semibold mb-2">
              Connect your wallet
            </h2>
            <p className="text-figma-sm text-figma-muted max-w-xs">
              You need a connected wallet to deploy a token on the bonding curve.
            </p>
          </div>
          <ConnectButton />
        </div>
      </div>
    );
  }

  /* ── Success ── */
  if (isSuccess && tokenAddress) {
    return (
      <div className="max-w-lg mx-auto px-5">
        <div className="mb-8 pt-8">
          <h1 className="text-figma-3xl text-figma-white font-bold mb-1">
            Create Token
          </h1>
          <p className="text-figma-sm text-figma-muted">
            Launch your token on the Lick.fun bonding curve.
          </p>
        </div>
        <div className="rounded-card border border-figma-green/30 bg-figma-green/5 p-10 flex flex-col items-center gap-5 text-center">
          <div className="relative">
            <CheckCircle2 className="w-16 h-16 text-figma-green" />
            <div className="absolute -inset-2 bg-figma-green/20 rounded-full blur-xl -z-10" />
          </div>
          <div>
            <h2 className="text-figma-2xl text-figma-green font-bold mb-1">
              Token Created! 🎉
            </h2>
            <p className="text-figma-sm text-figma-muted">
              Your token is live on the bonding curve.
            </p>
          </div>
          <div className="w-full rounded-card border border-figma-surface bg-figma-card p-4 text-left">
            <p className="text-figma-xs text-figma-muted mb-1">Token Address</p>
            <p className="font-mono text-figma-sm text-figma-white break-all">
              {tokenAddress}
            </p>
          </div>
          {txHash && (
            <div className="w-full rounded-card border border-figma-surface bg-figma-card p-4 text-left">
              <p className="text-figma-xs text-figma-muted mb-1">Transaction Hash</p>
              <p className="font-mono text-figma-xs text-figma-white break-all">
                {txHash}
              </p>
            </div>
          )}
          <div className="flex gap-3 w-full">
            <Link
              href={`/token/${tokenAddress}`}
              className="btn-lick flex-1 py-3 rounded-card flex items-center justify-center gap-2"
            >
              View Token <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={reset}
              className="flex-1 py-3 rounded-card border border-figma-surface bg-figma-card text-figma-white font-semibold text-sm hover:bg-figma-surface transition-colors"
            >
              Create Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Form ── */
  return (
    <div className="max-w-3xl mx-auto px-5">
      <div className="mb-4 pt-4">
        <h1 className="text-figma-2xl text-figma-white font-bold mb-1">
          Create Token
        </h1>
        <p className="text-figma-sm text-figma-muted">
          Launch your token on the Lick.fun bonding curve.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* ── Top row: Image (left) + Token Details (right) ── */}
        <div className="rounded-card border border-figma-card bg-figma-card p-4">
          <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4">
            {/* Image uploader — compact square */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-figma-green" />
                <h2 className="text-figma-xs font-semibold text-figma-muted uppercase tracking-wider">
                  Image
                </h2>
                <span className="text-figma-xs text-figma-green ml-auto">
                  Required
                </span>
              </div>

              {imagePreview ? (
                <div className="relative w-[140px] h-[140px] rounded-card overflow-hidden border border-figma-surface group">
                  <Image
                    src={imagePreview}
                    alt="Token image preview"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    disabled={isLoading}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-figma-bg/80 backdrop-blur flex items-center justify-center text-figma-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-40"
                    aria-label="Remove image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => !isLoading && fileInputRef.current?.click()}
                  className={cn(
                    "w-[140px] h-[140px] border-2 border-dashed rounded-card flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all",
                    dragOver
                      ? "border-figma-green/60 bg-figma-green/5"
                      : "border-figma-surface hover:border-figma-card-alt hover:bg-figma-surface/30",
                    isLoading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="w-9 h-9 rounded-card bg-figma-surface flex items-center justify-center">
                    <Upload className="w-4 h-4 text-figma-muted" />
                  </div>
                  <p className="text-figma-xs text-figma-muted text-center px-2 leading-tight">
                    {dragOver ? "Drop!" : "Drop / click"}
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(",")}
                onChange={handleFileChange}
                className="hidden"
                disabled={isLoading}
              />

              {imageError && (
                <p className="text-figma-xs text-figma-red flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {imageError}
                </p>
              )}
            </div>

            {/* Token details — name + ticker on one row, description below */}
            <div className="space-y-3 min-w-0">
              <div className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-figma-green" />
                <h2 className="text-figma-xs font-semibold text-figma-muted uppercase tracking-wider">
                  Token Details
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3">
                {/* Name */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor="token-name" className="text-figma-xs font-medium">
                      Name
                    </label>
                    <span className="text-figma-xs text-figma-muted">{name.length}/64</span>
                  </div>
                  <input
                    id="token-name"
                    type="text"
                    placeholder="e.g. Lick Coin"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    maxLength={64}
                    required
                    className="w-full px-3 py-2 rounded-card border border-figma-surface bg-figma-bg text-figma-white placeholder:text-figma-muted focus:outline-none focus:border-figma-green transition-colors disabled:opacity-50 text-figma-sm"
                  />
                </div>

                {/* Symbol */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor="token-symbol" className="text-figma-xs font-medium">
                      Ticker
                    </label>
                    <span className="text-figma-xs text-figma-muted">{symbol.length}/8</span>
                  </div>
                  <input
                    id="token-symbol"
                    type="text"
                    placeholder="LICK"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    disabled={isLoading}
                    maxLength={8}
                    required
                    className="w-full px-3 py-2 rounded-card border border-figma-surface bg-figma-bg text-figma-white placeholder:text-figma-muted focus:outline-none focus:border-figma-green transition-colors disabled:opacity-50 text-figma-sm font-mono"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="token-desc" className="text-figma-xs font-medium">
                    Description
                  </label>
                  <span className="text-figma-xs text-figma-muted">{description.length}/280</span>
                </div>
                <textarea
                  id="token-desc"
                  placeholder="Describe your token — what's the vibe?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
                  maxLength={280}
                  rows={2}
                  required
                  className="w-full px-3 py-2 rounded-card border border-figma-surface bg-figma-bg text-figma-white placeholder:text-figma-muted focus:outline-none focus:border-figma-green transition-colors disabled:opacity-50 text-figma-sm resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Social Links — 3 columns ── */}
        <div className="rounded-card border border-figma-card bg-figma-card p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Link2 className="w-3.5 h-3.5 text-figma-green" />
            <h2 className="text-figma-xs font-semibold text-figma-muted uppercase tracking-wider">
              Social Links
            </h2>
            <span className="text-figma-xs text-figma-muted ml-auto">
              Optional
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Telegram */}
            <div className="space-y-1">
              <label htmlFor="token-telegram" className="text-figma-xs font-medium">
                Telegram
              </label>
              <input
                id="token-telegram"
                type="url"
                inputMode="url"
                placeholder="https://t.me/yourtoken"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                disabled={isLoading}
                className={cn(
                  "w-full px-3 py-2 rounded-card border bg-figma-bg text-figma-white placeholder:text-figma-muted focus:outline-none transition-colors disabled:opacity-50 text-figma-sm",
                  telegramError
                    ? "border-figma-red focus:border-figma-red"
                    : "border-figma-surface focus:border-figma-green"
                )}
              />
              {telegramError && (
                <p className="text-figma-xs text-figma-red flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {telegramError}
                </p>
              )}
            </div>

            {/* X / Twitter */}
            <div className="space-y-1">
              <label htmlFor="token-twitter" className="text-figma-xs font-medium">
                X (Twitter)
              </label>
              <input
                id="token-twitter"
                type="url"
                inputMode="url"
                placeholder="https://x.com/yourtoken"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                disabled={isLoading}
                className={cn(
                  "w-full px-3 py-2 rounded-card border bg-figma-bg text-figma-white placeholder:text-figma-muted focus:outline-none transition-colors disabled:opacity-50 text-figma-sm",
                  twitterError
                    ? "border-figma-red focus:border-figma-red"
                    : "border-figma-surface focus:border-figma-green"
                )}
              />
              {twitterError && (
                <p className="text-figma-xs text-figma-red flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {twitterError}
                </p>
              )}
            </div>

            {/* Website */}
            <div className="space-y-1">
              <label htmlFor="token-website" className="text-figma-xs font-medium">
                Website
              </label>
              <input
                id="token-website"
                type="url"
                inputMode="url"
                placeholder="https://yourtoken.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled={isLoading}
                className={cn(
                  "w-full px-3 py-2 rounded-card border bg-figma-bg text-figma-white placeholder:text-figma-muted focus:outline-none transition-colors disabled:opacity-50 text-figma-sm",
                  websiteError
                    ? "border-figma-red focus:border-figma-red"
                    : "border-figma-surface focus:border-figma-green"
                )}
              />
              {websiteError && (
                <p className="text-figma-xs text-figma-red flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {websiteError}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Fee Strategy ── */}
        <div className="rounded-card border border-figma-card bg-figma-card p-4">
          <FeeConfigSelector
            onChange={handleFeeChange}
          />
        </div>

        {/* ── Bottom row: Dev Purchase (left) + Deploy Cost (right) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Dev Purchase */}
          <div className="rounded-card border border-figma-card bg-figma-card p-4 space-y-3">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-figma-green" />
              <h2 className="text-figma-xs font-semibold text-figma-muted uppercase tracking-wider">
                Initial Buy
              </h2>
              <span className="text-figma-xs text-figma-muted ml-auto">
                Optional
              </span>
            </div>

            {/* Wallet balance display */}
            <div className="flex items-center justify-between rounded-card border border-figma-surface bg-figma-bg px-3 py-2">
              <div className="flex items-center gap-1.5 text-figma-xs text-figma-muted">
                <Wallet className="w-3 h-3" />
                <span>Wallet balance</span>
              </div>
              <div className="flex items-center gap-1 text-figma-xs">
                <span className="font-mono font-semibold text-figma-white">
                  {walletMonDisplay !== null ? `${walletMonDisplay} MON` : "—"}
                </span>
                {monBalance && (
                  <button
                    type="button"
                    onClick={() => {
                      const max = Number(formatEther(monBalance.value));
                      if (Number.isFinite(max) && max > 0) {
                        // Reserve 10 MON for the token creation fee + small gas buffer.
                        // Cap at 100k limit.
                        const capped = Math.min(Math.max(max - 10, 0), 100_000);
                        setDevBuyAmount(capped > 0 ? capped.toFixed(4) : "");
                      }
                    }}
                    disabled={isLoading || !monBalance}
                    className="ml-1 text-figma-green hover:opacity-80 transition-opacity disabled:opacity-40 font-semibold"
                  >
                    MAX
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="dev-buy-amount" className="text-figma-xs font-medium">
                  Amount (MON)
                </label>
                <span className="text-figma-xs text-figma-muted">
                  {estimatedDevBuyTokens !== null
                    ? `≈ ${formatTokens(estimatedDevBuyTokens)} tokens`
                    : ""}
                </span>
              </div>
              <input
                id="dev-buy-amount"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                placeholder="0 = skip"
                value={devBuyAmount}
                onChange={(e) => setDevBuyAmount(e.target.value)}
                disabled={isLoading}
                className={cn(
                  "w-full px-3 py-2 rounded-card border bg-figma-bg text-figma-white placeholder:text-figma-muted focus:outline-none transition-colors disabled:opacity-50 text-figma-sm font-mono",
                  devBuyError
                    ? "border-figma-red focus:border-figma-red"
                    : "border-figma-surface focus:border-figma-green"
                )}
              />
              {devBuyError && (
                <p className="text-figma-xs text-figma-red flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {devBuyError}
                </p>
              )}
            </div>
          </div>

          {/* Deploy Cost */}
          <div className="rounded-card border border-figma-card bg-figma-card p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Info className="w-3.5 h-3.5 text-figma-green-soft" />
              <h2 className="text-figma-xs font-semibold text-figma-muted uppercase tracking-wider">
                Deploy Cost
              </h2>
            </div>
            <div className="space-y-2 text-figma-sm">
              <div className="flex justify-between">
                <span className="text-figma-muted">Deploy fee</span>
                <span className="font-mono font-semibold text-figma-green">10 MON</span>
              </div>
              <div className="flex justify-between">
                <span className="text-figma-muted">Trade fee</span>
                <span className="font-mono">2% (1% + 1%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-figma-muted">Graduation</span>
                <span className="font-mono">100,000 MON</span>
              </div>
            </div>
            <p className="mt-3 text-figma-xs text-figma-muted flex items-start gap-1.5">
              <Info className="w-3 h-3 shrink-0 mt-0.5" />
              First buy on the curve is exempt from anti-sniping penalty.
            </p>
          </div>
        </div>

        {/* ── Status display (per-step) ── */}
        {(() => {
          const hasDevBuy = devBuyMonFloat > 0;
          // Step → user-facing label
          const stepLabel: Record<string, string> = {
            "idle": "",
            "uploading": "Uploading image",
            "creating": "Confirm token creation in wallet",
            "confirming-create": "Deploying token on-chain",
            "dev-buying": "Confirm dev buy in wallet",
            "confirming-buy": hasDevBuy
              ? `Buying ${devBuyTrimmed} MON of your token`
              : "Finalizing",
            "done": "Done",
          };
          const label = stepLabel[step] ?? "";
          if (!label || step === "done") return null;
          return (
            <div className="flex items-center gap-3 rounded-card border border-figma-green-soft/30 bg-figma-green-soft/5 p-4">
              <Loader2 className="w-4 h-4 text-figma-green-soft animate-spin shrink-0" />
              <div>
                <p className="text-figma-sm font-medium text-figma-green-soft">
                  {label}
                </p>
                <p className="text-figma-xs text-figma-muted">
                  {hasDevBuy
                    ? "Two transactions required — deploy + dev buy."
                    : "One transaction required — deploy."}
                </p>
              </div>
            </div>
          );
        })()}

        {/* ── Error ── */}
        {error && (
          <div className="flex items-start gap-3 rounded-card border border-figma-red/40 bg-figma-red/10 p-4">
            <AlertCircle className="w-4 h-4 text-figma-red mt-0.5 shrink-0" />
            <p className="text-figma-sm text-figma-red break-all">
              {/* Friendly message for wallet signature / tx rejections */}
              {/rejected|denied|user (cancelled|canceled|refused)/i.test(error.message)
                ? "You cancelled the request in your wallet — please try again."
                : error.message.length > 200
                ? error.message.slice(0, 200) + "…"
                : error.message}
            </p>
          </div>
        )}

        {/* ── Submit ── */}
        <button
          type="submit"
          disabled={isLoading || !formComplete}
          className={cn(
            "w-full py-4 rounded-card font-semibold text-figma-sm transition-all flex items-center justify-center gap-2",
            isLoading || !formComplete
              ? "bg-figma-green/30 text-figma-bg/50 cursor-not-allowed"
              : "btn-lick shadow-md"
          )}
        >
          {isLoading ? (
            (() => {
              const hasDevBuy = devBuyMonFloat > 0; // eslint-disable-line @typescript-eslint/no-unused-vars
              if (uploadStatus === "uploading") {
                return <><Loader2 className="w-4 h-4 animate-spin" /> Uploading image…</>;
              }
              if (step === "creating") {
                return <><Loader2 className="w-4 h-4 animate-spin" /> Confirm token creation…</>;
              }
              if (step === "confirming-create") {
                return <><Loader2 className="w-4 h-4 animate-spin" /> Deploying token…</>;
              }
              if (step === "dev-buying") {
                return <><Loader2 className="w-4 h-4 animate-spin" /> Confirm dev buy…</>;
              }
              if (step === "confirming-buy") {
                return <><Loader2 className="w-4 h-4 animate-spin" /> Buying dev allocation…</>;
              }
              if (isConfirming) {
                return <><Loader2 className="w-4 h-4 animate-spin" /> Confirming transaction…</>;
              }
              return <><Loader2 className="w-4 h-4 animate-spin" /> Confirm in wallet…</>;
            })()
          ) : (
            <>
              <Rocket className="w-4 h-4" />
              {devBuyMonFloat > 0
                ? `Create Token — 10 + ${devBuyTrimmed} MON`
                : "Create Token — 10 MON"}
            </>
          )}
        </button>
      </form>
    </div>
  );
}