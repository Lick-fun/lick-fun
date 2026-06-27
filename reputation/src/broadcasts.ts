/**
 * Lickfun.xyz Engagement Layer — System Broadcasts
 * Stage 5: Pure functions that generate structured broadcast messages
 * from indexed events. The frontend (Stage 7) renders these.
 *
 * No polling, no push — just pure functions.
 */

import type { Badge, Tier, ProfileEntity, TokenEntity } from "./types";

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Broadcast Payload Types                                                         */
/* ──────────────────────────────────────────────────────────────────────────────── */

export type BroadcastType =
  | "token_launched"
  | "token_graduated"
  | "profile_tier_up"
  | "badge_earned";

export interface BroadcastPayload {
  type: BroadcastType;
  message: string;
  metadata: Record<string, unknown>;
  timestamp: number;
}

export interface TokenLaunchedParams {
  /** The creator profile */
  profile: ProfileEntity;
  /** The token that was launched */
  token: TokenEntity;
  /** Optional override for the creator display name */
  creatorName?: string;
}

export interface TokenGraduatedParams {
  /** The creator profile */
  profile: ProfileEntity;
  /** The token that graduated */
  token: TokenEntity;
  /** The token symbol (e.g. "LICK") */
  symbol?: string;
}

export interface ProfileTierUpParams {
  /** The creator profile */
  profile: ProfileEntity;
  /** The tier the creator moved from */
  oldTier: Tier;
  /** The tier the creator moved to */
  newTier: Tier;
  /** Optional override for the creator display name */
  creatorName?: string;
}

export interface BadgeEarnedParams {
  /** The creator profile */
  profile: ProfileEntity;
  /** The badge that was earned */
  badge: Badge;
  /** Optional override for the creator display name */
  creatorName?: string;
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                         */
/* ──────────────────────────────────────────────────────────────────────────────── */

/**
 * Derive a display name from the profile's address.
 * Falls back to a shortened hex string if no ENS-like name is available.
 */
function displayName(profile: ProfileEntity, override?: string): string {
  if (override) return override;
  // Use a shortened address as the display name
  const addr = profile.id;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * Generate a monotonically-increasing timestamp.
 * By default uses Date.now() — the caller can pass an explicit value.
 */
function now(ts?: number): number {
  return ts ?? Math.floor(Date.now() / 1000);
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Broadcast Functions                                                             */
/* ──────────────────────────────────────────────────────────────────────────────── */

/**
 * "CreatorName just launched TOKEN"
 */
export function tokenLaunched(params: TokenLaunchedParams, ts?: number): BroadcastPayload {
  const name = displayName(params.profile, params.creatorName);
  const symbol = params.token.symbol;

  return {
    type: "token_launched",
    message: `${name} just launched $${symbol}`,
    metadata: {
      creator: params.profile.id,
      token: params.token.id,
      name: params.token.name,
      symbol: params.token.symbol,
      curve: params.token.curve,
    },
    timestamp: now(ts),
  };
}

/**
 * "TOKEN graduated! DEX trading live"
 */
export function tokenGraduated(params: TokenGraduatedParams, ts?: number): BroadcastPayload {
  const symbol = params.symbol ?? params.token.symbol;

  return {
    type: "token_graduated",
    message: `$${symbol} graduated! DEX trading live`,
    metadata: {
      creator: params.profile.id,
      token: params.token.id,
      symbol,
      graduatedAt: params.token.graduatedAt ?? null,
    },
    timestamp: now(ts),
  };
}

/**
 * "CreatorName reached Established/Verified"
 */
export function profileTierUp(params: ProfileTierUpParams, ts?: number): BroadcastPayload {
  const name = displayName(params.profile, params.creatorName);

  return {
    type: "profile_tier_up",
    message: `${name} reached ${params.newTier}`,
    metadata: {
      creator: params.profile.id,
      oldTier: params.oldTier,
      newTier: params.newTier,
    },
    timestamp: now(ts),
  };
}

/**
 * "CreatorName earned BADGE_NAME"
 */
export function badgeEarned(params: BadgeEarnedParams, ts?: number): BroadcastPayload {
  const name = displayName(params.profile, params.creatorName);

  return {
    type: "badge_earned",
    message: `${name} earned ${params.badge}`,
    metadata: {
      creator: params.profile.id,
      badge: params.badge,
    },
    timestamp: now(ts),
  };
}