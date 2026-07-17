"use client";

import { cn } from "@/lib/utils";

interface ReputationScoreProps {
  score: number;
  /**
   * When true, the profile has too little on-chain activity for the numeric
   * score to be meaningful. Renders an "Unranked" / "Building reputation"
   * state instead of the number + progress bar.
   */
  isSparse?: boolean;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

/**
 * Reputation score display — number + progress bar.
 * Color shifts from purple (low) → green (high) to match the home page palette.
 *
 * When `isSparse` is true, renders an "Unranked" state instead of a number,
 * since a near-zero score from a blank profile is misleading to users.
 */
export function ReputationScore({
  score,
  isSparse = false,
  size = "md",
  showLabel = true,
  className,
}: ReputationScoreProps) {
  const clamped = Math.min(Math.max(score, 0), 100);

  const numberSize = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  }[size];

  const barHeight = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  }[size];

  // Color: purple at low scores, green at high scores
  const fillClass =
    clamped >= 70
      ? "bg-gradient-to-r from-figma-green to-figma-green-soft"
      : clamped >= 30
      ? "bg-gradient-to-r from-figma-purple to-figma-purple-soft"
      : "bg-gradient-to-r from-figma-purple/60 to-figma-purple/30";

  if (isSparse) {
    return (
      <div className={cn("flex flex-col gap-2 w-full", className)}>
        {showLabel && (
          <div className="flex items-center justify-between">
            <span className="text-figma-sm text-figma-muted font-medium">
              Reputation Score
            </span>
            <span
              className={cn(
                "font-bold font-mono text-figma-muted",
                numberSize
              )}
            >
              Unranked
            </span>
          </div>
        )}
        <div
          className={cn(
            "relative w-full rounded-full bg-figma-surface overflow-hidden",
            barHeight
          )}
        >
          <div
            className="h-full rounded-full bg-figma-surface"
            style={{ width: "100%" }}
          />
        </div>
        {!showLabel && (
          <span className="text-figma-xs text-figma-muted">
            Building reputation…
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2 w-full", className)}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <span className="text-figma-sm text-figma-muted font-medium">
            Reputation Score
          </span>
          <span
            className={cn(
              "font-bold font-mono text-figma-white",
              numberSize
            )}
          >
            {clamped.toFixed(1)}
          </span>
        </div>
      )}
      <div
        className={cn(
          "relative w-full rounded-full bg-figma-surface overflow-hidden",
          barHeight
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            fillClass
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}