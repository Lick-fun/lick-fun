"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useProfile,
  useTokensByCreator,
  computeReputation,
  formatAddress,
  formatMon,
  formatTimeAgo,
  tierColor,
  tierBg,
  reputationColor,
} from "@/lib/hooks/useData";
import type { Badge, Tier } from "@/lib/hooks/useData";
import { TokenCard } from "@/components/token/TokenCard";
import {
  ArrowLeft,
  Shield,
  Award,
  Star,
  TrendingUp,
  Users,
  Clock,
  Coins,
} from "lucide-react";

const BADGE_DESCRIPTIONS: Record<Badge, string> = {
  "First Token": "Launched your first token on Lick.fun",
  "Triple Graduate": "Three of your tokens successfully graduated",
  "Deca Graduate": "Ten tokens graduated — you're a launch machine",
  "Locked & Honest — 180d": "No rugs for 180+ days",
  "Locked & Honest — 365d": "Perfect record for a full year",
  "Never Rug": "Profile older than 30 days with zero rug events",
  "Pre-buy Honest": "95%+ pre-buy honesty rate",
  "Volume Maker": "Cumulative volume exceeded 100K MON",
  "Verified Founder": "Reputation score of 70+",
  OG: "365+ days old with at least 3 graduates",
};

const BADGE_ICONS: Record<Badge, string> = {
  "First Token": "🪙",
  "Triple Graduate": "🎓",
  "Deca Graduate": "🏆",
  "Locked & Honest — 180d": "🛡️",
  "Locked & Honest — 365d": "🔒",
  "Never Rug": "✅",
  "Pre-buy Honest": "🤝",
  "Volume Maker": "📊",
  "Verified Founder": "👑",
  OG: "🐉",
};

export default function ProfilePage() {
  const { address } = useParams<{ address: string }>();
  const profile = useProfile(address);
  const tokens = useTokensByCreator(address);

  if (!profile) {
    return (
      <div className="max-w-5xl mx-auto text-center py-20">
        <h2 className="text-2xl font-bold mb-2">Profile not found</h2>
        <p className="text-sm text-muted-foreground mb-4">
          No profile data for this address yet. Profiles are created when a creator
          launches their first token.
        </p>
        <Link href="/discover" className="text-lick-orange-light hover:underline">
          Explore Tokens
        </Link>
      </div>
    );
  }

  const rep = computeReputation(profile);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back */}
      <Link
        href="/discover"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      {/* Profile Header */}
      <section className="rounded-xl border border-border bg-card p-8 mb-8">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full gradient-lick flex items-center justify-center shrink-0">
            <span className="text-3xl">🦎</span>
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold font-mono">
                {formatAddress(profile.id)}
              </h1>
              <span
                className={`text-sm px-3 py-1 rounded-full border ${tierBg(rep.tier)} ${tierColor(rep.tier)} font-medium`}
              >
                {rep.tier}
              </span>
            </div>

            {/* Score */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Award className={`w-5 h-5 ${reputationColor(rep.score)}`} />
                <span className={`text-3xl font-bold ${reputationColor(rep.score)}`}>
                  {rep.score}
                </span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>

              {/* Score bar */}
              <div className="flex-1 max-w-xs">
                <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      rep.score >= 70
                        ? "bg-green-500"
                        : rep.score >= 30
                          ? "bg-blue-500"
                          : "bg-yellow-500"
                    }`}
                    style={{ width: `${rep.score}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4 border-t border-border">
              <div>
                <div className="text-lg font-semibold">{profile.tokenCount}</div>
                <div className="text-xs text-muted-foreground">Tokens Launched</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-green-400">
                  {profile.graduatedCount}
                </div>
                <div className="text-xs text-muted-foreground">Graduated</div>
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {formatMon(profile.totalBuyVolume)}
                </div>
                <div className="text-xs text-muted-foreground">Total Volume</div>
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {formatMon(profile.totalSellVolume)}
                </div>
                <div className="text-xs text-muted-foreground">Sell Volume</div>
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {formatTimeAgo(profile.createdAt)}
                </div>
                <div className="text-xs text-muted-foreground">Profile Age</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Badges */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-lick-orange-light" />
          Badges
        </h2>
        {rep.badges.length === 0 ? (
          <p className="text-muted-foreground text-sm">No badges earned yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rep.badges.map((badge) => (
              <div
                key={badge}
                className="rounded-xl border border-border bg-card p-4 flex items-start gap-3 card-hover"
              >
                <span className="text-2xl shrink-0">{BADGE_ICONS[badge]}</span>
                <div>
                  <div className="font-medium text-sm">{badge}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {BADGE_DESCRIPTIONS[badge]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Token Gallery */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Coins className="w-5 h-5 text-lick-orange-light" />
          Tokens Launched ({tokens.length})
        </h2>
        {tokens.length === 0 ? (
          <p className="text-muted-foreground text-sm">No tokens launched yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tokens.map((token) => (
              <TokenCard key={token.id} token={token} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}