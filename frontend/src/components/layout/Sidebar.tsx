"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Compass,
  User,
  TrendingUp,
  BookOpen,
  Zap,
} from "lucide-react";

const links = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/markets", label: "Markets", icon: TrendingUp },
  { href: "/how-it-works", label: "How It Works", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card shrink-0">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 px-6 h-16 border-b border-border">
        <div className="w-9 h-9 rounded-lg gradient-lick flex items-center justify-center">
          <span className="text-black text-xl font-bold">🦎</span>
        </div>
        <div>
          <h1 className="text-lg font-bold text-gradient-lick">Lick.fun</h1>
          <p className="text-[10px] text-muted-foreground leading-none">
            a meme lake on liquidity fun
          </p>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const isActive =
            pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-lick-orange/10 text-lick-orange-light border border-lick-orange/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Zap className="w-3.5 h-3.5 text-lick-orange" />
          <span>Built on Monad</span>
        </div>
      </div>
    </aside>
  );
}