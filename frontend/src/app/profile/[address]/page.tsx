"use client";

import { useParams } from "next/navigation";
import { Copy, Check, ExternalLink, Pencil, Globe, Send } from "lucide-react";
import { useState } from "react";
import { TierBadge } from "@/components/reputation/TierBadge";
import { ReputationScore } from "@/components/reputation/ReputationScore";
import { BadgeGrid } from "@/components/reputation/BadgeGrid";
import { PortfolioSummary } from "@/components/profile/PortfolioSummary";
import { HoldingsList } from "@/components/profile/HoldingsList";
import { CreatedTokensList } from "@/components/profile/CreatedTokensList";
import { ActivityTabs } from "@/components/profile/ActivityTabs";
import { useProfile, useTokensByCreator } from "@/lib/hooks/useData";
import { useReputation } from "@/lib/hooks/useReputation";
import { useProfileMeta } from "@/lib/hooks/useProfileMeta";
import { useTokenHoldings } from "@/lib/hooks/useTokenHoldings";
import { useCreatorFees } from "@/lib/hooks/useCreatorFees";
import { useMonUsdPrice } from "@/lib/hooks/useMonUsdPrice";
import { useAccount } from "wagmi";
import { EditProfileModal } from "@/components/profile/EditProfileModal";

function formatMon(amount: bigint): string {
  const mon = Number(amount) / 1e18;
  if (mon >= 1000) return `${(mon / 1000).toFixed(2)}K`;
  if (mon >= 1) return mon.toFixed(2);
  return mon.toFixed(3);
}

