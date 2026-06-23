"use client";

import { useState, FormEvent, useEffect, useRef, useCallback } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCreateToken } from "@/lib/hooks/useCreateToken";
import {
  Loader2, CheckCircle2, AlertCircle, Rocket, ArrowRight,
  Coins, Info, Upload, X, ImageIcon, Cloud,
} from "lucide-react";

const MAX_IMAGE_SIZE_MB = 10;
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
];

export default function CreateTokenPage() {
  const { isConnected } = useAccount();
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    createToken, isPending, isConfirming, isSuccess,
    tokenAddress, txHash, error, reset, uploadStatus,
  } = useCreateToken();
  const router = useRouter();

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !symbol.trim()) return;
    try {
      await createToken({
        name: name.trim(),
        symbol: symbol.trim().toUpperCase(),
        description: description.trim() || undefined,
        imageFile,
      });
    } catch (err) {
      console.error("[CreateToken] handleSubmit error:", err);
      // error is captured in hook state and displayed in the UI
    }
  };

  const uploadLabel = () => {
    switch (uploadStatus) {
      case "uploading": return "Uploading to IPFS…";
      case "done":     return "Uploaded to IPFS ✓";
      default:         return null;
    }
  };

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
            {imageFile && (
              <p className="text-figma-xs text-figma-green/70 mt-1 flex items-center justify-center gap-1">
                <Cloud className="w-3 h-3" /> Image pinned to IPFS permanently
              </p>
            )}
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
    <div className="max-w-lg mx-auto px-5">
      <div className="mb-8 pt-8">
        <h1 className="text-figma-3xl text-figma-white font-bold mb-1">
          Create Token
        </h1>
        <p className="text-figma-sm text-figma-muted">
          Launch your token on the Lick.fun bonding curve.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Token Image ── */}
        <div className="rounded-card border border-figma-card bg-figma-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <ImageIcon className="w-4 h-4 text-figma-green" />
            <h2 className="text-figma-sm font-semibold text-figma-muted uppercase tracking-wider">
              Token Image
            </h2>
            <span className="text-figma-xs text-figma-muted ml-auto">
              Optional · Pinned to IPFS
            </span>
          </div>

          {imagePreview ? (
            <div className="flex items-start gap-4">
              <div className="relative w-24 h-24 rounded-card overflow-hidden shrink-0 border border-figma-surface">
                <Image
                  src={imagePreview}
                  alt="Token image preview"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-figma-sm font-medium truncate">{imageFile?.name}</p>
                <p className="text-figma-xs text-figma-muted mt-0.5">
                  {imageFile ? `${(imageFile.size / 1024 / 1024).toFixed(2)} MB` : ""}
                </p>
                <p className="text-figma-xs text-figma-green-soft mt-1 flex items-center gap-1">
                  <Cloud className="w-3 h-3" />
                  Will be uploaded to IPFS before deployment
                </p>
                <button
                  type="button"
                  onClick={removeImage}
                  disabled={isLoading}
                  className="mt-2 flex items-center gap-1 text-figma-xs text-figma-red hover:opacity-80 transition-colors disabled:opacity-40"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !isLoading && fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-card p-8 flex flex-col items-center gap-3 cursor-pointer transition-all",
                dragOver
                  ? "border-figma-green/60 bg-figma-green/5"
                  : "border-figma-surface hover:border-figma-card-alt hover:bg-figma-surface/30",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="w-12 h-12 rounded-card bg-figma-surface flex items-center justify-center">
                <Upload className="w-5 h-5 text-figma-muted" />
              </div>
              <div className="text-center">
                <p className="text-figma-sm font-medium">
                  {dragOver ? "Drop it here!" : "Drop image or click to upload"}
                </p>
                <p className="text-figma-xs text-figma-muted mt-0.5">
                  JPG, PNG, GIF, WebP, SVG · Max {MAX_IMAGE_SIZE_MB} MB
                </p>
              </div>
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
            <p className="text-figma-xs text-figma-red flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3 shrink-0" /> {imageError}
            </p>
          )}
        </div>

        {/* ── Token Details ── */}
        <div className="rounded-card border border-figma-card bg-figma-card p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="w-4 h-4 text-figma-green" />
            <h2 className="text-figma-sm font-semibold text-figma-muted uppercase tracking-wider">
              Token Details
            </h2>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="token-name" className="text-figma-sm font-medium">
                Token Name
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
              className="w-full px-4 py-3 rounded-card border border-figma-surface bg-figma-bg text-figma-white placeholder:text-figma-muted focus:outline-none focus:border-figma-green transition-colors disabled:opacity-50 text-figma-sm"
            />
          </div>

          {/* Symbol */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="token-symbol" className="text-figma-sm font-medium">
                Token Symbol
              </label>
              <span className="text-figma-xs text-figma-muted">{symbol.length}/8</span>
            </div>
            <input
              id="token-symbol"
              type="text"
              placeholder="e.g. LICK"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              disabled={isLoading}
              maxLength={8}
              required
              className="w-full px-4 py-3 rounded-card border border-figma-surface bg-figma-bg text-figma-white placeholder:text-figma-muted focus:outline-none focus:border-figma-green transition-colors disabled:opacity-50 text-figma-sm font-mono"
            />
            <p className="text-figma-xs text-figma-muted">
              Max 8 characters, auto-uppercased.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="token-desc" className="text-figma-sm font-medium">
                Description
                <span className="text-figma-xs text-figma-muted font-normal ml-1">
                  (optional)
                </span>
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
              rows={3}
              className="w-full px-4 py-3 rounded-card border border-figma-surface bg-figma-bg text-figma-white placeholder:text-figma-muted focus:outline-none focus:border-figma-green transition-colors disabled:opacity-50 text-figma-sm resize-none"
            />
          </div>
        </div>

        {/* ── Fee info ── */}
        <div className="rounded-card border border-figma-card bg-figma-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-figma-green-soft" />
            <h2 className="text-figma-sm font-semibold text-figma-muted uppercase tracking-wider">
              Deploy Cost
            </h2>
          </div>
          <div className="space-y-2 text-figma-sm">
            <div className="flex justify-between">
              <span className="text-figma-muted">Deploy fee</span>
              <span className="font-mono font-semibold text-figma-green">10 MON</span>
            </div>
            <div className="flex justify-between">
              <span className="text-figma-muted">IPFS storage</span>
              <span className="font-mono text-figma-green-soft">Free (NFT.storage)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-figma-muted">Trade fee (per tx)</span>
              <span className="font-mono">2% (1% protocol + 1% creator)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-figma-muted">Graduation threshold</span>
              <span className="font-mono">100,000 MON</span>
            </div>
          </div>
        </div>

        {/* ── Upload status ── */}
        {uploadStatus === "uploading" && (
          <div className="flex items-center gap-3 rounded-card border border-figma-green-soft/30 bg-figma-green-soft/5 p-4">
            <Loader2 className="w-4 h-4 text-figma-green-soft animate-spin shrink-0" />
            <div>
              <p className="text-figma-sm font-medium text-figma-green-soft">
                Creating Token!
              </p>
              <p className="text-figma-xs text-figma-muted">
                Pinning image and metadata to IPFS…
              </p>
            </div>
          </div>
        )}

        {uploadStatus === "done" && uploadLabel() && (
          <div className="flex items-center gap-3 rounded-card border border-figma-green/30 bg-figma-green/5 p-4">
            <CheckCircle2 className="w-4 h-4 text-figma-green shrink-0" />
            <p className="text-figma-sm text-figma-green">{uploadLabel()}</p>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="flex items-start gap-3 rounded-card border border-figma-red/40 bg-figma-red/10 p-4">
            <AlertCircle className="w-4 h-4 text-figma-red mt-0.5 shrink-0" />
            <p className="text-figma-sm text-figma-red break-all">
              {error.message.length > 200 ? error.message.slice(0, 200) + "…" : error.message}
            </p>
          </div>
        )}

        {/* ── Submit ── */}
        <button
          type="submit"
          disabled={isLoading || !name.trim() || !symbol.trim()}
          className={cn(
            "w-full py-4 rounded-card font-semibold text-figma-sm transition-all flex items-center justify-center gap-2",
            isLoading || !name.trim() || !symbol.trim()
              ? "bg-figma-green/30 text-figma-bg/50 cursor-not-allowed"
              : "btn-lick shadow-md"
          )}
        >
          {uploadStatus === "uploading" ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Creating Token!</>
          ) : isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Confirm in wallet…</>
          ) : isConfirming ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Confirming transaction…</>
          ) : (
            <><Rocket className="w-4 h-4" /> Create Token — 10 MON</>
          )}
        </button>
      </form>
    </div>
  );
}