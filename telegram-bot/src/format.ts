/**
 * Lickfun Telegram Bot — Message formatting
 * Cherry-style buy alerts with Lickfun branding.
 */
import type { TokenEntity, TradeEntity } from "./graphql.js";
import { config } from "./config.js";

/* ─── Number formatting ──────────────────────────────────────────────────────── */

const MON_DECIMALS = 18;
const TOKEN_DECIMALS = 18;

/**
 * Convert a wei-style BigInt string to a human-readable MON number.
 * Returns a string with up to 4 decimal places, trimmed.
 */
export function weiToMon(weiStr: string, decimals = MON_DECIMALS): string {
  const wei = BigInt(weiStr);
  if (wei === 0n) return "0";
  const negative = wei < 0n;
  const abs = negative ? -wei : wei;
  const s = abs.toString().padStart(decimals + 1, "0");
  const intPart = s.slice(0, s.length - decimals) || "0";
  const decPart = s.slice(s.length - decimals);
  const trimmed = decPart.slice(0, 4).replace(/0+$/, "");
  const result = trimmed ? `${intPart}.${trimmed}` : intPart;
  return negative ? `-${result}` : result;
}

/**
 * Format a token amount (18 decimals) with thousands separators.
 */
export function formatTokenAmount(rawStr: string): string {
  const raw = BigInt(rawStr);
  const whole = raw / 10n ** BigInt(TOKEN_DECIMALS);
  const frac = raw % 10n ** BigInt(TOKEN_DECIMALS);
  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (frac === 0n) return wholeStr;
  const fracStr = frac.toString().padStart(TOKEN_DECIMALS, "0").slice(0, 2);
  const trimmedFrac = fracStr.replace(/0+$/, "");
  return trimmedFrac ? `${wholeStr}.${trimmedFrac}` : wholeStr;
}

/**
 * Shorten an address: 0x1234…abcd
 */
