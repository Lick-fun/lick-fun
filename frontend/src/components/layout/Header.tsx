"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { Search } from "lucide-react";

/**
 * Figma-sourced header:
 *   - Slim top bar (64px) with search pill in center
 *   - ConnectButton on the right
 *   - Mobile shows logo + wallet only
 */
export function Header() {
  return (
    <header className="flex items-center justify-between gap-4 h-16 px-6 border-b border-figma-surface bg-figma-bg shrink-0">
      {/* Mobile logo */}
      <Link href="/" className="flex items-center gap-2 lg:hidden">
        <div className="w-8 h-8 rounded-lg gradient-lick flex items-center justify-center text-black text-lg">
          🦎
        </div>
        <span className="font-bold text-gradient-lick">Lick.fun</span>
      </Link>

      {/* Desktop: search pill in center */}
      <div className="hidden lg:flex flex-1 max-w-xl mx-auto">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-figma-muted" />
          <input
            type="text"
            placeholder="Search tokens, creators, addresses..."
            className="w-full pl-11 pr-4 py-2.5 rounded-pill border border-figma-surface bg-figma-card text-sm text-figma-white placeholder:text-figma-muted focus:outline-none focus:border-figma-green transition-colors"
          />
        </div>
      </div>

      {/* Spacer (desktop, when search is hidden — keeps wallet right) */}
      <div className="hidden lg:block" />

      {/* Wallet */}
      <ConnectButton
        showBalance={false}
        chainStatus="icon"
        accountStatus="address"
      />
    </header>
  );
}