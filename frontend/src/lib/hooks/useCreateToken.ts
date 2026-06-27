"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useAccount, useWaitForTransactionReceipt, useSignMessage } from "wagmi";
import { decodeEventLog, parseEther } from "viem";
import {
  FactoryABI,
  BondingCurveABI,
  FACTORY_ADDRESS,
  FEE_ROUTER_ADDRESS,
} from "@/lib/wagmi/contracts";
import type { CustomFeeConfig } from "@/components/fee/FeeConfigSelector";

/**
 * High-level state machine exposed to the UI.
 * idle → uploading → creating → confirming-create → dev-buying → confirming-buy → done
 * (dev-buying / confirming-buy are skipped when no dev buy amount is set)
 */
export type CreateStep =
  | "idle"
  | "uploading"
  | "creating"
  | "confirming-create"
  | "dev-buying"
  | "confirming-buy"
  | "done";

export interface UseCreateTokenResult {
  createToken: (params: {
    name: string;
    symbol: string;
    description?: string;
    imageFile?: File | null;
    telegram?: string;
    twitter?: string;
    website?: string;
    /** Custom fee config — creator/LP/burn/gift splits. */
    customFeeConfig?: CustomFeeConfig;
    /** Optional dev pre-buy amount in MON (string from input). "" / "0" = no dev buy. */
    devBuyAmountMon?: string;
  }) => Promise<void>;
  step: CreateStep;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  tokenAddress: `0x${string}` | null;
  curveAddress: `0x${string}` | null;
  txHash: `0x${string}` | undefined;
  buyTxHash: `0x${string}` | undefined;
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
  const { signMessageAsync } = useSignMessage();
  const [tokenAddress, setTokenAddress] = useState<`0x${string}` | null>(null);
  const [curveAddress, setCurveAddress] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [uploadStatus, setUploadStatus] =
    useState<"idle" | "uploading" | "done" | "error">("idle");
  const [metadataUri, setMetadataUri] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [step, setStep] = useState<CreateStep>("idle");
  const [pendingDevBuyMon, setPendingDevBuyMon] = useState<string>("");

  const {
    writeContractAsync,
    data: createTxHash,
    isPending: isCreatePending,
    reset: resetCreateWrite,
  } = useWriteContract();

  const {
    writeContractAsync: writeBuyAsync,
    data: buyTxHash,
    isPending: isBuyPending,
    reset: resetBuyWrite,
  } = useWriteContract();

  const {
    isLoading: isCreateConfirming,
    isSuccess: isCreateSuccess,
    data: receipt,
  } = useWaitForTransactionReceipt({ hash: createTxHash });

  const { isLoading: isBuyConfirming, isSuccess: isBuySuccess } =
    useWaitForTransactionReceipt({ hash: buyTxHash });

  // ── Create tx lifecycle → step transitions ──
  useEffect(() => {
    if (isCreatePending && (step === "idle" || step === "uploading")) {
      setStep("creating");
    } else if (
      !isCreatePending &&
      isCreateConfirming &&
      step === "creating"
    ) {
      setStep("confirming-create");
    }
  }, [isCreatePending, isCreateConfirming, step]);

  // ── Dev buy tx lifecycle → step transitions ──
  useEffect(() => {
    if (isBuyPending && step === "confirming-create") {
      setStep("dev-buying");
    } else if (
      !isBuyPending &&
      isBuyConfirming &&
      step === "dev-buying"
    ) {
      setStep("confirming-buy");
    } else if (isBuySuccess && step === "confirming-buy") {
      setStep("done");
    }
  }, [isBuyPending, isBuyConfirming, isBuySuccess, step]);

