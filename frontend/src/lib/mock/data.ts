import type { TokenEntity, TradeEntity, ProfileEntity } from "@/lib/graphql/queries";

/**
 * Mock data matching the Envio GraphQL schema.
 * Used when the GraphQL endpoint isn't live yet.
 * All values are in wei (18 decimals).
 */

const NOW = BigInt(Math.floor(Date.now() / 1000));
const DAY = 86400n;
const MON = 10n ** 18n;

function h(d: string): string {
  return d.toLowerCase();
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Mock Profiles                                                                    */
/* ──────────────────────────────────────────────────────────────────────────────── */

export const mockProfiles: ProfileEntity[] = [
  {
    id: h("0x1111222233334444555566667777888899990000"),
    createdAt: NOW - 180n * DAY,
    tokenCount: 5,
    graduatedCount: 3,
    totalBuyVolume: 450_000n * MON,
    totalSellVolume: 200_000n * MON,
  },
  {
    id: h("0xAAAAbbbbCCCCddddEEEEffff1111222233334444"),
    createdAt: NOW - 90n * DAY,
    tokenCount: 2,
    graduatedCount: 1,
    totalBuyVolume: 120_000n * MON,
    totalSellVolume: 30_000n * MON,
  },
  {
    id: h("0xD3AdB33FC4F3eeeeeeee33334444555566667777"),
    createdAt: NOW - 365n * DAY,
    tokenCount: 12,
    graduatedCount: 10,
    totalBuyVolume: 2_500_000n * MON,
    totalSellVolume: 1_800_000n * MON,
  },
  {
    id: h("0x88889999AAAABBBBCCCCDDDDEEEEFFFF00001111"),
    createdAt: NOW - 30n * DAY,
    tokenCount: 1,
    graduatedCount: 0,
    totalBuyVolume: 25_000n * MON,
    totalSellVolume: 5_000n * MON,
  },
];

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Mock Tokens                                                                      */
/* ──────────────────────────────────────────────────────────────────────────────── */

export const mockTokens: TokenEntity[] = [
  {
    id: h("0x1111222233334444555566667777888899990000"),
    creator: mockProfiles[0].id,
    name: "Lick Master 3000",
    symbol: "LICK3K",
    curve: h("0x22223333444455556666777788889999AAAAbbbb"),
    virtualMon: 80_000n * MON,
    virtualTokens: 477_000_000n * MON,
    targetTokenAmount: 523_000_000n * MON,
    startTime: NOW - 180n * DAY,
    startBlock: 5000000n,
    realMon: 95_000n * MON,
    soldTokens: 350_000_000n * MON,
    graduated: false,
    createdAt: NOW - 180n * DAY,
    graduatedAt: null,
    buyCount: 245,
    sellCount: 32,
    totalBuyVolume: 320_000n * MON,
    totalSellVolume: 80_000n * MON,
    uniqueBuyerCount: 180,
    creatorSellCount: 2,
  },
  {
    id: h("0x3333444455556666777788889999AAAAbbbbCCCC"),
    creator: mockProfiles[0].id,
    name: "Meme Lake",
    symbol: "MEME",
    curve: h("0x444455556666777788889999AAAAbbbbCCCCdddd"),
    virtualMon: 80_000n * MON,
    virtualTokens: 477_000_000n * MON,
    targetTokenAmount: 523_000_000n * MON,
    startTime: NOW - 60n * DAY,
    startBlock: 6000000n,
    realMon: 102_000n * MON,
    soldTokens: 400_000_000n * MON,
    graduated: true,
    createdAt: NOW - 60n * DAY,
    graduatedAt: NOW - 10n * DAY,
    buyCount: 512,
    sellCount: 89,
    totalBuyVolume: 680_000n * MON,
    totalSellVolume: 250_000n * MON,
    uniqueBuyerCount: 420,
    creatorSellCount: 0,
  },
  {
    id: h("0x55556666777788889999AAAAbbbbCCCCddddEEEE"),
    creator: mockProfiles[0].id,
    name: "Tongue Twister",
    symbol: "TONGUE",
    curve: h("0x6666777788889999AAAAbbbbCCCCddddEEEEffff"),
    virtualMon: 80_000n * MON,
    virtualTokens: 477_000_000n * MON,
    targetTokenAmount: 523_000_000n * MON,
    startTime: NOW - 30n * DAY,
    startBlock: 6500000n,
    realMon: 15_000n * MON,
    soldTokens: 80_000_000n * MON,
    graduated: false,
    createdAt: NOW - 30n * DAY,
    graduatedAt: null,
    buyCount: 67,
    sellCount: 8,
    totalBuyVolume: 45_000n * MON,
    totalSellVolume: 8_000n * MON,
    uniqueBuyerCount: 55,
    creatorSellCount: 1,
  },
  {
    id: h("0x777788889999AAAAbbbbCCCCddddEEEEffff1111"),
    creator: mockProfiles[1].id,
    name: "Degen Lizard",
    symbol: "DGLIZ",
    curve: h("0x88889999AAAAbbbbCCCCddddEEEEffff11112222"),
    virtualMon: 80_000n * MON,
    virtualTokens: 477_000_000n * MON,
    targetTokenAmount: 523_000_000n * MON,
    startTime: NOW - 45n * DAY,
    startBlock: 6200000n,
    realMon: 101_000n * MON,
    soldTokens: 420_000_000n * MON,
    graduated: true,
    createdAt: NOW - 45n * DAY,
    graduatedAt: NOW - 5n * DAY,
    buyCount: 340,
    sellCount: 55,
    totalBuyVolume: 450_000n * MON,
    totalSellVolume: 160_000n * MON,
    uniqueBuyerCount: 280,
    creatorSellCount: 0,
  },
  {
    id: h("0x9999AAAAbbbbCCCCddddEEEEffff111122223333"),
    creator: mockProfiles[2].id,
    name: "Bonk of Monad",
    symbol: "BONKAD",
    curve: h("0xAAAAbbbbCCCCddddEEEEffff1111222233334444"),
    virtualMon: 80_000n * MON,
    virtualTokens: 477_000_000n * MON,
    targetTokenAmount: 523_000_000n * MON,
    startTime: NOW - 200n * DAY,
    startBlock: 4900000n,
    realMon: 350_000n * MON,
    soldTokens: 450_000_000n * MON,
    graduated: true,
    createdAt: NOW - 200n * DAY,
    graduatedAt: NOW - 150n * DAY,
    buyCount: 1200,
    sellCount: 300,
    totalBuyVolume: 1_800_000n * MON,
    totalSellVolume: 900_000n * MON,
    uniqueBuyerCount: 950,
    creatorSellCount: 0,
  },
  {
    id: h("0xBBBBCCCCddddEEEEffff11112222333344445555"),
    creator: mockProfiles[3].id,
    name: "Fresh Pup",
    symbol: "PUPPY",
    curve: h("0xCCCCddddEEEEffff111122223333444455556666"),
    virtualMon: 80_000n * MON,
    virtualTokens: 477_000_000n * MON,
    targetTokenAmount: 523_000_000n * MON,
    startTime: NOW - 2n * DAY,
    startBlock: 7000000n,
    realMon: 3_000n * MON,
    soldTokens: 12_000_000n * MON,
    graduated: false,
    createdAt: NOW - 2n * DAY,
    graduatedAt: null,
    buyCount: 14,
    sellCount: 1,
    totalBuyVolume: 12_000n * MON,
    totalSellVolume: 1_000n * MON,
    uniqueBuyerCount: 12,
    creatorSellCount: 0,
  },
  {
    id: h("0xDDDDEEEEffff1111222233334444555566667777"),
    creator: mockProfiles[0].id,
    name: "Lick Rocket",
    symbol: "LROCK",
    curve: h("0xEEEEffff11112222333344445555666677778888"),
    virtualMon: 80_000n * MON,
    virtualTokens: 477_000_000n * MON,
    targetTokenAmount: 523_000_000n * MON,
    startTime: NOW - 14n * DAY,
    startBlock: 6800000n,
    realMon: 45_000n * MON,
    soldTokens: 200_000_000n * MON,
    graduated: false,
    createdAt: NOW - 14n * DAY,
    graduatedAt: null,
    buyCount: 156,
    sellCount: 22,
    totalBuyVolume: 180_000n * MON,
    totalSellVolume: 45_000n * MON,
    uniqueBuyerCount: 120,
    creatorSellCount: 3,
  },
  {
    id: h("0xffff111122223333444455556666777788889999"),
    creator: mockProfiles[2].id,
    name: "Chad Monad",
    symbol: "CHONAD",
    curve: h("0x111122223333444455556666777788889999AAAA"),
    virtualMon: 80_000n * MON,
    virtualTokens: 477_000_000n * MON,
    targetTokenAmount: 523_000_000n * MON,
    startTime: NOW - 150n * DAY,
    startBlock: 5200000n,
    realMon: 200_000n * MON,
    soldTokens: 470_000_000n * MON,
    graduated: true,
    createdAt: NOW - 150n * DAY,
    graduatedAt: NOW - 80n * DAY,
    buyCount: 890,
    sellCount: 180,
    totalBuyVolume: 1_200_000n * MON,
    totalSellVolume: 500_000n * MON,
    uniqueBuyerCount: 720,
    creatorSellCount: 0,
  },
];

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Mock Trades                                                                      */
/* ──────────────────────────────────────────────────────────────────────────────── */

export const mockTrades: TradeEntity[] = [
  {
    id: "0xaaaa1",
    token_id: mockTokens[0].id,
    trader: mockProfiles[2].id,
    isBuy: true,
    amountIn: 10_000n * MON,
    amountOut: 50_000_000n * MON,
    blockNumber: 5000100,
    blockTimestamp: NOW - 179n * DAY,
    penaltyBps: 0,
  },
  {
    id: "0xaaaa2",
    token_id: mockTokens[0].id,
    trader: mockProfiles[3].id,
    isBuy: true,
    amountIn: 5_000n * MON,
    amountOut: 24_000_000n * MON,
    blockNumber: 5000200,
    blockTimestamp: NOW - 178n * DAY,
    penaltyBps: 0,
  },
  {
    id: "0xaaaa3",
    token_id: mockTokens[0].id,
    trader: mockProfiles[1].id,
    isBuy: true,
    amountIn: 15_000n * MON,
    amountOut: 70_000_000n * MON,
    blockNumber: 5000300,
    blockTimestamp: NOW - 177n * DAY,
    penaltyBps: 0,
  },
  {
    id: "0xaaaa4",
    token_id: mockTokens[0].id,
    trader: mockProfiles[2].id,
    isBuy: false,
    amountIn: 10_000_000n * MON,
    amountOut: 2_000n * MON,
    blockNumber: 5000400,
    blockTimestamp: NOW - 176n * DAY,
    penaltyBps: 0,
  },
  {
    id: "0xaaaa5",
    token_id: mockTokens[0].id,
    trader: mockProfiles[0].id,
    isBuy: true,
    amountIn: 30_000n * MON,
    amountOut: 130_000_000n * MON,
    blockNumber: 5000500,
    blockTimestamp: NOW - 175n * DAY,
    penaltyBps: 0,
  },
  {
    id: "0xbbbb1",
    token_id: mockTokens[1].id,
    trader: mockProfiles[1].id,
    isBuy: true,
    amountIn: 20_000n * MON,
    amountOut: 90_000_000n * MON,
    blockNumber: 6000100,
    blockTimestamp: NOW - 59n * DAY,
    penaltyBps: 0,
  },
  {
    id: "0xbbbb2",
    token_id: mockTokens[1].id,
    trader: mockProfiles[2].id,
    isBuy: true,
    amountIn: 50_000n * MON,
    amountOut: 200_000_000n * MON,
    blockNumber: 6000200,
    blockTimestamp: NOW - 58n * DAY,
    penaltyBps: 0,
  },
  {
    id: "0xcccc1",
    token_id: mockTokens[4].id,
    trader: mockProfiles[0].id,
    isBuy: true,
    amountIn: 100_000n * MON,
    amountOut: 400_000_000n * MON,
    blockNumber: 4900100,
    blockTimestamp: NOW - 199n * DAY,
    penaltyBps: 0,
  },
  {
    id: "0xcccc2",
    token_id: mockTokens[4].id,
    trader: mockProfiles[3].id,
    isBuy: false,
    amountIn: 50_000_000n * MON,
    amountOut: 10_000n * MON,
    blockNumber: 4900200,
    blockTimestamp: NOW - 198n * DAY,
    penaltyBps: 0,
  },
];

/**
 * Get trades filtered for a specific token.
 */
export function getMockTradesForToken(tokenId: string): TradeEntity[] {
  return mockTrades.filter(
    (t) => t.token_id.toLowerCase() === tokenId.toLowerCase()
  );
}

/**
 * Get a mock profile by address.
 */
export function getMockProfile(address: string): ProfileEntity | undefined {
  return mockProfiles.find(
    (p) => p.id.toLowerCase() === address.toLowerCase()
  );
}

/**
 * Get tokens created by a specific address.
 */
export function getMockTokensByCreator(creator: string): TokenEntity[] {
  return mockTokens.filter(
    (t) => t.creator.toLowerCase() === creator.toLowerCase()
  );
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Mock Prediction Market Data                                                      */
/* ──────────────────────────────────────────────────────────────────────────────── */

export interface MockMarketData {
  tokenId: string;
  tokenName: string;
  totalYesMON: bigint;
  totalNoMON: bigint;
  resolved: boolean;
  outcome: boolean;
  userYesBet: bigint;
  userNoBet: bigint;
  claimed: boolean;
}

export const mockMarkets: MockMarketData[] = [
  {
    tokenId: mockTokens[0].id,
    tokenName: "LICK3K",
    totalYesMON: 15_000n * MON,
    totalNoMON: 5_000n * MON,
    resolved: false,
    outcome: false,
    userYesBet: 1_000n * MON,
    userNoBet: 0n,
    claimed: false,
  },
  {
    tokenId: mockTokens[1].id,
    tokenName: "MEME",
    totalYesMON: 30_000n * MON,
    totalNoMON: 10_000n * MON,
    resolved: true,
    outcome: true,
    userYesBet: 2_000n * MON,
    userNoBet: 0n,
    claimed: false,
  },
  {
    tokenId: mockTokens[3].id,
    tokenName: "DGLIZ",
    totalYesMON: 8_000n * MON,
    totalNoMON: 12_000n * MON,
    resolved: true,
    outcome: true,
    userYesBet: 0n,
    userNoBet: 1_000n * MON,
    claimed: true,
  },
  {
    tokenId: mockTokens[6].id,
    tokenName: "PUPPY",
    totalYesMON: 500n * MON,
    totalNoMON: 2_000n * MON,
    resolved: false,
    outcome: false,
    userYesBet: 0n,
    userNoBet: 0n,
    claimed: false,
  },
];

export function getMockMarket(tokenId: string): MockMarketData | undefined {
  return mockMarkets.find(
    (m) => m.tokenId.toLowerCase() === tokenId.toLowerCase()
  );
}

export function getMockOdds(tokenId: string): { yesOdds: number; noOdds: number } {
  const market = getMockMarket(tokenId);
  if (!market) return { yesOdds: 50, noOdds: 50 };
  const total = market.totalYesMON + market.totalNoMON;
  if (total === 0n) return { yesOdds: 50, noOdds: 50 };
  return {
    yesOdds: Number((market.totalYesMON * 10000n) / total) / 100,
    noOdds: Number((market.totalNoMON * 10000n) / total) / 100,
  };
}