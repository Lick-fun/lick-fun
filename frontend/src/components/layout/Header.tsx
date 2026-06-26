"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { Search, Home, Compass, TrendingUp, BookOpen, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/",             label: "Home",         icon: Home },
  { href: "/discover",     label: "Discover",     icon: Compass },
  { href: "/create",       label: "Create Token", icon: Plus },
  { href: "/markets",      label: "Markets",      icon: TrendingUp },
  { href: "/how-it-works", label: "How It Works", icon: BookOpen },
];

function isActiveLink(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Full-width top navigation bar:
 *   Logo → Nav links → Search pill → Wallet connect
 */
export function Header() {
  const pathname = usePathname();
  const { address } = useAccount();

  return (
    <header className="flex items-center gap-4 h-16 px-6 border-b border-figma-surface bg-figma-bg shrink-0 w-full">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 shrink-0">
        <Image
          src="/logo-transparent.png"
          alt="Lick.fun"
          width={32}
          height={32}
          className="w-8 h-8 rounded-lg object-cover shrink-0"
        />
        <span className="font-bold text-gradient-lick text-lg">Lick.fun</span>
      </Link>

      {/* Desktop nav links */}
      <nav className="hidden lg:flex items-center gap-1 ml-2">
        {navLinks.map((link) => {
          // Profile link — disabled without wallet
          if (link.href === "/profile") return null;

          const active = isActiveLink(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "bg-figma-surface text-figma-white"
                  : "text-figma-muted hover:text-figma-white hover:bg-figma-surface"
              )}
            >
              <link.icon className={cn("w-4 h-4", active ? "text-figma-green" : "")} />
              {link.label}
            </Link>
          );
        })}

        {/* Profile — only shown when wallet connected */}
        {address && (
          <Link
            href={`/profile/${address}`}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
              isActiveLink(pathname, `/profile/${address}`)
                ? "bg-figma-surface text-figma-white"
                : "text-figma-muted hover:text-figma-white hover:bg-figma-surface"
            )}
          >
            <User className={cn("w-4 h-4", isActiveLink(pathname, `/profile/${address}`) ? "text-figma-green" : "")} />
            Profile
          </Link>
        )}
      </nav>

      {/* Search pill — grows to fill remaining space */}
      <div className="hidden lg:flex flex-1 max-w-sm ml-auto">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-figma-muted" />
          <input
            type="text"
            placeholder="Search tokens, creators..."
            className="w-full pl-9 pr-4 py-2 rounded-pill border border-figma-surface bg-figma-card text-sm text-figma-white placeholder:text-figma-muted focus:outline-none focus:border-figma-green transition-colors"
          />
        </div>
      </div>

      {/* Mobile: logo only (nav handled by BottomNav) */}
      <div className="flex items-center gap-2 lg:hidden ml-auto" />

      {/* Wallet */}
      <ConnectButton
        showBalance={false}
        chainStatus="icon"
        accountStatus="address"
      />
    </header>
  );
}