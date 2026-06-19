import Link from "next/link";
import { ArrowRight, Coins, Shield, TrendingUp, Users } from "lucide-react";

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero */}
      <section className="flex flex-col items-center text-center py-20 lg:py-32">
        <div className="w-24 h-24 rounded-2xl gradient-lick flex items-center justify-center mb-8 animate-pulse-lick shadow-lg shadow-lick-orange/20">
          <span className="text-5xl">🦎</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4">
          <span className="text-gradient-lick">Lick.fun</span>
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-lg mb-2">
          a meme lake on liquidity fun
        </p>
        <p className="text-sm text-muted-foreground/60 max-w-md mb-8">
          Social-first token launchpad on Monad. Launch tokens, earn reputation,
          and ride the bonding curve.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/discover" className="btn-lick flex items-center gap-2 text-base">
            Explore Tokens
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/how-it-works" className="btn-lick-outline text-base">
            How It Works
          </Link>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="grid md:grid-cols-3 gap-6 mb-20">
        <div className="rounded-xl border border-border bg-card p-6 card-hover">
          <div className="w-10 h-10 rounded-lg bg-lick-orange/10 flex items-center justify-center mb-4">
            <Coins className="w-5 h-5 text-lick-orange-light" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Bonding Curve Launch</h3>
          <p className="text-sm text-muted-foreground">
            Tokens launch on a constant-product bonding curve. 100K MON threshold triggers
            graduation to a full DEX pool.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 card-hover">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Earned Reputation</h3>
          <p className="text-sm text-muted-foreground">
            Creators build reputation through successful launches. Badges, tiers, and
            on-chain scoring unlock perks.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 card-hover">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Prediction Markets</h3>
          <p className="text-sm text-muted-foreground">
            Bet on whether tokens will graduate. YES/NO binary markets with
            real-time odds from on-chain data.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="rounded-xl border border-border bg-card p-8 mb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-2xl font-bold text-lick-orange-light">8</div>
            <div className="text-sm text-muted-foreground">Tokens Launched</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">5</div>
            <div className="text-sm text-muted-foreground">Graduated</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-400">4</div>
            <div className="text-sm text-muted-foreground">Creators</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400">1.2K MON</div>
            <div className="text-sm text-muted-foreground">Total Volume</div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center mb-20">
        <h2 className="text-2xl font-bold mb-4">Ready to dive in?</h2>
        <p className="text-muted-foreground mb-6">
          Connect your wallet and start exploring tokens on Monad.
        </p>
        <Link href="/discover" className="btn-lick text-base">
          Discover Tokens
        </Link>
      </section>
    </div>
  );
}