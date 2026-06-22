import { GraphQLClient } from "graphql-request";

const DEFAULT_ENVIO_URL = "http://localhost:8080/v1/graphql";

export function getGraphQLClient(): GraphQLClient {
  const url = process.env.NEXT_PUBLIC_ENVIO_GRAPHQL_URL ?? DEFAULT_ENVIO_URL;
  return new GraphQLClient(url);
}
