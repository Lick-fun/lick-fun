"use client";

import { useReadContract, useWriteContract } from "wagmi";
import { type Abi } from "viem";

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Contract Addresses (from env)                                                    */
/* ──────────────────────────────────────────────────────────────────────────────── */

export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const PREDICTION_MARKET_ADDRESS = (process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const PREDICTION_MARKET_DEPLOYED = PREDICTION_MARKET_ADDRESS !== ZERO_ADDRESS;

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Factory ABI (deployed testnet version)                                           */
/* ──────────────────────────────────────────────────────────────────────────────── */

export const FactoryABI = [
  {
    type: "function",
    name: "createToken",
    inputs: [
      { name: "name", type: "string", internalType: "string" },
      { name: "symbol", type: "string", internalType: "string" },
      { name: "creator", type: "address", internalType: "address" },
      { name: "startTime", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      { name: "token", type: "address", internalType: "address" },
      { name: "curve", type: "address", internalType: "address" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "createTokenWithPreset",
    inputs: [
      { name: "name", type: "string", internalType: "string" },
      { name: "symbol", type: "string", internalType: "string" },
      { name: "creator", type: "address", internalType: "address" },
      { name: "startTime", type: "uint256", internalType: "uint256" },
      { name: "preset", type: "uint8", internalType: "uint8" },
    ],
    outputs: [
      { name: "token", type: "address", internalType: "address" },
      { name: "curve", type: "address", internalType: "address" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "createTokenWithCustomConfig",
    inputs: [
      { name: "name", type: "string", internalType: "string" },
      { name: "symbol", type: "string", internalType: "string" },
      { name: "creatorAddress", type: "address", internalType: "address" },
      { name: "startTime", type: "uint256", internalType: "uint256" },
      { name: "creatorShareBps", type: "uint256", internalType: "uint256" },
      { name: "lpSupportBps", type: "uint256", internalType: "uint256" },
      { name: "buybackBurnBps", type: "uint256", internalType: "uint256" },
      { name: "giftBps", type: "uint256", internalType: "uint256" },
      { name: "giftRecipient", type: "address", internalType: "address" },
    ],
    outputs: [
      { name: "tokenAddr", type: "address", internalType: "address" },
      { name: "curveAddr", type: "address", internalType: "address" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "protocolFeeReceiver",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "TokenCreated",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "curve", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
    ],
  },
] as const satisfies Abi;

/* ──────────────────────────────────────────────────────────────────────────────── */
/* FeeRouter ABI (for setCustomConfig after token creation)                         */
/* ──────────────────────────────────────────────────────────────────────────────── */

export const FeeRouterABI = [
  {
    type: "function",
    name: "setCustomConfig",
    inputs: [
      { name: "token", type: "address", internalType: "address" },
      {
        name: "config",
        type: "tuple",
        internalType: "struct FeeRouter.FeeConfig",
        components: [
          { name: "creatorShareBps", type: "uint256", internalType: "uint256" },
          { name: "lpSupportBps", type: "uint256", internalType: "uint256" },
          { name: "buybackBurnBps", type: "uint256", internalType: "uint256" },
          { name: "giftBps", type: "uint256", internalType: "uint256" },
          { name: "giftRecipient", type: "address", internalType: "address" },
          { name: "creator", type: "address", internalType: "address" },
          { name: "initialized", type: "bool", internalType: "bool" },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const satisfies Abi;

export const FEE_ROUTER_ADDRESS = (process.env.NEXT_PUBLIC_FEE_ROUTER_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;

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
    inputs: [
      { name: "token", type: "address", internalType: "address" },
      { name: "curve", type: "address", internalType: "address" },
    ],
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
    name: "sweepProtocolFee",
    inputs: [{ name: "token", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "refundOneSidedMarket",
    inputs: [{ name: "token", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdrawRefund",
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
      { name: "curve", type: "address", internalType: "address" },
      { name: "totalYesMON", type: "uint256", internalType: "uint256" },
      { name: "totalNoMON", type: "uint256", internalType: "uint256" },
      { name: "resolved", type: "bool", internalType: "bool" },
      { name: "outcome", type: "bool", internalType: "bool" },
      { name: "cancelled", type: "bool", internalType: "bool" },
      { name: "closeTime", type: "uint256", internalType: "uint256" },
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
  {
    type: "function",
    name: "feeSwept",
    inputs: [{ name: "token", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "MarketCreated",
    inputs: [
      { name: "token", type: "address", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "BetPlaced",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "bettor", type: "address", indexed: true },
      { name: "isYes", type: "bool", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MarketResolved",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "outcome", type: "bool", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "WinningsClaimed",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "claimant", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
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
  const reserveTokens = VIRTUAL_TOKENS - soldTokens;
  if (reserveTokens <= 0n) return { monPerToken: 0, marketCapMon: 0 };
  const reserveMon = VIRTUAL_MON + realMon;
  // AMM spot price: reserveMon and reserveTokens are both in wei (1e18),
  // so their ratio gives MON per token directly (units cancel).
  const monPerToken = Number(reserveMon) / Number(reserveTokens);
  const totalSupply = 1_000_000_000; // 1 billion tokens
  const marketCapMon = monPerToken * totalSupply;
  return { monPerToken, marketCapMon };
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

/**
 * Estimate tokens received for a dev pre-buy on a freshly deployed curve.
 * Mirrors the on-chain `BondingCurve.buy()` math for the FIRST buy:
 *  - 0 anti-sniping penalty (initialBuyExecuted == false)
 *  - 1% protocol fee + 1% creator fee deducted from msg.value
 *  - CPMM: tokensOut = VIRTUAL_TOKENS − k / (VIRTUAL_MON + netAmountIn)
 * Assumes the curve starts at realMon=0, soldTokens=0.
 */
export function estimateDevBuyTokens(monAmountWei: bigint): bigint {
  if (monAmountWei <= 0n) return 0n;
  const protocolFee = (monAmountWei * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
  const creatorFee = (monAmountWei * CREATOR_FEE_BPS) / BPS_DENOMINATOR;
  const netAmountIn = monAmountWei - protocolFee - creatorFee;
  const denominator = VIRTUAL_MON + netAmountIn;
  if (denominator <= 0n) return 0n;
  const newSold = K / denominator;
  const tokensOut = VIRTUAL_TOKENS - newSold;
  return tokensOut;
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

export interface PredictionMarketStruct {
  token: string;
  curve: string;
  totalYesMON: bigint;
  totalNoMON: bigint;
  resolved: boolean;
  outcome: boolean;
  cancelled: boolean;
  closeTime: bigint;
}

export function usePredictionMarketRead(tokenAddress: `0x${string}`, userAddress?: `0x${string}`) {
  const { data: marketRaw } = useReadContract({
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

  // wagmi returns the struct as an array (tuple) — normalize to a typed object.
  // markets[token] == address(0) means no market exists for this token.
  const raw = marketRaw as readonly [string, string, bigint, bigint, boolean, boolean, boolean, bigint] | undefined;
  const market: PredictionMarketStruct | null = raw && raw[0] !== "0x0000000000000000000000000000000000000000"
    ? {
        token: raw[0],
        curve: raw[1],
        totalYesMON: raw[2],
        totalNoMON: raw[3],
        resolved: raw[4],
        outcome: raw[5],
        cancelled: raw[6],
        closeTime: raw[7],
      }
    : null;

  // getOdds returns basis points (0–10000). Convert to percentages here so
  // callers don't have to remember the unit.
  const oddsRaw = odds as readonly [bigint, bigint] | undefined;
  const oddsPct = oddsRaw
    ? {
        yesOdds: Number(oddsRaw[0]) / 100,
        noOdds: Number(oddsRaw[1]) / 100,
      }
    : { yesOdds: 50, noOdds: 50 };

  return {
    market,
    odds: oddsPct,
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

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Minimal ERC-20 ABI (approve + balanceOf — used by TradePanel sell flow)          */
/* ──────────────────────────────────────────────────────────────────────────────── */

export const ERC20ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const satisfies Abi;

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

export function useWithdrawRefund() {
  const { writeContractAsync, ...rest } = useWriteContract();

  const withdraw = async (tokenAddress: `0x${string}`) => {
    return writeContractAsync({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI,
      functionName: "withdrawRefund",
      args: [tokenAddress],
    });
  };

  return { withdraw, ...rest };
}

export function useRefundOneSidedMarket() {
  const { writeContractAsync, ...rest } = useWriteContract();

  const refund = async (tokenAddress: `0x${string}`) => {
    return writeContractAsync({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI,
      functionName: "refundOneSidedMarket",
      args: [tokenAddress],
    });
  };

  return { refund, ...rest };
}

export function useResolveMarket() {
  const { writeContractAsync, ...rest } = useWriteContract();

  const resolve = async (tokenAddress: `0x${string}`) => {
    return writeContractAsync({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI,
      functionName: "resolveMarket",
      args: [tokenAddress],
    });
  };

  return { resolve, ...rest };
}

export function useSweepProtocolFee() {
  const { writeContractAsync, ...rest } = useWriteContract();

  const sweep = async (tokenAddress: `0x${string}`) => {
    return writeContractAsync({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI,
      functionName: "sweepProtocolFee",
      args: [tokenAddress],
    });
  };

  return { sweep, ...rest };
}

export function useFeeSwept(tokenAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: PREDICTION_MARKET_ADDRESS,
    abi: PredictionMarketABI,
    functionName: "feeSwept",
    args: tokenAddress ? [tokenAddress] : undefined,
    query: { enabled: PREDICTION_MARKET_DEPLOYED && !!tokenAddress },
  });
}