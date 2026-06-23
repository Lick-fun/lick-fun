"use client";

import { useState } from "react";
import { useWriteContract, useAccount, useWaitForTransactionReceipt } from "wagmi";
import { decodeEventLog } from "viem";
import { FactoryABI, FACTORY_ADDRESS } from "@/lib/wagmi/contracts";

export interface UseCreateTokenResult {
  createToken: (params: {
    name: string;
    symbol: string;
    description?: string;
    imageFile?: File | null;
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
  }: {
    name: string;
    symbol: string;
    description?: string;
    imageFile?: File | null;
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
    console.log("[useCreateToken] Calling createToken on-chain:", {
      factory: FACTORY_ADDRESS,
      name,
      symbol,
      creator: address,
    });
    try {
      await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: FactoryABI,
        functionName: "createToken",
        args: [name, symbol, address, 0n],
      });
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
