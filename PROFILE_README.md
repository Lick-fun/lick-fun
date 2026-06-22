# Lick.fun 🐸

> **A meme lake on liquidity fun.**
> Social-first token launchpad on [Monad](https://monad.xyz) with earned creator reputation.

---

## What is Lick.fun?

Lick.fun is a token launchpad where **your on-chain behavior is your content**. No open posting feed. No shilling. Creators build a portable reputation score from their actual track record — graduation rates, lock fulfillment, pre-buy honesty — and that score unlocks real platform benefits.

Tokens launch on a bonding curve, graduate to a built-in V2-style DEX at 100K MON, and creator allocations are locked in tiered vesting from day one.

---

## Current Stage 🔄 UI Overhaul

We're actively rebuilding the frontend with Figma-sourced design tokens — a full dark-mode design system extracted from the Lick.fun Figma file. Every page, component, and layout element is being rebuilt to match the final product design.

| What's done | Status |
|---|---|
| 11 Solidity contracts (audited, deployed on Monad testnet) | ✅ |
| Envio HyperIndex v3 (live GraphQL, 5 event handlers) | ✅ |
| Off-chain reputation engine (7-factor sigmoid, 46 tests) | ✅ |
| Token creation page + wagmi Factory integration | ✅ |
| Token image system (Pinata IPFS, server-side upload, gateway fallback) | ✅ |
| **UI overhaul — Figma design tokens, 9 pages, new component library** | 🔄 |
| Envio cloud deploy + Vercel frontend | ⏳ |
| Mainnet launch | PENDING |

---

## Tech Stack

| Layer | Tech |
|---|---|
| Chain | Monad (EVM, 10,000 TPS) |
| Contracts | Solidity 0.8.27 · Foundry · OpenZeppelin |
| Indexer | Envio HyperIndex v3 (TypeScript + GraphQL) |
| Frontend | Next.js 15 · wagmi · RainbowKit · Tailwind CSS |
| Images | Pinata IPFS (server-side JWT, gateway fallback cycling) |
| Reputation | Off-chain TypeScript engine · Merkle-anchored on-chain daily |

---

## Contracts (Monad Testnet — chain 10143)

| Contract | Address |
|---|---|
| Factory (Launch) | `0xf4a3D553EF6982C1633dC7e913443eD78dbaF83b` |
| GraduationRouter | `0xf7067c6f9Fc81f0FB435bEcaeA05e5878B092c86` |
| ProfileRegistry | `0xc21d440e717a8E5637a2628B8f5AA5430e17e82E` |
| VestingController | `0xAA5b7D3ab8387CdEE8767f4E622101da191C6AfC` |
| LickFactory (DEX) | `0x6848A334f9f7C2Cd5a2b34580EcC05F1616bAE48` |

---

## Repo

**[github.com/Lick-fun/lick-fun](https://github.com/Lick-fun/lick-fun)** — MIT licensed

```
103+ Forge tests · 46 vitest tests · 11 contracts · 9 pages
```

---

*Built for Monad. Reputation over hype.*
