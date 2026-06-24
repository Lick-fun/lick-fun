"use client";

import { cn } from "@/lib/utils";
import type { Badge } from "@/lib/reputation";

interface BadgeGridProps {
  earned: Badge[];
  className?: string;
}

const ALL_BADGES: Badge[] = [
  "First Token",
  "Triple Graduate",
  "Deca Graduate",
  "Crowd Favourite",
  "Diamond Hands",
  "Never Rug",
  "Pre-buy Honest",
  "Volume Maker",
  "Verified Founder",
  "OG",
];

const BADGE_ICONS: Record<Badge, string> = {
  "First Token": "🚀",
  "Triple Graduate": "🎓",
  "Deca Graduate": "🏆",
  "Crowd Favourite": "⭐",
  "Diamond Hands": "💎",
  "Never Rug": "✅",
  "Pre-buy Honest": "🤝",
  "Volume Maker": "📊",
  "Verified Founder": "👑",
  "OG": "🌟",
};

const BADGE_DESCRIPTIONS: Record<Badge, string> = {
  "First Token": "Launched your first token",
  "Triple Graduate": "Three or more tokens graduated to DEX",
  "Deca Graduate": "Ten or more tokens graduated to DEX",
  "Crowd Favourite": "One of your tokens attracted 200+ unique buyers",
  "Diamond Hands": "Never sold your creator allocation on a graduated token",
  "Never Rug": "30+ days active with no rug events",
  "Pre-buy Honest": "95%+ honest pre-buy behaviour",
  "Volume Maker": "Cumulative graduated volume over 100k MON",
  "Verified Founder": "Reputation score of 70 or higher",
  "OG": "365+ days active with 3+ graduated tokens",
};

export function BadgeGrid({ earned, className }: BadgeGridProps) {
  const earnedSet = new Set(earned);

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3", className)}>
      {ALL_BADGES.map((badge) => {
        const isEarned = earnedSet.has(badge);
        return (
          <div
            key={badge}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-card border transition-all",
              isEarned
                ? "bg-figma-card border-figma-green/30 hover:border-figma-green/60"
                : "bg-figma-card border-figma-surface opacity-40"
            )}
          >
            <span
              className={cn(
                "text-2xl",
                isEarned ? "" : "grayscale"
              )}
            >
              {BADGE_ICONS[badge]}
            </span>
            <span
              className={cn(
                "text-figma-xs font-medium text-center leading-tight",
                isEarned ? "text-figma-white" : "text-figma-muted"
              )}
            >
              {badge}
            </span>
            <span
              className={cn(
                "text-figma-xs text-center leading-tight",
                isEarned ? "text-figma-muted" : "text-figma-muted/60"
              )}
            >
              {BADGE_DESCRIPTIONS[badge]}
            </span>
          </div>
        );
      })}
    </div>
  );
}