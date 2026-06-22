"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Compass,
  TrendingUp,
  BookOpen,
  Plus,
  Zap,
} from "lucide-react";

const links = [
  { href: "/",          label: "Home",         icon: Home },
  { href: "/discover",  label: "Discover",     icon: Compass },
  { href: "/create",    label: "Create Token", icon: Plus },
  { href: "/markets",   label: "Markets",      icon: TrendingUp },
  { href: "/how-it-works", label: "How It Works", icon: BookOpen },
];

/**
 * Figma-sourced sidebar:
 *   - Width: 291px (token: --sidebar-w)
 *   - Background: var(--color-bg)  (#0E0E0E)
 *   - Active item: green left border + green text
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden lg:flex flex-col shrink-0 border-r border-figma-surface bg-figma-bg"
      style={{ width: "var(--sidebar-w)" }}
    >
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-3 px-6 h-16 border-b border-figma-surface"
      >
        <div className="w-9 h-9 rounded-lg gradient-lick flex items-center justify-center text-black text-xl font-bold">
          🦎
        </div>
        <div>
          <h1 className="text-lg font-bold text-gradient-lick">Lick.fun</h1>
          <p className="text-figma-xs text-figma-muted leading-none">
            a meme lake on liquidity fun
          </p>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/" && pathname.startsWith(link.href + "/"));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 border-l-2",
                isActive
                  ? "bg-figma-surface text-figma-green border-figma-green"
                  : "border-transparent text-figma-muted hover:text-figma-white hover:bg-figma-surface"
              )}
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-figma-surface">
        <div className="flex items-center gap-2 text-figma-xs text-figma-muted">
          <Zap className="w-3.5 h-3.5 text-figma-green" />
          <span>Built on Monad</span>
        </div>
      </div>
    </aside>
  );
}