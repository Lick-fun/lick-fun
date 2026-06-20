/**
 * Lick.fun — Envio HyperIndex Event Handlers
 * Stage 3: Indexes Factory + BondingCurve events on Monad testnet (chain 10143)
 *
 * Event flow:
 *   Factory.CurveCreate     → create Token + Profile
 *   BondingCurve.CurveLaunch → confirm startBlock on Token (emitted in constructor)
 *   BondingCurve.CurveBuy   → create Trade, update Token + Profile
 *   BondingCurve.CurveSell  → create Trade, update Token + Profile
 *   BondingCurve.CurveGraduate → mark Token graduated, update Profile
 *
 * NOTE: Run `envio codegen` first to generate the typed bindings in ../generated/
 */

import {
  Factory,
  BondingCurve,
  type Token,
  type Trade,
  type Profile,
} from "../generated";
import LickTokenAbi from "../abis/LickToken.json";
import {
  VIRTUAL_MON,
  VIRTUAL_TOKENS,
  TARGET_TOKEN_AMOUNT,
  getPenaltyBps,
  deriveRealMon,
} from "./utils";

// Register BondingCurve contracts dynamically when Factory emits CurveCreate
Factory.CurveCreate.contractRegister(({ event, context }) => {
  context.chain.BondingCurve.add(event.params.curve);
  context.log.info(`Registered BondingCurve at ${event.params.curve.toLowerCase()}`);
});

/* ════════════════════════════ FACTORY: CurveCreate ════════════════════════════════ */

/**
 * Fired by Factory.createToken(). One event per new token launch.
 * Creates Token entity + creates/updates Profile entity.
 *
 * We set startBlock = event.block.number here because BondingCurve was deployed
 * in the same block (CurveLaunch is emitted before CurveCreate in the same tx,
 * but may not be picked up by Envio until the BondingCurve address is registered).
 */
Factory.CurveCreate.handlerWithLoader({
  loader: async ({ event, context }) => {
    const creatorId = event.params.creator.toLowerCase();
    const [profile, tokenName, tokenSymbol] = await Promise.all([
      context.Profile.get(creatorId),
      context.client.readContract({
        address: event.params.token as `0x${string}`,
        abi: LickTokenAbi,
        functionName: "name",
      }) as Promise<string>,
      context.client.readContract({
        address: event.params.token as `0x${string}`,
        abi: LickTokenAbi,
        functionName: "symbol",
      }) as Promise<string>,
    ]);
    return { profile, tokenName, tokenSymbol };
  },

  handler: async ({ event, context, loaderReturn }) => {
    const { profile, tokenName, tokenSymbol } = loaderReturn;
    const tokenId = event.params.token.toLowerCase();
    const creatorId = event.params.creator.toLowerCase();
    const blockTimestamp = BigInt(event.block.timestamp);
    const blockNumber = BigInt(event.block.number);

    /* ── Create Token ── */
    const token: Token = {
      id: tokenId,
      creator: creatorId,
      name: tokenName,
      symbol: tokenSymbol,
      curve: event.params.curve.toLowerCase(),
      virtualMon: event.params.virtualMon,
      virtualTokens: event.params.virtualTokens,
      targetTokenAmount: TARGET_TOKEN_AMOUNT,
      startTime: event.params.startTime,
      startBlock: blockNumber, // BondingCurve deployed this block
      realMon: 0n,
      soldTokens: 0n,
      graduated: false,
      createdAt: blockTimestamp,
      graduatedAt: undefined,
      buyCount: 0,
      sellCount: 0,
      totalBuyVolume: 0n,
      totalSellVolume: 0n,
    };
    context.Token.set(token);

    /* ── Create or update Profile ── */
    const updatedProfile: Profile = {
      id: creatorId,
      createdAt: profile?.createdAt ?? blockTimestamp, // first launch timestamp
      tokenCount: (profile?.tokenCount ?? 0) + 1,
      graduatedCount: profile?.graduatedCount ?? 0,
      totalBuyVolume: profile?.totalBuyVolume ?? 0n,
      totalSellVolume: profile?.totalSellVolume ?? 0n,
    };
    context.Profile.set(updatedProfile);
  },
});

/* ════════════════════= BONDINGCURVE: CurveLaunch ══════════════════════════════════ */

/**
 * Emitted in the BondingCurve constructor. Provides the canonical startBlock.
 * Updates the Token's startBlock if a more precise value is available.
 * In most cases, startBlock was already set correctly in CurveCreate above.
 */
BondingCurve.CurveLaunch.handlerWithLoader({
  loader: async ({ event, context }) => {
    const tokenId = event.params.token.toLowerCase();
    return { token: await context.Token.get(tokenId) };
  },

  handler: async ({ event, context, loaderReturn }) => {
    const { token } = loaderReturn;
    if (!token) return; // Token not yet indexed (should not happen in normal operation)

    // Use the startBlock from the event for maximum precision
    context.Token.set({
      ...token,
      startBlock: event.params.startBlock,
      startTime: event.params.startTime,
    });
  },
});

