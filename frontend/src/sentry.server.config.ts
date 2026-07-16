/**
 * Sentry server-side (Node.js runtime) configuration.
 *
 * Loaded automatically by the Sentry Next.js SDK for API routes, server
 * components, and generateMetadata() functions running on the Node runtime.
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
