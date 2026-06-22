import {
  Coins,
  TrendingUp,
  Shield,
  Award,
  CheckCircle,
  ArrowRight,
  Zap,
  BarChart3,
} from "lucide-react";

export default function HowItWorksPage() {
  return (
    <div className="bg-figma-bg min-h-screen pl-sidebar pr-5 pb-20">
      {/* Page Header */}
      <div className="pt-8 mb-12 text-center max-w-3xl mx-auto">
        <h1 className="text-figma-3xl text-figma-white font-bold mb-3">
          How Lick.fun Works
        </h1>
        <p className="text-figma-md text-figma-muted">
          A social-first token launchpad on Monad. Earn reputation, launch tokens,
          and let the community decide what graduates.
        </p>
      </div>

      {/* What is Lick.fun */}
      <section className="rounded-card border border-figma-card bg-figma-card p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-card gradient-lick flex items-center justify-center text-xl">
            🦎
          </div>
          <h2 className="text-figma-2xl text-figma-white font-bold">What is Lick.fun?</h2>
        </div>
        <p className="text-figma-md text-figma-muted leading-relaxed mb-4">
          Lick.fun is a meme lake on liquidity fun. It&apos;s the first social-first token
          launchpad on Monad where creators earn reputation by launching successful
          tokens. Tokens use a constant-product bonding curve — buy pressure raises
          price, and when a token hits 100K MON raised, it graduates to a full DEX pool.
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="rounded-pill bg-figma-surface p-4 text-center">
            <div className="text-figma-lg text-figma-green font-bold mb-1">Launch</div>
            <div className="text-figma-sm text-figma-muted">
              Create a token with a single click on the bonding curve
            </div>
          </div>
          <div className="rounded-pill bg-figma-surface p-4 text-center">
            <div className="text-figma-lg text-figma-green font-bold mb-1">Trade</div>
            <div className="text-figma-sm text-figma-muted">
              Buy and sell on the curve — price rises with demand
            </div>
          </div>
          <div className="rounded-pill bg-figma-surface p-4 text-center">
            <div className="text-figma-lg text-figma-green font-bold mb-1">Graduate</div>
            <div className="text-figma-sm text-figma-muted">
              Hit 100K MON → token migrates to a full DEX pool
            </div>
          </div>
        </div>
      </section>

      {/* Bonding Curve */}
      <section className="rounded-card border border-figma-card bg-figma-card p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-7 h-7 text-figma-green" />
          <h2 className="text-figma-2xl text-figma-white font-bold">Bonding Curve</h2>
        </div>
        <p className="text-figma-md text-figma-muted leading-relaxed mb-4">
          Lick.fun uses a constant-product market maker (CPMM) for pricing:
        </p>
        <div className="rounded-pill bg-figma-surface p-4 mb-4 font-mono text-figma-sm text-figma-white text-center">
          (80,000 + realMon) × (477,000,000 - soldTokens) = k
        </div>
        <div className="space-y-3 text-figma-sm text-figma-muted">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-figma-green/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-figma-green text-figma-xs font-bold">1</span>
            </div>
            <span>
              Virtual reserves start at 80,000 MON and 477,000,000 tokens to create
              a smooth price curve.
            </span>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-figma-green/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-figma-green text-figma-xs font-bold">2</span>
            </div>
            <span>
              Buying pushes realMon up and soldTokens down, increasing the price
              exponentially as tokens become scarce.
            </span>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-figma-green/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-figma-green text-figma-xs font-bold">3</span>
            </div>
            <span>
              Selling pushes realMon down and tokens back into the curve,
              decreasing the price.
            </span>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-figma-green-soft/10 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle className="w-4 h-4 text-figma-green-soft" />
            </div>
            <span>
              When realMon hits 100,000 MON, the token graduates and liquidity
              migrates to a full DEX pool.
            </span>
          </div>
        </div>
      </section>

      {/* Reputation System */}
      <section className="rounded-card border border-figma-card bg-figma-card p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Award className="w-7 h-7 text-figma-green" />
          <h2 className="text-figma-2xl text-figma-white font-bold">Reputation System</h2>
        </div>
        <p className="text-figma-md text-figma-muted leading-relaxed mb-6">
          Every creator builds a reputation score (0–100) based on their launch
          history. Higher reputation unlocks perks and builds trust with traders.
        </p>

        {/* Tiers */}
        <h3 className="text-figma-md text-figma-white font-semibold mb-3">Tiers</h3>
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-pill border border-figma-card-alt bg-figma-surface p-4 text-center">
            <div className="text-figma-lg text-figma-muted font-bold">Starter</div>
            <div className="text-figma-xs text-figma-muted">0–29</div>
            <div className="text-figma-xs text-figma-muted mt-1">New creator</div>
          </div>
          <div className="rounded-pill border border-figma-card-alt bg-figma-surface p-4 text-center">
            <div className="text-figma-lg text-figma-muted font-bold">Established</div>
            <div className="text-figma-xs text-figma-muted">30–69</div>
            <div className="text-figma-xs text-figma-muted mt-1">Proven track record</div>
          </div>
          <div className="rounded-pill border border-figma-green/30 bg-figma-green/5 p-4 text-center">
            <div className="text-figma-lg text-figma-green font-bold">Verified</div>
            <div className="text-figma-xs text-figma-muted">70–100</div>
            <div className="text-figma-xs text-figma-muted mt-1">Top-tier trusted</div>
          </div>
        </div>

        {/* Badges */}
        <h3 className="text-figma-md text-figma-white font-semibold mb-3">Badges</h3>
        <div className="grid sm:grid-cols-2 gap-2 text-figma-sm">
          <div className="flex items-center gap-2 p-2 rounded-pill bg-figma-surface">
            <span>🪙</span>
            <span>First Token</span>
            <span className="text-figma-xs text-figma-muted ml-auto">Launch milestone</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-pill bg-figma-surface">
            <span>🎓</span>
            <span>Triple Graduate</span>
            <span className="text-figma-xs text-figma-muted ml-auto">3 graduates</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-pill bg-figma-surface">
            <span>🏆</span>
            <span>Deca Graduate</span>
            <span className="text-figma-xs text-figma-muted ml-auto">10 graduates</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-pill bg-figma-surface">
            <span>🛡️</span>
            <span>Locked & Honest</span>
            <span className="text-figma-xs text-figma-muted ml-auto">No rug history</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-pill bg-figma-surface">
            <span>📊</span>
            <span>Volume Maker</span>
            <span className="text-figma-xs text-figma-muted ml-auto">100K+ MON volume</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-pill bg-figma-surface">
            <span>👑</span>
            <span>Verified Founder</span>
            <span className="text-figma-xs text-figma-muted ml-auto">Score 70+</span>
          </div>
        </div>
      </section>

      {/* Fee Structure */}
      <section className="rounded-card border border-figma-card bg-figma-card p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Coins className="w-7 h-7 text-figma-green" />
          <h2 className="text-figma-2xl text-figma-white font-bold">Fee Structure</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-figma-sm">
            <thead>
              <tr className="border-b border-figma-surface">
                <th className="text-left py-3 px-4 text-figma-muted font-medium">Fee</th>
                <th className="text-left py-3 px-4 text-figma-muted font-medium">Rate</th>
                <th className="text-left py-3 px-4 text-figma-muted font-medium">Recipient</th>
                <th className="text-left py-3 px-4 text-figma-muted font-medium">Applied On</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-figma-surface">
                <td className="py-3 px-4 text-figma-white">Protocol Fee</td>
                <td className="py-3 px-4 font-mono text-figma-muted">1%</td>
                <td className="py-3 px-4 text-figma-muted">Protocol Treasury</td>
                <td className="py-3 px-4 text-figma-muted">Every buy & sell</td>
              </tr>
              <tr className="border-b border-figma-surface">
                <td className="py-3 px-4 text-figma-white">Creator Fee</td>
                <td className="py-3 px-4 font-mono text-figma-muted">1%</td>
                <td className="py-3 px-4 text-figma-muted">Token Creator</td>
                <td className="py-3 px-4 text-figma-muted">Every buy & sell</td>
              </tr>
              <tr className="border-b border-figma-surface">
                <td className="py-3 px-4 text-figma-white">Anti-Sniping Penalty</td>
                <td className="py-3 px-4 font-mono text-figma-muted">0–80%</td>
                <td className="py-3 px-4 text-figma-muted">Protocol Treasury</td>
                <td className="py-3 px-4 text-figma-muted">First 7 blocks</td>
              </tr>
              <tr className="border-b border-figma-surface">
                <td className="py-3 px-4 text-figma-white">Prediction Fee</td>
                <td className="py-3 px-4 font-mono text-figma-muted">2%</td>
                <td className="py-3 px-4 text-figma-muted">Protocol Treasury</td>
                <td className="py-3 px-4 text-figma-muted">Losing pool</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-figma-white font-medium">Total Trade Fee</td>
                <td className="py-3 px-4 font-mono font-bold text-figma-green">2%</td>
                <td className="py-3 px-4 text-figma-muted" colSpan={2}>
                  Split equally between protocol & creator
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Creator Checklist */}
      <section className="rounded-card border border-figma-card bg-figma-card p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-7 h-7 text-figma-green" />
          <h2 className="text-figma-2xl text-figma-white font-bold">Creator Checklist</h2>
        </div>
        <div className="space-y-4">
          {[
            "Connect your wallet to Monad testnet or mainnet",
            "Choose a token name, symbol, and total supply",
            "Pre-buy your own token (proves skin in the game)",
            "Your token deploys on the bonding curve — trading begins",
            "Share your token link — the community starts buying",
            "RealMon climbs toward 100K — if hit, token graduates",
            "Graduation: liquidity migrates to a DEX pool",
            "Your reputation score updates with each launch outcome",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-figma-green/10 flex items-center justify-center shrink-0">
                <span className="text-figma-green text-figma-sm font-bold">{i + 1}</span>
              </div>
              <span className="text-figma-sm text-figma-muted pt-1.5">{step}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center mb-20">
        <h2 className="text-figma-2xl text-figma-white font-bold mb-4">Ready to launch?</h2>
        <p className="text-figma-md text-figma-muted mb-6">
          Connect your wallet and become a creator on Lick.fun.
        </p>
        <a href="/create" className="btn-lick inline-flex items-center gap-2 text-figma-md">
          Get Started
          <ArrowRight className="w-5 h-5" />
        </a>
      </section>
    </div>
  );
}