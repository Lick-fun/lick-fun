/**
 * Lick.fun — Envio HyperIndex Event Handlers (v3 API)
 * Stage 3: Indexes Factory + BondingCurve events on Monad testnet (chain 10143)
 *
 * Event flow:
 *   Factory.TokenCreated    → create Token + Profile
 *   BondingCurve.CurveLaunch → confirm startBlock on Token (emitted in constructor)
 *   BondingCurve.CurveBuy   → create Trade, update Token + Profile
 *   BondingCurve.CurveSell  → create Trade, update Token + Profile
 *   BondingCurve.CurveGraduate → mark Token graduated, update Profile
 *
 * Note: context.client.readContract is NOT available in Envio Cloud deployments.
 * Token name/symbol are stored as empty strings and must be resolved by the frontend
 * via direct RPC calls to the token contract.
 */

import { indexer } from "envio";
import {
  VIRTUAL_MON,
  VIRTUAL_TOKENS,
  TARGET_TOKEN_AMOUNT,
  getPenaltyBps,
  deriveRealMon,
} from "./utils.js";

/* ════════════════════════════ CONTRACT REGISTRATION ═══════════════════════════════ */

// Register BondingCurve contracts dynamically when Factory emits TokenCreated
indexer.contractRegister({ contract: "Factory", event: "TokenCreated" }, ({ event, context }) => {
  context.chain.BondingCurve.add(event.params.curve);
  context.log.info(`Registered BondingCurve at ${event.params.curve.toLowerCase()}`);
});

/* ════════════════════════════ FACTORY: TokenCreated ════════════════════════════════ */

/**
 * Fired by Factory.createToken(). One event per new token launch.
 * Creates Token entity + creates/updates Profile entity.
 *
 * Note: The new event no longer carries virtualMon, virtualTokens, or startTime.
 * We use the known protocol constants for virtualMon/virtualTokens, and 0n for
 * startTime (the CurveLaunch handler overwrites it with the canonical on-chain value).
 *
 * name/symbol are stored as empty strings — the frontend reads them directly from
 * the token contract via RPC since context.client is not available in cloud deployments.
 */
indexer.onEvent({ contract: "Factory", event: "TokenCreated" }, async ({ event, context }) => {
  const creatorId = event.params.creator.toLowerCase();
  const tokenId = event.params.token.toLowerCase();
  const blockTimestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);

  const profile = await context.Profile.get(creatorId);

  /* ── Create Token ── */
  context.Token.set({
    id: tokenId,
    creator: creatorId,
    name: "",            // frontend reads from contract
    symbol: "",          // frontend reads from contract
    curve: event.params.curve.toLowerCase(),
    virtualMon: VIRTUAL_MON,
    virtualTokens: VIRTUAL_TOKENS,
    targetTokenAmount: TARGET_TOKEN_AMOUNT,
    startTime: 0n,           // overwritten by CurveLaunch
    startBlock: blockNumber, // overwritten by CurveLaunch
    realMon: 0n,
    soldTokens: 0n,
    graduated: false,
    createdAt: blockTimestamp,
    graduatedAt: undefined,
    buyCount: 0,
    sellCount: 0,
    totalBuyVolume: 0n,
    totalSellVolume: 0n,
  });

  /* ── Create or update Profile ── */
  context.Profile.set({
    id: creatorId,
    createdAt: profile?.createdAt ?? blockTimestamp,
    tokenCount: (profile?.tokenCount ?? 0) + 1,
    graduatedCount: profile?.graduatedCount ?? 0,
    totalBuyVolume: profile?.totalBuyVolume ?? 0n,
    totalSellVolume: profile?.totalSellVolume ?? 0n,
  });
});

/* ════════════════════= BONDINGCURVE: CurveLaunch ══════════════════════════════════ */

/**
 * Emitted in the BondingCurve constructor. Provides the canonical startBlock.
 */
indexer.onEvent({ contract: "BondingCurve", event: "CurveLaunch" }, async ({ event, context }) => {
  const tokenId = event.params.token.toLowerCase();
  const token = await context.Token.get(tokenId);
  if (!token) return;

  context.Token.set({
    ...token,
    startBlock: event.params.startBlock,
    startTime: event.params.startTime,
  });
});

/* ═══════════════════════════ BONDINGCURVE: CurveBuy ═══════════════════════════════ */

/**
 * Fired on every buy: MON → tokens.
 */
indexer.onEvent({ contract: "BondingCurve", event: "CurveBuy" }, async ({ event, context }) => {
  const tokenId = event.params.token.toLowerCase();
  const token = await context.Token.get(tokenId);
  if (!token) return;

  const blockNumber = BigInt(event.block.number);
  const blockTimestamp = BigInt(event.block.timestamp);
  const elapsed = blockNumber - token.startBlock;
  const penaltyBps = getPenaltyBps(elapsed);

  const newSoldTokens = token.soldTokens + event.params.amountOut;
  const newRealMon = deriveRealMon(newSoldTokens);

  /* ── Create Trade ── */
  context.Trade.set({
    id: `${event.transaction.hash}-${event.logIndex}`,
    token_id: token.id,
    trader: event.params.buyer.toLowerCase(),
    isBuy: true,
    amountIn: event.params.amountIn,
    amountOut: event.params.amountOut,
    blockNumber: event.block.number,
    blockTimestamp: blockTimestamp,
    penaltyBps: penaltyBps,
  });

  /* ── Update Token ── */
  context.Token.set({
    ...token,
    realMon: newRealMon,
    soldTokens: newSoldTokens,
    buyCount: token.buyCount + 1,
    totalBuyVolume: token.totalBuyVolume + event.params.amountIn,
  });

  /* ── Update Profile ── */
  const profile = await context.Profile.get(token.creator);
  if (profile) {
    context.Profile.set({
      ...profile,
      totalBuyVolume: profile.totalBuyVolume + event.params.amountIn,
    });
  }
});