/* ═══════════════════════════ BONDINGCURVE: CurveBuy ═══════════════════════════════ */

/**
 * Fired on every buy: MON → tokens.
 * event.params.amountIn  = full msg.value (MON sent by buyer, before fees)
 * event.params.amountOut = tokens received by buyer
 *
 * realMon is derived via CPMM invariant for exact on-chain accuracy.
 * penaltyBps is computed from the decay table using (blockNumber - startBlock).
 */
BondingCurve.CurveBuy.handlerWithLoader({
  loader: async ({ event, context }) => {
    const tokenId = event.params.token.toLowerCase();
    return { token: await context.Token.get(tokenId) };
  },

  handler: async ({ event, context, loaderReturn }) => {
    const { token } = loaderReturn;
    if (!token) return;

    const blockNumber = BigInt(event.block.number);
    const blockTimestamp = BigInt(event.block.timestamp);
    const elapsed = blockNumber - token.startBlock;
    const penaltyBps = getPenaltyBps(elapsed);

    // Derive new state via CPMM invariant (exact match to on-chain integer arithmetic)
    const newSoldTokens = token.soldTokens + event.params.amountOut;
    const newRealMon = deriveRealMon(newSoldTokens);

    /* ── Create Trade ── */
    const tradeId = `${event.transaction.hash}-${event.logIndex}`;
    const trade: Trade = {
      id: tradeId,
      token_id: token.id,
      trader: event.params.buyer.toLowerCase(),
      isBuy: true,
      amountIn: event.params.amountIn,   // full MON sent (msg.value)
      amountOut: event.params.amountOut, // tokens received
      blockNumber: event.block.number,
      blockTimestamp: blockTimestamp,
      penaltyBps: penaltyBps,
    };
    context.Trade.set(trade);

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
  },
});

/* ══════════════════════════ BONDINGCURVE: CurveSell ═══════════════════════════════ */

/**
 * Fired on every sell: tokens → MON.
 * event.params.amountIn  = tokensIn (tokens the seller deposited)
 * event.params.amountOut = monOut   (net MON received by seller, after fees)
 *
 * realMon is derived via CPMM invariant for exact accuracy.
 * penaltyBps computed from decay table.
 */
BondingCurve.CurveSell.handlerWithLoader({
  loader: async ({ event, context }) => {
    const tokenId = event.params.token.toLowerCase();
    return { token: await context.Token.get(tokenId) };
  },

  handler: async ({ event, context, loaderReturn }) => {
    const { token } = loaderReturn;
    if (!token) return;

    const blockNumber = BigInt(event.block.number);
    const blockTimestamp = BigInt(event.block.timestamp);
    const elapsed = blockNumber - token.startBlock;
    const penaltyBps = getPenaltyBps(elapsed);

    // Derive new state via CPMM invariant
    // amountIn = tokensIn → soldTokens decreases
    const newSoldTokens = token.soldTokens - event.params.amountIn;
    const newRealMon = deriveRealMon(newSoldTokens);

    /* ── Create Trade ── */
    const tradeId = `${event.transaction.hash}-${event.logIndex}`;
    const trade: Trade = {
      id: tradeId,
      token_id: token.id,
      trader: event.params.seller.toLowerCase(),
      isBuy: false,
      amountIn: event.params.amountIn,   // tokens sold
      amountOut: event.params.amountOut, // net MON received (after fees + penalty)
      blockNumber: event.block.number,
      blockTimestamp: blockTimestamp,
      penaltyBps: penaltyBps,
    };
    context.Trade.set(trade);

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
  },
});

/* ═════════════════════════ BONDINGCURVE: CurveGraduate ════════════════════════════ */

/**
 * Fired when realMon >= 100,000 MON and the curve graduates.
 * Marks Token as graduated and updates Profile's graduatedCount.
 */
BondingCurve.CurveGraduate.handlerWithLoader({
  loader: async ({ event, context }) => {
    const tokenId = event.params.token.toLowerCase();
    const token = await context.Token.get(tokenId);
    const profile = token ? await context.Profile.get(token.creator) : undefined;
    return { token, profile };
  },

  handler: async ({ event, context, loaderReturn }) => {
    const { token, profile } = loaderReturn;
    if (!token) return;

    const blockTimestamp = BigInt(event.block.timestamp);

    /* ── Mark Token graduated ── */
    context.Token.set({
      ...token,
      graduated: true,
      graduatedAt: blockTimestamp,
    });

    /* ── Update Profile graduatedCount ── */
    if (profile) {
      context.Profile.set({
        ...profile,
        graduatedCount: profile.graduatedCount + 1,
      });
    }
  },
});