export default function ProfilePage() {
  const { address } = useParams<{ address: string }>();
  const addr = (address as string) ?? "";
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { address: connectedAddress } = useAccount();
  const isOwner =
    !!connectedAddress &&
    connectedAddress.toLowerCase() === addr.toLowerCase();

  const handleCopy = () => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { data: profile, isLoading: profileLoading } = useProfile(addr);
  const { data: tokens = [], isLoading: tokensLoading } = useTokensByCreator(addr);
  const { data: reputation, isLoading: repLoading } = useReputation(addr);
  const { data: profileMeta, refetch: refetchProfileMeta } = useProfileMeta(addr);
  const { data: monUsdPrice } = useMonUsdPrice();

  // Holdings (tokens the user bought)
  const { holdings, totals: holdingsTotals, isLoading: holdingsLoading } =
    useTokenHoldings(addr, monUsdPrice);

  // Creator fees for tokens created by this user
  const { data: creatorFees, isLoading: feesLoading } = useCreatorFees(addr);

  const isLoading = profileLoading || tokensLoading || repLoading;

  // Display name: custom name from off-chain store, or truncated address
  const displayName = profileMeta?.displayName?.trim()
    ? profileMeta.displayName
    : `@${addr.slice(0, 8)}...`;

  return (
    <div className="relative bg-figma-bg min-h-screen px-5 pb-20">
      <div className="max-w-[960px] mx-auto flex flex-col gap-6 mt-8">
        {/* ── Profile Card ── */}
        <div
          className="flex flex-col gap-[18px] w-full"
          style={{
            background: "#000000",
            borderRadius: "34px",
            padding: "26px 37px 25px",
          }}
        >
          {/* Top row: Avatar + Welcome */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-[23px]">
              {/* Avatar — custom image if set, otherwise generated initials */}
              <div className="w-[49px] h-[49px] rounded-full bg-figma-purple flex items-center justify-center text-white font-bold text-lg shrink-0 overflow-hidden">
                {profileMeta?.avatarUrl ? (
                  <img
                    src={profileMeta.avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  addr.slice(2, 4).toUpperCase()
                )}
              </div>
              {/* Welcome + Username */}
              <div className="flex flex-col gap-[6px]">
                <span className="text-figma-white font-figma-regular text-figma-13">
                  Welcome Back
                </span>
                <span className="text-figma-white font-figma-bold text-figma-16">
                  {displayName}
                </span>
              </div>
            </div>

            {/* Right side: Edit button (owner only) + Tier Badge */}
            <div className="flex items-center gap-3">
              {isOwner && (
                <button
                  onClick={() => setEditOpen(true)}
                  className="flex items-center gap-1.5 h-[32px] px-3 rounded-pill bg-figma-surface border border-figma-card-alt text-figma-white text-figma-xs font-medium hover:border-figma-green transition-colors"
                >
                  <Pencil size={12} />
                  Edit Profile
                </button>
              )}
              {reputation && <TierBadge tier={reputation.tier} size="md" />}
            </div>
          </div>

          {/* Address + Copy */}
          <div className="flex items-center gap-[10px] w-full">
            <span className="text-figma-muted font-figma-regular text-figma-13">
              {addr.slice(0, 6)}...{addr.slice(-4)}
            </span>
            <button
              onClick={handleCopy}
              className="text-figma-muted hover:text-figma-white transition-colors"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <a
              href={`https://monadexplorer.com/address/${addr}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-figma-muted hover:text-figma-white transition-colors"
            >
              <ExternalLink size={14} />
            </a>
          </div>

          {/* Social Links — only render if any are set */}
          {(profileMeta?.xUrl ||
            profileMeta?.websiteUrl ||
            profileMeta?.telegramUrl) && (
            <div className="flex items-center gap-[10px] w-full">
              {profileMeta?.xUrl && (
                <a
                  href={profileMeta.xUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="X (Twitter)"
                  aria-label="X (Twitter)"
                  className="flex items-center justify-center w-[28px] h-[28px] rounded-full bg-figma-surface border border-figma-card-alt text-figma-white hover:border-figma-green hover:text-figma-green transition-colors"
                >
                  <span className="font-bold text-figma-sm leading-none">𝕏</span>
                </a>
              )}
              {profileMeta?.websiteUrl && (
                <a
                  href={profileMeta.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Website"
                  aria-label="Website"
                  className="flex items-center justify-center w-[28px] h-[28px] rounded-full bg-figma-surface border border-figma-card-alt text-figma-muted hover:border-figma-green hover:text-figma-green transition-colors"
                >
                  <Globe size={14} />
                </a>
              )}
              {profileMeta?.telegramUrl && (
                <a
                  href={profileMeta.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Telegram"
                  aria-label="Telegram"
                  className="flex items-center justify-center w-[28px] h-[28px] rounded-full bg-figma-surface border border-figma-card-alt text-figma-muted hover:border-figma-green hover:text-figma-green transition-colors"
                >
                  <Send size={14} />
                </a>
              )}
            </div>
          )}

          {/* Reputation Score */}
          {reputation && (
            <div className="w-full pt-2">
              <ReputationScore score={reputation.reputation} />
            </div>
          )}

          {/* Stats Row */}
          <div className="flex items-center justify-between w-full pt-2">
            <div className="flex flex-col gap-[4px]">
              <span className="text-figma-muted font-figma-regular text-figma-11">
                Tokens
              </span>
              <span className="text-figma-white font-figma-bold text-figma-16">
                {profile?.tokenCount ?? 0}
              </span>
            </div>
            <div className="flex flex-col gap-[4px]">
              <span className="text-figma-muted font-figma-regular text-figma-11">
                Graduated
              </span>
              <span className="text-figma-white font-figma-bold text-figma-16">
                {profile?.graduatedCount ?? 0}
              </span>
            </div>
            <div className="flex flex-col gap-[4px]">
              <span className="text-figma-muted font-figma-regular text-figma-11">
                Buy Vol
              </span>
              <span className="text-figma-white font-figma-bold text-figma-16">
                {profile ? formatMon(profile.totalBuyVolume) : "0"} MON
              </span>
            </div>
            <div className="flex flex-col gap-[4px]">
              <span className="text-figma-muted font-figma-regular text-figma-11">
                Sell Vol
              </span>
              <span className="text-figma-white font-figma-bold text-figma-16">
                {profile ? formatMon(profile.totalSellVolume) : "0"} MON
              </span>
            </div>
          </div>
        </div>

        {/* ── Portfolio Summary ── */}
        <PortfolioSummary
          address={addr}
          holdingsValueMon={holdingsTotals.totalValueMon}
          holdingsCostBasisMon={holdingsTotals.totalCostBasisMon}
          holdingsCount={holdingsTotals.count}
          isLoading={holdingsLoading}
        />

        {/* ── Holdings (Tokens Bought) ── */}
        <div className="w-full">
          <h2 className="text-figma-white font-figma-bold text-figma-16 mb-3">
            Holdings
          </h2>
          <HoldingsList
            holdings={holdings}
            isLoading={holdingsLoading}
            monUsdPrice={monUsdPrice}
          />
        </div>

        {/* ── Badges Section ── */}
        {reputation && reputation.badges.length > 0 && (
          <div className="w-full">
            <h2 className="text-figma-white font-figma-bold text-figma-16 mb-3">
              Achievements
            </h2>
            <BadgeGrid earned={reputation.badges} />
          </div>
        )}

        {/* ── Tokens Created ── */}
        <div className="w-full">
          <h2 className="text-figma-white font-figma-bold text-figma-16 mb-3">
            Tokens Created
          </h2>
          <CreatedTokensList
            tokens={tokens}
            isLoading={tokensLoading}
            creatorFees={creatorFees ?? new Map()}
            feesLoading={feesLoading}
          />
        </div>

        {/* ── Activity Tabs ── */}
        <div className="w-full">
          <h2 className="text-figma-white font-figma-bold text-figma-16 mb-3">
            Activity
          </h2>
          <ActivityTabs
            trades={[]}
            createdTokens={tokens}
            isLoading={holdingsLoading || tokensLoading}
          />
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="text-figma-muted text-figma-13 mt-4 text-center">
            Loading profile data...
          </div>
        )}

        {/* Edit Profile Modal — only rendered for the profile owner */}
        {editOpen && isOwner && (
          <EditProfileModal
            walletAddress={addr}
            currentDisplayName={profileMeta?.displayName ?? ""}
            currentAvatarUrl={profileMeta?.avatarUrl}
            currentXUrl={profileMeta?.xUrl ?? ""}
            currentWebsiteUrl={profileMeta?.websiteUrl ?? ""}
            currentTelegramUrl={profileMeta?.telegramUrl ?? ""}
            onClose={() => setEditOpen(false)}
            onSuccess={() => refetchProfileMeta()}
          />
        )}
      </div>
    </div>
  );
}