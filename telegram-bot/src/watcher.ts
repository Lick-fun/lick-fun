/**
 * Lickfun Telegram Bot — Trade watcher
 * Polls the Envio GraphQL endpoint for new trades and posts Lickfun-branded
 * alerts to the configured Telegram group. Founder coin gets a full
 * image + detail card; other Lickfun tokens get a lighter one-liner.
 */
import type { Telegraf } from "telegraf";
import { config } from "./config.js";
import {
  fetchRecentTrades,
  fetchToken,
  fetchTraderHistoryCount,
  type TokenEntity,
  type TradeEntity,
} from "./graphql.js";
import {
  formatFounderBuyAlert,
  formatOtherTokenBuyAlert,
  formatSellAlert,
  formatGraduationAlert,
  weiToMon,
} from "./format.js";
import { loadCursor, getCursor, markProcessed, hasProcessed } from "./state.js";

const tokenCache = new Map<string, { token: TokenEntity; fetchedAt: number }>();
const TOKEN_CACHE_TTL_MS = 30_000;

async function getToken(tokenId: string): Promise<TokenEntity | null> {
  const cached = tokenCache.get(tokenId);
  if (cached && Date.now() - cached.fetchedAt < TOKEN_CACHE_TTL_MS) {
    return cached.token;
  }
  const token = await fetchToken(tokenId);
  if (token) tokenCache.set(tokenId, { token, fetchedAt: Date.now() });
  return token;
}

/** Track graduated tokens we've already alerted on, to avoid repeat alerts. */
const graduatedAlerted = new Set<string>();

async function processTrade(bot: Telegraf, trade: TradeEntity): Promise<void> {
  if (hasProcessed(trade.id)) return;

  const token = await getToken(trade.token_id);
  if (!token) {
    markProcessed(trade.id, trade.blockTimestamp);
    return;
  }

  const isFounder = token.id.toLowerCase() === config.founder.address;
  const txHash = trade.id.split("-")[0]; // id = `${txHash}-${logIndex}`

  if (trade.isBuy) {
    const monIn = Number(weiToMon(trade.amountIn));
    if (monIn < config.behaviour.minBuyAlertMon) {
      markProcessed(trade.id, trade.blockTimestamp);
      return;
    }

    // Determine new vs returning buyer: count prior trades for this (token, trader).
    // A count of 1 means this trade IS their first (since it's already indexed).
    let isNewBuyer = false;
    try {
      const historyCount = await fetchTraderHistoryCount(
        token.id,
        trade.trader,
      );
      isNewBuyer = historyCount <= 1;
    } catch (err) {
      console.error("[watcher] Failed to fetch trader history:", err);
    }

    const ctx = { trade, token, isNewBuyer, txHash };

    try {
      if (isFounder) {
        const { caption, imageUrl } = formatFounderBuyAlert(ctx);
        await bot.telegram.sendPhoto(
          config.telegram.groupId,
          imageUrl,
          { caption, parse_mode: "HTML" },
        );
      } else if (config.behaviour.enableOtherTokenAlerts) {
        const text = formatOtherTokenBuyAlert(ctx);
        await bot.telegram.sendMessage(config.telegram.groupId, text, {
          parse_mode: "HTML",
          link_preview_options: { is_disabled: true },
        });
      }
    } catch (err) {
      console.error("[watcher] Failed to send buy alert:", err);
    }
  } else if (config.behaviour.enableSellAlerts) {
    const ctx = { trade, token, isNewBuyer: false, txHash };
    try {
      const text = formatSellAlert(ctx);
      await bot.telegram.sendMessage(config.telegram.groupId, text, {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      });
    } catch (err) {
      console.error("[watcher] Failed to send sell alert:", err);
    }
  }

  // Graduation check (fires once per token, based on the freshest token data).
  if (token.graduated && !graduatedAlerted.has(token.id)) {
    graduatedAlerted.add(token.id);
    try {
      const text = formatGraduationAlert(token);
      await bot.telegram.sendMessage(config.telegram.groupId, text, {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      });
    } catch (err) {
      console.error("[watcher] Failed to send graduation alert:", err);
    }
  }

  markProcessed(trade.id, trade.blockTimestamp);
}

let polling = false;

async function pollOnce(bot: Telegraf): Promise<void> {
  if (polling) return; // avoid overlapping polls
  polling = true;
  try {
    const trades = await fetchRecentTrades(50);
    const cursor = getCursor();
    const lastTs = BigInt(cursor.lastTimestamp);

    // Process oldest-first so alerts appear in chronological order.
    const newTrades = trades
      .filter((t) => BigInt(t.blockTimestamp) >= lastTs)
      .filter((t) => !hasProcessed(t.id))
      .sort((a, b) => Number(BigInt(a.blockTimestamp) - BigInt(b.blockTimestamp)));

    for (const trade of newTrades) {
      await processTrade(bot, trade);
    }
  } catch (err) {
    console.error("[watcher] Poll failed:", err);
  } finally {
    polling = false;
  }
}

export function startWatcher(bot: Telegraf): () => void {
  loadCursor();

  // On first boot with an empty cursor, seed it to "now" so we don't blast
  // the group with historical trades.
  const cursor = getCursor();
  if (cursor.lastTimestamp === "0") {
    const nowSeconds = Math.floor(Date.now() / 1000).toString();
    markProcessed("__seed__", nowSeconds);
    console.log("[watcher] Seeded cursor to current time:", nowSeconds);
  }

  console.log(
    `[watcher] Starting poll loop every ${config.behaviour.pollIntervalMs}ms`,
  );

  const interval = setInterval(() => {
    void pollOnce(bot);
  }, config.behaviour.pollIntervalMs);

  // Kick off an immediate first poll too.
  void pollOnce(bot);

  return () => clearInterval(interval);
}
