"use client";

import { useState } from "react";
import { useWriteContract, useAccount, useWaitForTransactionReceipt } from "wagmi";
import { decodeEventLog } from "viem";
import { FactoryABI, FACTORY_ADDRESS, FEE_ROUTER_ADDRESS } from "@/lib/wagmi/contracts";
import type { FeePreset } from "@/components/fee/FeeConfigSelector";

/**
 * Maps the frontend FeePreset key to the on-chain FeeRouter.Preset enum index.
 * Contract enum: { DEFAULT=0, ECOSYSTEM=1, LIGHT=2, STANDARD_A=3, STANDARD_B=4, DIAMOND=5 }
 */
const PRESET_ENUM_INDEX: Record<FeePreset, number> = {
  LIGHT: 2,
  STANDARD_A: 3,
  STANDARD_B: 4,
  DIAMOND: 5,
};

export interface UseCreateTokenResult {
  createToken: (params: {
    name: string;
    symbol: string;
    description?: string;
    imageFile?: File | null;
    telegram?: string;
    twitter?: string;
    website?: string;
    /** Selected fee preset. Defaults to LIGHT (Starter). */
    preset?: FeePreset;
  }) => Promise<void>;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  tokenAddress: `0x${string}` | null;
  txHash: `0x${string}` | undefined;
  error: Error | null;
  uploadStatus: "idle" | "uploading" | "done" | "error";
  metadataUri: string | null;
  imageUri: string | null;
  reset: () => void;
}

class IPFSUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IPFSUploadError";
  }
}

export function useCreateToken(): UseCreateTokenResult {
  const { address } = useAccount();
  const [tokenAddress, setTokenAddress] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [metadataUri, setMetadataUri] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);

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
          eventName: "TokenCreated" as const,
        });
        if (decoded.args.token) {
          const newAddr = decoded.args.token as `0x${string}`;
          setTokenAddress(newAddr);

          // Register metadata with our API so the image shows everywhere
          if (metadataUri && imageUri) {
            fetch("/api/register-metadata", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tokenAddress: newAddr,
                metadataUri,
                imageUri,
              }),
            }).catch((err) => {
              console.warn("[useCreateToken] Failed to register metadata:", err);
            });
          }
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
    description,
    imageFile,
    telegram,
    twitter,
    website,
    preset = "LIGHT",
  }: {
    name: string;
    symbol: string;
    description?: string;
    imageFile?: File | null;
    telegram?: string;
    twitter?: string;
    website?: string;
    preset?: FeePreset;
  }) => {
    if (!address) throw new Error("Wallet not connected");
    setError(null);
    setTokenAddress(null);
    setMetadataUri(null);
    setImageUri(null);
    setUploadStatus("idle");

    // Guard: fail fast with a clear error if factory address is not configured
    if (FACTORY_ADDRESS === "0x0000000000000000000000000000000000000000") {
      const err = new Error(
        "Factory contract address not configured. Set NEXT_PUBLIC_FACTORY_ADDRESS in .env.local"
      );
      console.error("[useCreateToken]", err.message);
      setError(err);
      throw err;
    }

    // Step 1: Upload image + metadata to IPFS via the server-safe API route
    if (imageFile) {
      setUploadStatus("uploading");
      try {
        const formData = new FormData();
        formData.append("image", imageFile);
        formData.append("name", name);
        formData.append("symbol", symbol);
        if (description) formData.append("description", description);
        if (telegram) formData.append("telegram", telegram);
        if (twitter) formData.append("twitter", twitter);
        if (website) formData.append("website", website);

        console.log("[useCreateToken] Uploading image + metadata to IPFS...");
        const res = await fetch("/api/upload-token", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new IPFSUploadError(
            payload.error ?? `IPFS upload failed (${res.status})`
          );
        }

        const result = (await res.json()) as {
          imageUri: string;
          metadataUri: string;
        };

        console.log("[useCreateToken] IPFS upload complete:", result);
        setMetadataUri(result.metadataUri);
        setImageUri(result.imageUri);
        setUploadStatus("done");
      } catch (err) {
        setUploadStatus("error");
        console.error("[useCreateToken] IPFS upload failed:", err);
        if (err instanceof IPFSUploadError) {
          setError(err);
          throw err;
        }
        const wrappedErr = new Error(
          `IPFS upload failed: ${err instanceof Error ? err.message : String(err)}`
        );
        setError(wrappedErr);
        throw wrappedErr;
      }
    }

    // Step 2: Deploy token on-chain (ONE wallet signature)
    //
    // Routing logic:
    //  - If a FeeRouter is configured AND the chosen preset is one of the fixed
    //    presets (LIGHT / STANDARD_A / STANDARD_B), use createTokenWithPreset so
    //    fees are split by the FeeRouter at launch.
    //  - DIAMOND (Custom) cannot be applied via createTokenWithPreset (the contract
    //    reverts with UseCustomConfig — the split must be set by the owner via
    //    setCustomConfig afterwards). For now DIAMOND falls back to the standard
    //    createToken flow; the custom split is configured by an admin operation.
    //  - If no FeeRouter is configured, always use the standard createToken.
    const feeRouterConfigured =
      FEE_ROUTER_ADDRESS !== "0x0000000000000000000000000000000000000000";
    const usePreset = feeRouterConfigured && preset !== "DIAMOND";

    console.log("[useCreateToken] Calling create on-chain:", {
      factory: FACTORY_ADDRESS,
      name,
      symbol,
      creator: address,
      preset,
      usePreset,
    });
    try {
      if (usePreset) {
        await writeContractAsync({
          address: FACTORY_ADDRESS,
          abi: FactoryABI,
          functionName: "createTokenWithPreset",
          args: [name, symbol, address, 0n, PRESET_ENUM_INDEX[preset]],
        });
      } else {
        await writeContractAsync({
          address: FACTORY_ADDRESS,
          abi: FactoryABI,
          functionName: "createToken",
          args: [name, symbol, address, 0n],
        });
      }
    } catch (err) {
      console.error("[useCreateToken] writeContractAsync failed:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };

  const reset = () => {
    resetWrite();
    setTokenAddress(null);
    setError(null);
    setUploadStatus("idle");
    setMetadataUri(null);
    setImageUri(null);
  };

  return {
    createToken,
    isPending,
    isConfirming,
    isSuccess,
    tokenAddress,
    txHash,
    error,
    uploadStatus,
    metadataUri,
    imageUri,
    reset,
  };
}
