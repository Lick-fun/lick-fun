"use client";

/**
 * Root error boundary — catches any error thrown during rendering anywhere
 * in the App Router tree that isn't already caught by a nested error.tsx.
 * Reports to Sentry (no-op if NEXT_PUBLIC_SENTRY_DSN is unset) and shows a
 * minimal branded fallback instead of Next.js's default error screen.
 *
 * See https://nextjs.org/docs/app/api-reference/file-conventions/error#global-errorjs
 */
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="bg-figma-bg text-figma-white font-sans antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-figma-muted max-w-md">
            An unexpected error occurred. Our team has been notified — please
            try again.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-figma-green px-4 py-2 text-sm font-semibold text-figma-bg transition-opacity hover:opacity-90"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
