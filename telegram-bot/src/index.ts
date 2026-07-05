/**
 * Lickfun Telegram Bot — Entry point
 * Boots the group-management bot (welcome/verify gate) and the trade watcher
 * (Lickfun-branded buy alerts), with graceful shutdown handling.
 */
import { config } from "./config.js";
import { createBot } from "./bot.js";
import { startWatcher } from "./watcher.js";

async function main() {
  console.log("[index] Starting Lickfun Telegram bot...");
  console.log(`[index] Group ID: ${config.telegram.groupId}`);
  console.log(`[index] Founder token: ${config.founder.address}`);
  console.log(`[index] GraphQL endpoint: ${config.graphql.url}`);
  console.log(
    `[index] Poll interval: ${config.behaviour.pollIntervalMs}ms | Verify timeout: ${config.behaviour.verifyTimeoutSeconds}s`,
  );

  const bot = createBot();

  const stopWatcher = startWatcher(bot);

  bot
    .launch()
    .then(() => console.log("[index] Bot launched and listening for updates."))
    .catch((err) => {
      console.error("[index] Failed to launch bot:", err);
      process.exit(1);
    });

  const shutdown = (signal: string) => {
    console.log(`[index] Received ${signal}, shutting down gracefully...`);
    stopWatcher();
    bot.stop(signal);
    process.exit(0);
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  process.on("unhandledRejection", (reason) => {
    console.error("[index] Unhandled rejection:", reason);
  });
  process.on("uncaughtException", (err) => {
    console.error("[index] Uncaught exception:", err);
  });
}

main().catch((err) => {
  console.error("[index] Fatal error during startup:", err);
  process.exit(1);
});
