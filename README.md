# Lick.fun

> A meme lake on liquidity fun. Social-first token launchpad on Monad with earned creator reputation.

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.27-blue)](https://soliditylang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Foundry](https://img.shields.io/badge/Foundry-latest-orange)](https://getfoundry.sh/)
[![Tests](https://img.shields.io/badge/Tests-136%20Forge%20•%2058%20Vitest-green)](.)

**Status:** 🟢 **Live on Monad mainnet (chain 143)** · 29-finding security audit completed + all fixes applied · 164 Forge tests green · Envio HyperSync indexer · Phase 3 shipped — custom fee config for all users (Nad.fun-style toggle-card UI with 4 destinations: Buyback & Burn / LP Support / Creator / Gift), tier gating removed, new `FeeRouter.applyCustomConfig()` + `Factory.createTokenWithCustomConfig()` · Phase 2 FeeRouter + reputation-gated tier system · Profile & reputation live on frontend · Token creation requires image + social links · PriceChart — volume histogram pane, OHLC crosshair header, chart type toggle (candle/bar/line), MCap/Price toggle, USD/MON quote toggle, log scale, fullscreen, 1W/1M timeframes · Token detail page redesigned (nad.fun-inspired 2-column layout) · Prediction Markets page — token name/symbol/price/MC/progress on every card, stats bar, sort controls, YES/NO pool split bar, parimutuel payout, status badges · USD market cap display (CoinGecko feed) · Founder token banner · Profile custom name + avatar (wallet-signed) · Ticker full-width auto-scrolling · Phase 3b — removed 10% auto dev allocation (100% supply to curve, creators buy their own tokens via dev pre-buy), TradePanel slippage control · Phase 3c — USD MC on every token card · Phase 3d — Social links on profiles · **Mainnet launched 2026-06-27** — all 29 audit findings fixed, recoverable vaults, Safe multisig treasury, real GraduationPool, deterministic pair anti-manipulation (skim), full regression + fuzz test suite (164 tests)<!-- Phase 3 shipped — USD market cap display (CoinGecko feed), founder token banner, profile custom name + avatar (wallet-signed), ticker redesigned as full-width auto-scrolling marquee, charts default to MCap + USD, 24h % change bug fixed, token names now display in ticker + markets via GraphQL join, About page rewritten in buyer-friendly language · Phase 3b shipped — removed 10% auto dev allocation (100% supply to curve, creators buy their own tokens via dev pre-buy), TradePanel slippage control (default 10%, clickable with 1%/5%/10% presets + custom input), MAX button on dev buy reserves 10 MON for creation fee, sell MAX button uses formatEther to avoid 1-wei rounding bug, global CSS hides number input spinners · Phase 3c shipped — USD MC on every token card (home trending + grid, discover grid) via shared `lib/format.ts` helpers, bonding bar default `progress = 0` (was misleading `65`), discover cards now show live price + 24h change matching homepage, trending card fixed (removed fixed `h-[343px]` height that was clipping MC/VOL/bonding bar via `overflow-hidden`, added token name + ticker, added bonding curve progress bar with purple gradient) · **Phase 3g shipped** — Profile page overhaul: token holdings (bought, not created) with live USD value + P&L, Portfolio Summary card (MON balance + total value + P&L), Tokens Created now shows USD MC + creator fees distributed per token, Activity tabs (All/Buys/Sells/Creates), max-width increased to 960px

---

## Overview

Lick.fun is a social-first token launchpad on [Monad](https://monad.xyz) (MON). It uses a bonding-curve system to bootstrap liquidity for new tokens, then graduates successful ones to a built-in Uniswap V2-style DEX. The core innovation is earned creator reputation — a portable, multi-wallet Profile that replaces hype with on-chain track records.

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
Every on-chain action feeds an off-chain reputation engine. Scores (0–100) computed from graduation rates, lock fulfillment, pre-buy honesty, profile age, verified tenure, and volume. Sigmoid formula: `100 / (1 + e^(-0.15 × (raw - 0.4)))`. Anchored daily on-chain via Merkle root in ProfileRegistry. 10 milestone badges auto-awarded.

### 6. View Profile
Connected wallet → click Profile in nav → see live trading stats, reputation score, tier badge, achievements, tokens created, and recent activity — all from the Envio indexer.

**Profile page sections (Phase 3g+):**
- **Profile Card** — avatar, display name, address, tier badge, reputation score, stats (Tokens / Graduated / Buy Vol / Sell Vol), social links row (X / website / Telegram — shown only when set)
- **Portfolio Summary** — Total Value (USD with MON fallback), MON balance, Holdings value, P&L with percentage
- **Holdings** — tokens the wallet bought, with balance, current price, USD value, P&L per holding (green/red)
- **Achievements** — badge grid (only if badges earned)
- **Tokens Created** — USD MC + creator fees distributed per token (show all, "Show more" if > 10)
- **Activity** — tabs (All / Buys / Sells / Creates) with counts

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
| VaultLPSupport | `0x69240beca90d25e2D50ca443D8ECaaAB69cCe183` |
| VaultBuybackBurn | `0xe64d7d3E2d714f23B38bc00E1c185875C2b4D1D1` |
| GraduationPool | `0x33e576E95F0d6f6B214F602ec5022Ffed0Eae389` |
| WMON | `0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A` |

RPC: https://rpc.monad.xyz

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
├── contracts/          Foundry project (14 Solidity contracts, 164 tests)
│   ├── src/            14 contracts (Factory, BondingCurve, FeeRouter, etc.)
│   ├── script/         Deploy scripts (DeployMainnet.s.sol — mainnet; DeployVestingAndFactory.s.sol — testnet)
│   └── test/           15 test files, 164 Forge tests (incl. AuditFixes.t.sol)
├── frontend/           Next.js 15.5 (9 pages, wagmi, RainbowKit)
│   ├── src/app/        Routes: / /create /discover /how-it-works /markets /profile/[address] /token/[id]
│   └── src/components/ UI + layout + reputation + token (TradePanel, PriceChart, CurveChart)
├── indexer/            Envio HyperIndex v3 config + handlers (5 entities)
├── reputation/         Off-chain TypeScript scoring engine (10 badges, 3 tiers, Merkle anchor)
├── .memory/            RAG reference files (8 .txt files for Cline)
└── script/             Utility scripts
```

---

## Reputation Badges (10 total)

| Badge | Condition |
|---|---|
| First Token | tokenCount ≥ 1 |
| Triple Graduate | graduatedCount ≥ 3 + trader diversity ≥ 30% |
| Deca Graduate | graduatedCount ≥ 10 + trader diversity ≥ 30% |
| Crowd Favourite | One graduated token with 200+ unique buyers |
| Diamond Hands | Never sold creator allocation on a graduated token |
| Never Rug | age ≥ 30d + zero rug events |
| Pre-buy Honest | prebuy honesty rate ≥ 95% |
| Volume Maker | cumulative grad volume > 100K MON |
| Verified Founder | reputation score ≥ 70 |
| OG | age ≥ 365d + ≥ 3 graduates + trader diversity ≥ 30% |

---

## Quick Start

```bash
# Frontend (mainnet)
cd frontend && pnpm install && pnpm dev   # → http://localhost:3010

# Contracts (Forge)
cd contracts && forge build
forge test   # 164 tests, all green

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
├── reputation/         Off-chain reputation engine (TypeScript, 58 tests)
└── frontend/           Next.js 15.5 (9 pages, wagmi, RainbowKit)
```

---

## Contract Architecture

```
Factory (owner = Safe multisig, transferOwnership)
├── LickToken              Pure ERC-20, 1B supply per token
├── BondingCurve           CPMM, 2% fee, anti-sniping, graduation at 100K MON
├── FeeRouter              Preset + custom splits, onlyFactoryOrOwner config, pull-payment fallback
├── VaultLPSupport         LP support vault (owner-sweep, immutable Safe owner)
├── VaultBuybackBurn       Buyback & burn vault (owner-sweep, immutable Safe owner)
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

164 Forge tests · 58 vitest tests · All green · 164 includes 15 audit regression + fuzz tests (`test/AuditFixes.t.sol`)

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
| + | Envio indexer → mainnet (chain 143, block 83961211, endpoint c6a3f92) | ✅ done |
| + | Founder token LICK created · fees verified to Safe · banner live | ✅ done |
| -> | Frontend file upload validation (5MB limit, type allowlist) | pending |
| -> | Rate limiting on API routes | pending |
| -> | ProfileRegistry + VestingController mainnet deploy (Phase 4) | pending |

164 Forge tests · 58 vitest tests · 14 contracts · 9 pages · All green

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
