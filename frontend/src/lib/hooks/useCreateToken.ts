"use client";

import { useState } from "react";
import { useWriteContract, useAccount, useWaitForTransactionReceipt } from "wagmi";
import { decodeEventLog } from "viem";
import { FactoryABI, FACTORY_ADDRESS } from "@/lib/wagmi/contracts";
import { uploadTokenToIPFS, IPFSUploadError } from "@/lib/ipfs";

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

    // Step 1: Upload image + metadata to IPFS if an image was provided
    if (imageFile) {
      setUploadStatus("uploading");
      try {
        const result = await uploadTokenToIPFS({
          name,
          symbol,
          description,
          imageFile,
          // tokenAddress is not yet known at this point; we'll update external_url
          // via the register-metadata call after the tx confirms
        });
        setMetadataUri(result.metadataUri);
        setImageUri(result.imageUri);
        setUploadStatus("done");
      } catch (err) {
        setUploadStatus("error");
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

    // Step 2: Deploy token on-chain
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