  // ── After create tx confirms: parse receipt, register metadata, optionally fire dev buy ──
  useEffect(() => {
    if (!isCreateSuccess || !receipt || step !== "confirming-create") return;

    let parsedToken: `0x${string}` | null = null;
    let parsedCurve: `0x${string}` | null = null;

    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: FactoryABI,
          data: log.data,
          topics: log.topics,
          eventName: "TokenCreated" as const,
        });
        const args = decoded.args as { token?: string; curve?: string };
        if (args.token && args.curve) {
          parsedToken = args.token as `0x${string}`;
          parsedCurve = args.curve as `0x${string}`;
          break;
        }
      } catch {
        // not a TokenCreated log, skip
      }
    }

    if (!parsedToken || !parsedCurve) {
      // No TokenCreated event found — shouldn't happen, but mark done.
      setStep("done");
      return;
    }

    setTokenAddress(parsedToken);
    setCurveAddress(parsedCurve);

    // Register metadata with our API so the image shows everywhere
    if (metadataUri && imageUri) {
      // Sign a message to authenticate the metadata registration (P0-2)
      const metaMessage = `Lick.fun: register metadata for ${parsedToken} by ${address} at ${Date.now()}`;
      signMessageAsync({ message: metaMessage })
        .then((metaSig) =>
          fetch("/api/register-metadata", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tokenAddress: parsedToken,
              metadataUri,
              imageUri,
              walletAddress: address,
              signature: metaSig,
              message: metaMessage,
            }),
          })
        )
        .catch((err) => {
          console.warn("[useCreateToken] Failed to register metadata:", err);
        });
    }

    const devBuyStr = pendingDevBuyMon;
    const devBuyFloat = parseFloat(devBuyStr);
    if (devBuyStr && devBuyFloat > 0 && Number.isFinite(devBuyFloat)) {
      // Fire the dev pre-buy on the freshly deployed curve.
      // First buy is exempt from anti-sniping penalty by contract design
      // (initialBuyExecuted flag). We pass minTokensOut=0 because:
      //  1. The curve has 0 realMon / 0 soldTokens — pricing is deterministic.
      //  2. We sign + broadcast immediately after the create tx in the same session,
      //     so no front-running window.
      //  3. The user explicitly chose this amount.
      try {
        const valueWei = parseEther(devBuyStr);
        writeBuyAsync({
          address: parsedCurve,
          abi: BondingCurveABI,
          functionName: "buy",
          args: [0n],
          value: valueWei,
        }).catch((err) => {
          console.error("[useCreateToken] dev buy failed:", err);
          setError(
            err instanceof Error ? err : new Error(String(err))
          );
          // Token was created successfully; still mark done so user sees it.
          setStep("done");
        });
      } catch (err) {
        console.error("[useCreateToken] dev buy setup failed:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setStep("done");
      }
    } else {
      // No dev buy requested — flow complete.
      setStep("done");
    }
  }, [
    isCreateSuccess,
    receipt,
    step,
    metadataUri,
    imageUri,
    writeBuyAsync,
    pendingDevBuyMon,
  ]);

  const createToken = async ({
    name,
    symbol,
    description,
    imageFile,
    telegram,
    twitter,
    website,
    customFeeConfig,
    devBuyAmountMon = "",
  }: {
    name: string;
    symbol: string;
    description?: string;
    imageFile?: File | null;
    telegram?: string;
    twitter?: string;
    website?: string;
    customFeeConfig?: CustomFeeConfig;
    devBuyAmountMon?: string;
  }) => {
    if (!address) throw new Error("Wallet not connected");
    setError(null);
    setTokenAddress(null);
    setCurveAddress(null);
    setMetadataUri(null);
    setImageUri(null);
    setUploadStatus("idle");
    setStep("idle");
    setPendingDevBuyMon(devBuyAmountMon ?? "");

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
      setStep("uploading");
      try {
        // Sign a message to authenticate the upload (P0-1)
        const uploadMessage = `Lick.fun: upload token image for ${address} at ${Date.now()}`;
        const uploadSig = await signMessageAsync({ message: uploadMessage });

        const formData = new FormData();
        formData.append("image", imageFile);
        formData.append("name", name);
        formData.append("symbol", symbol);
        if (description) formData.append("description", description);
        if (telegram) formData.append("telegram", telegram);
        if (twitter) formData.append("twitter", twitter);
        if (website) formData.append("website", website);
        formData.append("walletAddress", address ?? "");
        formData.append("signature", uploadSig);
        formData.append("message", uploadMessage);

        console.info("[useCreateToken] Uploading image + metadata to IPFS...");
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

        console.info("[useCreateToken] IPFS upload complete:", result);
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
    //  - If a FeeRouter is configured AND a customFeeConfig is provided,
    //    use createTokenWithCustomConfig so fees are split by FeeRouter at launch.
    //  - If no FeeRouter is configured, fall back to the standard createToken.
    const feeRouterConfigured =
      FEE_ROUTER_ADDRESS !== "0x0000000000000000000000000000000000000000";
    const useCustomConfig = feeRouterConfigured && !!customFeeConfig;

    console.info("[useCreateToken] Calling create on-chain:", {
      factory: FACTORY_ADDRESS,
      name,
      symbol,
      creator: address,
      useCustomConfig,
      customFeeConfig,
      devBuyAmountMon,
    });
    try {
      if (useCustomConfig && customFeeConfig) {
        const giftAddr = (customFeeConfig.giftBps > 0 && customFeeConfig.giftRecipient)
          ? customFeeConfig.giftRecipient as `0x${string}`
          : "0x0000000000000000000000000000000000000000" as `0x${string}`;
        await writeContractAsync({
          address: FACTORY_ADDRESS,
          abi: FactoryABI,
          functionName: "createTokenWithCustomConfig",
          args: [
            name,
            symbol,
            address,
            0n,
            BigInt(customFeeConfig.creatorBps),
            BigInt(customFeeConfig.lpBps),
            BigInt(customFeeConfig.burnBps),
            BigInt(customFeeConfig.giftBps),
            giftAddr,
          ],
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
    resetCreateWrite();
    resetBuyWrite();
    setTokenAddress(null);
    setCurveAddress(null);
    setError(null);
    setUploadStatus("idle");
    setMetadataUri(null);
    setImageUri(null);
    setStep("idle");
    setPendingDevBuyMon("");
  };

  // Backwards-compat flags consumed by the create page.
  // - isPending: either wallet prompt is open
  // - isConfirming: either tx is awaiting receipt
  // - isSuccess: the entire flow (incl. optional dev buy) finished
  const isPending = isCreatePending || isBuyPending;
  const isConfirming = isCreateConfirming || isBuyConfirming;
  const isSuccess = step === "done";

  return {
    createToken,
    step,
    isPending,
    isConfirming,
    isSuccess,
    tokenAddress,
    curveAddress,
    txHash: createTxHash,
    buyTxHash,
    error,
    uploadStatus,
    metadataUri,
    imageUri,
    reset,
  };
}