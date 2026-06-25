"use client";

import { http } from "wagmi";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import type { Chain } from "viem";
import { defineChain } from "viem";

// Monad chains (not built into wagmi/chains yet)
const monadTestnetChain = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
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
    default: { http: ["https://rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://monadexplorer.com" },
  },
});

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
  chains: [monadTestnetChain, monadChain],
  ssr: true,
  transports: {
    [monadTestnetChain.id]: http(),
    [monadChain.id]: http(),
  },
});

export { monadTestnetChain as monadTestnet, monadChain as monad };
