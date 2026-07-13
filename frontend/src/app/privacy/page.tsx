import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Lickfun.xyz",
  description:
    "Privacy Policy for Lickfun.xyz, a social-first token launchpad on Monad.",
  alternates: {
    canonical: "https://lickfun.xyz/privacy",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const LAST_UPDATED = "July 13, 2026";

/**
 * Privacy Policy — placeholder legal copy.
 *
 * ⚠️ DRAFT — NOT YET REVIEWED BY LEGAL COUNSEL. Update the specifics below
 * (sub-processor list, retention periods, data-subject-rights process) to
 * match your actual configuration before publishing, and have counsel
 * confirm applicability of GDPR/CCPA/etc. for your target jurisdictions.
 *
 * The description of what's actually collected below is accurate as of
 * this writing based on the current codebase:
 *  - Wallet addresses (public blockchain data, plus stored alongside
 *    profile customization: display name, avatar, social links).
 *  - Uploaded images (token/profile avatars) stored in a Storj bucket.
 *  - Standard server request metadata (IP address, for rate limiting only).
 *  - Optional analytics (Plausible) and error monitoring (Sentry), both of
 *    which only activate if the respective site owner has configured them.
 * No email addresses, names, or other traditional PII are collected — the
 * Platform only ever asks you to connect a wallet.
 */
export default function PrivacyPage() {
  return (
    <div className="bg-figma-bg min-h-screen px-5 pb-20">
      <div className="max-w-3xl mx-auto pt-8">
        <h1 className="text-figma-3xl text-figma-white font-bold mb-2">
          Privacy Policy
        </h1>
        <p className="text-figma-sm text-figma-muted mb-1">
          Last updated: {LAST_UPDATED}
        </p>
        <p className="text-figma-sm text-figma-muted mb-10 italic">
          Draft — pending legal review. This page is a placeholder and does
          not yet constitute a finalized privacy notice.
        </p>

        <div className="space-y-8 text-figma-md text-figma-muted leading-relaxed">
          <section>
            <h2 className="text-figma-xl text-figma-white font-bold mb-3">
              1. Overview
            </h2>
            <p>
              Lickfun.xyz (&quot;we&quot;, &quot;us&quot;) is a non-custodial
              front-end for smart contracts deployed on the Monad
              blockchain. We are intentionally minimal about what we
              collect: we do not require email addresses, phone numbers, or
              government identification to use the Platform. This policy
              explains what limited data we do collect and how it is used.
            </p>
          </section>

          <section>
            <h2 className="text-figma-xl text-figma-white font-bold mb-3">
              2. Information We Collect
            </h2>
            <h3 className="text-figma-md text-figma-white font-semibold mt-4 mb-2">
              On-chain data (public)
            </h3>
            <p>
              Your wallet address and all transactions you submit (token
              creation, trades, votes, claims) are recorded permanently and
              publicly on the Monad blockchain. This data is not controlled
              by us and cannot be deleted — it is inherent to how public
              blockchains work.
            </p>
            <h3 className="text-figma-md text-figma-white font-semibold mt-4 mb-2">
              Profile customization (optional, off-chain)
            </h3>
            <p>
              If you choose to customize your profile, we store your wallet
              address alongside a display name, avatar image, and any
              social links (X/Twitter, website, Telegram) you provide. This
              is entirely optional and gated behind a wallet-signed message
              proving you own the address — we never write profile data on
              your behalf. Avatar images and token images you upload are
              stored on Storj, a decentralized S3-compatible storage
              provider.
            </p>
            <h3 className="text-figma-md text-figma-white font-semibold mt-4 mb-2">
              Server logs
            </h3>
            <p>
              Our hosting infrastructure automatically logs standard request
              metadata (IP address, timestamp, requested path) for the
              purpose of rate-limiting abuse and diagnosing technical
              issues. These logs are not used for advertising or sold to
              third parties.
            </p>
            <h3 className="text-figma-md text-figma-white font-semibold mt-4 mb-2">
              Analytics and error monitoring (optional)
            </h3>
            <p>
              We may use privacy-respecting analytics (e.g. Plausible, which
              does not use cookies or collect personal data) to understand
              aggregate traffic patterns, and an error-monitoring service
              (Sentry) to detect and fix bugs. Error reports may incidentally
              include your wallet address if it appeared in application
              state at the time of the error, and are used solely for
              debugging.
            </p>
          </section>

          <section>
            <h2 className="text-figma-xl text-figma-white font-bold mb-3">
              3. How We Use Information
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To operate and display the Platform&apos;s core features (trading UI, profiles, leaderboards, reputation scores);</li>
              <li>To prevent abuse via rate limiting and file-upload validation;</li>
              <li>To diagnose and fix technical issues;</li>
              <li>To understand aggregate usage trends and improve the Platform.</li>
            </ul>
            <p className="mt-2">
              We do not sell personal data, and we do not use profile data
              for targeted advertising.
            </p>
          </section>

          <section>
            <h2 className="text-figma-xl text-figma-white font-bold mb-3">
              4. Third-Party Services
            </h2>
            <p>
              The Platform relies on third-party infrastructure, including
              blockchain RPC providers, a hosted GraphQL indexer, Storj
              object storage, and optionally Sentry and Plausible/analytics
              providers. Each operates under its own privacy policy; we
              encourage you to review them if you have specific concerns.
            </p>
          </section>

          <section>
            <h2 className="text-figma-xl text-figma-white font-bold mb-3">
              5. Data Retention
            </h2>
            <p>
              On-chain data is permanent and cannot be deleted by us or
              anyone else. Off-chain profile data (display name, avatar,
              social links) is retained until you update or clear it, or
              until you contact us to request removal — see Section 7.
            </p>
          </section>

          <section>
            <h2 className="text-figma-xl text-figma-white font-bold mb-3">
              6. Cookies
            </h2>
            <p>
              The Platform itself does not set tracking cookies. Your wallet
              browser extension or connection provider (e.g. WalletConnect,
              MetaMask) may set its own cookies or local storage entries
              under its own privacy policy.
            </p>
          </section>

          <section>
            <h2 className="text-figma-xl text-figma-white font-bold mb-3">
              7. Your Rights and Requests
            </h2>
            <p>
              You may request deletion of any off-chain profile data
              associated with your wallet address (display name, avatar,
              social links) by contacting us through the channels below.
              Note that we cannot delete or alter any data that has been
              recorded on the Monad blockchain, as it is outside of our
              control.
            </p>
          </section>

          <section>
            <h2 className="text-figma-xl text-figma-white font-bold mb-3">
              8. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. Material
              changes will be reflected by updating the &quot;Last
              updated&quot; date above.
            </p>
          </section>

          <section>
            <h2 className="text-figma-xl text-figma-white font-bold mb-3">
              9. Contact
            </h2>
            <p>
              Questions or data-removal requests can be sent via{" "}
              <a
                href="https://x.com/_Lickfun"
                target="_blank"
                rel="noopener noreferrer"
                className="text-figma-green hover:underline"
              >
                X / Twitter
              </a>{" "}
              or{" "}
              <a
                href="https://t.me/Lick_fun"
                target="_blank"
                rel="noopener noreferrer"
                className="text-figma-green hover:underline"
              >
                Telegram
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
