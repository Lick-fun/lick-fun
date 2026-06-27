/**
 * Next.js Edge Middleware — rate limiting for all /api/* routes (P0-3).
 *
 * Uses a simple in-memory sliding-window counter keyed by client IP.
 * Limits:
 *   - Upload routes (upload-token, upload-profile): 10 requests / 60s per IP
 *   - Write routes (register-profile, register-metadata): 20 requests / 60s per IP
 *   - All other /api/* routes: 60 requests / 60s per IP
 *
 * Note: Edge middleware state is per-instance (not shared across serverless replicas).
 * For a distributed deployment, replace this with Upstash Redis ratelimit.
 * For the current single-instance Next.js self-hosted setup this is sufficient.
 */

import { type NextRequest, NextResponse } from "next/server";

// ─── Config ──────────────────────────────────────────────────────────────────

const WINDOW_MS = 60_000; // 1 minute

const LIMITS: Record<string, number> = {
  "/api/upload-token":    10,
  "/api/upload-profile":  10,
  "/api/register-profile": 20,
  "/api/register-metadata": 20,
};
const DEFAULT_LIMIT = 60;

// ─── In-memory store ─────────────────────────────────────────────────────────

type Entry = { count: number; windowStart: number };
const store = new Map<string, Entry>();

function isRateLimited(ip: string, pathname: string): boolean {
  const limit = LIMITS[pathname] ?? DEFAULT_LIMIT;
  const now = Date.now();
  const key = `${ip}:${pathname}`;
  const entry = store.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    // New window
    store.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  if (entry.count > limit) return true;
  return false;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only rate-limit API routes
  if (!pathname.startsWith("/api/")) return NextResponse.next();

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip, pathname)) {
    return NextResponse.json(
      { error: "Too many requests — please slow down" },
      {
        status: 429,
        headers: {
          "Retry-After": "60",
          "X-RateLimit-Limit": String(LIMITS[pathname] ?? DEFAULT_LIMIT),
        },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