export function shortAddr(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function explorerAddr(addr: string): string {
  return `${config.branding.explorerUrl}/address/${addr}`;
}

export function explorerTx(txHash: string): string {
  return `${config.branding.explorerUrl}/tx/${txHash}`;
}

export function tokenPage(tokenId: string): string {
  return `${config.branding.siteUrl}/token/${tokenId}`;
}

/**
 * Build an HTML anchor tag.
 */
function link(url: string, text: string): string {
  return `<a href="${url}">${text}</a>`;
}

/**
 * Build a bold HTML tag.
 */
function bold(text: string | number): string {
  return `<b>${text}</b>`;
}

/**
 * Cherry-style emoji scale: more emojis for bigger buys.
 * 0.1 MON → 1 🟢, 1 MON → 2, 10 MON → 3, 100 MON → 4, 1000+ → 5.
 */
export function buyEmojiScale(monAmount: number): string {
  let n = 1;
  if (monAmount >= 1000) n = 5;
  else if (monAmount >= 100) n = 4;
  else if (monAmount >= 10) n = 3;
  else if (monAmount >= 1) n = 2;
  return "🟢".repeat(n);
}

/**
 * Compute graduation progress % from realMon / 100,000 MON.
 */
export function graduationProgress(realMonStr: string): number {
  const realMon = Number(weiToMon(realMonStr));
  return Math.min(100, (realMon / 100_000) * 100);
}

/* ─── Message templates ──────────────────────────────────────────────────────── */

export interface BuyAlertContext {
  trade: TradeEntity;
  token: TokenEntity;
  isNewBuyer: boolean;
  txHash: string;
}

/**
 * Full Lickfun-branded buy alert for the founder coin.
 * Returns { caption, imageUrl } for sendPhoto.
 */
export function formatFounderBuyAlert(ctx: BuyAlertContext): {
  caption: string;
  imageUrl: string;
} {
  const { trade, token, isNewBuyer, txHash } = ctx;
  const monIn = Number(weiToMon(trade.amountIn));
  const tokensOut = formatTokenAmount(trade.amountOut);
  const progress = graduationProgress(token.realMon).toFixed(2);
  const emoji = buyEmojiScale(monIn);
  const walletTag = isNewBuyer ? "🆕 NEW WALLET" : "♻️ Returning";
  const ticker = `$${token.symbol || "LICKFUN"}`;

  const lines: string[] = [];
  lines.push(`${emoji} ${bold("NEW BUY")} ${emoji}`);
  lines.push("");
  lines.push(`${bold(ticker)}  ${walletTag}`);
  lines.push("");
  lines.push(`👤 ${link(explorerAddr(trade.trader), shortAddr(trade.trader))}`);
  lines.push(`💸 Spent: ${bold(`${weiToMon(trade.amountIn)} MON`)}`);
  lines.push(`🪙 Received: ${bold(`${tokensOut} ${ticker}`)}`);
  lines.push("");
  lines.push(`📊 Curve progress: ${bold(`${progress}%`)} to graduation`);
  lines.push(`👥 Unique buyers: ${bold(token.uniqueBuyerCount)}`);
  lines.push("");
  lines.push(`🔗 ${link(tokenPage(token.id), "View on Lickfun.fun")}`);
  lines.push(`🔗 ${link(explorerTx(txHash), "View on Monad Explorer")}`);

  return { caption: lines.join("\n"), imageUrl: config.founder.imageUrl };
}

/**
 * Lighter one-line alert for non-founder Lickfun tokens.
 */
export function formatOtherTokenBuyAlert(ctx: BuyAlertContext): string {
  const { trade, token, isNewBuyer } = ctx;
  const monIn = weiToMon(trade.amountIn);
  const walletTag = isNewBuyer ? "🆕" : "♻️";
  const ticker = `$${token.symbol || shortAddr(token.id)}`;

  const line1 = `${walletTag} ${bold(ticker)} — ${link(
    explorerAddr(trade.trader),
    shortAddr(trade.trader),
  )} bought ${bold(`${monIn} MON`)}`;
  const line2 = `🔗 ${link(tokenPage(token.id), "lickfun.xyz")}`;
  return `${line1}\n${line2}`;
}

/**
 * Sell alert (optional, gated by ENABLE_SELL_ALERTS).
 */
export function formatSellAlert(ctx: BuyAlertContext): string {
  const { trade, token } = ctx;
  const monOut = weiToMon(trade.amountOut);
  const ticker = `$${token.symbol || shortAddr(token.id)}`;

  const line1 = `🔴 ${bold("SELL")} — ${bold(ticker)}`;
  const line2 = `${link(
    explorerAddr(trade.trader),
    shortAddr(trade.trader),
  )} sold for ${bold(`${monOut} MON`)}`;
  const line3 = `🔗 ${link(tokenPage(token.id), "lickfun.xyz")}`;
  return `${line1}\n${line2}\n${line3}`;
}

/**
 * Graduation alert.
 */
export function formatGraduationAlert(token: TokenEntity): string {
  const ticker = `$${token.symbol || shortAddr(token.id)}`;

  const lines: string[] = [];
  lines.push(`🎓 ${bold(`${ticker} GRADUATED`)} 🎓`);
  lines.push("");
  lines.push("Curve filled — liquidity migrated to DEX.");
  lines.push("");
  lines.push(`🔗 ${link(tokenPage(token.id), "View on Lickfun.fun")}`);
  return lines.join("\n");
}

/**
 * Welcome message shown after a user successfully verifies.
 */
export function formatWelcomeVerified(userName: string): string {
  return (
    `✅ ${bold(userName)} is human! Welcome to Lickfun.fun 🟢\n\n` +
    `Trade tokens, follow the founder coin, and watch live buys roll in.`
  );
}

/**
 * Welcome message shown to a new joiner with the verify button.
 */
export function formatWelcomePrompt(
  userName: string,
  timeoutSeconds: number,
): string {
  const minutes = Math.floor(timeoutSeconds / 60);
  const seconds = timeoutSeconds % 60;
  let timeStr: string;
  if (minutes > 0) {
    timeStr = `${minutes} min`;
    if (seconds > 0) timeStr += ` ${seconds}s`;
  } else {
    timeStr = `${seconds}s`;
  }

  const lines: string[] = [];
  lines.push(`👋 Welcome to ${bold("Lickfun.fun")}, ${bold(userName)}!`);
  lines.push("");
  lines.push(
    `Tap the button below within ${bold(timeStr)} to verify you're human and unlock chat.`,
  );
  lines.push("");
  lines.push("🤖 Bots that don't verify will be auto-kicked.");
  return lines.join("\n");
}
