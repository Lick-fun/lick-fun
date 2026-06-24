"use client";

import { cn } from "@/lib/utils";
import { TierBadge } from "./TierBadge";
import { ReputationScore } from "./ReputationScore";
import { BadgeGrid } from "./BadgeGrid";
import type { ScoringResult } from "@/lib/reputation";

interface ReputationCardProps {
  result: ScoringResult;
  className?: string;
}

/**
 * Composite reputation card — combines tier badge, score bar, and badge grid.
 * Matches the home page card style: black background, rounded corners, white text.
 */
export function ReputationCard({ result, className }: ReputationCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 bg-figma-card rounded-panel p-6",
        className
      )}
    >
      {/* Header: tier + score */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-figma-lg text-figma-white font-bold">
            Reputation
          </span>
          <TierBadge tier={result.tier} size="md" />
        </div>
        <ReputationScore score={result.reputation} size="lg" />
      </div>

      {/* Badges */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-figma-md text-figma-white font-semibold">
            Milestone Badges
          </span>
          <span className="text-figma-sm text-figma-muted font-medium">
            {result.badges.length} / 10 earned
          </span>
        </div>
        <BadgeGrid earned={result.badges} />
      </div>
    </div>
  );
}