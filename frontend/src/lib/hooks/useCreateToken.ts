"use client";

import { useState } from "react";
import { useWriteContract, useAccount, useWaitForTransactionReceipt } from "wagmi";
import { decodeEventLog } from "viem";
import { FactoryABI, FACTORY_ADDRESS, FeePreset, DEPLOY_FEE } from "@/lib/wagmi/contracts";

export type FeePresetKey = keyof typeof FeePreset;
export type DevLockTier = "LIGHT" | "STANDARD" | "DIAMOND";

export interface UseCreateTokenResult {
  createToken: (params: {
    name: string;
    symbol: string;
    preset: FeePresetKey;
    tier: DevLockTier;
  }) => Promise<void>;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  tokenAddress: `0x${string}` | null;
  txHash: `0x${string}` | undefined;
  error: Error | null;
  reset: () => void;
}

export function useCreateToken(): UseCreateTokenResult {
  const { address } = useAccount();
  const [tokenAddress, setTokenAddress] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const {
    writeContractAsync,
    data: txHash,
    isPending,
    reset: resetWrite,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Parse TokenCreated event from receipt to get the new token address
  if (isSuccess && receipt && !tokenAddress) {
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: FactoryABI,
          data: log.data,
          topics: log.topics,
          eventName: "TokenCreated",
        });
        if (decoded.args.token) {
          setTokenAddress(decoded.args.token as `0x${string}`);
        }
        break;
      } catch {
        // not a TokenCreated log, skip
      }
    }
  }

  const createToken = async ({
    name,
    symbol,
    preset,
  }: {
    name: string;
    symbol: string;
    preset: FeePresetKey;
    tier: DevLockTier;
  }) => {
    if (!address) throw new Error("Wallet not connected");
    setError(null);
    setTokenAddress(null);

    try {
      await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: FactoryABI,
        functionName: "createTokenWithPreset",
        args: [name, symbol, address, 0n, FeePreset[preset]],
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore wagmi types value as undefined for nonpayable but we pass the deploy fee
        value: DEPLOY_FEE,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };

  const reset = () => {
    resetWrite();
    setTokenAddress(null);
    setError(null);
  };

  return {
    createToken,
    isPending,
    isConfirming,
    isSuccess,
    tokenAddress,
    txHash,
    error,
    reset,
  };
}
