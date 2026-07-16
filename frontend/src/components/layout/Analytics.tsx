import Script from "next/script";

/**
 * Plausible Analytics — privacy-friendly, cookie-less page-view analytics.
 *
 * Entirely optional: renders nothing unless NEXT_PUBLIC_PLAUSIBLE_DOMAIN is
 * set. Plausible doesn't use cookies or collect personal data, so no
 * cookie-consent banner is required for it specifically — see
 * https://plausible.io/data-policy.
 *
 * Self-hosting: if you run your own Plausible instance instead of
 * plausible.io, set NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL to your instance's
 * script URL (defaults to the plausible.io-hosted script).
 */
export function Analytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;

  const scriptUrl =
    process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL ||
    "https://plausible.io/js/script.js";

  return (
    <Script
      defer
      data-domain={domain}
      src={scriptUrl}
      strategy="afterInteractive"
    />
  );
}
