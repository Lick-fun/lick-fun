```markdown
# Lick.fun

**A meme lake on liquidity fun.**

Lick.fun is a social-first token launchpad on **Monad (MON)**. It uses a bonding-curve system to bootstrap liquidity for new tokens, then graduates successful ones to a built-in Uniswap V2-style DEX. The core innovation is **earned creator reputation** — a portable, multi-wallet Profile that replaces hype with on-chain track records.

No open posting feed. No shilling. Your behavior is your content.

---

## How it works

1. **Create** — A creator submits a single commit transaction declaring token params + allocation + lock tier + a 30-second fixed delay. No presale, no special access.
2. **Trade** — After the 30s delay, anyone can buy/sell on the bonding curve. Symmetric anti-sniping penalties protect early traders (decays over 7 blocks).
3. **Graduate** — When the curve accumulates 100,000 MON, the remaining liquidity migrates to Lick.fun's internal DEX. Trading continues with deeper liquidity.
4. **Lock & Vest** — Creators choose a tier (Light/Standard/Diamond). Pre-DEX vesting is 730-day linear. Post-DEX vesting and liquidity-lock durations are tier-coupled. If a token never graduates, the dev allocation stays locked — permanent alignment.
5. **Earn Reputation** — Every on-chain action feeds an off-chain reputation engine. Scores are computed from graduation rates, lock fulfillment, pre-buy honesty, profile age, verified tenure, and volume — weighted against asymmetric rug penalties. Scores are 0–100, anchored daily on-chain via Merkle root.

---

## Locked Parameters

| Parameter | Value |
|---|---|
| Chain | Monad (chain 143 mainnet / 10143 testnet) |
| Graduation threshold | 100,000 MON |
| Virtual reserves | 80,000 vMON / 477,000,000 vTokens (scaled from nad.fun V2 reference) |
| Total supply per token | 1,000,000,000 |
| Fixed mint delay | 30 seconds (~75 Monad blocks) |
| Anti-sniping | Symmetric (buy + sell), 7-block decay: 80/40/20/15/10/10/5/0%, initial buy exempt |
| Deploy fee | 10 MON (spam gate, negligible revenue) |
| Bonding curve fee | 2% (1% protocol + 1% creator) |
| Post-grad DEX fee | 1.60% (1% creator + 0.35% protocol + 0.25% LP) |
| LP format | Uniswap V2-style fungible ERC-20 LP |
| Dev lock tiers | Light (90d liquidity / 365d vest) / Standard (180/180) / Diamond (365/90) |

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

Reputation maps to three tiers: Starter (0–30), Established (30–70), Verified (70+).

---

## Project Structure

```
lick-fun/
├── contracts/          — Foundry project (8 Solidity contracts + tests)
│   ├── src/
│   │   ├── LickToken.sol          — Pure ERC-20, 1B supply
│   │   ├── BondingCurve.sol       — CPMM curve, fees, anti-sniping, graduation
│   │   ├── Factory.sol            — Deploys token + curve + fee routing
│   │   ├── PredictionMarket.sol   — Binary graduation prediction market
│   │   ├── FeeRouter.sol          — Creator fee routing to vaults
│   │   ├── VestingController.sol  — OZ VestingWallet management, tier system
│   │   ├── GraduationPool.sol     — Sponsorship pool for high-rep creators
│   │   └── ProfileRegistry.sol    — Wallet linking, multi-wallet profiles, Merkle anchor
│   └── test/                      — 80+ Forge tests
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
└── frontend/            — Next.js 15 app (v0 + Cline)
    ├── src/app/                  — 7 pages (Landing, Discover, Token, Profile, Markets, How It Works)
    ├── src/lib/                  — wagmi config, GraphQL client, contract hooks
    └── src/components/           — Layout, shared UI components
```

---

## Contract Architecture

```
Factory
  ├── deploys LickToken (ERC-20, 1B supply)
  ├── deploys BondingCurve (CPMM, fees, delay, anti-sniping, graduation)
  └── configures FeeRouter (preset-based fee routing)

BondingCurve
  ├── buy/sell with 1% protocol + 1% creator fees
  ├── symmetric anti-sniping (7-block decay, first buy exempt)
  ├── graduation at 100K real MON (locks trading, emits event)
  └── queries: getAmountOut, getProgress (bps)

FeeRouter
  ├── DEFAULT preset: 80% creator / 10% LP / 10% buyback
  └── ECOSYSTEM preset: 20% creator / 40% LP / 40% buyback (founder-first-token)

PredictionMarket
  ├── binary "will token graduate?" markets
  ├── creators cannot bet on their own tokens (ProfileRegistry-linked)
  ├── 2% protocol fee on losing pool
  └── resolves via BondingCurve.graduated()

VestingController
  ├── deploys OZ VestingWallet per token
  ├── pre-DEX: 730-day linear (same for all tiers)
  └── post-DEX: tier-coupled (Light 365d, Standard 180d, Diamond 90d)

GraduationPool
  ├── receives ECOSYSTEM-preset creator fees
  ├── pays deploy (10 MON) and graduation fees for reputation ≥ 30
  └── dual claim paths: direct mapping + Merkle proof

ProfileRegistry
  ├── register profile, link wallets (0.1 MON bond, refundable)
  ├── multi-wallet profile queries
  └── daily Merkle root anchor (from off-chain engine)
```

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
| 7 | Frontend (Next.js, 7 pages, RainbowKit, wagmi) | ✅ |
| + | ProfileRegistry | ✅ |
| → | **Security review** | **PENDING** |
| → | **Testnet deploy** | **PENDING** |
| → | **Mainnet launch** | **PENDING** |

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

See `contracts/LOCKER_VALIDATION.md` for the step-by-step UNCX/Team Finance LP locker validation guide.

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

All contracts use OpenZeppelin audited libraries (ERC-20, VestingWallet, ReentrancyGuard). The CPMM math uses uint256 — k ≈ 3.8e49 is safely within the 2^256 ≈ 1.15e77 range. Solc 0.8.27, EVM Paris (Monad-compatible).

**Before mainnet:**
- Full Opus 4.8 security review (completed)
- Testnet deploy with real fund testing
- UNCX/Team Finance locker validation against own V2 pair

---

## License

MIT — see LICENSE file.
```

That's your README. Ready to paste. Go build. 🚀
