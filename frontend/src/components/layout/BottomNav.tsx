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
} from "lucide-react";

const links = [
  { href: "/",            label: "Home",     icon: Home },
  { href: "/discover",    label: "Discover", icon: Compass },
  { href: "/create",      label: "Create",   icon: Plus },
  { href: "/markets",     label: "Markets",  icon: TrendingUp },
  { href: "/how-it-works", label: "Learn",   icon: BookOpen },
];

/**
 * Figma-sourced mobile bottom navigation.
 *   - Fixed to bottom, 64px tall
 *   - Active tab: green icon + label
 *   - bg-figma-bg with top border
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-figma-surface bg-figma-bg">
      <div className="flex items-center justify-around h-16">
        {links.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/" && pathname.startsWith(link.href + "/"));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg text-figma-xs font-medium transition-all",
                isActive
                  ? "text-figma-green"
                  : "text-figma-muted"
              )}
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}