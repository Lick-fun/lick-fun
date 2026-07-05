/**
 * Lickfun Telegram Bot — Config
 * Loads and validates environment variables.
 */
import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function optional(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.trim() !== "" ? v : fallback;
}

function optionalBool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return v.toLowerCase() === "true" || v === "1";
}

function optionalInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function optionalFloat(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  telegram: {
    botToken: required("TELEGRAM_BOT_TOKEN"),
    groupId: required("TELEGRAM_GROUP_ID"),
  },
  graphql: {
    url: optional(
      "GRAPHQL_URL",
      "https://indexer.dev.hyperindex.xyz/a49668b/v1/graphql",
    ),
  },
  founder: {
    address: optional(
      "FOUNDER_TOKEN_ADDRESS",
      "0x0236787a1baaeed46a123fa264a2355eed11d151",
    ).toLowerCase(),
    imageUrl: optional(
      "FOUNDER_IMAGE_URL",
      "https://link.storjshare.io/s/jvqgktahde346s3s65orx4mmtk4a/lickfun/tokens/lickfun-1782537764601.png?wrap=0",
    ),
  },
  branding: {
    siteUrl: optional("SITE_URL", "https://lickfun.xyz"),
    explorerUrl: optional("EXPLORER_URL", "https://monadexplorer.com"),
  },
  behaviour: {
    pollIntervalMs: optionalInt("POLL_INTERVAL_MS", 4000),
    minBuyAlertMon: optionalFloat("MIN_BUY_ALERT_MON", 0),
    verifyTimeoutSeconds: optionalInt("VERIFY_TIMEOUT_SECONDS", 300),
    enableOtherTokenAlerts: optionalBool("ENABLE_OTHER_TOKEN_ALERTS", true),
    enableSellAlerts: optionalBool("ENABLE_SELL_ALERTS", false),
  },
} as const;

export type AppConfig = typeof config;
