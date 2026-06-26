"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { useTokenImage } from "@/lib/hooks/useTokenImage";
import { ipfsFallbackUrls } from "@/lib/ipfs";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Size presets                                                                      */
/* ──────────────────────────────────────────────────────────────────────────────── */


const SIZE_MAP = {
  xs: { px: 24, className: "w-6 h-6 text-[8px]" },
  sm: { px: 32, className: "w-8 h-8 text-[9px]" },
  md: { px: 40, className: "w-10 h-10 text-xs" },
  lg: { px: 58, className: "w-[58px] h-[58px] text-sm" },
  xl: { px: 80, className: "w-20 h-20 text-base" },
  "2xl": { px: 120, className: "w-[120px] h-[120px] text-xl" },
  "3xl": { px: 137, className: "w-[137px] h-[137px] text-2xl" },
} as const;

export type TokenImageSize = keyof typeof SIZE_MAP;

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Gradient palette for placeholder avatars (deterministic from address)            */
/* ──────────────────────────────────────────────────────────────────────────────── */

const GRADIENTS = [
  "from-purple-600 to-green-500",
  "from-orange-500 to-pink-600",
  "from-cyan-500 to-blue-600",
  "from-yellow-500 to-orange-600",
  "from-green-500 to-teal-600",
  "from-pink-500 to-purple-600",
  "from-indigo-500 to-cyan-500",
  "from-red-500 to-orange-500",
];

function getGradient(seed: string): string {
  const safeSeed = seed ?? "";
  let hash = 0;
  for (let i = 0; i < safeSeed.length; i++) {
    hash = (hash * 31 + safeSeed.charCodeAt(i)) & 0xffffffff;
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function getInitials(name: string, address: string): string {
  if (name && name.trim()) {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return address.slice(2, 4).toUpperCase();
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Placeholder (no image registered)                                                */
/* ──────────────────────────────────────────────────────────────────────────────── */

function Placeholder({
  tokenAddress,
  tokenName,
  size,
  round,
  className,
}: {
  tokenAddress: string;
  tokenName?: string;
  size: TokenImageSize;
  round?: boolean;
  className?: string;
}) {
  const { px, className: sizeClass } = SIZE_MAP[size];
  const safeAddress = tokenAddress ?? "0x0";
  const gradient = getGradient(safeAddress);
  const initials = getInitials(tokenName ?? "", safeAddress);
  void px;

  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0 font-bold text-white",
        `bg-gradient-to-br ${gradient}`,
        sizeClass,
        round ? "rounded-full" : "rounded-[7px]",
        className
      )}
    >
      {initials}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Skeleton                                                                          */
/* ──────────────────────────────────────────────────────────────────────────────── */

function ImageSkeleton({
  size,
  round,
  className,
}: {
  size: TokenImageSize;
  round?: boolean;
  className?: string;
}) {
  const { className: sizeClass } = SIZE_MAP[size];
  return (
    <div
      className={cn(
        "animate-pulse bg-gray-800 shrink-0",
        sizeClass,
        round ? "rounded-full" : "rounded-[7px]",
        className
      )}
    />
  );
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Main TokenImage component                                                         */
/* ──────────────────────────────────────────────────────────────────────────────── */

interface TokenImageProps {
  /** Token contract address — used to look up IPFS metadata */
  tokenAddress: string;
  /** Display name — used for initials fallback */
  tokenName?: string;
  size?: TokenImageSize;
  /** Round (circle) shape — default: false (rounded square) */
  round?: boolean;
  className?: string;
  /** Override imageUrl directly (skip API fetch) — useful when you already have the URL */
  directImageUrl?: string | null;
}

export function TokenImage({
  tokenAddress,
  tokenName,
  size = "lg",
  round = false,
  className,
  directImageUrl,
}: TokenImageProps) {
  const { data, isLoading } = useTokenImage(directImageUrl ? null : tokenAddress);
  const [errorCount, setErrorCount] = useState(0);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  const { px, className: sizeClass } = SIZE_MAP[size];

  // Resolve URL: directImageUrl → API data → null (show placeholder)
  const resolvedImageUrl =
    directImageUrl ??
    (currentUrl || (data?.imageUrl ?? null));

  // Track the raw IPFS URI for fallback gateway cycling.
  // Only use IPFS fallbacks for actual ipfs:// URIs — Storj HTTPS URLs have no fallback.
  const ipfsUri = data?.imageUri ?? null;
  const isIpfsUri =
    !!ipfsUri &&
    (ipfsUri.startsWith("ipfs://") ||
      ipfsUri.startsWith("Qm") ||
      ipfsUri.startsWith("bafy"));

  const handleError = useCallback(() => {
    if (!isIpfsUri || !ipfsUri) {
      // Storj / plain HTTPS URL failed — show placeholder immediately
      setCurrentUrl(null);
      setErrorCount(99);
      return;
    }
    const fallbacks = ipfsFallbackUrls(ipfsUri);
    if (errorCount < fallbacks.length) {
      setCurrentUrl(fallbacks[errorCount]);
      setErrorCount((c) => c + 1);
    } else {
      // All IPFS gateways exhausted → show placeholder
      setCurrentUrl(null);
      setErrorCount(fallbacks.length + 1);
    }
  }, [ipfsUri, isIpfsUri, errorCount]);

  // Loading skeleton
  if (isLoading && !directImageUrl) {
    return <ImageSkeleton size={size} round={round} className={className} />;
  }

  // No image registered / all gateways failed → placeholder
  const gatewaysFailed = errorCount > (isIpfsUri ? ipfsFallbackUrls(ipfsUri).length : 0);
  if (!resolvedImageUrl || gatewaysFailed) {
    return (
      <Placeholder
        tokenAddress={tokenAddress}
        tokenName={tokenName}
        size={size}
        round={round}
        className={className}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden",
        sizeClass,
        round ? "rounded-full" : "rounded-[7px]",
        className
      )}
    >
      <Image
        src={resolvedImageUrl}
        alt={tokenName ?? tokenAddress.slice(0, 8)}
        width={px}
        height={px}
        className="w-full h-full object-cover"
        onError={handleError}
        unoptimized // IPFS content — Next.js image optimisation won't help
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Convenience variant — circular (for trending hero, trade ticker avatar)          */
/* ──────────────────────────────────────────────────────────────────────────────── */

export function TokenAvatar(props: Omit<TokenImageProps, "round">) {
  return <TokenImage {...props} round />;
}
