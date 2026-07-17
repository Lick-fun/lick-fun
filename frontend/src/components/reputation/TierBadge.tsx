"use client";

import { cn } from "@/lib/utils";
import type { Tier } from "@/lib/reputation";

interface TierBadgeProps {
  tier: Tier;
  /**
   * When true, the profile has too little on-chain activity to be ranked.
   * Renders a neutral "Unranked" badge instead of a tier.
   */
  isSparse?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const TIER_CONFIG: Record<
  Tier,
  { emoji: string; bg: string; text: string; border: string; label: string }
> = {
  Starter: {
    emoji: "🌱",
    bg: "bg-figma-surface",
    text: "text-figma-muted",
    border: "border-figma-surface",
    label: "Starter",
  },
  Established: {
    emoji: "⭐",
    bg: "bg-figma-purple/20",
    text: "text-figma-purple-soft",
    border: "border-figma-purple/40",
    label: "Established",
  },
  Verified: {
    emoji: "👑",
    bg: "bg-figma-green/20",
    text: "text-figma-green",
    border: "border-figma-green/40",
    label: "Verified",
  },
};

const SPARSE_CONFIG = {
  emoji: "○",
  bg: "bg-figma-surface",
  text: "text-figma-muted",
  border: "border-figma-surface",
  label: "Unranked",
};

export function TierBadge({ tier, isSparse = false, size = "md", className }: TierBadgeProps) {
  const config = isSparse ? SPARSE_CONFIG : TIER_CONFIG[tier];
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-3 py-1 text-sm gap-1.5",
    lg: "px-4 py-1.5 text-base gap-2",
  }[size];

  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold rounded-full border",
        config.bg,
        config.text,
        config.border,
        sizeClasses,
        className
      )}
    >
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </span>
  );
}