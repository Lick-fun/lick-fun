import { gql } from "graphql-request";

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Type Definitions (mirror Envio GraphQL schema)                                   */
/* ──────────────────────────────────────────────────────────────────────────────── */

export interface TokenEntity {
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
  graduatedAt?: bigint | null;
  buyCount: number;
  sellCount: number;
  totalBuyVolume: bigint;
  totalSellVolume: bigint;
  uniqueBuyerCount: number;
  creatorSellCount: number;
}

export interface TradeEntity {
  id: string;
  token_id: string;
  trader: string;
  isBuy: boolean;
  amountIn: bigint;
  amountOut: bigint;
  blockNumber: number;
  blockTimestamp: bigint;
  penaltyBps: number;
}

export interface ProfileEntity {
  id: string;
  createdAt: bigint;
  tokenCount: number;
  graduatedCount: number;
  totalBuyVolume: bigint;
  totalSellVolume: bigint;
}

export interface MarketIndexEntity {
  id: string;
  totalYesMON: bigint;
  totalNoMON: bigint;
  resolved: boolean;
  outcome: boolean | null;
  cancelled: boolean;
  closeTime: bigint;
  createdAt: bigint;
  resolvedAt: bigint | null;
}

export interface BetIndexEntity {
  id: string;
  market_id: string;
  bettor: string;
  isYes: boolean;
  amount: bigint;
  lastBetAt: bigint;
}

export interface ClaimIndexEntity {
  id: string;
  market_id: string;
  claimant: string;
  amount: bigint;
  claimedAt: bigint;
}

