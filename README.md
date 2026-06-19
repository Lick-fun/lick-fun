# Lick.fun

> A meme lake on liquidity fun. Social-first token launchpad on Monad with earned creator reputation.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.27-blue)](https://soliditylang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Foundry](https://img.shields.io/badge/Foundry-latest-orange)](https://getfoundry.sh/)

**Status:** ✅ All 9 build stages complete · ✅ 2 security audit passes · ✅ Live on Monad testnet (chain 10143) · ✅ Frontend gas limits tightened · ⏳ Envio indexer deploy next

---

## Overview

Lick.fun is a social-first token launchpad on [Monad](https://monad.xyz) (MON). It uses a **bonding-curve system** to bootstrap liquidity for new tokens, then graduates successful ones to a built-in Uniswap V2-style DEX. The core innovation is **earned creator reputation** — a portable, multi-wallet Profile that replaces hype with on-chain track records.

No open posting feed. No shilling. Your behavior *is* your content.

---

## How It Works

### 1. Create
A creator submits a single commit transaction declaring token params + allocation + lock tier + a **30-second fixed delay**. No presale, no special access.

### 2. Trade
After the 30s delay, anyone can buy/sell on the bonding curve. **Symmetric anti-sniping penalties** protect early traders (decays over 7 blocks).

### 3. Graduate
When the curve accumulates **100,000 MON**, `GraduationRouter` migrates remaining liquidity to a `LickPair` (V2-style AMM). Trading continues with deeper liquidity.

### 4. Lock & Vest
Creators choose a tier (**Light / Standard / Diamond**). Pre-DEX vesting is 730-day linear. Post-DEX vesting and LP-lock durations are tier-coupled. LP tokens are locked in `VestingController`; creator withdraws after `lockEnd`. If a token never graduates, the dev allocation stays locked — permanent alignment.

### 5. Earn Reputation
Every on-chain action feeds an off-chain reputation engine. Scores are computed from graduation rates, lock fulfillment, pre-buy honesty, profile age, verified tenure, and volume — weighted against asymmetric rug penalties. Scores are 0–100, anchored daily on-chain via Merkle root in `ProfileRegistry`.

---

## Locked Parameters

| Parameter | Value |
|---|---|
| Chain | Monad (chain 143 mainnet / 10143 testnet) |
| Graduation threshold | 100,000 MON |
| Virtual reserves | 80,000 vMON / 477,000,000 vTokens |
| Total supply per token | 1,000,000,000 |
| Fixed mint delay | 30 seconds (~75 Monad blocks) |
| Anti-sniping | Symmetric (buy + sell), 7-block decay: 80/40/20/15/10/10/5/0%, initial buy exempt |
| Deploy fee | 10 MON (spam gate, negligible revenue) |
| Bonding curve fee | 2% (1% protocol + 1% creator) |
| Post-grad DEX fee | 0.25% LP-only |
| LP format | Uniswap V2-style fungible ERC-20 LP (LickPair, standard init-code hash) |
| Dev lock tiers | Light (90d LP lock / 365d vest) · Standard (180/180) · Diamond (365/90) |

---

## Fee Vaults (FeeRouter Presets)

| Preset | Creator | LP Support | Buyback & Burn |
|---|---|---|---|
| **DEFAULT** | 80% | 10% | 10% |
| **ECOSYSTEM** | 20% | 40% | 40% |

The **ECOSYSTEM** preset is used for the founder-first-token. The creator share routes to `GraduationPool` — a sponsorship vault that pays deploy/graduation fees for creators with reputation ≥ 30.

---

## Reputation Signals

| Signal | Weight | Description |
|---|---|---|
| Account age | 0.10 | Saturates at 365 days |
| Graduation rate | 0.25 | Graduated tokens / total launched |
| Lock fulfillment | 0.25 | Lock duration honored vs declared tier |
| Cumulative volume | 0.10 | Total graduated DEX volume |
| Pre-buy honesty | 0.10 | Disclosed vs actual pre-buy match |
| Verified tenure | 0.10 | How long Verified has been held |
| Rug penalty | large | Asymmetric — one rug erases many successes |

```
raw_score = w_age * f_age(account_age_days)
          + w_grad * graduation_rate
          + w_lock * lock_fulfillment_rate
          + w_vol * f_vol(cumulative_grad_volume)
          + w_honest * prebuy_honesty_rate
          + w_vtenure * f_vtenure(verified_tenure_days)
          - w_rug * rug_penalty

reputation = 100 / (1 + e^(-k * (raw_score - midpoint)))
```

Weight `k=0.15`, midpoint `0.4` (tune post-launch on real data). Reputation maps to three tiers:

| Tier | Score Range |
|---|---|
| Starter | 0–30 |
| Established | 30–70 |
| Verified | 70+ |

---

## Testnet Deployment (Monad chain 10143)

All 8 protocol contracts live on Monad testnet via `forge script script/Deploy.s.sol --broadcast`.

| Contract | Address |
|---|---|
| **ProfileRegistry** | `0xc21d440e717a8E5637a2628B8f5AA5430e17e82E` |
| **GraduationPool** | `0x5c9CFaBf0E94f1ACF37A77a6f21B1e5acfD20568` |
| **VestingController** | `0xAA5b7D3ab8387CdEE8767f4E622101da191C6AfC` |
| **FeeRouter** | `0xA0a17b2eB3c836119e22E0Aa10e4243e88405161` |
| **PredictionMarket** | `0xc47FA8e0044458aaC0eeCCf6F2442E858f2387A6` |
| **LickFactory (DEX)** | `0x6848A334f9f7C2Cd5a2b34580EcC05F1616bAE48` |
| **Factory (Launch)** | `0xf4a3D553EF6982C1633dC7e913443eD78dbaF83b` |
| **GraduationRouter** | `0xf7067c6f9Fc81f0FB435bEcaeA05e5878B092c86` |

- **Deployer:** `0x58046897C814F6342f7F84086a5e53a413f944b6` (fresh wallet)
- **RPC:** `https://testnet-rpc.monad.xyz`
- **Gas used:** ~13.9M · **Cost:** ~2.97 MON

---

## Project Structure

```
lick-fun/
├── contracts/          — Foundry project (10 Solidity contracts + tests)
│   ├── src/
│   │   ├── LickToken.sol          — Pure ERC-20, 1B supply
│   │   ├── BondingCurve.sol       — CPMM curve, fees, anti-sniping, graduation
│   │   ├── Factory.sol            — Deploys token + curve + fee routing
│   │   ├── PredictionMarket.sol   — Binary graduation prediction market
│   │   ├── FeeRouter.sol          — Creator fee routing to vaults (DEFAULT/ECOSYSTEM)
│   │   ├── VestingController.sol  — OZ VestingWallet management, tier system, LP lock/unlock
│   │   ├── GraduationPool.sol     — Sponsorship pool for high-rep creators
│   │   ├── ProfileRegistry.sol    — Wallet linking, multi-wallet profiles, Merkle anchor
│   │   ├── GraduationRouter.sol   — Migration orchestrator (curve → LickPair → LP locked)
│   │   ├── LickPair.sol           — V2-style AMM pair (0.25% LP-only fee, ERC-20 LP)
│   │   └── LickFactory.sol        — CREATE2 factory, restricted createPair
│   ├── script/Deploy.s.sol        — One-shot deploy script (testnet verified)
│   └── test/                      — 103 Forge tests
├── indexer/             — Envio HyperIndex (TypeScript + GraphQL)
│   ├── config.yaml               — Chain events, factory tracking
│   ├── schema.graphql            — Token, Trade, Profile entities
│   └── src/EventHandlers.ts      — 5 event handlers with CPMM math
├── reputation/          — Off-chain reputation engine (TypeScript)
│   ├── src/
│   │   ├── scoring.ts            — 7-factor sigmoid scoring
│   │   ├── badges.ts             — 10 milestone-based badges
│   │   ├── tiers.ts              — Starter/Established/Verified
│   │   ├── anchor.ts             — Merkle tree computation
│   │   ├── queries.ts            — 5 GraphQL queries
│   │   ├── broadcasts.ts         — Platform broadcast templates
│   │   ├── ama.ts                — AMA window types
│   │   └── staking.ts            — Reputation staking types (post-launch)
│   └── src/__tests__/            — 46 vitest tests
└── frontend/            — Next.js 15 app
    ├── src/app/                  — 8 pages (Landing, Discover, Token Detail, Profile, Markets, How It Works)
    ├── src/lib/                  — wagmi config, GraphQL client, contract hooks, gas limits
    └── src/components/           — Layout, shared UI components
```

---

## Contract Architecture

```
Factory (deploys everything)
├── LickToken.sol           — Pure ERC-20, 1B supply per token
├── BondingCurve.sol        — CPMM (80k/477M vRES), 2% fee, 30s delay,
│                             symmetric anti-sniping, graduation at 100K MON
├── FeeRouter.sol           — Creator fee routing (DEFAULT / ECOSYSTEM presets)
├── VestingController.sol   — OZ VestingWallet, tier-coupled vesting,
│                             LP lock/unlock (creator withdraws after lockEnd)
└── GraduationRouter.sol    — Migration: curve → LickPair → LP locked
    ├── LickFactory.sol     — CREATE2 V2 factory (restricted to router)
    └── LickPair.sol        — V2-style AMM (0.25% LP-only fee, ERC-20 LP)

PredictionMarket.sol        — Binary grad predictions, creator cannot bet
                              own token (ProfileRegistry-linked), one-sided refund
GraduationPool.sol          — Sponsorship pool (Merkle proofs, rep ≥30)
ProfileRegistry.sol         — Wallet linking (0.1 MON bond refundable),
                              isLinkedToSameProfile, daily Merkle anchor
```

### Contract Details

**BondingCurve**
- buy/sell with 1% protocol + 1% creator fees
- symmetric anti-sniping (7-block decay, first buy exempt)
- graduation at 100K real MON (locks trading, emits event)
- queries: `getAmountOut`, `getProgress` (bps)

**FeeRouter**
- `DEFAULT` preset: 80% creator / 10% LP / 10% buyback
- `ECOSYSTEM` preset: 20% creator / 40% LP / 40% buyback (founder-first-token)

**PredictionMarket**
- binary "will token graduate?" markets
- creators cannot bet on their own tokens (ProfileRegistry-linked)
- 2% protocol fee on losing pool
- resolves via `BondingCurve.graduated()`

**VestingController**
- deploys OZ VestingWallet per token
- pre-DEX: 730-day linear (same for all tiers)
- post-DEX: tier-coupled (Light 365d, Standard 180d, Diamond 90d)
- LP tokens locked at graduation; creator calls `withdrawLP()` after `lockEnd`

**GraduationPool**
- receives ECOSYSTEM-preset creator fees
- pays deploy (10 MON) and graduation fees for reputation ≥ 30
- dual claim paths: direct mapping + Merkle proof

**ProfileRegistry**
- register profile, link wallets (0.1 MON bond, refundable)
- multi-wallet profile queries
- `isLinkedToSameProfile()` for creator betting ban
- daily Merkle root anchor (from off-chain engine)

---

## Build Pipeline

| Stage | What | Status |
|---|---|---|
| 0 | Foundry scaffold, Envio init, Monad testnet | ✅ |
| 1 | Core contracts (LickToken, BondingCurve, Factory) | ✅ |
| 2 | Delayed mint + symmetric anti-sniping | ✅ |
| 3 | Envio HyperIndex (5 event handlers, GraphQL) | ✅ |
| 4 | Reputation engine (scoring, badges, tiers, Merkle anchor) | ✅ |
| 5 | Engagement layer (PredictionMarket, broadcasts, AMA, staking types) | ✅ |
| 6 | FeeRouter + VestingController + GraduationPool + locker validation | ✅ |
| 7 | Frontend (Next.js, 8 pages, RainbowKit, wagmi) | ✅ |
| 8 | ProfileRegistry (wallet linking, Merkle anchor, creator betting ban) | ✅ |
| + | GraduationRouter + LickPair + LickFactory (V2 DEX, migration, LP lock) | ✅ |
| + | Security audit pass 1 (all CRITICAL/HIGH/MEDIUM fixed) | ✅ |
| + | Security audit pass 2 (LP withdrawal, factory access, fee simplification) | ✅ |
| + | GitHub repo (github.com/Lick-fun/lick-fun, MIT) | ✅ |
| + | Testnet deploy (all 8 contracts on Monad 10143) | ✅ |
| + | Frontend gas-limit tightening (Monad declared-gas billing) | ✅ |
| → | Envio indexer deploy (point to live addresses) | ⏳ |
| → | LP locker validation (UNCX / Team Finance) | ⏳ |
| → | Frontend wire to live Envio + Vercel deploy | ⏳ |
| → | Founder-first-token launch | ⏳ |
| → | Mainnet launch | PENDING |

> 103 Forge tests · 46 vitest tests · 10 contracts · 8 pages · All green

---

## Running Locally

```bash
# Contracts
cd contracts
forge build
forge test

# Indexer
cd indexer
envio dev

# Reputation engine
cd reputation
npm install
npm test

# Frontend
cd frontend
npm install
npm run dev
# opens at localhost:3000
```

---

## Deploying

See [`contracts/LOCKER_VALIDATION.md`](contracts/LOCKER_VALIDATION.md) for the step-by-step UNCX/Team Finance LP locker validation guide.

**Testnet:** Monad chain 10143, RPC `https://testnet-rpc.monad.xyz`, faucet `https://faucet.monad.xyz`

```bash
# Deploy contracts
cd contracts
source .env
forge script script/Deploy.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
```

Then deploy the Envio indexer with the real contract addresses, update the frontend's `.env` with the Envio GraphQL endpoint, and push to Vercel.

---

## Security

All contracts use OpenZeppelin audited libraries (ERC-20, VestingWallet, ReentrancyGuard). The CPMM math uses `uint256` — `k ≈ 3.8e49` is safely within the `2^256 ≈ 1.15e77` range. Solc `0.8.27`, EVM Paris (Monad-compatible).

**Completed:**
- Security audit pass 1 — all CRITICAL/HIGH/MEDIUM fixed (C1 oracle target, C2 sell solvency, C4 dev allocation, H1 fee routing, H4 sweep, M1 bond, M5 refund)
- Security audit pass 2 — LP withdrawal, factory access control, fee simplification
- Testnet deploy — all 8 contracts live on Monad chain 10143
- Frontend gas limits — all 10 tight limits wired into `writeContractAsync` calls

**Before mainnet:**
- Envio indexer deploy
- LP locker validation
- Frontend wire to live data
- Final testnet smoke tests
- Mainnet deployment

---

## License

MIT — see [LICENSE](LICENSE)

---

*Built for Monad. Reputation over hype.*