/* ══════════════════════════ BONDINGCURVE: CurveSell ═══════════════════════════════ */

/**
 * Fired on every sell: tokens → MON.
 */
indexer.onEvent({ contract: "BondingCurve", event: "CurveSell" }, async ({ event, context }) => {
  const tokenId = event.params.token.toLowerCase();
  const token = await context.Token.get(tokenId);
  if (!token) return;

  const blockNumber = BigInt(event.block.number);
  const blockTimestamp = BigInt(event.block.timestamp);
  const elapsed = blockNumber - token.startBlock;
  const penaltyBps = getPenaltyBps(elapsed);

  const newSoldTokens = token.soldTokens - event.params.amountIn;
  const newRealMon = deriveRealMon(newSoldTokens);

  /* ── Create Trade ── */
  context.Trade.set({
    id: `${event.transaction.hash}-${event.logIndex}`,
    token_id: token.id,
    trader: event.params.seller.toLowerCase(),
    isBuy: false,
    amountIn: event.params.amountIn,
    amountOut: event.params.amountOut,
    blockNumber: event.block.number,
    blockTimestamp: blockTimestamp,
    penaltyBps: penaltyBps,
  });

  /* ── Update Token ── */
  context.Token.set({
    ...token,
    realMon: newRealMon,
    soldTokens: newSoldTokens,
    sellCount: token.sellCount + 1,
    totalSellVolume: token.totalSellVolume + event.params.amountOut,
  });

  /* ── Update Profile ── */
  const profile = await context.Profile.get(token.creator);
  if (profile) {
    context.Profile.set({
      ...profile,
      totalSellVolume: profile.totalSellVolume + event.params.amountOut,
    });
  }
});

/* ═════════════════════════ BONDINGCURVE: CurveGraduate ════════════════════════════ */

/**
 * Fired when realMon >= 100,000 MON and the curve graduates.
 */
indexer.onEvent({ contract: "BondingCurve", event: "CurveGraduate" }, async ({ event, context }) => {
  const tokenId = event.params.token.toLowerCase();
  const token = await context.Token.get(tokenId);
  if (!token) return;

  const blockTimestamp = BigInt(event.block.timestamp);

  context.Token.set({
    ...token,
    graduated: true,
    graduatedAt: blockTimestamp,
  });

  const profile = await context.Profile.get(token.creator);
  if (profile) {
    context.Profile.set({
      ...profile,
      graduatedCount: profile.graduatedCount + 1,
    });
  }
});

/* ══════════════════════════ FEEROUTER: FeeConfigSet ═══════════════════════════════ */

function resolveTierName(config: {
  creatorShareBps: bigint;
  lpSupportBps: bigint;
  buybackBurnBps: bigint;
}): string {
  const c = Number(config.creatorShareBps);
  const lp = Number(config.lpSupportBps);
  const bb = Number(config.buybackBurnBps);
  if (c === 1000 && lp === 8000 && bb === 1000) return "LIGHT";
  if (c === 3000 && lp === 6000 && bb === 1000) return "STANDARD_A";
  if (c === 2000 && lp === 7000 && bb === 1000) return "STANDARD_B";
  if (c === 2000 && lp === 4000 && bb === 4000) return "ECOSYSTEM";
  if (c === 8000 && lp === 1000 && bb === 1000) return "DEFAULT";
  return "DIAMOND";
}

indexer.onEvent({ contract: "FeeRouter", event: "FeeConfigSet" }, async ({ event, context }) => {
  const tokenId = event.params.token.toLowerCase();
  await context.FeeConfig.set({
    id: tokenId,
    token: tokenId,
    creatorShareBps: event.params.config.creatorShareBps,
    lpSupportBps: event.params.config.lpSupportBps,
    buybackBurnBps: event.params.config.buybackBurnBps,
    preset: resolveTierName(event.params.config),
    blockTimestamp: BigInt(event.block.timestamp),
  });
});

/* ═══════════════════════════ FEEROUTER: FeeRouted ════════════════════════════════ */

indexer.onEvent({ contract: "FeeRouter", event: "FeeRouted" }, async ({ event, context }) => {
  const logIndex = String(event.logIndex);
  await context.FeeEvent.set({
    id: `${event.transaction.hash}-${logIndex}`,
    token: event.params.token.toLowerCase(),
    totalAmount: event.params.totalAmount,
    creatorShare: event.params.creatorShare,
    lpShare: event.params.lpShare,
    buybackShare: event.params.buybackShare,
    blockTimestamp: BigInt(event.block.timestamp),
  });
});
