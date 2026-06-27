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
    default: { name: "Monad Explorer", url: "https://testnet.monadexplorer.com" },
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

export const wagmiConfig = getDefaultConfig({
  appName: "Lick.fun",
  projectId,
  // Primary chain is active, secondary is always available for wallet UX
  chains: [activeChain, activeChain === monadChain ? monadTestnetChain : monadChain],
  ssr: true,
  transports: {
    [monadTestnetChain.id]: http(
      process.env.NEXT_PUBLIC_MONAD_TESTNET_RPC || "https://testnet-rpc.monad.xyz"
    ),
    [monadChain.id]: http(
      process.env.NEXT_PUBLIC_MONAD_RPC || "https://rpc.monad.xyz"
    ),
  },
});

export { monadTestnetChain as monadTestnet, monadChain as monad };
