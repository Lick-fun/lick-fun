# Lick.fun

> A meme lake on liquidity fun. Social-first token launchpad on Monad with earned creator reputation.

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.27-blue)](https://soliditylang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Foundry](https://img.shields.io/badge/Foundry-latest-orange)](https://getfoundry.sh/)
[![Tests](https://img.shields.io/badge/Tests-137%20Forge%20•%2058%20Vitest-green)](.)

**Status:** 3 security audit passes · 137 Forge tests green · Live on Monad testnet (chain 10143) · Envio HyperSync indexer live · Phase 2 FeeRouter + reputation-gated tier system deployed (Starter / Creator Extra / Creator + LP Support / Custom) · Profile & reputation live on frontend · Token creation now requires image + social links · PriceChart enhanced — volume histogram pane, OHLC crosshair header, chart type toggle (candle/bar/line), MCap/Price toggle, USD/MON quote toggle, log scale, fullscreen, extended timeframes (1W/1M) · Token detail page redesigned (nad.fun-inspired 2-column layout with IPFS metadata, social links, stats grid) · Prediction Markets page redesigned — token name/symbol/price/MC/progress on every card, stats bar, sort controls, YES/NO pool split bar, parimutuel payout fix, status badges · Phase 3 (USD MC display, founder token) next

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

### 4. Fee Tiers
Creators choose a tier at launch. The 1% creator fee is split per-tier through FeeRouter. Tier access is gated by reputation (Starter / Established / Verified):

| Tier | Creator | LP Support | Buyback & Burn | Min Reputation | Notes |
|---|---|---|---|---|---|
| Starter | 10% | 80% | 10% | Starter | Entry tier |
| Creator Extra | 30% | 60% | 10% | Established | Builder tier |
| Creator + LP Support | 20% | 70% | 10% | Established | Community-focused split |
| Custom | custom | custom | custom | Verified | Fully customisable — any split summing to 100% |

### 5. Earn Reputation
Every on-chain action feeds an off-chain reputation engine. Scores (0–100) computed from graduation rates, lock fulfillment, pre-buy honesty, profile age, verified tenure, and volume. Sigmoid formula: `100 / (1 + e^(-0.15 × (raw - 0.4)))`. Anchored daily on-chain via Merkle root in ProfileRegistry. 10 milestone badges auto-awarded.

### 6. View Profile
Connected wallet → click Profile in nav → see live trading stats, reputation score, tier badge, achievements, tokens created, and recent activity — all from the Envio indexer.

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
| Dev allocation | 10% of supply, liquid from block 1 |

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

### Phase 2 (FeeRouter tier system — applyPreset fix redeployed 2026-06-25, block 40486351)

| Contract | Address |
|---|---|
| Factory (Phase 2) | `0x6355D4405c2BCd722c0499f4997A37C7f8B7879f` |
| FeeRouter | `0x7b433B3F5C6D6Af67ec85ADbCdeC8b5a8AFAA6BA` |
| GraduationRouter | `0x97b4229951eDb4067560bB37B39cbCb3C1351CeF` |
| VaultLPSupport | `0x9d470C278234E2b895afccD0a1D1DF5A77Fb7edd` |
| VaultBuybackBurn | `0xdF3eDa57950e54feA6432cfDCc1EcD6aBB452D48` |
| PredictionMarket | `0x73e4dd64abf9909c06c9b9111f35ab4902ec37e2` |
| VestingController (Phase 2) | `0xC97C71435c3Fe98a955e939D1B6f509327795C1D` |

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
