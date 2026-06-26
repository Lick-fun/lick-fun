import {
  Coins,
  Shield,
  Award,
  CheckCircle,
  ArrowRight,
  Zap,
  BarChart3,
  Layers,
  Lock,
} from "lucide-react";

export default function HowItWorksPage() {
  return (
    <div className="bg-figma-bg min-h-screen px-5 pb-20">
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
          <img
            src="/logo-transparent.png"
            alt="Lick.fun"
            className="w-10 h-10 rounded-card object-cover shrink-0"
          />
          <h2 className="text-figma-2xl text-figma-white font-bold">What is Lick.fun?</h2>
        </div>
        <p className="text-figma-md text-figma-muted leading-relaxed mb-4">
          Lick.fun is a meme lake on liquidity fun. It&apos;s the first social-first token
          launchpad on Monad where creators earn reputation by launching successful
          tokens. Tokens use a constant-product bonding curve — buy pressure raises
          price, and when a token hits 100,000 MON raised, it graduates to a full DEX pool
          with liquidity permanently burned to 0xdead.
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
              Hit 100K MON → token migrates to a full DEX pool, LP burned
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
              When realMon hits 100,000 MON, the token graduates and LP tokens are
              permanently burned to 0xdead — no rug possible.
            </span>
          </div>
        </div>
      </section>

      {/* Anti-Sniping */}
      <section className="rounded-card border border-figma-card bg-figma-card p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-7 h-7 text-figma-green" />
          <h2 className="text-figma-2xl text-figma-white font-bold">Anti-Sniping Penalty</h2>
        </div>
        <p className="text-figma-md text-figma-muted leading-relaxed mb-4">
          Snipers can&apos;t snipe the first 7 blocks — every buy and sell within
          the decay window pays an extra penalty on top of the regular 2% fee. The
          creator&apos;s first buy (pre-buy) is always exempt.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-figma-sm">
            <thead>
              <tr className="border-b border-figma-surface">
                <th className="text-left py-3 px-4 text-figma-muted font-medium">Block Offset</th>
                <th className="text-left py-3 px-4 text-figma-muted font-medium">Penalty</th>
                <th className="text-left py-3 px-4 text-figma-muted font-medium">Recipient</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-figma-surface">
                <td className="py-3 px-4 font-mono text-figma-white">Block 0</td>
                <td className="py-3 px-4 font-mono text-figma-green">80%</td>
                <td className="py-3 px-4 text-figma-muted">Protocol Treasury</td>
              </tr>
              <tr className="border-b border-figma-surface">
                <td className="py-3 px-4 font-mono text-figma-white">Block 1</td>
                <td className="py-3 px-4 font-mono text-figma-green">40%</td>
                <td className="py-3 px-4 text-figma-muted">Protocol Treasury</td>
              </tr>
              <tr className="border-b border-figma-surface">
                <td className="py-3 px-4 font-mono text-figma-white">Block 2</td>
                <td className="py-3 px-4 font-mono text-figma-green">20%</td>
                <td className="py-3 px-4 text-figma-muted">Protocol Treasury</td>
              </tr>
              <tr className="border-b border-figma-surface">
                <td className="py-3 px-4 font-mono text-figma-white">Block 3</td>
                <td className="py-3 px-4 font-mono text-figma-green">15%</td>
                <td className="py-3 px-4 text-figma-muted">Protocol Treasury</td>
              </tr>
              <tr className="border-b border-figma-surface">
                <td className="py-3 px-4 font-mono text-figma-white">Block 4</td>
                <td className="py-3 px-4 font-mono text-figma-green">10%</td>
                <td className="py-3 px-4 text-figma-muted">Protocol Treasury</td>
              </tr>
              <tr className="border-b border-figma-surface">
                <td className="py-3 px-4 font-mono text-figma-white">Block 5</td>
                <td className="py-3 px-4 font-mono text-figma-green">10%</td>
                <td className="py-3 px-4 text-figma-muted">Protocol Treasury</td>
              </tr>
              <tr className="border-b border-figma-surface">
                <td className="py-3 px-4 font-mono text-figma-white">Block 6</td>
                <td className="py-3 px-4 font-mono text-figma-green">5%</td>
                <td className="py-3 px-4 text-figma-muted">Protocol Treasury</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono text-figma-white">Block 7+</td>
                <td className="py-3 px-4 font-mono text-figma-muted">0%</td>
                <td className="py-3 px-4 text-figma-muted">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Reputation System */}
      <section className="rounded-card border border-figma-card bg-figma-card p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Award className="w-7 h-7 text-figma-green" />
          <h2 className="text-figma-2xl text-figma-white font-bold">Reputation System</h2>
        </div>
        <p className="text-figma-md text-figma-muted leading-relaxed mb-4">
          Every creator builds a reputation score (0–100) computed off-chain from
          Envio data. The score factors in account age, graduation rate, lock
          fulfillment, cumulative volume, pre-buy honesty, and verified tenure.
          A single rug event floors the score (intentionally huge penalty).
        </p>
        <p className="text-figma-sm text-figma-muted leading-relaxed mb-6">
          Final score is mapped through a sigmoid: <span className="font-mono text-figma-white">reputation = 100 / (1 + e^(-k × (raw - midpoint)))</span> with k = 0.15 and midpoint = 0.4.
          Scores are anchored on-chain as a daily Merkle root committed to ProfileRegistry.
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
        <h3 className="text-figma-md text-figma-white font-semibold mb-3">Badges (auto-awarded)</h3>
        <div className="grid sm:grid-cols-2 gap-2 text-figma-sm">
          <div className="flex items-center gap-2 p-2 rounded-pill bg-figma-surface">
            <span>🎓</span>
            <span>Triple Graduate</span>
            <span className="text-figma-xs text-figma-muted ml-auto">3 grads · diversity 30%+</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-pill bg-figma-surface">
            <span>🏆</span>
            <span>Deca Graduate</span>
            <span className="text-figma-xs text-figma-muted ml-auto">10 grads · diversity 30%+</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-pill bg-figma-surface">
            <span>⭐</span>
            <span>Crowd Favourite</span>
            <span className="text-figma-xs text-figma-muted ml-auto">200+ unique buyers</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-pill bg-figma-surface">
            <span>💎</span>
            <span>Diamond Hands</span>
            <span className="text-figma-xs text-figma-muted ml-auto">Never sold own grad</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-pill bg-figma-surface">
            <span>🛡️</span>
            <span>Never Rug</span>
            <span className="text-figma-xs text-figma-muted ml-auto">30d+ · 0 rugs</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-pill bg-figma-surface">
            <span>✅</span>
            <span>Pre-buy Honest</span>
            <span className="text-figma-xs text-figma-muted ml-auto">≥95% honesty</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-pill bg-figma-surface">
            <span>📊</span>
            <span>Volume Maker</span>
            <span className="text-figma-xs text-figma-muted ml-auto">100K+ MON grad vol</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-pill bg-figma-surface">
            <span>👑</span>
            <span>Verified Founder</span>
            <span className="text-figma-xs text-figma-muted ml-auto">Score 70+</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-pill bg-figma-surface">
            <span>🌟</span>
            <span>OG</span>
            <span className="text-figma-xs text-figma-muted ml-auto">365d+ · 3 grads · diversity 30%+</span>
          </div>
        </div>
      </section>

      {/* Fee Structure */}
      <section className="rounded-card border border-figma-card bg-figma-card p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Coins className="w-7 h-7 text-figma-green" />
          <h2 className="text-figma-2xl text-figma-white font-bold">Fee Structure</h2>
        </div>
        <p className="text-figma-md text-figma-muted leading-relaxed mb-4">
          Every trade pays a 2% total fee, split equally between the protocol and
          the creator. The protocol fee goes straight to the protocolFeeReceiver;
          the creator fee goes direct to the creator (standard mode) or is
          routed through the FeeRouter (preset mode — see tier table below).
        </p>
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
                <td className="py-3 px-4 text-figma-muted">Creator or FeeRouter</td>
                <td className="py-3 px-4 text-figma-muted">Every buy & sell</td>
              </tr>
              <tr className="border-b border-figma-surface">
                <td className="py-3 px-4 text-figma-white">Anti-Sniping Penalty</td>
                <td className="py-3 px-4 font-mono text-figma-muted">0–80%</td>
                <td className="py-3 px-4 text-figma-muted">Protocol Treasury</td>
                <td className="py-3 px-4 text-figma-muted">First 7 blocks (excl. creator pre-buy)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-figma-white font-medium">Total Trade Fee</td>
                <td className="py-3 px-4 font-mono font-bold text-figma-green">2%</td>
                <td className="py-3 px-4 text-figma-muted" colSpan={2}>
                  1% protocol + 1% creator
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Fee Tiers (FeeRouter) */}
      <section className="rounded-card border border-figma-card bg-figma-card p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Layers className="w-7 h-7 text-figma-green" />
          <h2 className="text-figma-2xl text-figma-white font-bold">Fee Tiers (FeeRouter)</h2>
        </div>
        <p className="text-figma-md text-figma-muted leading-relaxed mb-4">
          When launching a token with <span className="font-mono text-figma-white">createTokenWithPreset()</span>, the 1% creator fee is split across
          three destinations by tier. Starter/Creator Extra/Creator + LP Support are fixed
          presets; Custom (Diamond) lets verified creators set any split they want.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-figma-sm">
            <thead>
              <tr className="border-b border-figma-surface">
                <th className="text-left py-3 px-4 text-figma-muted font-medium">Tier</th>
                <th className="text-left py-3 px-4 text-figma-muted font-medium">Creator</th>
                <th className="text-left py-3 px-4 text-figma-muted font-medium">LP Support</th>
                <th className="text-left py-3 px-4 text-figma-muted font-medium">Buyback & Burn</th>
                <th className="text-left py-3 px-4 text-figma-muted font-medium">Mode</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-figma-surface">
                <td className="py-3 px-4 text-figma-white">Starter</td>
                <td className="py-3 px-4 font-mono text-figma-muted">10%</td>
                <td className="py-3 px-4 font-mono text-figma-muted">80%</td>
                <td className="py-3 px-4 font-mono text-figma-muted">10%</td>
                <td className="py-3 px-4 text-figma-muted">Fixed (entry)</td>
              </tr>
              <tr className="border-b border-figma-surface">
                <td className="py-3 px-4 text-figma-white">Creator Extra</td>
                <td className="py-3 px-4 font-mono text-figma-muted">30%</td>
                <td className="py-3 px-4 font-mono text-figma-muted">60%</td>
                <td className="py-3 px-4 font-mono text-figma-muted">10%</td>
                <td className="py-3 px-4 text-figma-muted">Fixed (builder)</td>
              </tr>
              <tr className="border-b border-figma-surface">
                <td className="py-3 px-4 text-figma-white">Creator + LP Support</td>
                <td className="py-3 px-4 font-mono text-figma-muted">20%</td>
                <td className="py-3 px-4 font-mono text-figma-muted">70%</td>
                <td className="py-3 px-4 font-mono text-figma-muted">10%</td>
                <td className="py-3 px-4 text-figma-muted">Fixed (established)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-figma-white">Custom</td>
                <td className="py-3 px-4 font-mono text-figma-muted">custom</td>
                <td className="py-3 px-4 font-mono text-figma-muted">custom</td>
                <td className="py-3 px-4 font-mono text-figma-muted">custom</td>
                <td className="py-3 px-4 text-figma-muted">Custom via setCustomConfig()</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-figma-xs text-figma-muted mt-4">
          Note: FeeRouter is failure-tolerant — if a vault push fails, the
          amount lands in pendingWithdrawals and the creator can pull it
          manually.
        </p>
      </section>

      {/* LP Burn */}
      <section className="rounded-card border border-figma-card bg-figma-card p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Lock className="w-7 h-7 text-figma-green" />
          <h2 className="text-figma-2xl text-figma-white font-bold">LP Burn at Graduation</h2>
        </div>
        <p className="text-figma-md text-figma-muted leading-relaxed">
          When a token hits the 100K MON threshold, the GraduationRouter migrates
          liquidity to a full DEX pool and transfers the LP tokens to
          <span className="font-mono text-figma-white"> 0x000000000000000000000000000000000000dEaD</span>.
          They are burned — not locked, not vested. This makes rugs structurally
          impossible: there is no LP to withdraw, and no admin key to do it with.
        </p>
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
            "Pick a launch mode — standard (creator-direct fee) or preset (FeeRouter tier)",
            "If preset, pick a tier: Starter, Creator Extra, Creator + LP Support, or Custom",
            "Pre-buy your own token (exempt from anti-snipe, proves skin in the game)",
            "Your token deploys on the bonding curve — trading begins",
            "Anti-sniping penalty applies for the first 7 blocks, then decays to 0%",
            "Share your token link — the community starts buying",
            "RealMon climbs toward 100K — if hit, token graduates",
            "Graduation: liquidity migrates to a DEX pool and LP is burned to 0xdead",
            "Your reputation score updates with each launch outcome (off-chain)",
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