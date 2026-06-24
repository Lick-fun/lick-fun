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
  TokenDiversityData,
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

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Scoring input derivation                                                       */
/* ──────────────────────────────────────────────────────────────────────────────── */

/**
 * Compute volume-weighted graduation quality (0–1).
 * Each graduated token contributes min(volume / medianGradVolume, 1.0).
 * The result is the average across graduated tokens, capped at 1.0.
 */
export function computeQualityGradRate(
  tokens: TokenEntity[],
  medianGradVolume: bigint
): number {
  const graduated = tokens.filter((t) => t.graduated);
  if (graduated.length === 0 || medianGradVolume === 0n) return 0;
  const totalQuality = graduated.reduce((sum, t) => {
    const quality = Number(t.totalBuyVolume) / Number(medianGradVolume);
    return sum + Math.min(quality, 1.0);
  }, 0);
  return Math.min(totalQuality / graduated.length, 1.0);
}

/**
 * Compute average unique trader diversity across graduated tokens (0–1).
 * Each token contributes min(uniqueBuyerCount / diversityTarget, 1.0).
 */
export function computeAvgTraderDiversity(
  tokens: TokenEntity[],
  diversityTarget: number = 50
): number {
  const graduated = tokens.filter((t) => t.graduated);
  if (graduated.length === 0) return 0;
  const total = graduated.reduce((sum, t) => {
    return sum + Math.min((t.uniqueBuyerCount ?? 0) / diversityTarget, 1.0);
  }, 0);
  return total / graduated.length;
}

/**
 * Count tokens launched in the last 30 days.
 * `createdAt` is a unix timestamp as bigint.
 */
export function computeTokensInLast30Days(tokens: TokenEntity[]): number {
  const cutoff = BigInt(Math.floor(Date.now() / 1000) - 30 * 86400);
  return tokens.filter((t) => t.createdAt >= cutoff).length;
}

/**
 * Sum creator self-trade count across all tokens.
 * (creatorSellCount is incremented on each CurveSell where trader === creator.)
 */
export function computeCreatorSelfTradeCount(tokens: TokenEntity[]): number {
  return tokens.reduce((sum, t) => sum + (t.creatorSellCount ?? 0), 0);
}

/**
 * Build the per-token diversity data array needed by computeBadges.
 */
export function buildTokenDiversityData(
  tokens: TokenEntity[]
): TokenDiversityData[] {
  return tokens.map((t) => ({
    uniqueBuyerCount: t.uniqueBuyerCount ?? 0,
    totalBuyVolume: t.totalBuyVolume,
    graduated: t.graduated,
    ageAtGraduationDays:
      t.graduated && t.graduatedAt && t.createdAt
        ? Math.max(
            0,
            Math.floor(Number(t.graduatedAt - t.createdAt) / 86_400)
          )
        : 0,
    creatorSellCount: t.creatorSellCount ?? 0,
  }));
}