# Lickfun.xyz — Graduation Keeper

A lightweight Node.js service that automatically calls `migrateLiquidity()` on the `GraduationRouter` whenever a bonding curve graduates (reaches 100,000 MON).

Without the keeper, graduation migration is permissionless but requires someone to manually trigger it. The keeper automates this so every graduating token immediately gets its DEX pair deployed and LP burned to `0xdead`.

---

## How it works

1. Polls for `CurveGraduate` events from all deployed `BondingCurve` contracts every 6 seconds
2. For each newly graduated token, calls `GraduationRouter.migrateLiquidity(token)`
3. Tracks attempted migrations to avoid duplicate sends
4. Idempotent — checks `tokenToPair()` before sending; skips already-migrated tokens

---

## Setup

### 1. Install dependencies

```bash
cd script
npm install
# or: pnpm install
```

Required packages (install if not present):
- `viem` — EVM interaction
- `dotenv` — env file loading

```bash
npm install viem dotenv
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `script/.env`:

| Variable | Required | Description |
|---|---|---|
| `KEEPER_RPC_URL` | ✅ | Monad mainnet RPC — dedicated Alchemy PAYG endpoint. ⚠️ Must be an UNRESTRICTED Alchemy key (no "Allowed Origins" set) — the keeper is a server-side Node.js process that never sends an Origin/Referer header, so an origin-restricted browser key gets rejected here with "Unspecified origin not on whitelist". Use a separate Alchemy app/key from the frontend's `NEXT_PUBLIC_MONAD_RPC`. See `script/.env.example` for details. |
| `KEEPER_PRIVATE_KEY` | ✅ | Funded keeper wallet private key — use a **dedicated throwaway wallet** |
| `GRADUATION_ROUTER_ADDR` | ✅ | `0xb2Dc164Ac4eCDDA7Ea2D4115bC122463c65460b2` |
| `FACTORY_ADDR` | ✅ | `0x9845c5625d9f9C48e17956940485aAAAD168aA10` |
| `START_BLOCK` | optional | `83961211` (deploy block — skips all pre-deploy history) |
| `POLL_INTERVAL_MS` | optional | Default `6000` (6 seconds) |

> The keeper reads all logs (`CurveGraduate`, `TokenCreated`) and chain height
> directly from `KEEPER_RPC_URL` via viem. It previously used Envio HyperSync
> to work around Alchemy's free-tier 10-block `eth_getLogs` limit — now that
> the project is on Alchemy PAYG (unlimited range on Monad Mainnet), no
> separate service or `ENVIO_API_TOKEN` is required for this keeper.


> ⚠️ **Security:** Use a dedicated keeper wallet with only the gas MON it needs. Never reuse your deployer key or Safe signing keys.

### 3. Fund the keeper wallet

Each `migrateLiquidity` call costs roughly **0.3–0.5 MON** in gas. Keep at least **5–10 MON** in the keeper wallet as a buffer.

### 4. Run

```bash
# One-shot with tsx (recommended)
npx tsx graduation-keeper.ts

# Or with ts-node
npx ts-node --esm graduation-keeper.ts
```

---

## Running in production (24/7)

### Option A — PM2 (simplest, on a VPS)

```bash
npm install -g pm2
pm2 start graduation-keeper.ts --name lick-keeper --interpreter "npx tsx"
pm2 save
pm2 startup
```

### Option B — Railway / Render (cloud, ~$5/mo)

1. Connect your GitHub repo
2. Set root directory to `script/`
3. Set start command: `npx tsx graduation-keeper.ts` (a `script/railway.json` is
   already committed with this start command + an `ON_FAILURE` restart policy,
   so Railway will pick it up automatically once the service root is `script/`)
4. Add all env vars from `.env.example` as environment variables in the dashboard —
   **make sure to set `VAULT_BUYBACK_ADDR` and `VAULT_LP_ADDR` too**, otherwise the
   vault execution half of the keeper silently stays disabled (you'll see
   `VaultBuybackBurn: (not configured)` in the logs)
5. Under Settings, make sure "Serverless"/"Sleep Application" is **off** for this
   service (it's a headless poller with no HTTP traffic, so Railway can't
   detect activity and may sleep/cycle it if that's enabled)
6. This service has no HTTP server, so do **not** attach a public domain or a
   healthcheck path to it — Railway would keep restarting it waiting for a
   health check response that will never come

> Note on `Stopping Container` / `npm error signal SIGTERM` in logs: this is
> expected on every redeploy or restart — Railway sends `SIGTERM` to stop the
> old container. The keeper now handles this signal explicitly and exits
> cleanly (see `graduation-keeper.ts`), and the start command bypasses the
> `npm run` wrapper (which otherwise logs a cosmetic `npm error signal
> SIGTERM` even on a clean shutdown).


### Option C — Docker

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY script/ .
RUN npm install viem dotenv tsx
CMD ["npx", "tsx", "graduation-keeper.ts"]
```

