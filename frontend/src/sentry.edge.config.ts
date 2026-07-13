/**
 * Sentry Edge Runtime configuration.
 *
 * Loaded automatically by the Sentry Next.js SDK for code running on the
 * Edge runtime (middleware.ts, and any route/page explicitly opting into
 * `export const runtime = "edge"`, e.g. the dynamic OG image route).
 * Entirely optional — no-ops if SENTRY_DSN is unset.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "production",
  });
}
