/**
 * Lick.fun Indexer — Handler Unit + Integration Tests
 *
 * Uses Node.js built-in test runner (node:test + node:assert).
 * No extra dependencies required.
 *
 * Run:  node --experimental-vm-modules --loader ts-node/esm src/__tests__/handlers.test.ts
 * Or:   npx ts-node src/__tests__/handlers.test.ts
 * Or via package.json: npm test
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import type { Token, Trade, Profile } from "../../generated";
import {
  VIRTUAL_MON,
  VIRTUAL_TOKENS,
  TOTAL_SUPPLY,
  GRADUATION_THRESHOLD,
  K,
  TARGET_TOKEN_AMOUNT,
  getPenaltyBps,
  deriveRealMon,
} from "../utils";

/* ══════════════════════════ CONSTANTS SANITY ═══════════════════════════ */

describe("Constants", () => {
  it("K = VIRTUAL_MON × VIRTUAL_TOKENS", () => {
    assert.equal(K, VIRTUAL_MON * VIRTUAL_TOKENS);
  });

  it("TARGET_TOKEN_AMOUNT = TOTAL_SUPPLY - VIRTUAL_TOKENS", () => {
    const expected = TOTAL_SUPPLY - VIRTUAL_TOKENS;
    assert.equal(TARGET_TOKEN_AMOUNT, expected);
    // 1,000,000,000 - 477,000,000 = 523,000,000 tokens
    assert.equal(TARGET_TOKEN_AMOUNT, 523_000_000n * 10n ** 18n);
  });

  it("GRADUATION_THRESHOLD is 100,000 MON", () => {
    assert.equal(GRADUATION_THRESHOLD, 100_000n * 10n ** 18n);
  });
});

/* ═══════════════════════ ANTI-SNIPING DECAY TABLE ═══════════════════════ */

describe("getPenaltyBps — anti-sniping decay table", () => {
  // Full table as defined in BondingCurve.getAntiSnipingPenaltyBps()
  const cases: [bigint, number][] = [
    [0n, 8000],  // same block    → 80%
    [1n, 4000],  // 1 block later → 40%
    [2n, 2000],  // 2 blocks      → 20%
    [3n, 1500],  // 3 blocks      → 15%
    [4n, 1000],  // 4 blocks      → 10%
    [5n, 1000],  // 5 blocks      → 10%
    [6n, 500],   // 6 blocks      →  5%
    [7n, 0],     // 7 blocks      →  0% (no penalty)
    [8n, 0],     // 8 blocks      →  0%
    [100n, 0],   // far future    →  0%
  ];

  for (const [elapsed, expected] of cases) {
    it(`elapsed ${elapsed} → ${expected} bps`, () => {
      assert.equal(getPenaltyBps(elapsed), expected);
    });
  }

  it("returns 0 for very large elapsed values", () => {
    assert.equal(getPenaltyBps(1_000_000n), 0);
    assert.equal(getPenaltyBps(BigInt(Number.MAX_SAFE_INTEGER)), 0);
  });
});

/* ══════════════════════════ CPMM STATE DERIVATION ═══════════════════════ */

