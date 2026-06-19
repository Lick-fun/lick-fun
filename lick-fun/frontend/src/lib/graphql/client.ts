import { GraphQLClient } from "graphql-request";

const DEFAULT_ENVIO_URL = "http://localhost:8080/v1/graphql";

let client: GraphQLClient | null = null;

export function getGraphQLClient(): GraphQLClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_ENVIO_GRAPHQL_URL ?? DEFAULT_ENVIO_URL;
  client = new GraphQLClient(url);
  return client;
}