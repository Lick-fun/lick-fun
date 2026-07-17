/**
 * Server-side ERC-20 name/symbol resolver.
 *
 * The Envio indexer intentionally stores empty strings for Token.name and
 * Token.symbol (context.client.readContract is not available in Envio Cloud
 * deployments — see indexer/src/EventHandlers.ts). The client-side token page
 * works around this by calling name()/symbol() via wagmi on-chain reads
 * (useTokenMeta in lib/hooks/useData.ts).
 *
 * Server-rendered metadata (generateMetadata in layout.tsx, and the OG image
 * route) has no access to that client-side resolution, so without this helper
 * every token page's <title> and OG/share image permanently show the "???" /
 * "Unnamed Token" fallback — even though the token has a perfectly good
 * on-chain name/symbol.
 *
 * This helper mirrors the RPC pattern already used in
 * frontend/src/app/api/trades/[curve]/route.ts: a plain viem publicClient
 * (no wagmi/React dependency) reading directly from the configured Monad RPC.
 */

import { createPublicClient, http, defineChain } from "viem";

// Server-side code (no browser Origin header) must NOT use an
// origin-restricted Alchemy key — Alchemy's domain allowlist only inspects
// the Origin/Referer header, which Node.js server requests never send, so a
// browser-restricted key gets rejected here with "Unspecified origin not on
// whitelist". Prefer a dedicated, unrestricted server key (MONAD_RPC_URL);
// fall back to the public browser var only if no server override is set.
const RPC_URL =
  process.env.MONAD_RPC_URL ||
  process.env.NEXT_PUBLIC_MONAD_RPC ||
  "https://rpc.monad.xyz";

const monadMainnet = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

let _client: ReturnType<typeof createPublicClient> | null = null;

function getClient() {
  if (_client) return _client;
  _client = createPublicClient({
    chain: monadMainnet,
    transport: http(RPC_URL),
  });
  return _client;
}

const ERC20_NAME_SYMBOL_ABI = [
  { type: "function", name: "name", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
  { type: "function", name: "symbol", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
] as const;

/**
 * Resolves a token's name/symbol, preferring the indexer-supplied values and
 * falling back to a direct on-chain read when either is blank. Always
 * returns a usable display value (never throws) — on RPC failure it falls
 * back to a truncated address / "???" just like the client-side hook does.
 */
export async function resolveTokenMeta(
  tokenId: string,
  indexerName: string | null | undefined,
  indexerSymbol: string | null | undefined
): Promise<{ name: string; symbol: string }> {
  const hasName = !!indexerName && indexerName.trim().length > 0;
  const hasSymbol = !!indexerSymbol && indexerSymbol.trim().length > 0;

  if (hasName && hasSymbol) {
    return { name: indexerName!.trim(), symbol: indexerSymbol!.trim() };
  }

  try {
    const client = getClient();
    const address = tokenId as `0x${string}`;
    const [name, symbol] = await Promise.all([
      hasName
        ? Promise.resolve(indexerName!.trim())
        : client.readContract({
            address,
            abi: ERC20_NAME_SYMBOL_ABI,
            functionName: "name",
          }),
      hasSymbol
        ? Promise.resolve(indexerSymbol!.trim())
        : client.readContract({
            address,
            abi: ERC20_NAME_SYMBOL_ABI,
            functionName: "symbol",
          }),
    ]);

    return {
      name: (name as string) || `${tokenId.slice(0, 8)}`,
      symbol: (symbol as string) || "???",
    };
  } catch (err) {
    console.error(`[resolveTokenMeta] on-chain read failed for ${tokenId}:`, err);
    return {
      name: hasName ? indexerName!.trim() : tokenId.slice(0, 8),
      symbol: hasSymbol ? indexerSymbol!.trim() : "???",
    };
  }
}
