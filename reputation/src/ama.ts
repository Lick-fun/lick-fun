/**
 * Lickfun.xyz Engagement Layer — AMA Window Types
 * Stage 5: Pure TypeScript types + validation for optional time-boxed AMA windows.
 *
 * No persistence — the frontend manages AMA state.
 * These types define the contract's intended behavior for post-launch implementation.
 */

import type { ProfileEntity, TokenEntity } from "./types";

/* ──────────────────────────────────────────────────────────────────────────────── */
/* AMA Types                                                                       */
/* ──────────────────────────────────────────────────────────────────────────────── */

export type AMAStatus = "upcoming" | "active" | "closed";

export interface AMAWindow {
  /** The creator hosting the AMA */
  creator: ProfileEntity;
  /** The token associated with this AMA */
  token: TokenEntity;
  /** Unix timestamp (seconds) when the AMA opens */
  startTime: number;
  /** Unix timestamp (seconds) when the AMA closes */
  endTime: number;
  /** Current status of the AMA window */
  status: AMAStatus;
}

export interface AMAValidationResult {
  valid: boolean;
  errors: string[];
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Validation                                                                      */
/* ──────────────────────────────────────────────────────────────────────────────── */

/**
 * Check whether an AMA window is currently open.
 * @param window The AMA window to check.
 * @param nowSeconds Optional override for the current time (defaults to Date.now() / 1000).
 * @returns true if the AMA is active right now.
 */
export function isAMAOpen(window: AMAWindow, nowSeconds?: number): boolean {
  const t = nowSeconds ?? Math.floor(Date.now() / 1000);
  return t >= window.startTime && t < window.endTime;
}

/**
 * Determine the status of an AMA window based on the current time.
 * @param window The AMA window to evaluate.
 * @param nowSeconds Optional override for the current time (defaults to Date.now() / 1000).
 * @returns The computed AMAStatus.
 */
export function computeAMAStatus(window: AMAWindow, nowSeconds?: number): AMAStatus {
  const t = nowSeconds ?? Math.floor(Date.now() / 1000);
  if (t < window.startTime) return "upcoming";
  if (t >= window.endTime) return "closed";
  return "active";
}

/**
 * Validate an AMA window configuration.
 * Checks that timestamps are sensible and the token/creator are defined.
 * @param window The AMA window to validate.
 * @returns AMAValidationResult with errors array.
 */
export function validateAMAWindow(window: AMAWindow): AMAValidationResult {
  const errors: string[] = [];

  if (!window.creator || !window.creator.id) {
    errors.push("creator profile is required");
  }
  if (!window.token || !window.token.id) {
    errors.push("token entity is required");
  }
  if (typeof window.startTime !== "number" || window.startTime <= 0) {
    errors.push("startTime must be a positive number (unix seconds)");
  }
  if (typeof window.endTime !== "number" || window.endTime <= 0) {
    errors.push("endTime must be a positive number (unix seconds)");
  }
  if (
    typeof window.startTime === "number" &&
    typeof window.endTime === "number" &&
    window.startTime >= window.endTime
  ) {
    errors.push("startTime must be before endTime");
  }
  if (
    window.status &&
    !["upcoming", "active", "closed"].includes(window.status)
  ) {
    errors.push(
      `invalid status "${window.status}"; must be "upcoming", "active", or "closed"`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Build a default AMA window (30 minutes) starting now.
 * @param creator The creator profile.
 * @param token The token entity.
 * @param durationSeconds Optional duration in seconds (defaults to 1800 = 30 min).
 * @returns A pre-filled AMAWindow with status "active".
 */
export function createAMAWindow(
  creator: ProfileEntity,
  token: TokenEntity,
  durationSeconds: number = 1800,
): AMAWindow {
  const now = Math.floor(Date.now() / 1000);
  return {
    creator,
    token,
    startTime: now,
    endTime: now + durationSeconds,
    status: "active",
  };
}