"use client";

import { http } from "wagmi";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";

// ─── Chain definitions ────────────────────────────────────────────────────────

const monadTestnetChain = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_MONAD_TESTNET_RPC ||
          "https://testnet-rpc.monad.xyz",
      ],
    },
  },
  blockExplorers: {
    default: { name: "Monad Testnet Explorer", url: "https://testnet.monadexplorer.com" },
  },
  testnet: true,
});

const monadChain = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_MONAD_RPC || "https://rpc.monad.xyz",
      ],
    },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://monadexplorer.com" },
  },
});

// ─── Active chain selection ───────────────────────────────────────────────────
// Set NEXT_PUBLIC_CHAIN_ID=143 in .env.local to switch to mainnet.
// Default is 10143 (testnet) so existing dev setups are unaffected.

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 10143);
const activeChain = chainId === 143 ? monadChain : monadTestnetChain;

// ─── WalletConnect ────────────────────────────────────────────────────────────

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  throw new Error(
    "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set.\n" +
    "Get a free project ID at https://cloud.walletconnect.com and add it to frontend/.env.local"
  );
}

// ─── RPC request batching ─────────────────────────────────────────────────────
// Coalesces many independent eth_call/eth_getBalance requests fired in the same
// tick (e.g. useBondingCurveRead's 8 reads, holder/holdings balanceOf multicalls,
// name()/symbol() resolution) into a single HTTP round-trip via JSON-RPC batching.
// `wait: 0` flushes on the next microtask so it doesn't add perceptible latency.
const transportBatchConfig = { batch: { wait: 0 } };

export const wagmiConfig = getDefaultConfig({
  appName: "Lickfun.xyz",
  projectId,
  // Only the active chain — testnet removed from mainnet builds (P3-7)
  chains: [activeChain],
  ssr: true,
  // wagmi's `useReadContracts` automatically groups reads via viem's multicall
  // batching when the chain has a `multicall3` contract configured — see viem's
  // built-in chain definitions. Our custom `defineChain` calls above don't set
  // one, so wagmi falls back to firing one request per call; the JSON-RPC-level
  // `batch` option below still coalesces those into fewer HTTP round-trips.
  transports: {
    [monadTestnetChain.id]: http(
      process.env.NEXT_PUBLIC_MONAD_TESTNET_RPC || "https://testnet-rpc.monad.xyz",
      transportBatchConfig
    ),
    [monadChain.id]: http(
      process.env.NEXT_PUBLIC_MONAD_RPC || "https://rpc.monad.xyz",
      transportBatchConfig
    ),
  },
});

export { monadTestnetChain as monadTestnet, monadChain as monad };
