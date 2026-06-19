/**
 * ⚠️  AUTO-GENERATED STUB — DO NOT EDIT MANUALLY
 *
 * This file is a type-only placeholder so TypeScript can compile EventHandlers.ts
 * before `envio codegen` has been run.
 *
 * After deploying contracts (Stage 6), run:
 *   cd lick-fun/indexer && envio codegen
 *
 * Envio will overwrite this directory with fully-typed bindings derived from
 * config.yaml + schema.graphql.
 */

/* ──────────────────────────────── Entity Types ────────────────────────────────── */

export type Token = {
  id: string;
  creator: string;
  name: string;
  symbol: string;
  curve: string;
  virtualMon: bigint;
  virtualTokens: bigint;
  targetTokenAmount: bigint;
  startTime: bigint;
  startBlock: bigint;
  realMon: bigint;
  soldTokens: bigint;
  graduated: boolean;
  createdAt: bigint;
  graduatedAt?: bigint;
  buyCount: number;
  sellCount: number;
  totalBuyVolume: bigint;
  totalSellVolume: bigint;
};

export type Trade = {
  id: string;
  token_id: string;           // foreign key to Token
  trader: string;
  isBuy: boolean;
  amountIn: bigint;
  amountOut: bigint;
  blockNumber: number;
  blockTimestamp: bigint;
  penaltyBps: number;
};

export type Profile = {
  id: string;
  createdAt: bigint;
  tokenCount: number;
  graduatedCount: number;
  totalBuyVolume: bigint;
  totalSellVolume: bigint;
};

/* ──────────────────────────────── Event Param Types ────────────────────────────── */

type Block = {
  number: number;
  timestamp: number;
  hash: string;
};

type Transaction = {
  hash: string;
  from: string;
};

type HandlerContext = {
  Token: {
    get(id: string): Promise<Token | undefined>;
    set(entity: Token): void;
  };
  Trade: {
    get(id: string): Promise<Trade | undefined>;
    set(entity: Trade): void;
  };
  Profile: {
    get(id: string): Promise<Profile | undefined>;
    set(entity: Profile): void;
  };
  BondingCurve: {
    addDynamicContractAddress(address: string): void;
  };
  client: {
    readContract(params: {
      address: `0x${string}`;
      abi: readonly object[];
      functionName: string;
      args?: readonly unknown[];
    }): Promise<unknown>;
  };
};

type LoaderArgs<TParams> = {
  event: { params: TParams; block: Block; transaction: Transaction; logIndex: number };
  context: HandlerContext;
};

type HandlerArgs<TParams, TLoaderReturn> = {
  event: { params: TParams; block: Block; transaction: Transaction; logIndex: number };
  context: HandlerContext;
  loaderReturn: TLoaderReturn;
};

type EventRegistration<TParams> = {
  handlerWithLoader<TLoaderReturn>(opts: {
    loader(args: LoaderArgs<TParams>): Promise<TLoaderReturn>;
    handler(args: HandlerArgs<TParams, TLoaderReturn>): Promise<void>;
  }): void;
  handler(fn: (args: HandlerArgs<TParams, undefined>) => Promise<void>): void;
};

/* ──────────────────────────────── Contract Stubs ────────────────────────────────── */

type CurveCreateParams = {
  creator: string;
  token: string;
  curve: string;
  virtualMon: bigint;
  virtualTokens: bigint;
  startTime: bigint;
};

type CurveLaunchParams = {
  token: string;
  startTime: bigint;
  startBlock: bigint;
};

type CurveBuyParams = {
  buyer: string;
  token: string;
  amountIn: bigint;
  amountOut: bigint;
};

type CurveSellParams = {
  seller: string;
  token: string;
  amountIn: bigint;
  amountOut: bigint;
};

type CurveGraduateParams = {
  token: string;
  pool: string;
};

export const Factory = {
  CurveCreate: {} as EventRegistration<CurveCreateParams>,
};

export const BondingCurve = {
  CurveLaunch: {} as EventRegistration<CurveLaunchParams>,
  CurveBuy: {} as EventRegistration<CurveBuyParams>,
  CurveSell: {} as EventRegistration<CurveSellParams>,
  CurveGraduate: {} as EventRegistration<CurveGraduateParams>,
};