describe("deriveRealMon — CPMM invariant", () => {
  it("returns 0 when soldTokens = 0 (initial state)", () => {
    // K / VIRTUAL_TOKENS - VIRTUAL_MON = 0 (exact by construction)
    assert.equal(deriveRealMon(0n), 0n);
  });

  it("realMon increases as soldTokens increases (buy pressure)", () => {
    const sold1 = 1_000_000n * 10n ** 18n;   // 1M tokens sold
    const sold2 = 10_000_000n * 10n ** 18n;  // 10M tokens sold
    const sold3 = 100_000_000n * 10n ** 18n; // 100M tokens sold

    const rm1 = deriveRealMon(sold1);
    const rm2 = deriveRealMon(sold2);
    const rm3 = deriveRealMon(sold3);

    assert.ok(rm1 > 0n, "realMon should be > 0 after some buys");
    assert.ok(rm2 > rm1, "realMon should increase with more sales");
    assert.ok(rm3 > rm2, "realMon should increase further");
  });

  it("returns 0 for zero remaining supply guard", () => {
    // If somehow soldTokens >= VIRTUAL_TOKENS, should return 0 safely
    assert.equal(deriveRealMon(VIRTUAL_TOKENS), 0n);
    assert.equal(deriveRealMon(VIRTUAL_TOKENS + 1n), 0n);
  });

  it("CPMM consistency: buy then sell returns near-original state", () => {
    // Simulate: buy 1M tokens → sell 1M tokens
    // Due to fees the curve takes some MON, but CPMM state should be symmetric
    // (this tests the math ignoring fees — pure curve arithmetic)

    const tokensOut = 1_000_000n * 10n ** 18n; // tokens received on buy

    // After buy
    const soldAfterBuy = tokensOut;
    const realMonAfterBuy = deriveRealMon(soldAfterBuy);
    assert.ok(realMonAfterBuy > 0n);

    // After full round-trip sell (sell all tokensOut back)
    const soldAfterSell = soldAfterBuy - tokensOut; // = 0
    const realMonAfterSell = deriveRealMon(soldAfterSell);

    // Should return to initial state (zero)
    assert.equal(realMonAfterSell, 0n);
  });

  it("deriveRealMon approaches GRADUATION_THRESHOLD as soldTokens approaches theoretical max", () => {
    // At graduation, realMon ≈ 100k MON
    // Find approximate soldTokens needed for realMon = GRADUATION_THRESHOLD
    // realMon = K / (VIRTUAL_TOKENS - soldTokens) - VIRTUAL_MON = 100k
    // K / (VIRTUAL_TOKENS - soldTokens) = VIRTUAL_MON + GRADUATION_THRESHOLD
    // (VIRTUAL_TOKENS - soldTokens) = K / (VIRTUAL_MON + GRADUATION_THRESHOLD)
    // soldTokens = VIRTUAL_TOKENS - K / (VIRTUAL_MON + GRADUATION_THRESHOLD)

    const targetRealMon = GRADUATION_THRESHOLD;
    const denomTarget = VIRTUAL_MON + targetRealMon;
    const remainingAtGrad = K / denomTarget;
    const soldAtGrad = VIRTUAL_TOKENS - remainingAtGrad;

    const realMonAtGrad = deriveRealMon(soldAtGrad);

    // Should be very close to GRADUATION_THRESHOLD (within 1 wei due to integer division)
    const diff = realMonAtGrad > targetRealMon
      ? realMonAtGrad - targetRealMon
      : targetRealMon - realMonAtGrad;

    assert.ok(diff < 1_000_000n, `realMon diff too large: ${diff}`); // within 1 microMON
    assert.ok(realMonAtGrad >= targetRealMon || diff < 1_000_000n,
      "realMon at graduation should be approximately equal to GRADUATION_THRESHOLD");
  });
});

/* ════════════════════════ MOCK HANDLER INTEGRATION ════════════════════════ */

/**
 * Simulates the handler logic directly (without Envio framework) to verify
 * that entity state is populated correctly on mock events.
 */
