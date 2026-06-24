import { describe, it, expect } from "vitest";
import { tokenLaunched, tokenGraduated, profileTierUp, badgeEarned } from "../broadcasts";
import type { BroadcastPayload } from "../broadcasts";
import type { ProfileEntity, TokenEntity, Badge, Tier } from "../types";

/**
 * Build a minimal ProfileEntity for testing.
 */
function makeProfile(id: string): ProfileEntity {
  return {
    id,
    createdAt: 1700000000n,
    tokenCount: 3,
    graduatedCount: 1,
    totalBuyVolume: 100000n,
    totalSellVolume: 5000n,
  };
}

/**
 * Build a minimal TokenEntity for testing.
 */
function makeToken(id: string, overrides: Partial<TokenEntity> = {}): TokenEntity {
  return {
    id,
    creator: overrides.creator ?? "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    name: overrides.name ?? "Lick Dog",
    symbol: overrides.symbol ?? "LICK",
    curve: overrides.curve ?? "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    virtualMon: 80000n * 10n ** 18n,
    virtualTokens: 477000000n * 10n ** 18n,
    targetTokenAmount: 1000000000n * 10n ** 18n,
    startTime: 1700000000n,
    startBlock: 100n,
    realMon: 0n,
    soldTokens: 0n,
    graduated: false,
    createdAt: 1700000000n,
    graduatedAt: null,
    buyCount: 0,
    sellCount: 0,
    totalBuyVolume: 0n,
    totalSellVolume: 0n,
    uniqueBuyerCount: 0,
    creatorSellCount: 0,
    ...overrides,
  };
}

const FIXED_TIMESTAMP = 1717200000;

describe("broadcasts", () => {
  describe("tokenLaunched", () => {
    it("should generate a token_launched broadcast payload", () => {
      const profile = makeProfile("0x1234567890123456789012345678901234567890");
      const token = makeToken("0x7777777777777777777777777777777777777777", {
        name: "Pickle Rick",
        symbol: "PICKLE",
      });

      const result = tokenLaunched({ profile, token }, FIXED_TIMESTAMP);

      const expected: BroadcastPayload = {
        type: "token_launched",
        message: "0x1234...7890 just launched $PICKLE",
        metadata: {
          creator: profile.id,
          token: token.id,
          name: "Pickle Rick",
          symbol: "PICKLE",
          curve: token.curve,
        },
        timestamp: FIXED_TIMESTAMP,
      };

      expect(result).toEqual(expected);
    });

    it("should use creatorName override when provided", () => {
      const profile = makeProfile("0xdeadbeef00000000000000000000000000000000");
      const token = makeToken("0x1111111111111111111111111111111111111111", {
        name: "Moon Cat",
        symbol: "MOON",
      });

      const result = tokenLaunched(
        { profile, token, creatorName: "satoshifriend.eth" },
        FIXED_TIMESTAMP,
      );

      expect(result.message).toBe("satoshifriend.eth just launched $MOON");
      expect(result.metadata.creator).toBe(profile.id);
      expect(result.metadata.symbol).toBe("MOON");
    });
  });

  describe("tokenGraduated", () => {
    it("should generate a token_graduated broadcast payload using token symbol", () => {
      const profile = makeProfile("0xaaaa0000000000000000000000000000000000");
      const token = makeToken("0x2222222222222222222222222222222222222222", {
        symbol: "WOOF",
        graduated: true,
        graduatedAt: 1710000000n,
      });

      const result = tokenGraduated({ profile, token }, FIXED_TIMESTAMP);

      const expected: BroadcastPayload = {
        type: "token_graduated",
        message: "$WOOF graduated! DEX trading live",
        metadata: {
          creator: profile.id,
          token: token.id,
          symbol: "WOOF",
          graduatedAt: 1710000000n,
        },
        timestamp: FIXED_TIMESTAMP,
      };

      expect(result).toEqual(expected);
    });

    it("should use explicit symbol override", () => {
      const profile = makeProfile("0xbbbb0000000000000000000000000000000000");
      const token = makeToken("0x3333333333333333333333333333333333333333", {
        symbol: "BARK",
      });

      const result = tokenGraduated(
        { profile, token, symbol: "EXTRA" },
        FIXED_TIMESTAMP,
      );

      expect(result.message).toBe("$EXTRA graduated! DEX trading live");
      expect(result.metadata.symbol).toBe("EXTRA");
    });
  });

  describe("profileTierUp", () => {
    it("should generate a profile_tier_up broadcast payload", () => {
      const profile = makeProfile("0xcccc0000000000000000000000000000000000");

      const result = profileTierUp(
        {
          profile,
          oldTier: "Starter" as Tier,
          newTier: "Established" as Tier,
        },
        FIXED_TIMESTAMP,
      );

      const expected: BroadcastPayload = {
        type: "profile_tier_up",
        message: "0xcccc...0000 reached Established",
        metadata: {
          creator: profile.id,
          oldTier: "Starter",
          newTier: "Established",
        },
        timestamp: FIXED_TIMESTAMP,
      };

      expect(result).toEqual(expected);
    });

    it("should use creatorName override when provided", () => {
      const profile = makeProfile("0xdddd0000000000000000000000000000000000");

      const result = profileTierUp(
        {
          profile,
          oldTier: "Established" as Tier,
          newTier: "Verified" as Tier,
          creatorName: "vitalik.eth",
        },
        FIXED_TIMESTAMP,
      );

      expect(result.message).toBe("vitalik.eth reached Verified");
      expect(result.metadata.oldTier).toBe("Established");
      expect(result.metadata.newTier).toBe("Verified");
    });
  });

  describe("badgeEarned", () => {
    it("should generate a badge_earned broadcast payload", () => {
      const profile = makeProfile("0xeeee0000000000000000000000000000000000");

      const result = badgeEarned(
        {
          profile,
          badge: "Never Rug" as Badge,
        },
        FIXED_TIMESTAMP,
      );

      const expected: BroadcastPayload = {
        type: "badge_earned",
        message: "0xeeee...0000 earned Never Rug",
        metadata: {
          creator: profile.id,
          badge: "Never Rug",
        },
        timestamp: FIXED_TIMESTAMP,
      };

      expect(result).toEqual(expected);
    });

    it("should use creatorName override when provided", () => {
      const profile = makeProfile("0xffff0000000000000000000000000000000000");

      const result = badgeEarned(
        {
          profile,
          badge: "OG" as Badge,
          creatorName: "deployer.lick",
        },
        FIXED_TIMESTAMP,
      );

      expect(result.message).toBe("deployer.lick earned OG");
      expect(result.metadata.badge).toBe("OG");
    });
  });
});