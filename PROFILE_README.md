# Lickfun.xyz

A meme lake on liquidity fun. Social-first token launchpad on Monad with earned creator reputation.

---

## What is Lickfun.xyz?

Lickfun.xyz is a token launchpad where your on-chain behavior is your content. No open posting feed. No shilling. Creators build a portable reputation score from their actual track record — graduation rates, trader diversity, cumulative volume — and that score unlocks real platform benefits.

Tokens launch on a bonding curve, graduate to a built-in V2-style DEX at 100K MON, and LP tokens are burned to `0xdead` at graduation — permanent liquidity, zero rug risk.

---

## Current Stage: Phase 3 Shipped

| What's done | Status |
|---|---|
| 13 Solidity contracts (3 audit passes, 137 tests) | done |
| Envio HyperSync indexer (live GraphQL, 7 event handlers) | done |
| Off-chain reputation engine (9-factor sigmoid, 61 tests) | done |
| FeeRouter tier system (Starter / Creator Extra / Creator + LP Support / Custom) — reputation-gated | done |
| LP burned to 0xdead at graduation | done |
| Factory onlyOwner gates + failure-tolerant fee routing | done |
| Token creation + trading verified on Monad testnet | done |
| Frontend (9 pages, wagmi, RainbowKit, Figma design tokens) | done |
| USD market cap display (CoinGecko feed) | done |
| Founder-first-token launch (pinned banner via env var) | done |
| Profile custom name + avatar (wallet-signed, IPFS) | done |
| Ticker redesigned as full-width auto-scrolling marquee | done |
| Charts default to MCap + USD view | done |
| 24h % change bug fixed (was storing raw old price) | done |
| Token names now display in ticker + markets (GraphQL join) | done |
| About page rewritten in buyer-friendly language | done |
| Mainnet launch | pending |

---

## Tech Stack

| Layer | Tech |
|---|---|
| Chain | Monad (EVM, 10,000 TPS) |
| Contracts | Solidity 0.8.27, Foundry, OpenZeppelin |
| Indexer | Envio HyperSync v3 (TypeScript + GraphQL) |
| Frontend | Next.js 15, wagmi, RainbowKit, Tailwind CSS |
| Images | Pinata IPFS (server-side JWT, gateway fallback cycling) |
| Reputation | Off-chain TypeScript engine, Merkle-anchored on-chain daily (Stage 6 — not yet wired) |

---

## Contracts (Monad Testnet, chain 10143)

Phase 1:

| Contract | Address |
|---|---|
| Factory | `0xe5a63a3496952bb12e4802264244d476a8f36eed` |
| GraduationPool | `0x5c9CFaBf0E94f1ACF37A77a6f21B1e5acfD20568` |
| ProfileRegistry | `0xc21d440e717a8E5637a2628B8f5AA5430e17e82E` |
| LickFactory (DEX) | `0x6848A334f9f7C2Cd5a2b34580EcC05F1616bAE48` |

Phase 2:

| Contract | Address |
|---|---|
| Factory | `0x0Ba732dd3072764634bC410914b2D4e9fA7c0862` |
| FeeRouter | `0x1bC6FA459AE10738A5bFeDD08239386C2d3dec4f` |
| GraduationRouter | `0xd7cdb6D52f76EcaF226A32111CB6A2681a186Ca1` |
| VaultLPSupport | `0x8fD0e571721a3FB1Fd140676E4d248a195FbC670` |
| VaultBuybackBurn | `0x5094a0Dbae5FdAE06D495171944daefB01570415` |

---

## Repo

[github.com/Lick-fun/lick-fun](https://github.com/Lick-fun/lick-fun)

136 Forge tests · 58 vitest tests · 13 contracts · 9 pages · All green

---

Built for Monad. Reputation over hype.
