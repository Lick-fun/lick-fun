"use client";

import { useRouter } from "next/navigation";
import { useProfileMeta } from "@/lib/hooks/useProfileMeta";
import { KNOWN_ADDRESS_LABELS } from "@/lib/knownAddresses";

interface CreatorBadgeProps {
  address: string;
}

/**
 * Compact creator row used inside TokenCard.
 * Shows a small round avatar + display name (or truncated address).
 * Navigates to the creator's profile page on click.
 *
 * Known contract addresses (e.g. VaultBuybackBurn) are shown with a
 * friendly label and have click navigation disabled.
 *
 * Uses useProfileMeta internally — react-query caches by address so
 * repeated renders across many cards are free after the first fetch.
 *
 * NOTE: rendered as a <button> (not <Link>) because TokenCard is itself
 * wrapped in a parent <Link> to the token detail page — nested <a> tags
 * would cause a React hydration error.
 */
export function CreatorBadge({ address }: CreatorBadgeProps) {
  const router = useRouter();
  const knownLabel = KNOWN_ADDRESS_LABELS[address.toLowerCase()];
  // Skip profile fetch entirely for known contract addresses
  const { data: profileMeta } = useProfileMeta(knownLabel ? "" : address);

  const displayName =
    knownLabel ??
    (profileMeta?.displayName?.trim()
      ? profileMeta.displayName
      : `${address.slice(0, 6)}…${address.slice(-4)}`);

  const avatarUrl = knownLabel ? undefined : profileMeta?.avatarUrl;
  const initials = address.slice(2, 4).toUpperCase();

  const handleClick = (e: React.MouseEvent) => {
    // Known contract addresses are not clickable — no profile page
    if (knownLabel) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    // Prevent the parent card <Link> from navigating to the token page
    e.stopPropagation();
    e.preventDefault();
    router.push(`/profile/${address.toLowerCase()}`);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-[5px] transition-opacity w-fit bg-transparent border-none p-0 ${knownLabel ? "cursor-default" : "hover:opacity-80 cursor-pointer"}`}
      title={knownLabel ? displayName : `View profile of ${displayName}`}
    >
      {/* Avatar */}
      <span
        className="inline-flex items-center justify-center shrink-0 overflow-hidden bg-figma-card-alt text-figma-muted font-figma-bold"
        style={{
          width: "14px",
          height: "14px",
          borderRadius: "50%",
          fontSize: "7px",
          lineHeight: "1",
        }}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          initials
        )}
      </span>

      {/* "by [name]" */}
      <span
        className="text-figma-muted font-figma-regular truncate"
        style={{ fontSize: "9px", lineHeight: "1.2" }}
      >
        by{" "}
        <span className="text-figma-white font-figma-bold">{displayName}</span>
      </span>
    </button>
  );
}