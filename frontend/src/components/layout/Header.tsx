"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

export function Header() {
  return (
    <header className="flex items-center justify-between h-16 px-6 border-b border-border bg-card shrink-0">
      {/* Mobile Logo */}
      <Link href="/" className="flex items-center gap-2 lg:hidden">
        <div className="w-8 h-8 rounded-lg gradient-lick flex items-center justify-center">
          <span className="text-black text-lg">🦎</span>
        </div>
        <span className="font-bold text-gradient-lick">Lick.fun</span>
      </Link>

      {/* Spacer for mobile */}
      <div className="hidden lg:block flex-1" />

      {/* Wallet */}
      <ConnectButton
        showBalance={false}
        chainStatus="icon"
        accountStatus="address"
      />
    </header>
  );
}