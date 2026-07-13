/**
 * Next.js instrumentation hook — registers the Sentry SDK for the Node.js
 * and Edge runtimes (server components, API routes, middleware, and the
 * edge-runtime OG image route).
 *
 * See https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 * and https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
 *
 * Both imported config files are no-ops if their DSN env var is unset, so
 * this hook is always safe to run regardless of whether Sentry is configured.
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Capture errors from Server Components, middleware, and route handlers.
// No-op when Sentry.init() was never called (DSN unset).
export const onRequestError = Sentry.captureRequestError;
