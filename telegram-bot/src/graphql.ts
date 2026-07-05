/**
 * Lickfun Telegram Bot — GraphQL client
 * Polls the existing Envio HyperIndex endpoint for new Trade entities.
 * Same schema as the frontend (see frontend/src/lib/graphql/queries.ts).
 */
import { GraphQLClient, gql } from "graphql-request";
import { config } from "./config.js";

export const gqlClient = new GraphQLClient(config.graphql.url);

/* ─── Types ──────────────────────────────────────────────────────────────────── */

export interface TradeEntity {
  id: string; // `${txHash}-${logIndex}`
  token_id: string;
  trader: string;
  isBuy: boolean;
  amountIn: string; // BigInt as string
  amountOut: string;
  blockNumber: number;
  blockTimestamp: string;
  penaltyBps: number;
}

export interface TokenEntity {
  id: string;
  creator: string;
  name: string;
  symbol: string;
  curve: string;
  virtualMon: string;
  virtualTokens: string;
  targetTokenAmount: string;
  realMon: string;
  soldTokens: string;
  graduated: boolean;
  pairAddress: string | null;
  createdAt: string;
  graduatedAt: string | null;
  buyCount: number;
  sellCount: number;
  totalBuyVolume: string;
  totalSellVolume: string;
  uniqueBuyerCount: number;
  creatorSellCount: number;
}

export interface TokenBuyerIndexEntity {
  id: string; // `${tokenAddress}-${traderAddress}`
  token: string;
  buyer: string;
}

/* ─── Queries ────────────────────────────────────────────────────────────────── */

/**
 * Fetch the most recent N trades across all tokens, ordered by blockTimestamp desc.
 * Used to detect new trades since the last cursor.
 */
export const QUERY_RECENT_TRADES = gql`
  query RecentTrades($limit: Int!) {
    Trade(
      order_by: { blockTimestamp: desc }
      limit: $limit
    ) {
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
  }
`;

/**
 * Fetch a single token by id.
 */
export const QUERY_TOKEN_BY_ID = gql`
  query TokenById($id: String!) {
    Token_by_pk(id: $id) {
      id
      creator
      name
      symbol
      curve
      virtualMon
      virtualTokens
      targetTokenAmount
      realMon
      soldTokens
      graduated
      pairAddress
      createdAt
      graduatedAt
      buyCount
      sellCount
      totalBuyVolume
      totalSellVolume
      uniqueBuyerCount
      creatorSellCount
    }
  }
`;

/**
 * Count how many prior trades a given (token, trader) pair has.
 * If count > 0, the buyer is "returning" (not new).
 */
export const QUERY_TRADER_HISTORY_COUNT = gql`
  query TraderHistoryCount($tokenId: String!, $trader: String!) {
    Trade_aggregate(
      where: { token_id: { _eq: $tokenId }, trader: { _eq: $trader } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

export async function fetchRecentTrades(limit = 50): Promise<TradeEntity[]> {
  const data = await gqlClient.request<{ Trade: TradeEntity[] }>(
    QUERY_RECENT_TRADES,
    { limit },
  );
  return data.Trade;
}

export async function fetchToken(id: string): Promise<TokenEntity | null> {
  const data = await gqlClient.request<{ Token_by_pk: TokenEntity | null }>(
    QUERY_TOKEN_BY_ID,
    { id: id.toLowerCase() },
  );
  return data.Token_by_pk;
}

export async function fetchTraderHistoryCount(
  tokenId: string,
  trader: string,
): Promise<number> {
  const data = await gqlClient.request<{
    Trade_aggregate: { aggregate: { count: number } };
  }>(QUERY_TRADER_HISTORY_COUNT, {
    tokenId: tokenId.toLowerCase(),
    trader: trader.toLowerCase(),
  });
  return data.Trade_aggregate.aggregate.count;
}
