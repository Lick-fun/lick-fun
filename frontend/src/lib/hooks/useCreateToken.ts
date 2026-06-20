"use client";

import { useState } from "react";
import { useWriteContract, useAccount, useWaitForTransactionReceipt } from "wagmi";
import { decodeEventLog } from "viem";
import { FactoryABI, FACTORY_ADDRESS } from "@/lib/wagmi/contracts";

export interface UseCreateTokenResult {
  createToken: (params: {
    name: string;
    symbol: string;
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

  // Parse CurveCreate event from receipt to get the new token address
  if (isSuccess && receipt && !tokenAddress) {
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: FactoryABI,
          data: log.data,
          topics: log.topics,
          eventName: "CurveCreate" as const,
        });
        if (decoded.args.token) {
          setTokenAddress(decoded.args.token as `0x${string}`);
        }
        break;
      } catch {
        // not a CurveCreate log, skip
      }
    }
  }

  const createToken = async ({
    name,
    symbol,
  }: {
    name: string;
    symbol: string;
  }) => {
    if (!address) throw new Error("Wallet not connected");
    setError(null);
    setTokenAddress(null);

    try {
      await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: FactoryABI,
        functionName: "createToken",
        args: [name, symbol, address, 0n],
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