import {
  Coins,
  TrendingUp,
  Shield,
  Award,
  CheckCircle,
  ArrowRight,
  Zap,
  Users,
  BarChart3,
  Wallet,
} from "lucide-react";

export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold mb-3">How Lick.fun Works</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          A social-first token launchpad on Monad. Earn reputation, launch tokens,
          and let the community decide what graduates.
        </p>
      </div>

      {/* What is Lick.fun */}
      <section className="rounded-xl border border-border bg-card p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg gradient-lick flex items-center justify-center">
            <span className="text-xl">🦎</span>
          </div>
          <h2 className="text-2xl font-bold">What is Lick.fun?</h2>
        </div>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Lick.fun is a meme lake on liquidity fun. It&apos;s the first social-first token
          launchpad on Monad where creators earn reputation by launching successful
          tokens. Tokens use a constant-product bonding curve — buy pressure raises
          price, and when a token hits 100K MON raised, it graduates to a full DEX pool.
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="rounded-lg bg-secondary p-4 text-center">
            <div className="text-lick-orange-light font-bold text-lg mb-1">Launch</div>
            <div className="text-sm text-muted-foreground">
              Create a token with a single click on the bonding curve
            </div>
          </div>
          <div className="rounded-lg bg-secondary p-4 text-center">
            <div className="text-lick-orange-light font-bold text-lg mb-1">Trade</div>
            <div className="text-sm text-muted-foreground">
              Buy and sell on the curve — price rises with demand
            </div>
          </div>
          <div className="rounded-lg bg-secondary p-4 text-center">
            <div className="text-lick-orange-light font-bold text-lg mb-1">Graduate</div>
            <div className="text-sm text-muted-foreground">
              Hit 100K MON → token migrates to a full DEX pool
            </div>
          </div>
        </div>
      </section>

      {/* Bonding Curve */}
      <section className="rounded-xl border border-border bg-card p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-7 h-7 text-lick-orange-light" />
          <h2 className="text-2xl font-bold">Bonding Curve</h2>
        </div>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Lick.fun uses a constant-product market maker (CPMM) for pricing:
        </p>
        <div className="rounded-lg bg-secondary p-4 mb-4 font-mono text-sm text-center">
          (80,000 + realMon) × (477,000,000 - soldTokens) = k
        </div>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-lick-orange/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-lick-orange-light text-xs font-bold">1</span>
            </div>
            <span>
              Virtual reserves start at 80,000 MON and 477,000,000 tokens to create
              a smooth price curve.
            </span>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-lick-orange/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-lick-orange-light text-xs font-bold">2</span>
            </div>
            <span>
              Buying pushes realMon up and soldTokens down, increasing the price
              exponentially as tokens become scarce.
            </span>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-lick-orange/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-lick-orange-light text-xs font-bold">3</span>
            </div>
            <span>
              Selling pushes realMon down and tokens back into the curve,
              decreasing the price.
            </span>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle className="w-4 h-4 text-green-400" />
            </div>
            <span>
              When realMon hits 100,000 MON, the token graduates and liquidity
              migrates to a full DEX pool.
            </span>
          </div>
        </div>
      </section>

      {/* Reputation System */}
      <section className="rounded-xl border border-border bg-card p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Award className="w-7 h-7 text-lick-orange-light" />
          <h2 className="text-2xl font-bold">Reputation System</h2>
        </div>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Every creator builds a reputation score (0–100) based on their launch
          history. Higher reputation unlocks perks and builds trust with traders.
        </p>

        {/* Tiers */}
        <h3 className="font-semibold text-foreground mb-3">Tiers</h3>
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-lg border border-gray-500/30 bg-gray-500/5 p-4 text-center">
            <div className="text-gray-400 font-bold text-lg">Starter</div>
            <div className="text-xs text-muted-foreground">0–29</div>
            <div className="text-xs text-muted-foreground mt-1">New creator</div>
          </div>
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-center">
            <div className="text-blue-400 font-bold text-lg">Established</div>
            <div className="text-xs text-muted-foreground">30–69</div>
            <div className="text-xs text-muted-foreground mt-1">Proven track record</div>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-center">
            <div className="text-amber-400 font-bold text-lg">Verified</div>
            <div className="text-xs text-muted-foreground">70–100</div>
            <div className="text-xs text-muted-foreground mt-1">Top-tier trusted</div>
          </div>
        </div>

        {/* Badges */}
        <h3 className="font-semibold text-foreground mb-3">Badges</h3>
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary">
            <span>🪙</span>
            <span>First Token</span>
            <span className="text-xs text-muted-foreground ml-auto">Launch milestone</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary">
            <span>🎓</span>
            <span>Triple Graduate</span>
            <span className="text-xs text-muted-foreground ml-auto">3 graduates</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary">
            <span>🏆</span>
            <span>Deca Graduate</span>
            <span className="text-xs text-muted-foreground ml-auto">10 graduates</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary">
            <span>🛡️</span>
            <span>Locked & Honest</span>
            <span className="text-xs text-muted-foreground ml-auto">No rug history</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary">
            <span>📊</span>
            <span>Volume Maker</span>
            <span className="text-xs text-muted-foreground ml-auto">100K+ MON volume</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary">
            <span>👑</span>
            <span>Verified Founder</span>
            <span className="text-xs text-muted-foreground ml-auto">Score 70+</span>
          </div>
        </div>
      </section>

      {/* Fee Structure */}
      <section className="rounded-xl border border-border bg-card p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Coins className="w-7 h-7 text-lick-orange-light" />
          <h2 className="text-2xl font-bold">Fee Structure</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Fee</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Rate</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Recipient</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Applied On</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="py-3 px-4">Protocol Fee</td>
                <td className="py-3 px-4 font-mono">1%</td>
                <td className="py-3 px-4">Protocol Treasury</td>
                <td className="py-3 px-4">Every buy & sell</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-3 px-4">Creator Fee</td>
                <td className="py-3 px-4 font-mono">1%</td>
                <td className="py-3 px-4">Token Creator</td>
                <td className="py-3 px-4">Every buy & sell</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-3 px-4">Anti-Sniping Penalty</td>
                <td className="py-3 px-4 font-mono">0–80%</td>
                <td className="py-3 px-4">Protocol Treasury</td>
                <td className="py-3 px-4">First 7 blocks</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-3 px-4">Prediction Fee</td>
                <td className="py-3 px-4 font-mono">2%</td>
                <td className="py-3 px-4">Protocol Treasury</td>
                <td className="py-3 px-4">Losing pool</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Total Trade Fee</td>
                <td className="py-3 px-4 font-mono font-bold text-lick-orange-light">2%</td>
                <td className="py-3 px-4" colSpan={2}>
                  Split equally between protocol & creator
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Creator Checklist */}
      <section className="rounded-xl border border-border bg-card p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-7 h-7 text-lick-orange-light" />
          <h2 className="text-2xl font-bold">Creator Checklist</h2>
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
              <div className="w-8 h-8 rounded-full bg-lick-orange/10 flex items-center justify-center shrink-0">
                <span className="text-lick-orange-light text-sm font-bold">{i + 1}</span>
              </div>
              <span className="text-sm text-muted-foreground pt-1.5">{step}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center mb-20">
        <h2 className="text-2xl font-bold mb-4">Ready to launch?</h2>
        <p className="text-muted-foreground mb-6">
          Connect your wallet and become a creator on Lick.fun.
        </p>
        <a href="/discover" className="btn-lick inline-flex items-center gap-2 text-base">
          Get Started
          <ArrowRight className="w-5 h-5" />
        </a>
      </section>
    </div>
  );
}