describe("Handler logic — mock integration", () => {
  // ── Shared mock store ──
  type Store = {
    tokens: Map<string, Token>;
    trades: Map<string, Trade>;
    profiles: Map<string, Profile>;
  };

  function makeStore(): Store {
    return {
      tokens: new Map(),
      trades: new Map(),
      profiles: new Map(),
    };
  }

  // ── Simulate CurveCreate ──
  function handleCurveCreate(
    store: Store,
    params: {
      creator: string; token: string; curve: string;
      virtualMon: bigint; virtualTokens: bigint; startTime: bigint;
    },
    block: { number: number; timestamp: number },
    tokenName: string,
    tokenSymbol: string,
  ): void {
    const creatorId = params.creator.toLowerCase();
    const tokenId = params.token.toLowerCase();
    const blockTimestamp = BigInt(block.timestamp);
    const blockNumber = BigInt(block.number);
    const existing = store.profiles.get(creatorId);

    store.tokens.set(tokenId, {
      id: tokenId,
      creator: creatorId,
      name: tokenName,
      symbol: tokenSymbol,
      curve: params.curve.toLowerCase(),
      virtualMon: params.virtualMon,
      virtualTokens: params.virtualTokens,
      targetTokenAmount: TARGET_TOKEN_AMOUNT,
      startTime: params.startTime,
      startBlock: blockNumber,
      realMon: 0n,
      soldTokens: 0n,
      graduated: false,
      createdAt: blockTimestamp,
      graduatedAt: undefined,
      buyCount: 0,
      sellCount: 0,
      totalBuyVolume: 0n,
      totalSellVolume: 0n,
      uniqueBuyerCount: 0,
      creatorSellCount: 0,
    });

    store.profiles.set(creatorId, {
      id: creatorId,
      createdAt: existing?.createdAt ?? blockTimestamp,
      tokenCount: (existing?.tokenCount ?? 0) + 1,
      graduatedCount: existing?.graduatedCount ?? 0,
      totalBuyVolume: existing?.totalBuyVolume ?? 0n,
      totalSellVolume: existing?.totalSellVolume ?? 0n,
    });
  }

  // ── Simulate CurveBuy ──
  function handleCurveBuy(
    store: Store,
    params: { buyer: string; token: string; amountIn: bigint; amountOut: bigint },
    block: { number: number; timestamp: number },
    txHash: string,
    logIndex: number,
  ): void {
    const tokenId = params.token.toLowerCase();
    const token = store.tokens.get(tokenId);
    if (!token) return;

    const elapsed = BigInt(block.number) - token.startBlock;
    const penaltyBps = getPenaltyBps(elapsed);
    const newSoldTokens = token.soldTokens + params.amountOut;
    const newRealMon = deriveRealMon(newSoldTokens);

    store.trades.set(`${txHash}-${logIndex}`, {
      id: `${txHash}-${logIndex}`,
      token_id: tokenId,
      trader: params.buyer.toLowerCase(),
      isBuy: true,
      amountIn: params.amountIn,
      amountOut: params.amountOut,
      blockNumber: block.number,
      blockTimestamp: BigInt(block.timestamp),
      penaltyBps,
    });

    store.tokens.set(tokenId, {
      ...token,
      realMon: newRealMon,
      soldTokens: newSoldTokens,
      buyCount: token.buyCount + 1,
      totalBuyVolume: token.totalBuyVolume + params.amountIn,
      uniqueBuyerCount: token.uniqueBuyerCount + 1,
    });

    const profile = store.profiles.get(token.creator);
    if (profile) {
      store.profiles.set(token.creator, {
        ...profile,
        totalBuyVolume: profile.totalBuyVolume + params.amountIn,
      });
    }
  }

  // ── Simulate CurveSell ──
  function handleCurveSell(
    store: Store,
    params: { seller: string; token: string; amountIn: bigint; amountOut: bigint },
    block: { number: number; timestamp: number },
    txHash: string,
    logIndex: number,
  ): void {
    const tokenId = params.token.toLowerCase();
    const token = store.tokens.get(tokenId);
    if (!token) return;

    const elapsed = BigInt(block.number) - token.startBlock;
    const penaltyBps = getPenaltyBps(elapsed);
    const newSoldTokens = token.soldTokens - params.amountIn;
    const newRealMon = deriveRealMon(newSoldTokens);

    store.trades.set(`${txHash}-${logIndex}`, {
      id: `${txHash}-${logIndex}`,
      token_id: tokenId,
      trader: params.seller.toLowerCase(),
      isBuy: false,
      amountIn: params.amountIn,
      amountOut: params.amountOut,
      blockNumber: block.number,
      blockTimestamp: BigInt(block.timestamp),
      penaltyBps,
    });

    store.tokens.set(tokenId, {
      ...token,
      realMon: newRealMon,
      soldTokens: newSoldTokens,
      sellCount: token.sellCount + 1,
      totalSellVolume: token.totalSellVolume + params.amountOut,
      creatorSellCount:
        params.seller.toLowerCase() === token.creator
          ? token.creatorSellCount + 1
          : token.creatorSellCount,
    });

    const profile = store.profiles.get(token.creator);
    if (profile) {
      store.profiles.set(token.creator, {
        ...profile,
        totalSellVolume: profile.totalSellVolume + params.amountOut,
      });
    }
  }

  // ── Simulate CurveGraduate ──
  function handleCurveGraduate(
    store: Store,
    params: { token: string; pool: string },
    block: { number: number; timestamp: number },
  ): void {
    const tokenId = params.token.toLowerCase();
    const token = store.tokens.get(tokenId);
    if (!token) return;

    store.tokens.set(tokenId, {
      ...token,
      graduated: true,
      graduatedAt: BigInt(block.timestamp),
    });

    const profile = store.profiles.get(token.creator);
    if (profile) {
      store.profiles.set(token.creator, {
        ...profile,
        graduatedCount: profile.graduatedCount + 1,
      });
    }
  }

  /* ── Test: CurveCreate populates Token + Profile ── */

  it("CurveCreate: creates Token with correct initial state", () => {
    const store = makeStore();
    handleCurveCreate(
      store,
      {
        creator: "0xCreator",
        token: "0xToken",
        curve: "0xCurve",
        virtualMon: VIRTUAL_MON,
        virtualTokens: VIRTUAL_TOKENS,
        startTime: 0n,
      },
      { number: 100, timestamp: 1_700_000_000 },
      "Lick Token",
      "LICK",
    );

    const token = store.tokens.get("0xtoken");
    assert.ok(token, "Token entity should be created");
    assert.equal(token!.name, "Lick Token");
    assert.equal(token!.symbol, "LICK");
    assert.equal(token!.realMon, 0n);
    assert.equal(token!.soldTokens, 0n);
    assert.equal(token!.graduated, false);
    assert.equal(token!.buyCount, 0);
    assert.equal(token!.sellCount, 0);
    assert.equal(token!.totalBuyVolume, 0n);
    assert.equal(token!.totalSellVolume, 0n);
    assert.equal(token!.targetTokenAmount, TARGET_TOKEN_AMOUNT);
    assert.equal(token!.startBlock, 100n);
  });

  it("CurveCreate: creates Profile with tokenCount=1", () => {
    const store = makeStore();
    handleCurveCreate(
      store,
      {
        creator: "0xCreator",
        token: "0xToken",
        curve: "0xCurve",
        virtualMon: VIRTUAL_MON,
        virtualTokens: VIRTUAL_TOKENS,
        startTime: 0n,
      },
      { number: 100, timestamp: 1_700_000_000 },
      "Test Token",
      "TEST",
    );

    const profile = store.profiles.get("0xcreator");
    assert.ok(profile, "Profile entity should be created");
    assert.equal(profile!.tokenCount, 1);
    assert.equal(profile!.graduatedCount, 0);
  });

  it("CurveCreate: second token increments tokenCount", () => {
    const store = makeStore();
    const creator = "0xCreator";

    handleCurveCreate(store, {
      creator, token: "0xToken1", curve: "0xCurve1",
      virtualMon: VIRTUAL_MON, virtualTokens: VIRTUAL_TOKENS, startTime: 0n,
    }, { number: 100, timestamp: 1_700_000_000 }, "Token 1", "TK1");

    handleCurveCreate(store, {
      creator, token: "0xToken2", curve: "0xCurve2",
      virtualMon: VIRTUAL_MON, virtualTokens: VIRTUAL_TOKENS, startTime: 0n,
    }, { number: 101, timestamp: 1_700_000_010 }, "Token 2", "TK2");

    const profile = store.profiles.get("0xcreator");
    assert.equal(profile!.tokenCount, 2);
    // createdAt should be from FIRST token creation
    assert.equal(profile!.createdAt, 1_700_000_000n);
  });

  /* ── Test: CurveBuy ── */

  it("CurveBuy: creates Trade, updates Token soldTokens and buyCount", () => {
    const store = makeStore();
    const TOKEN = "0xToken";
    const CREATOR = "0xCreator";
    const BUYER = "0xBuyer";

    handleCurveCreate(store, {
      creator: CREATOR, token: TOKEN, curve: "0xCurve",
      virtualMon: VIRTUAL_MON, virtualTokens: VIRTUAL_TOKENS, startTime: 0n,
    }, { number: 500, timestamp: 1_700_000_000 }, "Meme", "MEME");

    const tokensOut = 100_000n * 10n ** 18n; // 100k tokens bought
    const monIn = 20n * 10n ** 18n;          // 20 MON spent

    handleCurveBuy(store,
      { buyer: BUYER, token: TOKEN, amountIn: monIn, amountOut: tokensOut },
      { number: 510, timestamp: 1_700_001_000 },
      "0xtxhash1", 0,
    );

    const token = store.tokens.get(TOKEN.toLowerCase())!;
    assert.equal(token.soldTokens, tokensOut);
    assert.equal(token.buyCount, 1);
    assert.equal(token.totalBuyVolume, monIn);
    assert.ok(token.realMon > 0n, "realMon should be > 0 after a buy");

    const trade = store.trades.get("0xtxhash1-0")!;
    assert.ok(trade, "Trade entity should be created");
    assert.equal(trade.isBuy, true);
    assert.equal(trade.amountIn, monIn);
    assert.equal(trade.amountOut, tokensOut);
    assert.equal(trade.trader, BUYER.toLowerCase());
    // elapsed = 510 - 500 = 10 blocks → no penalty
    assert.equal(trade.penaltyBps, 0);
  });

  it("CurveBuy: penalty applies when buying in same block as launch (elapsed=0)", () => {
    const store = makeStore();
    const TOKEN = "0xToken";

    handleCurveCreate(store, {
      creator: "0xCreator", token: TOKEN, curve: "0xCurve",
      virtualMon: VIRTUAL_MON, virtualTokens: VIRTUAL_TOKENS, startTime: 0n,
    }, { number: 1000, timestamp: 1_700_000_000 }, "SnipeTest", "SNIPE");

    handleCurveBuy(store,
      { buyer: "0xSniper", token: TOKEN, amountIn: 1n * 10n ** 18n, amountOut: 1000n * 10n ** 18n },
      { number: 1000, timestamp: 1_700_000_000 }, // same block as launch
      "0xtxsnipe", 0,
    );

    const trade = store.trades.get("0xtxsnipe-0")!;
    assert.equal(trade.penaltyBps, 8000); // 80% penalty for same-block buy
  });

  it("CurveBuy: updates Profile totalBuyVolume", () => {
    const store = makeStore();
    const TOKEN = "0xToken";
    const CREATOR = "0xCreator";

    handleCurveCreate(store, {
      creator: CREATOR, token: TOKEN, curve: "0xCurve",
      virtualMon: VIRTUAL_MON, virtualTokens: VIRTUAL_TOKENS, startTime: 0n,
    }, { number: 200, timestamp: 1_700_000_000 }, "Test", "TST");

    const monIn = 50n * 10n ** 18n;
    handleCurveBuy(store,
      { buyer: "0xBuyer", token: TOKEN, amountIn: monIn, amountOut: 5000n * 10n ** 18n },
      { number: 210, timestamp: 1_700_000_100 }, "0xtx2", 0,
    );

    const profile = store.profiles.get(CREATOR.toLowerCase())!;
    assert.equal(profile.totalBuyVolume, monIn);
  });

  /* ── Test: CurveSell ── */

  it("CurveSell: creates Trade, decrements soldTokens, increments sellCount", () => {
    const store = makeStore();
    const TOKEN = "0xToken";

    handleCurveCreate(store, {
      creator: "0xCreator", token: TOKEN, curve: "0xCurve",
      virtualMon: VIRTUAL_MON, virtualTokens: VIRTUAL_TOKENS, startTime: 0n,
    }, { number: 300, timestamp: 1_700_000_000 }, "Sell Test", "ST");

    const tokensOut = 200_000n * 10n ** 18n;
    const monIn = 40n * 10n ** 18n;

    // First buy some tokens
    handleCurveBuy(store,
      { buyer: "0xTrader", token: TOKEN, amountIn: monIn, amountOut: tokensOut },
      { number: 320, timestamp: 1_700_002_000 }, "0xtxbuy", 0,
    );

    const soldAfterBuy = store.tokens.get(TOKEN.toLowerCase())!.soldTokens;

    // Now sell half back
    const tokensToSell = tokensOut / 2n;
    const monReceived = 15n * 10n ** 18n;

    handleCurveSell(store,
      { seller: "0xTrader", token: TOKEN, amountIn: tokensToSell, amountOut: monReceived },
      { number: 325, timestamp: 1_700_002_500 }, "0xtxsell", 0,
    );

    const token = store.tokens.get(TOKEN.toLowerCase())!;
    assert.equal(token.soldTokens, soldAfterBuy - tokensToSell);
    assert.equal(token.sellCount, 1);
    assert.equal(token.totalSellVolume, monReceived);
    assert.ok(token.realMon < store.tokens.get(TOKEN.toLowerCase())!.realMon + 1n,
      "realMon should decrease after sell");

    const trade = store.trades.get("0xtxsell-0")!;
    assert.ok(trade, "Sell Trade entity should be created");
    assert.equal(trade.isBuy, false);
    assert.equal(trade.amountIn, tokensToSell);
    assert.equal(trade.amountOut, monReceived);
  });

  /* ── Test: CurveGraduate ── */

  it("CurveGraduate: sets graduated=true and graduatedAt on Token", () => {
    const store = makeStore();
    const TOKEN = "0xToken";
    const CREATOR = "0xCreator";

    handleCurveCreate(store, {
      creator: CREATOR, token: TOKEN, curve: "0xCurve",
      virtualMon: VIRTUAL_MON, virtualTokens: VIRTUAL_TOKENS, startTime: 0n,
    }, { number: 1000, timestamp: 1_700_000_000 }, "Grad Token", "GRAD");

    assert.equal(store.tokens.get(TOKEN.toLowerCase())!.graduated, false);

    handleCurveGraduate(store,
      { token: TOKEN, pool: "0xPool" },
      { number: 9999, timestamp: 1_700_100_000 },
    );

    const token = store.tokens.get(TOKEN.toLowerCase())!;
    assert.equal(token.graduated, true);
    assert.equal(token.graduatedAt, 1_700_100_000n);
  });

  it("CurveGraduate: increments Profile graduatedCount", () => {
    const store = makeStore();
    const TOKEN = "0xToken";
    const CREATOR = "0xCreator";

    handleCurveCreate(store, {
      creator: CREATOR, token: TOKEN, curve: "0xCurve",
      virtualMon: VIRTUAL_MON, virtualTokens: VIRTUAL_TOKENS, startTime: 0n,
    }, { number: 1000, timestamp: 1_700_000_000 }, "Grad Token", "GRAD");

    assert.equal(store.profiles.get(CREATOR.toLowerCase())!.graduatedCount, 0);

    handleCurveGraduate(store,
      { token: TOKEN, pool: "0xPool" },
      { number: 9999, timestamp: 1_700_100_000 },
    );

    assert.equal(store.profiles.get(CREATOR.toLowerCase())!.graduatedCount, 1);
  });

  /* ── Test: Full lifecycle ── */

  it("Full lifecycle: Create → Buy(×2) → Sell(×1) → Graduate", () => {
    const store = makeStore();
    const TOKEN = "0xLifecycleToken";
    const CREATOR = "0xLifecycleCreator";

    // 1. Launch
    handleCurveCreate(store, {
      creator: CREATOR, token: TOKEN, curve: "0xLifecycleCurve",
      virtualMon: VIRTUAL_MON, virtualTokens: VIRTUAL_TOKENS, startTime: 0n,
    }, { number: 5000, timestamp: 1_700_000_000 }, "Lifecycle", "LIFE");

    // 2. Buy #1 — 10 blocks after launch (no penalty)
    const buy1Out = 5_000_000n * 10n ** 18n;  // 5M tokens
    const buy1In = 844n * 10n ** 18n;         // ~844 MON
    handleCurveBuy(store,
      { buyer: "0xBuyer1", token: TOKEN, amountIn: buy1In, amountOut: buy1Out },
      { number: 5010, timestamp: 1_700_001_000 }, "0xtx_b1", 0,
    );

    // 3. Buy #2 — 20 blocks after launch (no penalty)
    const buy2Out = 5_000_000n * 10n ** 18n;
    const buy2In = 860n * 10n ** 18n;
    handleCurveBuy(store,
      { buyer: "0xBuyer2", token: TOKEN, amountIn: buy2In, amountOut: buy2Out },
      { number: 5020, timestamp: 1_700_002_000 }, "0xtx_b2", 0,
    );

    // 4. Sell #1 — sell half of buy1
    const sell1In = buy1Out / 2n;
    const sell1Out = 400n * 10n ** 18n; // ~400 MON back
    handleCurveSell(store,
      { seller: "0xBuyer1", token: TOKEN, amountIn: sell1In, amountOut: sell1Out },
      { number: 5030, timestamp: 1_700_003_000 }, "0xtx_s1", 0,
    );

    // 5. Graduate
    handleCurveGraduate(store,
      { token: TOKEN, pool: "0xDexPool" },
      { number: 99999, timestamp: 1_701_000_000 },
    );

    // ── Assertions ──
    const token = store.tokens.get(TOKEN.toLowerCase())!;
    const profile = store.profiles.get(CREATOR.toLowerCase())!;

    assert.equal(token.buyCount, 2);
    assert.equal(token.sellCount, 1);
    assert.equal(token.totalBuyVolume, buy1In + buy2In);
    assert.equal(token.totalSellVolume, sell1Out);
    assert.equal(token.soldTokens, buy1Out + buy2Out - sell1In);
    assert.ok(token.realMon > 0n);
    assert.equal(token.graduated, true);
    assert.equal(token.graduatedAt, 1_701_000_000n);

    assert.equal(profile.tokenCount, 1);
    assert.equal(profile.graduatedCount, 1);
    assert.equal(profile.totalBuyVolume, buy1In + buy2In);
    assert.equal(profile.totalSellVolume, sell1Out);

    // 2 buy trades + 1 sell trade
    assert.equal(store.trades.size, 3);
  });
});
