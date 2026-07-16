# Lickfun.xyz

> A meme lake on liquidity fun. Social-first token launchpad on Monad with earned creator reputation.

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.27-blue)](https://soliditylang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Foundry](https://img.shields.io/badge/Foundry-latest-orange)](https://getfoundry.sh/)
[![Tests](https://img.shields.io/badge/Tests-176%20Forge%20•%2061%20Vitest-green)](.)

**Status:** 🟢 **Live on Monad mainnet (chain 143)** · 29-finding mainnet security audit completed + all fixes applied (164 → 176 Forge tests) · Phase 3 — custom fee config for all users · **Phase 4 hardening (2026-07-13)** — V2 buyback-and-burn vault live (burn-to-dead-address, works with every ERC-20), vault auto-execution at 50 MON threshold with 5% on-chain slippage cap, untracked-vault-balance Telegram alerting in the keeper, Storj-backed profile metadata (survives Railway redeploys), Sentry error monitoring + Plausible analytics opt-in (env-gated, no-op without DSN), `/terms` and `/privacy` pages (legal-review pending) · **UI overhaul (2026-07-16)** — full Figma redesign (purple/lime theme) merged across every page and component, production infra (Sentry, WalletConnect fail-fast, Storj-backed profile storage) verified intact · **Profile/reputation upgrades (2026-07-16)** — new "First Graduation" badge (12 badges total), on-chain token name/symbol resolution on profile Holdings + Tokens Created lists (fixes blank names from indexer), token page Holders list now shows the bonding curve (pre-grad unsold supply), the DEX liquidity pool (post-grad), and the dead/burn address (🔥 Burned) as labeled rows · **Profile Activity tabs (2026-07-16)** — Activity rows (All/Buys/Sells) now show the token **name** (was symbol only) with USD value traded as primary (MON secondary); Creates tab shows token name + market cap USD; holdings name fallback fixed so on-chain `name()`/`symbol()` resolution fires instead of leaking truncated contract addresses · **Reputation consistency fix (2026-07-16)** — unified the token page + profile page onto a single sigmoid scoring engine (removed divergent legacy linear `computeReputation`), trader-only wallets now get a Starter score (was blank), homepage "Highest Reputation" sort renamed to "Highest Volume" (was volume-sorted under a misleading label), `medianGradVolume` normalized to the 100k MON graduation threshold (was per-profile → always ~1.0), "Never Rug" + "Pre-buy Honest" badges suppressed until their signals are indexed, profile OG/Twitter meta tags migrated to Storj (was local-disk, stale on Railway redeploys). 4 tokens live, fees verified to Safe multisig treasury `0x9F3fDE2C42BA3B00110fC4dc3365782dFE2743fA` (block 83961211).

## Overview

Lickfun.xyz is a social-first token launchpad on [Monad](https://monad.xyz) (MON). It uses a bonding-curve system to bootstrap liquidity for new tokens, then graduates successful ones to a built-in Uniswap V2-style DEX. The core innovation is earned creator reputation — a portable, multi-wallet Profile that replaces hype with on-chain track records.

No open posting feed. No shilling. Your behavior is your content.

---

## How It Works

### 1. Create
A creator submits a token with a name, symbol, image, and fee tier. An optional 30-second delay provides anti-snipe protection.

### 2. Trade
Anyone can buy/sell on the bonding curve. Symmetric anti-sniping penalties protect early traders (decays over 7 blocks: 80% → 40% → 20% → 15% → 10% → 10% → 5% → 0%, first buy exempt).

### 3. Graduate
When the curve accumulates 100,000 MON, GraduationRouter migrates all liquidity to a LickPair (V2-style AMM). LP tokens are burned to `0xdead` — permanent liquidity, strongest trust signal.

### 4. Fee Strategy (Phase 3 — custom for all users)
Every creator sets their own fee split at launch via a Nad.fun-style toggle-card UI. The 1% creator fee is routed through FeeRouter to up to 4 destinations:

| Destination | Description |
|---|---|
| Buyback & Burn | Used to buy back and burn tokens, reducing supply |
| LP Support | Feeds into liquidity pools to deepen token liquidity |
| Creator | Sent directly to your wallet on every trade |
| Gift | Split to any wallet — team, partner or community fund |

All enabled shares must sum to exactly 100%. No tier gating — available to every wallet regardless of reputation. Gift split is optional (toggle ON to reveal address input).

### 5. Earn Reputation
Every on-chain action feeds an off-chain reputation engine. Scores (0–100) computed from graduation rates, trader diversity, cumulative graduated volume, account age, and burst/self-trade penalties. Sigmoid formula: `100 / (1 + e^(-0.15 × (raw - 0.4)))`. 12 milestone badges (10 earnable + Founder + First Graduation). Computed client-side per profile view; daily Merkle-root anchoring to an on-chain ProfileRegistry is spec'd for Stage 6 (not yet wired).

### 6. View Profile
Connected wallet → click Profile in nav → see live trading stats, reputation score, tier badge, achievements, tokens created, and recent activity — all from the Envio indexer.

**Profile page sections (Phase 3g+):**
- **Profile Card** — avatar, display name, address, tier badge, reputation score, stats (Tokens / Graduated / Buy Vol / Sell Vol), social links row (X / website / Telegram — shown only when set)
- **Portfolio Summary** — Total Value (USD with MON fallback), MON balance, Holdings value, P&L with percentage
- **Holdings** — tokens the wallet bought, with balance, current price, USD value, P&L per holding (green/red). Token name/symbol resolved on-chain via multicall when indexer values are blank.
- **Achievements** — badge grid (only if badges earned)
- **Tokens Created** — USD MC + creator fees distributed per token (show all, "Show more" if > 10). Token name/symbol resolved on-chain via multicall when indexer values are blank.
- **Activity** — tabs (All / Buys / Sells / Creates) with counts. Trade rows show the token **name** (primary) + `symbol · timeAgo` (secondary), with **USD value traded** as primary (MON as secondary, falls back to MON-only when MON/USD price unavailable). Creates rows show token name + market cap USD. Token name/symbol resolved on-chain via multicall when indexer values are blank.

**Profile editing (owner only):**
- Display name (32 char max)
- Avatar image (upload → Storj S3, EIP-191 signed)
- Social links — X/Twitter (`https://x.com/…`), website, Telegram (`https://t.me/…`) — each independently saved, validated as https:// URLs server-side, only non-empty links shown on profile card

---

## Locked Parameters

| Parameter | Value |
|---|---|
| Chain | Monad (chain 143 mainnet / 10143 testnet) |
| Graduation threshold | 100,000 MON |
| Virtual reserves | 80,000 vMON / 477,000,000 vTokens |
| Total supply per token | 1,000,000,000 |
| Anti-sniping | Symmetric buy+sell, 7-block decay: 80/40/20/15/10/10/5/0%, first buy exempt |
| Bonding curve fee | 2% (1% protocol + 1% creator) |
| Post-grad DEX fee | 0.25% LP-only |
| LP at graduation | Burned to 0xdead (permanent) |
| Dev allocation | None — 100% of supply to curve. Creators buy their own tokens via dev pre-buy (first buy exempt from anti-sniping) |

---

## Mainnet Deployment (Monad chain 143)

**Deployed: 2026-06-27 · Block: 83961211 · Treasury: Safe multisig · Status: 🟢 LIVE**

**Founder token (LICK):** `0x0236787a1baaeed46a123fa264a2355eed11d151` — fees verified flowing to Safe treasury ✅

| Contract | Address |
|---|---|
| Factory | `0x9845c5625d9f9C48e17956940485aAAAD168aA10` |
| FeeRouter | `0x5BBe528936E627d33DE36f10d9DB946089b9E903` |
| GraduationRouter | `0xb2Dc164Ac4eCDDA7Ea2D4115bC122463c65460b2` |
| PredictionMarket | `0xe9200097cA7d7a48D87ce249B671c36ccB406776` |
| LickFactory (DEX) | `0xee3A05b788f375C34cF4d6EC63Ef3872D87b62c8` |
| LickRouter | `0xD0cC6C69162eb0635A7d423aEb2086F1821cA844` |
| VaultLPSupport (v2, active) | `0xF1Aac85a5F964564e472BF1E0628c536b01809e0` |
| VaultBuybackBurn (v2, active — burn-to-dead-address) | `0xd22bEf54aD5baeA2C21a80B91E38C5B67Cbb1822` |
| VaultRecouper (helper) | `0x3b0e57DBd9F80dB7963aa80A1167A224eD5E2b91` |
| GraduationPool | `0x33e576E95F0d6f6B214F602ec5022Ffed0Eae389` |
| WMON | `0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A` |
| Treasury (Safe multisig) | `0x9F3fDE2C42BA3B00110fC4dc3365782dFE2743fA` |
RPC: https://rpc.monad.xyz (frontend) / Alchemy PAYG dedicated endpoint (keeper + /api/trades)

## Previous: Testnet Deployment (Monad chain 10143)

<details>
<summary>Testnet addresses (historical reference)</summary>

**Phase 1**

| Contract | Address |
|---|---|
| Factory (Phase 1) | `0xe5a63a3496952bb12e4802264244d476a8f36eed` |
| GraduationPool | `0x5c9CFaBf0E94f1ACF37A77a6f21B1e5acfD20568` |
| ProfileRegistry | `0xc21d440e717a8E5637a2628B8f5AA5430e17e82E` |
| LickFactory (DEX) | `0x6848A334f9f7C2Cd5a2b34580EcC05F1616bAE48` |

**Phase 3 (block 40685542)**

| Contract | Address |
|---|---|
| Factory | `0x7fDDc1ae25164664e8837679f7Fd7b5ef59860f3` |
| FeeRouter | `0xfCFe5E41410575D7D37310A05ef12ed0F48f3A8e` |
| GraduationRouter | `0x073aD4D827c614494f470195f77a4B753c0963f7` |
| PredictionMarket | `0xb7aa4530c65EE93F34797A8eE988159E79C2abbE` |

RPC: https://testnet-rpc.monad.xyz

</details>

---

## Project Structure

```
lick-fun/
├── contracts/          Foundry project (15 Solidity contracts, 176 tests)
│   ├── src/            15 contracts (Factory, BondingCurve, FeeRouter, VaultBuybackBurnV2, VaultRecouper, …)
│   ├── script/         Deploy scripts (DeployMainnet.s.sol — mainnet; DeployVestingAndFactory.s.sol — testnet; ReconcileVaults.s.sol)
│   └── test/           17 test files, 176 Forge tests (incl. AuditFixes.t.sol, VaultsV2.t.sol)
├── frontend/           Next.js 15.5 (11 pages, wagmi, RainbowKit)
│   ├── src/app/        Routes: / /create /discover /how-it-works /markets /profile/[address] /token/[id] /terms /privacy
│   ├── src/instrumentation*  Sentry + instrumentation hooks (env-gated, no-op without DSN)
│   └── src/components/ UI + layout + reputation + token (TradePanel, PriceChart, CurveChart, Footer, Analytics)
├── indexer/            Envio HyperIndex v3 config + handlers (5 entities)
├── reputation/         Off-chain TypeScript scoring engine (12 badges, 3 tiers, Merkle anchor)
├── .memory/            RAG reference files for Cline (latest 2026-* session notes tracked)
└── script/             Utility scripts
    ├── graduation-keeper.ts            Polls CurveGraduate, auto-migrates graduated tokens, auto-executes vaults at 50 MON threshold
    ├── generate-reconcile-batch.mjs    Recurring Safe-batch generator for stranded-vault-MON reconciliation
    └── reconcile-vaults.mjs            One-shot Safe-batch generator
```

---

## Reputation Badges (12 total)

| Badge | Condition |
|---|---|
| Founder | Hardcoded — deployer wallet only (not earnable) |
| First Token | tokenCount ≥ 1 |
| First Graduation | graduatedCount ≥ 1 (no diversity gate) |
| Triple Graduate | graduatedCount ≥ 3 + trader diversity ≥ 30% |
| Deca Graduate | graduatedCount ≥ 10 + trader diversity ≥ 30% |
| Crowd Favourite | One graduated token with 200+ unique buyers |
| Diamond Hands | Never sold creator allocation on a graduated token |
| Never Rug | age ≥ 30d + zero rug events *(suppressed — rug detection not yet indexed)* |
| Pre-buy Honest | prebuy honesty rate ≥ 95% *(suppressed — pre-buy tagging not yet indexed)* |
| Volume Maker | cumulative grad volume > 100K MON |
| Verified Founder | reputation score ≥ 70 |
| OG | age ≥ 365d + ≥ 3 graduates + trader diversity ≥ 30% |

> **Note:** "Never Rug" and "Pre-buy Honest" are currently suppressed in the frontend because their underlying signals (rug events, pre-buy honesty) are not yet indexed. They will be re-enabled once that data is available. The scoring weights for those factors contribute 0 in the meantime.

---

## Quick Start

```bash
# Frontend (mainnet)
cd frontend && pnpm install && pnpm dev   # → http://localhost:3010

# Contracts (Forge)
cd contracts && forge build
forge test   # 176 tests, all green

# Indexer
cd indexer && pnpm install && pnpm dev

# Reputation tests
cd reputation && pnpm install && pnpm test

# Mainnet deploy (requires contracts/.env with PRIVATE_KEY + MULTISIG_ADDR)
cd contracts && forge script script/DeployMainnet.s.sol:DeployMainnet --rpc-url $MAINNET_RPC_URL --broadcast --legacy
```

---

## License

Proprietary — see [LICENSE](LICENSE).
├── indexer/            Envio HyperSync (TypeScript + GraphQL)
├── reputation/         Off-chain reputation engine (TypeScript, 61 tests)
└── frontend/           Next.js 15.5 (11 pages, wagmi, RainbowKit)
```

---

## Contract Architecture

```
Factory (owner = Safe multisig, transferOwnership)
├── LickToken              Pure ERC-20, 1B supply per token
├── BondingCurve           CPMM, 2% fee, anti-sniping, graduation at 100K MON
├── FeeRouter              Preset + custom splits, onlyFactoryOrOwner config, pull-payment fallback
├── VaultLPSupport         LP support vault v2 (owner-sweep, immutable Safe owner, 5% slippage, executes at 50 MON/token)
├── VaultBuybackBurnV2     Buyback & burn vault v2 (burn-to-dead-address — works with any ERC20, replaces V1 which required non-existent token.burn())
├── VaultRecouper          Permissionless helper — re-attributes raw-sent vault MON to per-token mapping
├── VestingController      Dev allocation (0d vest, Phase 2 — not wired on mainnet)
└── GraduationRouter       Migration: skim donations → assert reserves → LP burned to 0xdead
    ├── LickFactory        CREATE2 V2 factory (router-locked after deploy)
    ├── LickPair           V2-style AMM (0.25% LP-only fee, SafeERC20, skim())
    └── LickRouter         Swap router (SafeERC20, amountOutMin, deadline)

PredictionMarket           Parimutuel binary predictions (factory-only createMarket, time gate)
GraduationPool             Sponsorship pool for high-rep creators (onlyReporter Merkle root)
ProfileRegistry            Wallet linking (0.1 MON bond, checked refund, anchor rotation)
```

---

## Security

4 audit passes completed — all findings fixed:

- Pass 1: Reentrancy, solvency guard, access control
- Pass 2: LP burn, factory access, fee simplification
- Pass 3: onlyOwner Factory gates · failure-tolerant FeeRouter routing · GraduationRouter exact-price migration
- **Pass 4 (mainnet, 2026-06-27):** 29 findings — 2 Critical, 4 High, 7 Medium, 8 Low, 5 Info, 3 Gas — all fixed:
  - **C-01** Recoverable vaults (owner + sweep) — fees never permanently locked
  - **C-02** VestingController.initVesting access control
  - **H-01** First-mint donation manipulation blocked (skim + reserve assertion)
  - **H-02** Distinct fee sinks (GraduationPool ≠ VaultLP) deployed
  - **H-03** Factory zero-address check on creatorAddress
  - **H-04** PredictionMarket resolution time gate
  - **M-01–M-07** Router lock, CREATE2 guard, SafeERC20, config gating, withdrawLP guard, multisig treasury, checked refund
  - **L-01–L-08** MIN_LIQUIDITY to 0xdead, skim(), checked LP burn, stranded-MON sweep, ctor guards, anchor rotation, receive() restriction

176 Forge tests · 58 vitest tests · All green · 164 includes 15 audit regression + fuzz tests (`test/AuditFixes.t.sol`)

### API security
- `upload-token` + `register-metadata` require EIP-191 wallet signature (prevents bucket spam + metadata overwrite)
- Rate limiting middleware on all 6 `/api/*` routes (10 req/min uploads, 20 req/min writes, 60 req/min default)
- `upload-profile` + `register-profile` already required EIP-191 from launch
- File-upload validation: 5 MB cap, MIME + extension allowlist, atomic JSON writes
- All Storj indexes are key-deduped; profile metadata uses per-wallet signature-gated writes

### Observability (opt-in, env-gated — no behavior change without configuration)
- **Sentry** — `@sentry/nextjs` wired with browser/server/edge configs and an `instrumentation.ts` hook. No-op unless `NEXT_PUBLIC_SENTRY_DSN` is set. Wallet-rejection errors filtered to avoid noise.
- **Plausible analytics** — cookie-less, privacy-friendly, in root layout. No-op unless `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set.
- **Vault reconciliation alerts** — graduation keeper posts a Telegram message when a vault's untracked balance (raw `balance()` minus tracked per-token mapping) crosses 30 MON. See `script/graduation-keeper.ts` + `script/.env.example` (`ALERT_TELEGRAM_BOT_TOKEN` / `ALERT_TELEGRAM_CHAT_ID`).

---

## Build Pipeline

| Stage | What | Status |
|---|---|---|
| 0-8 | Core contracts, indexer, reputation, frontend, ProfileRegistry | ✅ done |
| + | GraduationRouter + LickPair + LickFactory (V2 DEX, LP burn to 0xdead) | ✅ done |
| + | Security audit passes 1-3 + testnet deploy (chain 10143) | ✅ done |
| + | Envio indexer v3 ESM rewrite + live GraphQL | ✅ done |
| + | Phase 2: FeeRouter tiers + vaults | ✅ done |
| + | Phase 3: Custom fee config for all users (applyCustomConfig) | ✅ done |
| + | Phase 3: PriceChart (volume, OHLC, chart types, MCap/USD/log/fullscreen) | ✅ done |
| + | Phase 3: Prediction Markets page redesign + parimutuel fix | ✅ done |
| + | Phase 3: USD MCap display (CoinGecko), founder banner, profile name/avatar | ✅ done |
| + | Phase 3b: Dev pre-buy model (100% supply to curve, slippage control) | ✅ done |
| + | Phase 3c/d: USD MC on all cards, social links on profiles | ✅ done |
| + | **Mainnet security audit** — 29 findings, all fixed, 164 tests green | ✅ done |
| + | **Mainnet deploy** (chain 143, block 83961211, Safe multisig treasury) | ✅ **LIVE** |
| + | Envio indexer → mainnet (chain 143, block 83961211, endpoint a49668b) | ✅ done |
| + | Founder token LICK created · fees verified to Safe · banner live | ✅ done |
| + | P0 security: upload-token + register-metadata EIP-191 auth | ✅ done |
| + | Rate limiting middleware on all API routes | ✅ done |
| + | LiquidityMigrated indexer handler (pairAddress on Token) | ✅ done |
| + | OG + Twitter card meta tags · mainnet explorer links · friendly errors | ✅ done |
| + | Graduation keeper live (auto-migrates graduated curves, 6s poll) | ✅ done |
| + | V2 buyback-and-burn vault (burn-to-dead-address, ERC20-compatible) | ✅ done |
| + | V1→V2 vault migration (FeeRouter re-pointed, ~87 MON migrated) | ✅ done |
| + | Vault keeper auto-execution at 50 MON/token (BB + LP, 5% slippage cap) | ✅ done |
| + | Recurring vault-reconcile batch generator (`script/generate-reconcile-batch.mjs`) | ✅ done |
| + | Profile metadata migrated to Storj-backed index (survives Railway redeploys) | ✅ done |
| + | Sentry error monitoring opt-in (env-gated, no-op without DSN) | ✅ done |
| + | Plausible analytics opt-in (cookie-less, no-op without DOMAIN) | ✅ done |
| + | `/terms` and `/privacy` pages (legal-review pending) | ✅ done |
| + | V2 buyback burns confirmed end-to-end (founder token 11.3M+ tokens sent to `0x…dEaD`) | ✅ done |
| + | Full UI overhaul — Figma redesign (purple/lime theme) merged across every page/component | ✅ done |
| + | Regenerated root pnpm-lock.yaml to include `@sentry/nextjs` (deleted stray `frontend/pnpm-lock.yaml` that was masking the sync issue, Railway `--frozen-lockfile` install was failing) | ✅ done |
| -> | ProfileRegistry + VestingController mainnet deploy (Phase 5) | pending |
176 Forge tests · 58 vitest tests · 15 contracts · 11 pages · All green

---

## Running Locally

```bash
cd contracts && forge build && forge test
cd indexer && envio dev
cd reputation && pnpm install && pnpm test
cd frontend && pnpm install && pnpm run dev   # localhost:3001
```

---

## Market Cap & Price Math

```typescript
const priceInMon = token.realMon / token.soldTokens   // guard: soldTokens === 0n -> show dash
const mcInMon    = priceInMon * 1_000_000_000n
const mcInUsd    = mcInMon * MON_USD_PRICE            // env var: NEXT_PUBLIC_MON_USD_PRICE
const volume     = token.totalBuyVolume + token.totalSellVolume
```

Built for Monad. Reputation over hype.
