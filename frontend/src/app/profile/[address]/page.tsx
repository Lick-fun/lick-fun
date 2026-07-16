"use client";

import { useParams } from "next/navigation";
import { Copy, Check, ExternalLink, Pencil, Globe, Send } from "lucide-react";
import { useState, useMemo } from "react";
import { TierBadge } from "@/components/reputation/TierBadge";
import { ReputationScore } from "@/components/reputation/ReputationScore";
import { BadgeGrid } from "@/components/reputation/BadgeGrid";
import { PortfolioSummary } from "@/components/profile/PortfolioSummary";
import { HoldingsList } from "@/components/profile/HoldingsList";
import { CreatedTokensList } from "@/components/profile/CreatedTokensList";
import { ActivityTabs } from "@/components/profile/ActivityTabs";
import { useProfile, useTokensByCreator, useTokensMeta } from "@/lib/hooks/useData";
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

  // Holdings (tokens the user bought) + raw trades for ActivityTabs
  const { holdings, trades: holdingTrades, totals: holdingsTotals, isLoading: holdingsLoading } =
    useTokenHoldings(addr, monUsdPrice);

  // Creator fees for tokens created by this user
  const { data: creatorFees, isLoading: feesLoading } = useCreatorFees(addr);

  // Resolve real on-chain name/symbol for tokens whose indexer values are blank
  // (the Envio indexer intentionally stores empty name/symbol strings — see
  // resolveTokenMeta / useTokenMeta pattern on the token detail page).
  // Applies to both "Tokens Created" (keyed by `id`) and "Holdings" (keyed by `tokenId`).
  const tokensResolved = useTokensMeta(tokens);

  // Holdings use `tokenId` as the id field — adapt to the {id,name,symbol} shape
  // useTokensMeta expects, resolve, then merge resolved name/symbol back.
  const holdingsForResolution = useMemo(
    () =>
      holdings.map((h) => ({ id: h.tokenId, name: h.name, symbol: h.symbol })),
    [holdings]
  );
  const holdingsResolvedRaw = useTokensMeta(holdingsForResolution);
  const holdingsResolved = useMemo(
    () =>
      holdings.map((h, i) => {
        const r = holdingsResolvedRaw[i];
        return r && (!h.name || !h.symbol)
          ? { ...h, name: r.name || h.name, symbol: r.symbol || h.symbol }
          : h;
      }),
    [holdings, holdingsResolvedRaw]
  );

  // Resolve real on-chain name/symbol for trades whose nested token join is
  // blank (same Envio empty-name issue as holdings). Dedupe by token_id so the
  // multicall only fires once per distinct token, then merge resolved values
  // back into each trade's `token` field for ActivityTabs to render.
  const tradesForResolution = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; symbol: string }>();
    for (const t of holdingTrades) {
      const id = t.token_id.toLowerCase();
      if (!seen.has(id)) {
        seen.set(id, {
          id,
          name: t.token?.name ?? "",
          symbol: t.token?.symbol ?? "",
        });
      }
    }
    return Array.from(seen.values());
  }, [holdingTrades]);
  const tradesResolvedRaw = useTokensMeta(tradesForResolution);
  const tradesResolved = useMemo(() => {
    if (!holdingTrades.length) return holdingTrades;
    const map = new Map<string, { name: string; symbol: string }>();
    for (const r of tradesResolvedRaw) {
      map.set(r.id.toLowerCase(), { name: r.name, symbol: r.symbol });
    }
    return holdingTrades.map((t) => {
      const r = map.get(t.token_id.toLowerCase());
      if (!r) return t;
      const existingName = t.token?.name?.trim();
      const existingSymbol = t.token?.symbol?.trim();
      // Only overwrite when the indexer value was blank
      if (existingName && existingSymbol) return t;
      return {
        ...t,
        token: {
          id: t.token_id,
          name: existingName || r.name || "",
          symbol: existingSymbol || r.symbol || "",
        },
      };
    });
  }, [holdingTrades, tradesResolvedRaw]);

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
            background: "rgba(19, 10, 34, 0.88)",
            border: "1px solid rgba(139, 61, 255, 0.2)",
            boxShadow: "0 24px 80px -48px rgba(139, 61, 255, 0.75)",
            borderRadius: "24px",
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
            holdings={holdingsResolved}
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
            tokens={tokensResolved}
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
            trades={tradesResolved}
            createdTokens={tokensResolved}
            isLoading={holdingsLoading || tokensLoading}
            monUsdPrice={monUsdPrice}
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
