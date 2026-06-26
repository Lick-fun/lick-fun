# Lick.fun

> A meme lake on liquidity fun. Social-first token launchpad on Monad with earned creator reputation.

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.27-blue)](https://soliditylang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Foundry](https://img.shields.io/badge/Foundry-latest-orange)](https://getfoundry.sh/)
[![Tests](https://img.shields.io/badge/Tests-136%20Forge%20•%2058%20Vitest-green)](.)

**Status:** 3 security audit passes · 136 Forge tests green · Live on Monad testnet (chain 10143) · Envio HyperSync indexer live · **Phase 3 shipped** — custom fee config for all users (Nad.fun-style toggle-card UI with 4 destinations: Buyback & Burn / LP Support / Creator / Gift), tier gating removed, new `FeeRouter.applyCustomConfig()` + `Factory.createTokenWithCustomConfig()` deployed at block 40685542 · Phase 2 FeeRouter + reputation-gated tier system deployed (Starter / Creator Extra / Creator + LP Support / Custom) · Profile & reputation live on frontend · Token creation now requires image + social links · PriceChart enhanced — volume histogram pane, OHLC crosshair header, chart type toggle (candle/bar/line), MCap/Price toggle, USD/MON quote toggle, log scale, fullscreen, extended timeframes (1W/1M) · Token detail page redesigned (nad.fun-inspired 2-column layout with IPFS metadata, social links, stats grid) · Prediction Markets page redesigned — token name/symbol/price/MC/progress on every card, stats bar, sort controls, YES/NO pool split bar, parimutuel payout fix, status badges · **Phase 3 shipped** — USD market cap display (CoinGecko feed), founder token banner, profile custom name + avatar (wallet-signed), ticker redesigned as full-width auto-scrolling marquee, charts default to MCap + USD, 24h % change bug fixed, token names now display in ticker + markets via GraphQL join, About page rewritten in buyer-friendly language · **Phase 3b shipped** — removed 10% auto dev allocation (100% supply to curve, creators buy their own tokens via dev pre-buy), TradePanel slippage control (default 10%, clickable with 1%/5%/10% presets + custom input), MAX button on dev buy reserves 10 MON for creation fee, sell MAX button uses formatEther to avoid 1-wei rounding bug, global CSS hides number input spinners · **Phase 3c shipped** — USD MC on every token card (home trending + grid, discover grid) via shared `lib/format.ts` helpers, bonding bar default `progress = 0` (was misleading `65`), discover cards now show live price + 24h change matching homepage, trending card fixed (removed fixed `h-[343px]` height that was clipping MC/VOL/bonding bar via `overflow-hidden`, added token name + ticker, added bonding curve progress bar with purple gradient) · **Phase 3g shipped** — Profile page overhaul: token holdings (bought, not created) with live USD value + P&L, Portfolio Summary card (MON balance + total value + P&L), Tokens Created now shows USD MC + creator fees distributed per token, Activity tabs (All/Buys/Sells/Creates), max-width increased to 960px

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

**Profile page sections (Phase 3g):**
- **Profile Card** — avatar, display name, address, tier badge, reputation score, stats (Tokens / Graduated / Buy Vol / Sell Vol)
- **Portfolio Summary** — Total Value (USD with MON fallback), MON balance, Holdings value, P&L with percentage
- **Holdings** — tokens the wallet bought, with balance, current price, USD value, P&L per holding (green/red)
- **Achievements** — badge grid (only if badges earned)
- **Tokens Created** — USD MC + creator fees distributed per token (show all, "Show more" if > 10)
- **Activity** — tabs (All / Buys / Sells / Creates) with counts

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

## Testnet Deployment (Monad chain 10143)

### Phase 1 (still live — indexing historical tokens)

| Contract | Address |
|---|---|
| Factory (Phase 1) | `0xe5a63a3496952bb12e4802264244d476a8f36eed` |
| GraduationPool | `0x5c9CFaBf0E94f1ACF37A77a6f21B1e5acfD20568` |
| ProfileRegistry | `0xc21d440e717a8E5637a2628B8f5AA5430e17e82E` |
| VestingController (Phase 1) | `0xAA5b7D3ab8387CdEE8767f4E622101da191C6AfC` |
| LickFactory (DEX) | `0x6848A334f9f7C2Cd5a2b34580EcC05F1616bAE48` |

### Phase 3 (custom fee config — redeployed 2026-06-26, block 40685542)

| Contract | Address |
|---|---|
| Factory (Phase 3) | `0x7fDDc1ae25164664e8837679f7Fd7b5ef59860f3` |
| FeeRouter | `0xfCFe5E41410575D7D37310A05ef12ed0F48f3A8e` |
| GraduationRouter | `0x073aD4D827c614494f470195f77a4B753c0963f7` |
| VaultLPSupport | `0x9Ca7D23D57b285C7b46A19e1CE2CcB355B0fF479` |
| VaultBuybackBurn | `0xd1309F6A7c486B0e81979522d339AF5ea2a27c56` |
| PredictionMarket | `0xb7aa4530c65EE93F34797A8eE988159E79C2abbE` |
| VestingController (Phase 2, deprecated) | `0xC97C71435c3Fe98a955e939D1B6f509327795C1D` |

RPC: https://testnet-rpc.monad.xyz
Envio: https://indexer.dev.hyperindex.xyz/7dfa25f/v1/graphql

---

## Project Structure

```
lick-fun/
├── contracts/          Foundry project (13 Solidity contracts, 136 tests)
│   ├── src/            13 contracts (Factory, BondingCurve, FeeRouter, etc.)
│   ├── script/         Deploy scripts
│   └── test/           13 test files, 136 Forge tests
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
# Frontend
cd frontend && pnpm install && pnpm dev   # → http://localhost:3010

# Contracts (Forge)
cd contracts && forge build --root . --config-path foundry.toml
forge test --root . --config-path foundry.toml

# Indexer
cd indexer && pnpm install && pnpm dev

# Reputation tests
cd reputation && pnpm install && pnpm test
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
Factory (owner-gated setters)
├── LickToken              Pure ERC-20, 1B supply per token
├── BondingCurve           CPMM, 2% fee, anti-sniping, graduation at 100K MON
├── FeeRouter              5 tiers, pull-payment fallback for failed pushes
├── VaultLPSupport         LP support vault stub
├── VaultBuybackBurn       Buyback & burn vault stub
├── VestingController      OZ VestingWallet, 0d vest (Phase 2)
└── GraduationRouter       Migration: curve to LickPair, LP burned to 0xdead
    ├── LickFactory        CREATE2 V2 factory (restricted to router)
    └── LickPair           V2-style AMM (0.25% LP-only fee, ERC-20 LP)

PredictionMarket           Binary grad predictions (factory-only createMarket)
GraduationPool             Sponsorship pool for high-rep creators
ProfileRegistry            Wallet linking (0.1 MON bond), daily Merkle anchor
```

---

## Security

3 audit passes completed — all findings fixed:

- Pass 1: Reentrancy, solvency guard, access control
- Pass 2: LP burn, factory access, fee simplification
- Pass 3: onlyOwner Factory gates · failure-tolerant FeeRouter routing · GraduationRouter exact-price migration · deprecated function gating

136 Forge tests · 58 vitest tests · All green.

---

## Build Pipeline

| Stage | What | Status |
|---|---|---|
| 0-8 | Core contracts, indexer, reputation, frontend, ProfileRegistry | done |
| + | GraduationRouter + LickPair + LickFactory (V2 DEX, LP burn) | done |
| + | Security audit passes 1-3 (all findings fixed) | done |
| + | Testnet deploy (Monad 10143) | done |
| + | Envio indexer v3 ESM rewrite + live GraphQL | done |
| + | Phase 2: FeeRouter tiers + vaults + LP burn to 0xdead | done |
| + | Phase 2: Audit pass 3 (10 fixes, 136 tests) | done |
| + | Phase 2: applyPreset fix redeployed (block 40486351) | done |
| + | TradingView Lightweight Charts price chart on token detail page | done |
| + | Token detail page redesign — nad.fun 2-column layout (IPFS metadata, social links, stats grid, compact header, trades table) | done |
| + | PriceChart fix — async init now applies bars immediately after series creation | done |
| + | TradePanel redesign — full-width Buy/Sell toggle, quick-select presets, cleaner layout | done |
| + | PriceChart enhancement — volume histogram, OHLC header, chart type toggle, MCap/Price, USD/MON, log scale, fullscreen, 1W/1M timeframes | done |
| + | Prediction Markets page redesigned — token name/symbol/price/MC/progress on every card, stats bar (active/locked/positions), sort controls (Largest Pool/Closes Soonest/Newest), YES/NO pool split bar, parimutuel payout fix (no stake added back), status badges, token detail page widget with countdown | done |
| + | Prediction Market GraphQL queries — QUERY_ALL_MARKETS, QUERY_MARKET, QUERY_BETS_BY_MARKET, QUERY_MY_BETS, QUERY_CLAIMS_BY_MARKET (uses existing Envio indexer) | done |
| -> | Phase 3: USD market cap display | pending |
| -> | Phase 3: Founder-first-token launch | pending |
| -> | Phase 3: protocolFeeReceiver to multisig | pending |
| -> | Mainnet launch | pending |

136 Forge tests · 58 vitest tests · 13 contracts · 9 pages · All green

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
