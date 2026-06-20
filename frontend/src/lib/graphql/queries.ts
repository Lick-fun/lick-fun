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