---

## Monitoring

The keeper logs to stdout:

```
[keeper] Starting graduation keeper on chain 143
[keeper] Polling every 6000ms from block 83961211
[keeper] Graduated token: 0xabc... — calling migrateLiquidity
[keeper] Migration tx sent: 0x123... — waiting for receipt
[keeper] Migration confirmed for 0xabc...
```

Monitor with `pm2 logs lick-keeper` or your cloud provider's log viewer.

---

## Vault reconciliation (recurring maintenance)

The live `FeeRouter` (`0x5BBe528936E627d33DE36f10d9DB946089b9E903`) predates the
`receiveForToken(address)` audit fix and can **never be replaced**
(`Factory.feeRouter` is set-once). It raw-sends every trade fee straight to
`VaultBuybackBurnV2` / `VaultLPSupport`'s bare `receive()`, which does **not**
populate the per-token `pendingBurn`/`pendingLP` mapping the keeper's
`execute()` threshold check relies on. So MON keeps silently accumulating in
both vaults' aggregate balance without ever being attributed to a specific
token — the keeper can't see it and `execute()` will never fire for that
token until it's manually reconciled.

**This means the reconcile step must be repeated periodically for as long as
this FeeRouter is deployed** (it is not a one-time fix).

### Regenerating the reconcile batch

```bash
node script/generate-reconcile-batch.mjs
```

This script (`script/generate-reconcile-batch.mjs`):
1. Re-queries live on-chain state (never trusts stale numbers).
2. For each vault (BB and LP), finds the vault's own last `Deposited` event
   (i.e. the last time it was reconciled) and sums `FeeRouted.<share>`
   events **strictly after** that block, per token — this is exactly the
   untracked wei amount sitting in that vault's balance.
3. Emits a ready-to-import Safe Transaction Builder JSON batch:
   `sweep(safe, totalUntracked)` followed by one
   `VaultRecouper.recover(vault, token)` call per token with a nonzero
   untracked amount (correctly split across however many tokens have
   accrued fees — not lumped into a single token).
4. Automatically skips a vault entirely if nothing is untracked.

Output: a timestamped `safe-batch-reconcile-<ts>.json` in `script/`. Rename
it to something memorable (e.g. `safe-batch-reconcile-3.json`) and import it
into the Safe Transaction Builder (app.safe.global, multisig
`0x9F3fDE2C42BA3B00110fC4dc3365782dFE2743fA`). **Re-verify amounts are still
current immediately before executing** — if meaningful time has passed since
generation, just re-run the script again rather than trusting old numbers.

### After executing the batch

No environment variable or Railway config changes are needed — the batch only
moves MON that's already sitting in the existing vaults back into those same
vaults with corrected per-token attribution; it does not change which
contract addresses are in use. Once the batch confirms, any token whose
`pendingBurn`/`pendingLP` crosses the 50 MON `EXECUTION_THRESHOLD` will have
its buyback+burn (or LP add, once graduated) fired automatically by the
Railway keeper within its next ~60s poll cycle — no manual action needed
beyond executing the Safe batch.

---

## Mainnet contract addresses

| Contract | Address |
|---|---|
| GraduationRouter | `0xb2Dc164Ac4eCDDA7Ea2D4115bC122463c65460b2` |
| Factory | `0x9845c5625d9f9C48e17956940485aAAAD168aA10` |
| VaultBuybackBurnV2 | `0xd22bEf54aD5baeA2C21a80B91E38C5B67Cbb1822` |
| VaultLPSupport | `0xF1Aac85a5F964564e472BF1E0628c536b01809e0` |
| VaultRecouper | `0x3b0e57DBd9F80dB7963aa80A1167A224eD5E2b91` |
| Multisig Safe | `0x9F3fDE2C42BA3B00110fC4dc3365782dFE2743fA` |
| Chain | Monad Mainnet (143) |
| Deploy block | 83961211 |

