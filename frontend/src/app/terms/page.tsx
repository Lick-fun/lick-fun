import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Lickfun.xyz",
  description:
    "Terms of Service for Lickfun.xyz, a social-first token launchpad on Monad.",
  alternates: {
    canonical: "https://lickfun.xyz/terms",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const LAST_UPDATED = "July 13, 2026";

/**
 * Terms of Service — placeholder legal copy.
 *
 * ⚠️ DRAFT — NOT YET REVIEWED BY LEGAL COUNSEL. Do not rely on this text as
 * a final, binding agreement. Replace with counsel-reviewed language before
 * treating it as enforceable, especially the sections on risk disclosure,
 * limitation of liability, and dispute resolution/governing law — these
 * carry the most legal weight for a DeFi/token-launchpad product and are
 * jurisdiction-sensitive.
 */
export default function TermsPage() {
  return (
    <div className="bg-figma-bg min-h-screen px-5 pb-20">
      <div className="max-w-3xl mx-auto pt-8">
        <h1 className="text-figma-3xl text-figma-white font-bold mb-2">
          Terms of Service
        </h1>
        <p className="text-figma-sm text-figma-muted mb-1">
          Last updated: {LAST_UPDATED}
        </p>
        <p className="text-figma-sm text-figma-muted mb-10 italic">
          Draft — pending legal review. This page is a placeholder and does
          not yet constitute a finalized legal agreement.
        </p>

        <div className="space-y-8 text-figma-md text-figma-muted leading-relaxed">
          <section>
            <h2 className="text-figma-xl text-figma-white font-bold mb-3">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using Lickfun.xyz (the &quot;Platform&quot;),
              you agree to be bound by these Terms of Service
              (&quot;Terms&quot;). If you do not agree to these Terms, do not
              use the Platform. The Platform is a front-end interface to
              smart contracts deployed on the Monad blockchain and does not
              custody user funds at any point.
            </p>
          </section>

          <section>
            <h2 className="text-figma-xl text-figma-white font-bold mb-3">
              2. Nature of the Platform
            </h2>
            <p>
              Lickfun.xyz provides a user interface for interacting with
              permissionless, non-custodial smart contracts that implement a
              bonding-curve token launchpad, an automated market maker
              (&quot;DEX&quot;), and a prediction market. All trades,
              token creations, and liquidity migrations are executed
              on-chain and are irreversible once confirmed. We do not
              control, endorse, or take responsibility for any token created
              by users of the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-figma-xl text-figma-white font-bold mb-3">
              3. Risk Disclosure
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Digital assets, including tokens created on the Platform,
                are highly volatile and can lose all value. You may lose
                some or all of the funds you use to interact with the
                Platform.
              </li>
              <li>
                Tokens launched on the Platform are created by independent,
                unaffiliated third parties. We do not vet, audit, or
                guarantee the legitimacy, value, or future performance of
                any token.
              </li>
              <li>
                Smart contracts, while audited, may contain undiscovered
                vulnerabilities. Interacting with any blockchain protocol
                carries inherent technical risk, including but not limited
                to bugs, exploits, network congestion, and validator/chain
                downtime.
              </li>
              <li>
                Reputation scores displayed on the Platform are computed
                from historical on-chain behavior and are provided for
                informational purposes only. A high reputation score is not
                a guarantee of future performance or trustworthiness.
              </li>
              <li>
                You are solely responsible for evaluating the risks of any
                transaction before submitting it, including gas fees,
                slippage, and price impact.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-figma-xl text-figma-white font-bold mb-3">
              4. Eligibility
            </h2>
            <p>
              You must be able to form a legally binding contract to use the
              Platform. You represent that you are not located in, or a
              resident of, any jurisdiction where use of the Platform would
              be illegal or where you are prohibited from accessing
              blockchain-based financial services under applicable law,
              including sanctions regimes.
            </p>
          </section>

          <section>
            <h2 className="text-figma-xl text-figma-white font-bold mb-3">
              5. Wallets and Self-Custody
            </h2>
            <p>
              The Platform requires you to connect a third-party
              self-custodial wallet. You are solely responsible for
              safeguarding your private keys and seed phrases. We never have
              access to your wallet&apos;s private keys and cannot recover
              lost funds, reverse transactions, or assist with wallet
              recovery.
            </p>
          </section>

          <section>
            <h2 className="text-figma-xl text-figma-white font-bold mb-3">
              6. Fees
            </h2>
            <p>
              Token creation and trading on the Platform involve on-chain
              fees as described on the{" "}
              <Link href="/how-it-works" className="text-figma-green hover:underline">
                How It Works
              </Link>{" "}
              page. Fee splits are configured by each token&apos;s creator at
              launch and enforced by smart contract; we do not manually
              adjust or waive on-chain fees.
            </p>
          </section>

          <section>
            <h2 className="text-figma-xl text-figma-white font-bold mb-3">
              7. Prohibited Conduct
            </h2>
            <p>You agree not to use the Platform to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Violate any applicable law or regulation;</li>
              <li>
                Engage in market manipulation, wash trading, or fraud
                against other users;
              </li>
              <li>
                Upload content (images, names, descriptions) that is
                unlawful, infringing, or that you do not have the right to
                use;
              </li>
              <li>
                Interfere with or disrupt the Platform&apos;s availability
                or integrity, including via automated abuse of upload or
                registration endpoints.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-figma-xl text-figma-white font-bold mb-3">
              8. No Investment Advice
            </h2>
            <p>
              Nothing on the Platform constitutes financial, investment,
              legal, or tax advice. Market data, reputation scores, and
              statistics are provided for informational purposes only.
            </p>
          </section>

          <section>
            <h2 className="text-figma-xl text-figma-white font-bold mb-3">
              9. Limitation of Liability
            </h2>
            <p>
              To the fullest extent permitted by law, the Platform and its
              operators are provided &quot;as is&quot; and &quot;as
              available&quot; without warranties of any kind. We shall not
              be liable for any indirect, incidental, special,
              consequential, or punitive damages, or any loss of profits or
              digital assets, arising from your use of the Platform or any
              smart contract it interacts with.
            </p>
          </section>

          <section>
            <h2 className="text-figma-xl text-figma-white font-bold mb-3">
              10. Changes to These Terms
            </h2>
            <p>
              We may update these Terms from time to time. Continued use of
              the Platform after changes are posted constitutes acceptance
              of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-figma-xl text-figma-white font-bold mb-3">
              11. Contact
            </h2>
            <p>
              Questions about these Terms can be sent via the contact
              channels listed on our{" "}
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
