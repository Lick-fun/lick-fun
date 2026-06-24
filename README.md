# Lick.fun

> A meme lake on liquidity fun. Social-first token launchpad on Monad with earned creator reputation.

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.27-blue)](https://soliditylang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Foundry](https://img.shields.io/badge/Foundry-latest-orange)](https://getfoundry.sh/)

**Status:** 3 security audit passes · 136 Forge tests green · Live on Monad testnet (chain 10143) · Envio HyperSync indexer live · Phase 2 FeeRouter + tier system deployed · Phase 3 (USD MC display, founder token) next

---

## Overview

Lick.fun is a social-first token launchpad on [Monad](https://monad.xyz) (MON). It uses a bonding-curve system to bootstrap liquidity for new tokens, then graduates successful ones to a built-in Uniswap V2-style DEX. The core innovation is earned creator reputation — a portable, multi-wallet Profile that replaces hype with on-chain track records.

No open posting feed. No shilling. Your behavior is your content.

---

## How It Works

### 1. Create
A creator submits a token with a name, symbol, image, and fee tier. An optional 30-second delay provides anti-snipe protection.

### 2. Trade
Anyone can buy/sell on the bonding curve. Symmetric anti-sniping penalties protect early traders (decays over 7 blocks, first buy exempt).

### 3. Graduate
When the curve accumulates 100,000 MON, GraduationRouter migrates all liquidity to a LickPair (V2-style AMM). LP tokens are burned to `0xdead` — permanent liquidity, strongest trust signal.

### 4. Fee Tiers
Creators choose a tier at launch. The 1% creator fee is split per-tier through FeeRouter:

| Tier | Creator | LP Support | Buyback & Burn | Notes |
|---|---|---|---|---|
| Light | 10% | 80% | 10% | Entry tier |
| Standard A | 30% | 60% | 10% | Creator-led |
| Standard B | 20% | 70% | 10% | Protocol-health |
| Diamond | custom | min 80% LP | custom | Floor enforced on-chain |
| ECOSYSTEM | 20% | 40% | 40% | Protocol reserve |

### 5. Earn Reputation
Every on-chain action feeds an off-chain reputation engine. Scores are computed from graduation rates, lock fulfillment, pre-buy honesty, profile age, verified tenure, and volume. Anchored daily on-chain via Merkle root in ProfileRegistry.

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

### Phase 2 (FeeRouter tier system)

| Contract | Address |
|---|---|
| Factory (Phase 2) | `0x0Ba732dd3072764634bC410914b2D4e9fA7c0862` |
| FeeRouter | `0x1bC6FA459AE10738A5bFeDD08239386C2d3dec4f` |
| GraduationRouter | `0xd7cdb6D52f76EcaF226A32111CB6A2681a186Ca1` |
| VaultLPSupport | `0x8fD0e571721a3FB1Fd140676E4d248a195FbC670` |
| VaultBuybackBurn | `0x5094a0Dbae5FdAE06D495171944daefB01570415` |
| VestingController (Phase 2) | `0xC97C71435c3Fe98a955e939D1B6f509327795C1D` |

RPC: https://testnet-rpc.monad.xyz
Envio: https://indexer.dev.hyperindex.xyz/6601ad1/v1/graphql

---

## Project Structure

```
lick-fun/
├── contracts/          Foundry project (13 Solidity contracts, 136 tests)
│   ├── src/            13 contracts
│   ├── script/         Deploy scripts
│   └── test/           13 test files, 136 Forge tests
├── indexer/            Envio HyperSync (TypeScript + GraphQL)
├── reputation/         Off-chain reputation engine (TypeScript, 46 tests)
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

136 Forge tests · 46 vitest tests · All green.

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
| -> | Phase 3: USD market cap display | pending |
| -> | Phase 3: Founder-first-token launch | pending |
| -> | Phase 3: protocolFeeReceiver to multisig | pending |
| -> | Mainnet launch | pending |

136 Forge tests · 46 vitest tests · 13 contracts · 9 pages · All green

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
