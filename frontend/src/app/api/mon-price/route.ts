/**
 * GET /api/mon-price
 *
 * Server-side proxy for the MON/USD price, backed by CoinGecko's free public
 * API. Exists so the browser never calls CoinGecko directly (see
 * lib/hooks/useMonUsdPrice.ts) — every visitor hitting CoinGecko individually
 * doesn't scale under marketing traffic and risks tripping CoinGecko's rate
 * limit for the whole site at once.
 *
 * Caching: `revalidate = 120` means Next.js's fetch cache reuses the upstream
 * response for up to 2 minutes across ALL visitors and serverless instances
 * sharing the same cache — so no matter how much traffic hits this route, at
 * most one real CoinGecko request goes out every ~2 minutes. That's ~720
 * requests/month at worst, comfortably inside CoinGecko's free tier (no paid
 * plan needed just to keep this ticker alive).
 *
 * Response: { price: number | null }
 */

import { NextResponse } from "next/server";

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=monad&vs_currencies=usd";

// Next.js Data Cache: dedupes + caches this fetch for 120s server-side,
// shared across all requests/instances (unlike client `staleTime`, which is
// per-browser-tab).
const REVALIDATE_SECONDS = 120;

export async function GET() {
  try {
    const res = await fetch(COINGECKO_URL, {
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!res.ok) {
      return NextResponse.json(
        { price: null },
        { headers: { "Cache-Control": "public, max-age=60" } }
      );
    }

    const data = await res.json();
    const price = data?.monad?.usd;
    const value = typeof price === "number" && price > 0 ? price : null;

    return NextResponse.json(
      { price: value },
      {
        headers: {
          // Let CDN/browser also cache briefly — belt-and-suspenders with the
          // Next.js fetch-level revalidate above.
          "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { price: null },
      { headers: { "Cache-Control": "public, max-age=30" } }
    );
  }
}
