# Lickfun Telegram Bot

A fully Lickfun-branded Telegram bot for your community group. It does two jobs:

1. **Group management** — welcomes new members, restricts them from posting until
   they tap "✅ I'm human", and auto-kicks anyone who ignores it past a timeout.
2. **Buy alerts** — watches your live Envio indexer (the same GraphQL endpoint the
   frontend uses) for new trades and posts Cherry-style alerts to your group:
   - **Founder coin** (`0x0236...d151`) gets the full card: founder-coin image,
     buyer wallet, new-wallet vs returning-buyer tag, MON spent, tokens received,
     curve progress, and links.
   - **Other Lickfun tokens** get a lighter one-line alert (no image, less spam).
   - **Graduations** get their own alert when a curve fills and migrates to DEX.

No changes to the indexer are required — this bot only *reads* the existing
public GraphQL API.

---

## 1. Create the bot with BotFather

1. Open Telegram, search for **[@BotFather](https://t.me/BotFather)**, and start a chat.
2. Send `/newbot` and follow the prompts:
   - Name: `Lickfun Alerts` (or whatever you like — this is the display name)
   - Username: must end in `bot`, e.g. `LickfunAlertsBot`
3. BotFather will reply with your **bot token** — copy it, you'll need it for `.env`.

### Set the founder-coin image as the bot's avatar

Telegram's Bot API has no endpoint for a bot to set its own profile photo — this
step must be done manually, once, via BotFather:

1. In the BotFather chat, send `/setuserpic`.
2. Select your bot from the list.
3. Upload the Lickfun founder-coin image (download it from
   `FOUNDER_IMAGE_URL` in `.env.example`, or use the file at
   `frontend/src/data/token-metadata.json` → the founder token's `imageUri`).

### Disable privacy mode (required for the welcome/verify feature)

By default, bots in groups can't see `new_chat_members` events or read messages
unless privacy mode is disabled:

1. In BotFather, send `/setprivacy`.
2. Select your bot.
3. Choose **Disable**.

### Set bot commands (optional, cosmetic)

Send `/setcommands` to BotFather, select your bot, and paste:
```
start - Check the bot is alive
```

---

## 2. Add the bot to your group

1. Add the bot to your Telegram group as a member.
2. Promote it to **Admin** with at least these permissions:
   - ✅ Ban users (required to restrict/kick unverified joiners)
   - ✅ Delete messages (used to clean up verification prompts)
   - Pin messages / manage video chats etc. are not required.
3. Send any message in the group, then visit:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
   Find the `"chat":{"id": -100XXXXXXXXXX, ...}` value — that negative number is
   your `TELEGRAM_GROUP_ID`.

---

## 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in:

| Variable | Description |
|---|---|
| `TELEGRAM_BOT_TOKEN` | From BotFather |
| `TELEGRAM_GROUP_ID` | From the `getUpdates` step above (starts with `-`) |
| `GRAPHQL_URL` | Defaults to the live Lickfun Envio endpoint — usually no change needed |
| `FOUNDER_TOKEN_ADDRESS` | Defaults to `0x0236787a1baaeed46a123fa264a2355eed11d151` |
| `FOUNDER_IMAGE_URL` | Defaults to the founder coin's Storj-hosted image |
| `SITE_URL` / `EXPLORER_URL` | Branding links used in alerts |
| `POLL_INTERVAL_MS` | How often to check for new trades (default 4000ms) |
| `MIN_BUY_ALERT_MON` | Ignore buys smaller than this (default 0 = alert on everything) |
| `VERIFY_TIMEOUT_SECONDS` | How long new members have to verify before being kicked (default 300 = 5 min) |
| `ENABLE_OTHER_TOKEN_ALERTS` | `true`/`false` — alerts for non-founder tokens |
| `ENABLE_SELL_ALERTS` | `true`/`false` — also alert on sells (default off) |

---

## 4. Run locally

```bash
npm install
npm run dev
```

You should see:
```
[index] Starting Lickfun Telegram bot...
[index] Bot launched and listening for updates.
[watcher] Starting poll loop every 4000ms
```

Test the welcome/verify flow by adding a test account to your group. Test buy
alerts by making a small buy on the founder coin (or any Lickfun token) and
watching the group for the alert within a few seconds.

---

## 5. Deploy to Railway

This service follows the same pattern as `script/graduation-keeper.ts`:

1. Create a new Railway service pointed at this directory (`telegram-bot/`).
2. Set the environment variables from step 3 in the Railway dashboard.
3. `railway.json` is already configured with:
   - `startCommand: npx tsx src/index.ts`
   - `restartPolicyType: ON_FAILURE` (10 retries)
4. **Important:** this is a long-running worker, not a web server — turn off
   "Serverless/Sleep" and don't attach a public domain or healthcheck to it.

---

## How the pieces fit together

```
src/
  config.ts     Environment variable loading/validation
  graphql.ts    Client + queries against the live Envio GraphQL endpoint
  format.ts     Lickfun-branded message templates (buy/sell/graduation/welcome)
  state.ts      Persisted trade cursor (.cursor.json) + in-memory verify timers
  bot.ts        Telegraf bot: welcome message, mute-on-join, verify button, auto-kick
  watcher.ts    Polls GraphQL every POLL_INTERVAL_MS, dedupes, sends alerts
  index.ts      Boots both, handles graceful shutdown (SIGTERM/SIGINT)
```

**New wallet vs returning buyer** is determined by counting how many prior
`Trade` rows exist for that `(token, trader)` pair via GraphQL — no manual
tracking needed, since the indexer already records full trade history.

**Why polling instead of a webhook?** The Envio indexer is a stateless hosted
service and doesn't support outbound webhooks to arbitrary bot processes. This
bot instead polls the same public GraphQL endpoint the frontend already uses,
which is simple, requires zero indexer changes, and easily keeps up at a few
seconds of latency.
