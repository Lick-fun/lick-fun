/**
 * Lickfun.xyz Engagement Layer — Reputation Staking Types
 * Stage 5: Pure TypeScript types + validation functions for the staking interface.
 *
 * "If creator behaves, both gain. If creator rugs, both lose."
 *
 * For now: pure types + validation functions. No on-chain contract.
 * These types define the contract's intended behavior for post-launch implementation.
 */

import type { ProfileEntity, Tier } from "./types";

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Staking Types                                                                    */
/* ──────────────────────────────────────────────────────────────────────────────── */

/**
 * Direction of the staking relationship.
 * - "backing": the staker is backing a creator (staker → creator)
 * - "staked-by": the creator is staked by a supporter (creator → staker)
 */
export type StakeDirection = "backing" | "staked-by";

/**
 * Represents an active stake from one profile to another.
 */
export interface ProfileStake {
  /** The profile that initiated the stake (staker) */
  staker: ProfileEntity;
  /** The creator being backed */
  creator: ProfileEntity;
  /** Amount of reputation staked (0-100 scale) */
  amount: number;
  /** Unix timestamp when the stake was created */
  stakedAt: number;
  /** Whether the stake is currently active */
  active: boolean;
  /** Direction of the stake relationship */
  direction: StakeDirection;
}

export interface StakingValidationResult {
  valid: boolean;
  errors: string[];
}

export interface StakeResult {
  success: boolean;
  message: string;
  stake?: ProfileStake;
}

export interface UnstakeResult {
  success: boolean;
  message: string;
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Constants                                                                        */
/* ──────────────────────────────────────────────────────────────────────────────── */

/** Minimum reputation score required to stake */
export const MIN_REPUTATION_TO_STAKE = 10;

/** Maximum amount of reputation that can be staked at once */
export const MAX_STAKE_AMOUNT = 100;

/** Minimum stake amount */
export const MIN_STAKE_AMOUNT = 1;

/** How long a stake must remain active before unstaking (seconds) */
export const MIN_STAKE_DURATION = 86400; // 24 hours

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Validation                                                                       */
/* ──────────────────────────────────────────────────────────────────────────────── */

/**
 * Validate that a staker can back a creator.
 * Checks:
 *  - Both profiles exist
 *  - Staker has sufficient reputation
 *  - Staker is not staking themselves
 *  - Amount is within valid range
 *  - Creator has a valid tier
 *
 * @param staker  The profile doing the staking.
 * @param creator The creator profile being backed.
 * @param amount  The amount of reputation to stake.
 * @returns StakingValidationResult with errors array.
 */
export function validateStake(
  staker: ProfileEntity,
  creator: ProfileEntity,
  amount: number,
): StakingValidationResult {
  const errors: string[] = [];

  if (!staker || !staker.id) {
    errors.push("staker profile is required");
  }
  if (!creator || !creator.id) {
    errors.push("creator profile is required");
  }

  if (staker && creator && staker.id === creator.id) {
    errors.push("cannot stake on yourself");
  }

  if (typeof amount !== "number" || amount < MIN_STAKE_AMOUNT) {
    errors.push(`stake amount must be at least ${MIN_STAKE_AMOUNT}`);
  }
  if (typeof amount === "number" && amount > MAX_STAKE_AMOUNT) {
    errors.push(`stake amount cannot exceed ${MAX_STAKE_AMOUNT}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate that a staker can unstake from a creator.
 * Checks:
 *  - Both profiles exist
 *  - Stake exists and is active
 *  - Minimum stake duration has elapsed
 *
 * @param staker  The profile doing the unstaking.
 * @param creator The creator being unstaked from.
 * @param stake   The existing stake record.
 * @param nowSeconds Optional override for current time.
 * @returns StakingValidationResult with errors array.
 */
export function validateUnstake(
  staker: ProfileEntity,
  creator: ProfileEntity,
  stake: ProfileStake,
  nowSeconds?: number,
): StakingValidationResult {
  const errors: string[] = [];
  const now = nowSeconds ?? Math.floor(Date.now() / 1000);

  if (!staker || !staker.id) {
    errors.push("staker profile is required");
  }
  if (!creator || !creator.id) {
    errors.push("creator profile is required");
  }
  if (!stake) {
    errors.push("stake record is required");
    return { valid: false, errors };
  }

  if (stake.staker.id !== staker.id) {
    errors.push("stake does not belong to this staker");
  }
  if (stake.creator.id !== creator.id) {
    errors.push("stake is not for this creator");
  }
  if (!stake.active) {
    errors.push("stake is not active");
  }
  if (now - stake.stakedAt < MIN_STAKE_DURATION) {
    errors.push(
      `stake must remain active for at least ${MIN_STAKE_DURATION} seconds before unstaking`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Stake / Unstake Logic (intended behavior — no persistence)                       */
/* ──────────────────────────────────────────────────────────────────────────────── */

/**
 * Create a stake from a staker to a creator.
 * Intended behavior: the staker backs the creator with their reputation.
 * If the creator behaves (graduates tokens, earns badges), both gain reputation.
 * If the creator rugs, both lose reputation.
 *
 * @param staker  The profile doing the staking.
 * @param creator The creator being backed.
 * @param amount  The amount of reputation to stake.
 * @returns StakeResult with success flag and optional stake record.
 */
export function stakeProfile(
  staker: ProfileEntity,
  creator: ProfileEntity,
  amount: number,
): StakeResult {
  const validation = validateStake(staker, creator, amount);
  if (!validation.valid) {
    return {
      success: false,
      message: `Stake validation failed: ${validation.errors.join("; ")}`,
    };
  }

  const stake: ProfileStake = {
    staker,
    creator,
    amount,
    stakedAt: Math.floor(Date.now() / 1000),
    active: true,
    direction: "backing",
  };

  return {
    success: true,
    message: `${staker.id.slice(0, 6)}... staked ${amount} reputation on ${creator.id.slice(0, 6)}...`,
    stake,
  };
}

/**
 * Unstake a profile from a creator.
 * Intended behavior: the staker withdraws their reputation backing.
 * Reputation gains/losses are settled at the time of unstaking.
 *
 * @param staker  The profile doing the unstaking.
 * @param creator The creator being unstaked from.
 * @param stake   The existing stake record.
 * @returns UnstakeResult with success flag.
 */
export function unstakeProfile(
  staker: ProfileEntity,
  creator: ProfileEntity,
  stake: ProfileStake,
): UnstakeResult {
  const validation = validateUnstake(staker, creator, stake);
  if (!validation.valid) {
    return {
      success: false,
      message: `Unstake validation failed: ${validation.errors.join("; ")}`,
    };
  }

  return {
    success: true,
    message: `${staker.id.slice(0, 6)}... withdrew ${stake.amount} reputation backing from ${creator.id.slice(0, 6)}...`,
  };
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Description                                                                      */
/* ──────────────────────────────────────────────────────────────────────────────── */

/**
 * Get the staking mechanism description.
 * Explains the intended behavior of the staking system.
 */
export function getStakingDescription(): string {
  return (
    "If creator behaves, both gain. If creator rugs, both lose. " +
    "Stakers back creators with their reputation. When a backed creator " +
    "graduates tokens or earns badges, both staker and creator gain reputation. " +
    "If the creator rugs (token fails to graduate with malicious intent), " +
    "both the creator and all stakers lose reputation proportionally."
  );
}