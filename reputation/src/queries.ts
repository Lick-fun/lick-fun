/**
 * Lick.fun Reputation Engine — GraphQL Query Layer
 *
 * Reads Profile, Token, and Trade data from the Envio HyperIndex
 * GraphQL endpoint. Used by the scoring engine to gather inputs.
 *
 * The Envio endpoint URL is configurable via ENVIO_GRAPHQL_URL env var,
 * defaulting to the Monad testnet indexer at localhost:8080.
 */

import { GraphQLClient, gql } from "graphql-request";
import type {
  ProfileEntity,
  TokenEntity,
  TradeEntity,
  EnvioProfileResponse,
  EnvioAllProfilesResponse,
  EnvioLeaderboardResponse,
} from "./types";

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Configuration                                                                  */
/* ──────────────────────────────────────────────────────────────────────────────── */

const DEFAULT_ENVIO_URL = "http://localhost:8080/v1/graphql";

function getClient(): GraphQLClient {
  const url = process.env.ENVIO_GRAPHQL_URL ?? DEFAULT_ENVIO_URL;
  return new GraphQLClient(url);
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* GraphQL Fragments                                                              */
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
/* Queries                                                                        */
/* ──────────────────────────────────────────────────────────────────────────────── */

/**
 * Fetch full profile data for a single address.
 * Returns profile entity, all tokens created, and all trades across those tokens.
 */
export async function queryProfileScore(
  address: string
): Promise<EnvioProfileResponse> {
  const client = getClient();
  const normalized = address.toLowerCase();

  const query = gql`
    query GetProfile($address: String!) {
      profile(id: $address) {
        ...ProfileFields
      }
      tokens(where: { creator: { _eq: $address } }) {
        ...TokenFields
      }
      trades(
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

  return client.request<EnvioProfileResponse>(query, {
    address: normalized,
  });
}

/**
 * Fetch all profiles for batch scoring.
 */
export async function queryAllProfiles(): Promise<EnvioAllProfilesResponse> {
  const client = getClient();

  const query = gql`
    query GetAllProfiles {
      profiles {
        ...ProfileFields
      }
    }
    ${PROFILE_FRAGMENT}
  `;

  return client.request<EnvioAllProfilesResponse>(query);
}

/**
 * Fetch a leaderboard: top N profiles by graduated count (proxy for reputation).
 * Actual ranking by reputation happens client-side after scoring.
 */
export async function queryLeaderboard(
  limit: number = 100
): Promise<EnvioLeaderboardResponse> {
  const client = getClient();

  const query = gql`
    query GetLeaderboard($limit: Int!) {
      profiles(
        order_by: { graduatedCount: desc }
        limit: $limit
      ) {
        ...ProfileFields
      }
    }
    ${PROFILE_FRAGMENT}
  `;

  return client.request<EnvioLeaderboardResponse>(query, { limit });
}

/**
 * Fetch tokens created by a specific address.
 */
export async function queryTokensByCreator(
  creator: string
): Promise<{ tokens: TokenEntity[] }> {
  const client = getClient();

  const query = gql`
    query GetTokensByCreator($creator: String!) {
      tokens(where: { creator: { _eq: $creator } }) {
        ...TokenFields
      }
    }
    ${TOKEN_FRAGMENT}
  `;

  return client.request<{ tokens: TokenEntity[] }>(query, {
    creator: creator.toLowerCase(),
  });
}

/**
 * Fetch trades for a specific token.
 */
export async function queryTradesByToken(
  tokenId: string
): Promise<{ trades: TradeEntity[] }> {
  const client = getClient();

  const query = gql`
    query GetTradesByToken($tokenId: String!) {
      trades(
        where: { token_id: { _eq: $tokenId } }
        order_by: { blockTimestamp: asc }
      ) {
        ...TradeFields
      }
    }
    ${TRADE_FRAGMENT}
  `;

  return client.request<{ trades: TradeEntity[] }>(query, {
    tokenId: tokenId.toLowerCase(),
  });
}