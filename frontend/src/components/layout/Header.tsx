"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Home, Compass, TrendingUp, BookOpen, Plus, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { WalletMenu } from "@/components/layout/WalletMenu";

const navLinks = [
  { href: "/", label: "Launchpad", icon: Home },
  { href: "/discover", label: "Explore", icon: Compass },
  { href: "/markets", label: "Markets", icon: TrendingUp },
  { href: "/how-it-works", label: "How it works", icon: BookOpen },
];

function isActiveLink(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 flex h-[72px] w-full shrink-0 items-center border-b border-figma-purple/20 bg-figma-bg/90 px-4 backdrop-blur-xl md:px-6">
      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5" aria-label="Lickfun home">
          <span className="relative flex size-11 items-center justify-center overflow-hidden rounded-xl border border-figma-purple/35 bg-figma-card shadow-glow-purple-sm transition-transform group-hover:-rotate-3 group-hover:scale-105">
            <Image src="/logo-transparent.png" alt="" width={44} height={44} className="size-11 object-cover" priority />
          </span>
          <span className="hidden font-display text-xl font-extrabold tracking-[-0.04em] text-figma-white sm:block">
            Lickfun<span className="text-figma-purple-soft">.xyz</span>
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {navLinks.map((link) => {
            const active = isActiveLink(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all",
                  active
                    ? "bg-figma-purple/15 text-figma-purple-soft shadow-[inset_0_0_0_1px_rgba(139,61,255,0.25)]"
                    : "text-figma-muted hover:bg-figma-card-alt hover:text-figma-white"
                )}
              >
                <link.icon className="size-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden max-w-xs flex-1 xl:flex">
          <label className="relative w-full">
            <span className="sr-only">Search tokens and creators</span>
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-figma-muted" />
            <input
              type="search"
              placeholder="Search the meme lake..."
              className="w-full rounded-xl border border-figma-purple/15 bg-figma-card py-2.5 pl-10 pr-4 text-sm text-figma-white outline-none transition-all placeholder:text-figma-muted focus:border-figma-purple/60 focus:shadow-glow-purple-sm"
            />
          </label>
        </div>

        <div className="hidden items-center gap-1.5 rounded-full border border-figma-green/20 bg-figma-green/5 px-3 py-1.5 text-xs font-bold text-figma-green md:flex">
          <Radio className="size-3.5 animate-pulse" />
          MONAD LIVE
        </div>

        <Link href="/create" className="hidden items-center gap-2 rounded-xl bg-figma-purple px-4 py-2.5 text-sm font-extrabold text-figma-white shadow-glow-purple-sm transition-all hover:-translate-y-0.5 hover:bg-figma-purple-soft sm:flex">
          <Plus className="size-4" />
          Launch
        </Link>

        <WalletMenu />
      </div>
    </header>
  );
}
