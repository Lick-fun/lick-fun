import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

/**
 * Generic shimmer skeleton — used inside larger loading states.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-lg bg-figma-surface relative overflow-hidden",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Figma-sourced skeletons (mirror working page.tsx loaders)                         */
/* ──────────────────────────────────────────────────────────────────────────────── */

/**
 * Small dark token-card placeholder — used in the token grid while loading.
 * Matches the 350×~120 dimensions of `TokenCard`.
 */
export function TokenCardSkeleton() {
  return (
    <div
      className="flex flex-col gap-[10px] w-[350px] p-[13px_18px] border border-figma-card bg-figma-card animate-pulse rounded-card"
    >
      <div className="flex gap-[15px] items-start">
        <div className="w-[58px] h-[58px] shrink-0 rounded-[7px] bg-figma-surface" />
        <div className="flex flex-col gap-[3px] flex-1 min-w-0">
          <div className="h-4 w-24 bg-figma-surface rounded" />
          <div className="h-3 w-40 bg-figma-surface rounded mt-1" />
        </div>
      </div>
      <div className="flex flex-col gap-[5px]">
        <div className="flex items-center justify-between w-full">
          <div className="h-3 w-28 bg-figma-surface rounded" />
          <div className="h-3 w-24 bg-figma-surface rounded" />
        </div>
        <div className="w-full h-[9px] rounded-full bg-figma-surface" />
      </div>
    </div>
  );
}

/**
 * Large white trending-card placeholder — used in the trending row.
 * Matches the 350×343 dimensions of the trending card.
 */
export function TrendingSkeletonCard() {
  return (
    <div
      className="flex flex-col items-center gap-[45px] animate-pulse w-[350px] h-[343px] bg-figma-white-card rounded-panel px-[25px] py-[60px_25px_16px] relative overflow-hidden"
    >
      <div className="w-[137px] h-[137px] rounded-full bg-gray-200" />
      <div className="h-6 w-32 bg-gray-200 rounded" />
      <div className="h-4 w-40 bg-gray-200 rounded" />
      <div className="flex items-center justify-between w-full">
        <div className="h-4 w-28 bg-gray-200 rounded" />
        <div className="h-4 w-12 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

/**
 * Trade ticker pill placeholder — used in the recent-trades ticker.
 * Matches the 211×46 dimensions of the pill.
 */
export function TickerSkeletonCard() {
  return (
    <div
      className="flex items-center gap-2 px-3 shrink-0 animate-pulse w-[211px] h-[46px] rounded-pill"
      style={{ background: "rgba(100,100,100,0.3)" }}
    >
      <div className="w-[32px] h-[32px] rounded-full bg-gray-700 shrink-0" />
      <div className="flex flex-col gap-1 flex-1">
        <div className="h-2 w-20 bg-gray-700 rounded" />
        <div className="h-2 w-24 bg-gray-700 rounded" />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Existing composite skeletons                                                     */
/* ──────────────────────────────────────────────────────────────────────────────── */

/**
 * Discover-page grid card — used in /discover loading state.
 */
export function DiscoverCardSkeleton() {
  return (
    <div className="rounded-card border border-figma-card bg-figma-card p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-3.5 w-16" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-10 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Profile-page hero placeholder.
 */
export function ProfileSkeleton() {
  return (
    <div className="rounded-card border border-figma-card bg-figma-card p-8 space-y-4">
      <div className="flex gap-6">
        <Skeleton className="w-20 h-20 rounded-full shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-5 w-32 rounded-full" />
          <Skeleton className="h-2 w-full max-w-xs rounded-full" />
        </div>
      </div>
    </div>
  );
}