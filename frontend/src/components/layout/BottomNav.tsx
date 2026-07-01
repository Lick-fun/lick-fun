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

// Split evenly around the raised center "Create" action
const leftLinks = [
  { href: "/",         label: "Home",     icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
];

const rightLinks = [
  { href: "/markets",      label: "Markets", icon: TrendingUp },
  { href: "/how-it-works", label: "Learn",   icon: BookOpen },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
        active ? "text-figma-green" : "text-figma-muted"
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

/**
 * Mobile bottom navigation.
 *   - Fixed to bottom, 64px tall
 *   - "Create Token" is the primary CTA, raised as a center floating action
 *     button so it stays prominent even though "Profile" moved into the
 *     wallet dropdown menu.
 *   - Remaining 4 links split evenly left/right for balance on small screens.
 */
export function BottomNav() {
  const pathname = usePathname();
  const createActive = isActive(pathname, "/create");

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-figma-surface bg-figma-bg">
      <div className="relative flex items-stretch h-16 px-1">
        {leftLinks.map((link) => (
          <NavItem
            key={link.href}
            {...link}
            active={isActive(pathname, link.href)}
          />
        ))}

        {/* Spacer reserves room for the raised center FAB */}
        <div className="w-16 shrink-0" aria-hidden="true" />

        {rightLinks.map((link) => (
          <NavItem
            key={link.href}
            {...link}
            active={isActive(pathname, link.href)}
          />
        ))}

        {/* Raised center "Create" action */}
        <Link
          href="/create"
          aria-label="Create Token"
          className="absolute left-1/2 -translate-x-1/2 -top-5 flex flex-col items-center gap-1"
        >
          <span
            className={cn(
              "flex items-center justify-center w-12 h-12 rounded-full shadow-lg border-4 border-figma-bg transition-colors",
              createActive
                ? "bg-figma-green text-figma-bg"
                : "bg-figma-purple text-white"
            )}
          >
            <Plus className="w-6 h-6" />
          </span>
          <span
            className={cn(
              "text-[11px] font-medium leading-none",
              createActive ? "text-figma-green" : "text-figma-muted"
            )}
          >
            Create
          </span>
        </Link>
      </div>
    </nav>
  );
}
