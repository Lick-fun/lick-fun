"use client";

import { useReadContract, useWriteContract } from "wagmi";
import { parseEther, type Abi } from "viem";

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Contract Addresses (from env)                                                    */
/* ──────────────────────────────────────────────────────────────────────────────── */

export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;
const PREDICTION_MARKET_ADDRESS = (process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Factory ABI (token creation)                                                     */
/* ──────────────────────────────────────────────────────────────────────────────── */

export const FactoryABI = [
  {
    type: "function",
    name: "createToken",
    inputs: [
      { name: "name", type: "string", internalType: "string" },
      { name: "symbol", type: "string", internalType: "string" },
      { name: "creatorAddress", type: "address", internalType: "address" },
      { name: "startTime", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      { name: "tokenAddr", type: "address", internalType: "address" },
      { name: "curveAddr", type: "address", internalType: "address" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "createTokenWithPreset",
    inputs: [
      { name: "name", type: "string", internalType: "string" },
      { name: "symbol", type: "string", internalType: "string" },
      { name: "creatorAddress", type: "address", internalType: "address" },
      { name: "startTime", type: "uint256", internalType: "uint256" },
      { name: "preset", type: "uint8", internalType: "enum FeeRouter.Preset" },
    ],
    outputs: [
      { name: "tokenAddr", type: "address", internalType: "address" },
      { name: "curveAddr", type: "address", internalType: "address" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "TokenCreated",
    inputs: [
      { name: "token", type: "address", indexed: true, internalType: "address" },
      { name: "curve", type: "address", indexed: true, internalType: "address" },
      { name: "creator", type: "address", indexed: true, internalType: "address" },
    ],
  },
] as const satisfies Abi;

/** FeeRouter.Preset enum — DEFAULT=0, ECOSYSTEM=1 */
export const FeePreset = {
  DEFAULT: 0,
  ECOSYSTEM: 1,
} as const;

/** Deploy fee: 10 MON */
export const DEPLOY_FEE = parseEther("10");

/* ──────────────────────────────────────────────────────────────────────────────── */
/* BondingCurve ABI (minimal — only what the frontend needs)                        */
/* ──────────────────────────────────────────────────────────────────────────────── */

export const BondingCurveABI = [
  {
    type: "function",
    name: "buy",
    inputs: [{ name: "minTokensOut", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "tokensOut", type: "uint256", internalType: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "sell",
    inputs: [
      { name: "tokensIn", type: "uint256", internalType: "uint256" },
      { name: "minMonOut", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "monOut", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getAmountOut",
    inputs: [
      { name: "amountIn", type: "uint256", internalType: "uint256" },
      { name: "isBuy", type: "bool", internalType: "bool" },
    ],
    outputs: [{ name: "amountOut", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getProgress",
    inputs: [],
    outputs: [{ name: "progressInBps", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "realMon",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "soldTokens",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "graduated",
    inputs: [],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "creator",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "token",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "VIRTUAL_MON",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "VIRTUAL_TOKENS",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "GRADUATION_THRESHOLD",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAntiSnipingPenaltyBps",
    inputs: [],
    outputs: [{ name: "penaltyBps", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const satisfies Abi;

export const PredictionMarketABI = [
  {
    type: "function",
    name: "createMarket",
    inputs: [{ name: "token", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "betYes",
    inputs: [{ name: "token", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "betNo",
    inputs: [{ name: "token", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "resolveMarket",
    inputs: [{ name: "token", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimWinnings",
    inputs: [{ name: "token", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getOdds",
    inputs: [{ name: "token", type: "address", internalType: "address" }],
    outputs: [
      { name: "yesOdds", type: "uint256", internalType: "uint256" },
      { name: "noOdds", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "markets",
    inputs: [{ name: "token", type: "address", internalType: "address" }],
    outputs: [
      { name: "token", type: "address", internalType: "address" },
      { name: "totalYesMON", type: "uint256", internalType: "uint256" },
      { name: "totalNoMON", type: "uint256", internalType: "uint256" },
      { name: "resolved", type: "bool", internalType: "bool" },
      { name: "outcome", type: "bool", internalType: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "yesBets",
    inputs: [
      { name: "token", type: "address", internalType: "address" },
      { name: "bettor", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "noBets",
    inputs: [
      { name: "token", type: "address", internalType: "address" },
      { name: "bettor", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "winningsClaimed",
    inputs: [
      { name: "token", type: "address", internalType: "address" },
      { name: "claimant", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
] as const satisfies Abi;

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Price Calculation Helpers (off-chain mirror of BondingCurve math)                */
/* ──────────────────────────────────────────────────────────────────────────────── */

const VIRTUAL_MON = 80_000n * 10n ** 18n;
const VIRTUAL_TOKENS = 477_000_000n * 10n ** 18n;
const K = VIRTUAL_MON * VIRTUAL_TOKENS;
const BPS_DENOMINATOR = 10_000n;
const PROTOCOL_FEE_BPS = 100n;
const CREATOR_FEE_BPS = 100n;

export function getTokenPrice(
  realMon: bigint,
  soldTokens: bigint
): { monPerToken: number; marketCapMon: number } {
  // Current bonding curve price: MON required to buy one more token
  const remainingTokens = VIRTUAL_TOKENS - soldTokens;
  if (remainingTokens === 0n) return { monPerToken: 0, marketCapMon: 0 };
  const priceWei = K / (remainingTokens * remainingTokens);
  const monPerToken = Number(priceWei) / 1e18;
  const totalSupply = 1_000_000_000n * 10n ** 18n;
  const marketCapWei = (totalSupply * priceWei) / 10n ** 18n;
  return { monPerToken, marketCapMon: Number(marketCapWei) / 1e18 };
}

export function formatMon(wei: bigint): string {
  const num = Number(wei) / 1e18;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K MON`;
  return `${num.toFixed(2)} MON`;
}

export function formatTokens(wei: bigint): string {
  const num = Number(wei) / 1e18;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
}

export function getGraduationProgress(realMon: bigint): number {
  const threshold = 100_000n * 10n ** 18n;
  if (realMon >= threshold) return 100;
  return Number((realMon * 10000n) / threshold) / 100;
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* React Hooks                                                                      */
/* ──────────────────────────────────────────────────────────────────────────────── */

export function useBondingCurveRead(curveAddress: `0x${string}`) {
  const { data: realMon } = useReadContract({
    address: curveAddress,
    abi: BondingCurveABI,
    functionName: "realMon",
  });
  const { data: soldTokens } = useReadContract({
    address: curveAddress,
    abi: BondingCurveABI,
    functionName: "soldTokens",
  });
  const { data: graduated } = useReadContract({
    address: curveAddress,
    abi: BondingCurveABI,
    functionName: "graduated",
  });
  const { data: progress } = useReadContract({
    address: curveAddress,
    abi: BondingCurveABI,
    functionName: "getProgress",
  });
  const { data: creator } = useReadContract({
    address: curveAddress,
    abi: BondingCurveABI,
    functionName: "creator",
  });
  const { data: penaltyBps } = useReadContract({
    address: curveAddress,
    abi: BondingCurveABI,
    functionName: "getAntiSnipingPenaltyBps",
  });
  const { data: vMon } = useReadContract({
    address: curveAddress,
    abi: BondingCurveABI,
    functionName: "VIRTUAL_MON",
  });
  const { data: vTokens } = useReadContract({
    address: curveAddress,
    abi: BondingCurveABI,
    functionName: "VIRTUAL_TOKENS",
  });

  return {
    realMon: (realMon as bigint) ?? 0n,
    soldTokens: (soldTokens as bigint) ?? 0n,
    graduated: (graduated as boolean) ?? false,
    progressBps: (progress as bigint) ?? 0n,
    creator: (creator as string) ?? "",
    penaltyBps: (penaltyBps as bigint) ?? 0n,
    virtualMon: (vMon as bigint) ?? VIRTUAL_MON,
    virtualTokens: (vTokens as bigint) ?? VIRTUAL_TOKENS,
    price: getTokenPrice((realMon as bigint) ?? 0n, (soldTokens as bigint) ?? 0n),
  };
}

export function useGetAmountOut(
  curveAddress: `0x${string}`,
  amountIn: bigint,
  isBuy: boolean
) {
  return useReadContract({
    address: curveAddress,
    abi: BondingCurveABI,
    functionName: "getAmountOut",
    args: [amountIn, isBuy],
  });
}

export function useWriteBuy(_curveAddress: `0x${string}`) {
  return useWriteContract();
}

export function useWriteSell(_curveAddress: `0x${string}`) {
  return useWriteContract();
}

export function usePredictionMarketRead(tokenAddress: `0x${string}`, userAddress?: `0x${string}`) {
  const { data: market } = useReadContract({
    address: PREDICTION_MARKET_ADDRESS,
    abi: PredictionMarketABI,
    functionName: "markets",
    args: [tokenAddress],
  });
  const { data: odds } = useReadContract({
    address: PREDICTION_MARKET_ADDRESS,
    abi: PredictionMarketABI,
    functionName: "getOdds",
    args: [tokenAddress],
  });
  const { data: yesBet } = useReadContract({
    address: PREDICTION_MARKET_ADDRESS,
    abi: PredictionMarketABI,
    functionName: "yesBets",
    args: userAddress ? [tokenAddress, userAddress] : undefined,
    query: { enabled: !!userAddress },
  });
  const { data: noBet } = useReadContract({
    address: PREDICTION_MARKET_ADDRESS,
    abi: PredictionMarketABI,
    functionName: "noBets",
    args: userAddress ? [tokenAddress, userAddress] : undefined,
    query: { enabled: !!userAddress },
  });
  const { data: claimed } = useReadContract({
    address: PREDICTION_MARKET_ADDRESS,
    abi: PredictionMarketABI,
    functionName: "winningsClaimed",
    args: userAddress ? [tokenAddress, userAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  return {
    market,
    odds,
    yesBet: (yesBet as bigint) ?? 0n,
    noBet: (noBet as bigint) ?? 0n,
    claimed: (claimed as boolean) ?? false,
  };
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Write hooks                                                                     */
/* ──────────────────────────────────────────────────────────────────────────────── */

export function useBuyToken() {
  const { writeContractAsync, ...rest } = useWriteContract();

  const buy = async (
    curveAddress: `0x${string}`,
    valueInWei: bigint,
    minTokensOut: bigint
  ) => {
    return writeContractAsync({
      address: curveAddress,
      abi: BondingCurveABI,
      functionName: "buy",
      args: [minTokensOut],
      value: valueInWei,
    });
  };

  return { buy, ...rest };
}

export function useSellToken() {
  const { writeContractAsync, ...rest } = useWriteContract();

  const sell = async (
    curveAddress: `0x${string}`,
    tokensIn: bigint,
    minMonOut: bigint
  ) => {
    return writeContractAsync({
      address: curveAddress,
      abi: BondingCurveABI,
      functionName: "sell",
      args: [tokensIn, minMonOut],
    });
  };

  return { sell, ...rest };
}

export function useBetYes() {
  const { writeContractAsync, ...rest } = useWriteContract();

  const betYes = async (tokenAddress: `0x${string}`, valueInWei: bigint) => {
    return writeContractAsync({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI,
      functionName: "betYes",
      args: [tokenAddress],
      value: valueInWei,
    });
  };

  return { betYes, ...rest };
}

export function useBetNo() {
  const { writeContractAsync, ...rest } = useWriteContract();

  const betNo = async (tokenAddress: `0x${string}`, valueInWei: bigint) => {
    return writeContractAsync({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI,
      functionName: "betNo",
      args: [tokenAddress],
      value: valueInWei,
    });
  };

  return { betNo, ...rest };
}

export function useClaimWinnings() {
  const { writeContractAsync, ...rest } = useWriteContract();

  const claim = async (tokenAddress: `0x${string}`) => {
    return writeContractAsync({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI,
      functionName: "claimWinnings",
      args: [tokenAddress],
    });
  };

  return { claim, ...rest };
}
