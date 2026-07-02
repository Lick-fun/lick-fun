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
| `KEEPER_RPC_URL` | ✅ | Monad mainnet RPC — dedicated Alchemy provider (Pay-As-You-Go plan, unlimited `eth_getLogs` block range) |
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
3. Set start command: `npx tsx graduation-keeper.ts`
4. Add all env vars from `.env.example` as environment variables in the dashboard

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

## Mainnet contract addresses

| Contract | Address |
|---|---|
| GraduationRouter | `0xb2Dc164Ac4eCDDA7Ea2D4115bC122463c65460b2` |
| Factory | `0x9845c5625d9f9C48e17956940485aAAAD168aA10` |
| Chain | Monad Mainnet (143) |
| Deploy block | 83961211 |