export interface EnvioProfileResponse {
  Profile_by_pk?: ProfileEntity | null;
  Token: TokenEntity[];
  Trade: TradeEntity[];
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* GraphQL Fragments                                                               */
/* ──────────────────────────────────────────────────────────────────────────────── */

const PROFILE_FRAGMENT = gql`
  fragment ProfileFields on Profile {
    id
    createdAt
    tokenCount
    graduatedCount
    totalBuyVolume
    totalSellVolume
  }
`;

const TOKEN_FRAGMENT = gql`
  fragment TokenFields on Token {
    id
    creator
    name
    symbol
    curve
    virtualMon
    virtualTokens
    targetTokenAmount
    startTime
    startBlock
    realMon
    soldTokens
    graduated
    createdAt
    graduatedAt
    buyCount
    sellCount
    totalBuyVolume
    totalSellVolume
    uniqueBuyerCount
    creatorSellCount
  }
`;

const TRADE_FRAGMENT = gql`
  fragment TradeFields on Trade {
    id
    token_id
    trader
    isBuy
    amountIn
    amountOut
    blockNumber
    blockTimestamp
    penaltyBps
  }
`;

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Query Strings (exported for use with graphql-request)                            */
/* NOTE: Envio v3 uses PascalCase query roots (Token, Token_by_pk, Trade, Profile) */
/* ──────────────────────────────────────────────────────────────────────────────── */

export const QUERY_ALL_TOKENS = gql`
  query GetAllTokens($limit: Int, $offset: Int, $orderBy: [Token_order_by!], $where: Token_bool_exp) {
    Token(limit: $limit, offset: $offset, order_by: $orderBy, where: $where) {
      ...TokenFields
    }
  }
  ${TOKEN_FRAGMENT}
`;

export const QUERY_TOKEN = gql`
  query GetToken($id: String!) {
    Token_by_pk(id: $id) {
      ...TokenFields
    }
  }
  ${TOKEN_FRAGMENT}
`;

export const QUERY_TRADES_BY_TOKEN = gql`
  query GetTradesByToken($tokenId: String!, $limit: Int!) {
    Trade(
      where: { token_id: { _eq: $tokenId } }
      order_by: { blockTimestamp: desc }
      limit: $limit
    ) {
      ...TradeFields
    }
  }
  ${TRADE_FRAGMENT}
`;

export const QUERY_PROFILE = gql`
  query GetProfile($address: String!) {
    Profile_by_pk(id: $address) {
      ...ProfileFields
    }
  }
  ${PROFILE_FRAGMENT}
`;

export const QUERY_PROFILE_SCORE = gql`
  query GetProfileScore($address: String!) {
    Profile_by_pk(id: $address) {
      ...ProfileFields
    }
    Token(where: { creator: { _eq: $address } }) {
      ...TokenFields
    }
    Trade(
      where: { trader: { _eq: $address } }
      order_by: { blockTimestamp: asc }
    ) {
      ...TradeFields
    }
  }
  ${PROFILE_FRAGMENT}
  ${TOKEN_FRAGMENT}
  ${TRADE_FRAGMENT}
`;

export const QUERY_ALL_PROFILES = gql`
  query GetAllProfiles {
    Profile {
      ...ProfileFields
    }
  }
  ${PROFILE_FRAGMENT}
`;

export const QUERY_LEADERBOARD = gql`
  query GetLeaderboard($limit: Int!) {
    Profile(
      order_by: { graduatedCount: desc }
      limit: $limit
    ) {
      ...ProfileFields
    }
  }
  ${PROFILE_FRAGMENT}
`;

export const QUERY_RECENT_TRADES = gql`
  query GetRecentTrades($limit: Int!) {
    Trade(
      order_by: { blockTimestamp: desc }
      limit: $limit
    ) {
      ...TradeFields
    }
  }
  ${TRADE_FRAGMENT}
`;

/**
 * Earliest trade for each token in the last 24h. Used as a reference price
 * for computing 24h percentage change without requiring stored snapshots.
 *
 * Envio does not support `_in` with `_gte` composite filters across many IDs
 * in one query for dynamic lists, so callers iterate per token or keep limit
 * high enough to capture all relevant trades. This query is intentionally
 * simple and additive only.
 */
export const QUERY_TRADES_24H = gql`
  query GetTrades24h($since: numeric!, $tokenId: String!, $limit: Int!) {
    Trade(
      where: { blockTimestamp: { _gte: $since }, token_id: { _eq: $tokenId } }
      order_by: { blockTimestamp: asc }
      limit: $limit
    ) {
      ...TradeFields
    }
  }
  ${TRADE_FRAGMENT}
`;

/**
 * Fetches all trades for a token in chronological order for building OHLC
 * price bars client-side. Ordered ASC so bars can be built by iterating once.
 */
export const QUERY_CHART_TRADES = gql`
  query GetChartTrades($tokenId: String!, $limit: Int!) {
    Trade(
      where: { token_id: { _eq: $tokenId } }
      order_by: { blockTimestamp: asc }
      limit: $limit
    ) {
      ...TradeFields
    }
  }
  ${TRADE_FRAGMENT}
`;

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Prediction Market Queries                                                       */
/* ──────────────────────────────────────────────────────────────────────────────── */

const MARKET_FRAGMENT = gql`
  fragment MarketFields on Market {
    id
    totalYesMON
    totalNoMON
    resolved
    outcome
    cancelled
    closeTime
    createdAt
    resolvedAt
  }
`;

const BET_FRAGMENT = gql`
  fragment BetFields on Bet {
    id
    market_id
    bettor
    isYes
    amount
    lastBetAt
  }
`;

const CLAIM_FRAGMENT = gql`
  fragment ClaimFields on Claim {
    id
    market_id
    claimant
    amount
    claimedAt
  }
`;

/**
 * Fetches all prediction markets from the indexer. Used for historical/resolved
 * views and leaderboards. Live odds and user positions still come from on-chain
 * multicalls in useAllMarkets/useMarket.
 */
export const QUERY_ALL_MARKETS = gql`
  query GetAllMarkets($limit: Int, $offset: Int, $orderBy: [Market_order_by!], $where: Market_bool_exp) {
    Market(limit: $limit, offset: $offset, order_by: $orderBy, where: $where) {
      ...MarketFields
    }
  }
  ${MARKET_FRAGMENT}
`;

/**
 * Fetches a single prediction market by token address.
 */
export const QUERY_MARKET = gql`
  query GetMarket($id: String!) {
    Market_by_pk(id: $id) {
      ...MarketFields
    }
  }
  ${MARKET_FRAGMENT}
`;

/**
 * Fetches all bets for a market, ordered by amount descending. Used for
 * "top bettors" leaderboards.
 */
export const QUERY_BETS_BY_MARKET = gql`
  query GetBetsByMarket($marketId: String!, $limit: Int!) {
    Bet(
      where: { market_id: { _eq: $marketId } }
      order_by: { amount: desc }
      limit: $limit
    ) {
      ...BetFields
    }
  }
  ${BET_FRAGMENT}
`;

/**
 * Fetches all bets placed by a specific wallet address. Used for "My Positions"
 * views across all markets.
 */
export const QUERY_MY_BETS = gql`
  query GetMyBets($bettor: String!, $limit: Int!) {
    Bet(
      where: { bettor: { _eq: $bettor } }
      order_by: { lastBetAt: desc }
      limit: $limit
    ) {
      ...BetFields
    }
  }
  ${BET_FRAGMENT}
`;

/**
 * Fetches all winnings claims for a market. Used for "recent winners" displays.
 */
export const QUERY_CLAIMS_BY_MARKET = gql`
  query GetClaimsByMarket($marketId: String!, $limit: Int!) {
    Claim(
      where: { market_id: { _eq: $marketId } }
      order_by: { claimedAt: desc }
      limit: $limit
    ) {
      ...ClaimFields
    }
  }
  ${CLAIM_FRAGMENT}
`;
