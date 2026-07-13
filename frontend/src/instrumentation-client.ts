/**
 * Sentry client-side (browser) instrumentation.
 *
 * Loaded automatically by Next.js on the client (App Router convention —
 * see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation).
 *
 * Entirely optional — if NEXT_PUBLIC_SENTRY_DSN is unset, Sentry.init() is
 * simply not called and this has zero effect (no network calls, no
 * behavior change beyond the SDK being present in the bundle).
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Keep this low — Lickfun.xyz wants error visibility, not full trace
    // sampling. Raise if you want deeper performance monitoring later.
    tracesSampleRate: 0.1,
    // Session Replay is off by default (privacy + cost) — enable explicitly
    // via replaysSessionSampleRate/replaysOnErrorSampleRate if wanted later.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "production",
    // Don't spam Sentry with noisy wallet-rejection / user-cancelled errors —
    // these are expected user behavior, not bugs.
    ignoreErrors: [
      "User rejected the request",
      "User denied transaction signature",
      "ConnectorNotConnectedError",
    ],
  });
}

// Instruments App Router client-side navigations for tracing (no-op if
// Sentry.init() above was skipped).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
