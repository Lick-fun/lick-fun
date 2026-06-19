# Lick.fun 🐸

> **"A meme lake on liquidity fun."**
> Social/reputation-first token launchpad on Monad (MON).

---

## Overview

Lick.fun is a bonding curve token launchpad with social reputation layers built on Monad.

- **On-chain**: money & truth (bonding curve, graduation, vesting, fees)
- **Off-chain**: social & reputation (daily root-hash anchored to chain)
- **Chain**: Monad testnet (`chain_id = 10143`) → mainnet (`chain_id = 143`)

---

## Project Structure

```
lick-fun/
├── contracts/       Foundry — Solidity contracts (src/, test/, script/, lib/)
├── indexer/         Envio HyperIndex — event indexer (config.yaml, TypeScript handlers)
├── frontend/        Next.js frontend — Stage 7
└── README.md        This file
```

---

## Key Parameters

| Parameter | Value |
|---|---|
| Graduation threshold | 100,000 MON |
| Virtual reserves | ~80,000 vMON / ~477,000,000 vTokens |
| Total supply per token | 1,000,000,000 |
| Bonding curve fee | 2% (1% protocol + 1% creator) |
| Post-grad DEX fee | 1.60% (1% creator + 0.35% protocol + 0.25% LP) |
| Deploy fee | 10 MON |
| Fixed mint delay | 30 seconds (~75 blocks) |
| Anti-sniping decay | 7 blocks: 80/40/20/15/10/10/5/0% |

---

## Contracts (7 modules)

1. **Factory/Deployer** — deploys new token + curve pairs
2. **BondingCurve** — constant-product AMM (k = vMON × vTOK ≈ 80,000 × 477,000,000)
3. **GraduationRouter** — migrates liquidity to Uniswap V2-style DEX at 100,000 MON
4. **ProfileRegistry** — on-chain social reputation registry
5. **VestingController** — dev lock tiers (Light/Standard/Diamond)
6. **FeeRouter** — distributes protocol/creator/LP fees
7. **PredictionMarketSettlement** — on-chain prediction settlement

---

## Getting Started

### Prerequisites

- [Foundry](https://book.getfoundry.sh/) v1.7.1+
- Node.js v18+
- [Envio CLI](https://docs.envio.dev) v3+

### Setup

```bash
# 1. Clone and enter repo
cd lick-fun

# 2. Build contracts
cd contracts
cp .env.example .env  # fill in PRIVATE_KEY and RPC_URL
forge build

# 3. Run tests (Stage 1+)
forge test

# 4. Indexer (Stage 3+)
cd ../indexer
npm install
```

### Monad Testnet

- **RPC URL**: `https://testnet-rpc.monad.xyz`
- **Chain ID**: `10143`
- **Explorer**: https://testnet.monadexplorer.com
- **Faucet**: https://faucet.monad.xyz (request testnet MON)

> ⚠️ **Monad gas billing**: Gas is charged on the **declared gas limit**, not gas used.
> Always set tight `--gas-limit` values in deployment scripts.

---

## Development Stages

- [x] **Stage 0** — Project scaffold (Foundry + Envio + structure)
- [ ] **Stage 1** — Core contracts (BondingCurve, Factory, FeeRouter)
- [ ] **Stage 2** — Graduation + DEX integration
- [ ] **Stage 3** — Indexer + GraphQL API
- [ ] **Stage 4** — ProfileRegistry + VestingController
- [ ] **Stage 5** — PredictionMarketSettlement
- [ ] **Stage 6** — Testnet deployment + audit prep
- [ ] **Stage 7** — Frontend (Next.js)

---

## Security

- **NEVER** let AI write Solidity without human review.
- Every Solidity line gets reviewed before `forge test`.
- `forge test` must pass before anything touches testnet.
- Smart contracts use audited OpenZeppelin/UNCX libraries as-is.
- `.env` is git-ignored. Never commit private keys.

---

## License

UNLICENSED — private until audit complete.