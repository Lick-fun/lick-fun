import {
  Coins,
  Shield,
  Award,
  CheckCircle,
  ArrowRight,
  Zap,
  BarChart3,
  Lock,
  Users,
} from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="bg-figma-bg min-h-screen px-5 pb-20">
      {/* Page Header */}
      <div className="pt-8 mb-12 text-center max-w-3xl mx-auto">
        <h1 className="text-figma-3xl text-figma-white font-bold mb-3">
          About Lickfun.xyz
        </h1>
        <p className="text-figma-md text-figma-muted">
          A social-first token launchpad on Monad. Discover new tokens, trade
          on a fair curve, and watch the strongest projects graduate to a real
          DEX pool.
        </p>
      </div>

      {/* What is Lickfun.xyz */}
      <section className="rounded-card border border-figma-card bg-figma-card p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <img
            src="/logo-transparent.png"
            alt="Lickfun.xyz"
            className="w-10 h-10 rounded-card object-cover shrink-0"
          />
          <h2 className="text-figma-2xl text-figma-white font-bold">What is Lickfun.xyz?</h2>
        </div>
        <p className="text-figma-md text-figma-muted leading-relaxed mb-4">
          Lickfun.xyz is a place where anyone can launch a token and the community
          decides what&apos;s worth keeping. Every new token starts on a bonding
          curve — a simple rule that says: as more people buy, the price goes up.
          When a token reaches 100,000 MON raised, it graduates to a real DEX
          pool with its liquidity permanently locked away. No rug possible.
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="rounded-pill bg-figma-surface p-4 text-center">
            <div className="text-figma-lg text-figma-green font-bold mb-1">Launch</div>
            <div className="text-figma-sm text-figma-muted">
              Anyone can create a token in seconds
            </div>
          </div>
          <div className="rounded-pill bg-figma-surface p-4 text-center">
            <div className="text-figma-lg text-figma-green font-bold mb-1">Trade</div>
            <div className="text-figma-sm text-figma-muted">
              Buy and sell instantly — price rises with demand
            </div>
          </div>
          <div className="rounded-pill bg-figma-surface p-4 text-center">
            <div className="text-figma-lg text-figma-green font-bold mb-1">Graduate</div>
            <div className="text-figma-sm text-figma-muted">
              Hit 100K MON → token moves to a real DEX, LP locked forever
            </div>
          </div>
        </div>
      </section>

      {/* How Trading Works */}
      <section className="rounded-card border border-figma-card bg-figma-card p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-7 h-7 text-figma-green" />
          <h2 className="text-figma-2xl text-figma-white font-bold">How Trading Works</h2>
        </div>
        <p className="text-figma-md text-figma-muted leading-relaxed mb-4">
          Every token starts on a bonding curve — a pricing rule that makes the
          price go up smoothly as more people buy. There&apos;s no order book, no
          waiting for a match. You buy, you get tokens instantly. You sell, you
          get MON instantly.
        </p>
        <div className="space-y-3 text-figma-sm text-figma-muted">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-figma-green/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-figma-green text-figma-xs font-bold">1</span>
            </div>
            <span>
              <span className="text-figma-white font-medium">Early buyers get the best price.</span>{" "}
              The first people to buy a new token pay the lowest price on the curve.
            </span>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-figma-green/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-figma-green text-figma-xs font-bold">2</span>
            </div>
            <span>
              <span className="text-figma-white font-medium">Price rises with demand.</span>{" "}
              As more people buy, the price climbs. The more popular a token gets,
              the more expensive each new buy becomes.
            </span>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-figma-green/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-figma-green text-figma-xs font-bold">3</span>
            </div>
            <span>
              <span className="text-figma-white font-medium">Selling is always allowed.</span>{" "}
              You can sell your tokens back to the curve at any time for MON.
            </span>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-figma-green-soft/10 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle className="w-4 h-4 text-figma-green-soft" />
            </div>
            <span>
              <span className="text-figma-white font-medium">Graduation locks liquidity forever.</span>{" "}
              When a token hits 100K MON, it moves to a real DEX pool and the
              liquidity is permanently burned. No one — not even the creator —
              can ever pull it out.
            </span>
          </div>
        </div>
      </section>

      {/* Fair Launch Protection */}
      <section className="rounded-card border border-figma-card bg-figma-card p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-7 h-7 text-figma-green" />
          <h2 className="text-figma-2xl text-figma-white font-bold">Fair Launch Protection</h2>
        </div>
        <p className="text-figma-md text-figma-muted leading-relaxed mb-4">
          Bots that try to snipe new tokens in the first few seconds get hit with
          a heavy penalty — up to 80% on the very first block, fading down to
          nothing after the first few blocks. This gives real people a fair
          chance to get in early instead of being front-run by automated snipers.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-pill bg-figma-surface p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-figma-green" />
              <span className="text-figma-md text-figma-white font-semibold">First few seconds</span>
            </div>
            <div className="text-figma-sm text-figma-muted">
              Snipers pay up to 80% penalty. Real buyers are protected.
            </div>
          </div>
          <div className="rounded-pill bg-figma-surface p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-figma-green" />
              <span className="text-figma-md text-figma-white font-semibold">After a few blocks</span>
            </div>
            <div className="text-figma-sm text-figma-muted">
              Penalty drops to 0%. Normal trading with just the standard 2% fee.
            </div>
          </div>
        </div>
      </section>

      {/* Reputation & Trust */}
      <section className="rounded-card border border-figma-card bg-figma-card p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Award className="w-7 h-7 text-figma-green" />
          <h2 className="text-figma-2xl text-figma-white font-bold">Reputation & Trust</h2>
        </div>
        <p className="text-figma-md text-figma-muted leading-relaxed mb-4">
          Every creator builds a reputation score from 0 to 100 based on their
          track record — how many tokens they&apos;ve launched, how many graduated,
          how honest their pre-buys were, and whether they&apos;ve ever rugged.
          A single rug event tanks the score. Look for creators with high
          reputation before you buy.
        </p>

        {/* Tiers */}
        <h3 className="text-figma-md text-figma-white font-semibold mb-3">Creator Tiers</h3>
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-pill border border-figma-card-alt bg-figma-surface p-4 text-center">
            <div className="text-figma-lg text-figma-muted font-bold">New</div>
            <div className="text-figma-xs text-figma-muted">0–29</div>
            <div className="text-figma-xs text-figma-muted mt-1">Just getting started</div>
          </div>
          <div className="rounded-pill border border-figma-card-alt bg-figma-surface p-4 text-center">
            <div className="text-figma-lg text-figma-muted font-bold">Established</div>
            <div className="text-figma-xs text-figma-muted">30–69</div>
            <div className="text-figma-xs text-figma-muted mt-1">Proven track record</div>
          </div>
          <div className="rounded-pill border border-figma-green/30 bg-figma-green/5 p-4 text-center">
            <div className="text-figma-lg text-figma-green font-bold">Trusted</div>
            <div className="text-figma-xs text-figma-muted">70–100</div>
            <div className="text-figma-xs text-figma-muted mt-1">Top-tier, verified</div>
          </div>
        </div>

        {/* Badges */}
        <h3 className="text-figma-md text-figma-white font-semibold mb-3">Achievement Badges</h3>
        <p className="text-figma-sm text-figma-muted mb-3">
          Creators earn badges automatically as they hit milestones:
        </p>
        <div className="grid sm:grid-cols-2 gap-2 text-figma-sm">
          <div className="flex items-center gap-2 p-2 rounded-pill bg-figma-surface">
            <span>🎓</span>
            <span>Triple Graduate</span>
            <span className="text-figma-xs text-figma-muted ml-auto">3 successful launches</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-pill bg-figma-surface">
            <span>🏆</span>
            <span>Deca Graduate</span>
            <span className="text-figma-xs text-figma-muted ml-auto">10 successful launches</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-pill bg-figma-surface">
            <span>⭐</span>
            <span>Crowd Favourite</span>
            <span className="text-figma-xs text-figma-muted ml-auto">200+ unique buyers</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-pill bg-figma-surface">
            <span>💎</span>
            <span>Diamond Hands</span>
            <span className="text-figma-xs text-figma-muted ml-auto">Never sold own launch</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-pill bg-figma-surface">
            <span>🛡️</span>
            <span>Never Rugged</span>
            <span className="text-figma-xs text-figma-muted ml-auto">30+ days, zero rugs</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-pill bg-figma-surface">
            <span>✅</span>
            <span>Honest Pre-buy</span>
            <span className="text-figma-xs text-figma-muted ml-auto">Bought what they launched</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-pill bg-figma-surface">
            <span>📊</span>
            <span>Volume Maker</span>
            <span className="text-figma-xs text-figma-muted ml-auto">100K+ MON traded</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-pill bg-figma-surface">
            <span>👑</span>
            <span>Trusted Founder</span>
            <span className="text-figma-xs text-figma-muted ml-auto">Score 70+</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-pill bg-figma-surface">
            <span>🌟</span>
            <span>OG</span>
            <span className="text-figma-xs text-figma-muted ml-auto">1 year+ veteran</span>
          </div>
        </div>
      </section>

      {/* Fees */}
      <section className="rounded-card border border-figma-card bg-figma-card p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Coins className="w-7 h-7 text-figma-green" />
          <h2 className="text-figma-2xl text-figma-white font-bold">Fees</h2>
        </div>
        <p className="text-figma-md text-figma-muted leading-relaxed mb-4">
          Every trade pays a small 2% fee. Half goes to the token&apos;s creator
          as a reward for launching, and half goes to the platform to keep
          things running. That&apos;s it — no hidden charges, no surprise costs.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-pill bg-figma-surface p-4 text-center">
            <div className="text-figma-lg text-figma-green font-bold mb-1">1%</div>
            <div className="text-figma-sm text-figma-muted">To the creator</div>
          </div>
          <div className="rounded-pill bg-figma-surface p-4 text-center">
            <div className="text-figma-lg text-figma-green font-bold mb-1">1%</div>
            <div className="text-figma-sm text-figma-muted">Platform fee</div>
          </div>
        </div>
      </section>

      {/* Why It's Safe */}
      <section className="rounded-card border border-figma-card bg-figma-card p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Lock className="w-7 h-7 text-figma-green" />
          <h2 className="text-figma-2xl text-figma-white font-bold">Why It&apos;s Safe</h2>
        </div>
        <p className="text-figma-md text-figma-muted leading-relaxed mb-4">
          Lickfun.xyz is built so that rugs are structurally impossible:
        </p>
        <div className="space-y-3 text-figma-sm text-figma-muted">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-figma-green/10 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle className="w-4 h-4 text-figma-green" />
            </div>
            <span>
              <span className="text-figma-white font-medium">Liquidity is burned, not locked.</span>{" "}
              When a token graduates, the DEX pool&apos;s LP tokens are sent to a
              dead address. They&apos;re gone forever — no one can withdraw them.
            </span>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-figma-green/10 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle className="w-4 h-4 text-figma-green" />
            </div>
            <span>
              <span className="text-figma-white font-medium">No admin keys.</span>{" "}
              There are no special privileges that let anyone change the rules
              or drain funds. The code is the rules.
            </span>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-figma-green/10 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle className="w-4 h-4 text-figma-green" />
            </div>
            <span>
              <span className="text-figma-white font-medium">Sniper protection.</span>{" "}
              Bots that try to front-run launches get hit with heavy penalties,
              giving real people a fair shot.
            </span>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-figma-green/10 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle className="w-4 h-4 text-figma-green" />
            </div>
            <span>
              <span className="text-figma-white font-medium">Reputation matters.</span>{" "}
              Creators who rug get destroyed in the reputation system. Honest
              creators rise to the top.
            </span>
          </div>
        </div>
      </section>

      {/* Community */}
      <section className="rounded-card border border-figma-card bg-figma-card p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-7 h-7 text-figma-green" />
          <h2 className="text-figma-2xl text-figma-white font-bold">Community</h2>
        </div>
        <p className="text-figma-md text-figma-muted leading-relaxed">
          Lickfun.xyz is built for the community. Every token&apos;s success is
          decided by the people who buy it. The bonding curve means early
          supporters are rewarded for believing in a project first, and the
          reputation system means you can see who&apos;s trustworthy before you
          commit your MON.
        </p>
      </section>

      {/* CTA */}
      <section className="text-center mb-20">
        <h2 className="text-figma-2xl text-figma-white font-bold mb-4">Ready to explore?</h2>
        <p className="text-figma-md text-figma-muted mb-6">
          Browse trending tokens, check out the markets, or launch your own.
        </p>
        <Link href="/" className="btn-lick inline-flex items-center gap-2 text-figma-md">
          Explore Tokens
          <ArrowRight className="w-5 h-5" />
        </Link>
      </section>
    </div>
  );
}