"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { cn } from "@/lib/utils";
import {
  Home,
  Compass,
  TrendingUp,
  BookOpen,
  Plus,
  Zap,
  User,
  Trophy,
  Gift,
} from "lucide-react";

const mainLinks = [
  { href: "/",          label: "Home",         icon: Home },
  { href: "/discover",  label: "Discover",     icon: Compass },
  { href: "/create",    label: "Create Token", icon: Plus },
  { href: "/markets",   label: "Markets",      icon: TrendingUp },
  { href: "/how-it-works", label: "How It Works", icon: BookOpen },
];

const extraLinks = [
  { href: "/profile", label: "Profile", icon: User },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/rewards", label: "Rewards", icon: Gift },
];

// Simple SVG social icons (lucide doesn't ship Telegram/Instagram/Discord variants)
const TwitterXIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
  </svg>
);

const DiscordIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const socialLinks = [
  { href: "https://x.com/lickdotfun", label: "X / Twitter", icon: TwitterXIcon },
  { href: "https://t.me/lickdotfun", label: "Telegram", icon: TelegramIcon },
  { href: "https://instagram.com/lickdotfun", label: "Instagram", icon: InstagramIcon },
  { href: "https://discord.gg/lickdotfun", label: "Discord", icon: DiscordIcon },
];

function isActiveLink(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
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
        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 border-l-2",
        active
          ? "bg-figma-surface text-figma-white border-figma-purple"
          : "border-transparent text-figma-muted hover:text-figma-white hover:bg-figma-surface"
      )}
    >
      <Icon className={cn("w-5 h-5", active ? "text-figma-purple" : "")} />
      {label}
    </Link>
  );
}

function DisabledNavLink({
  label,
  icon: Icon,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <span
      className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium border-l-2 border-transparent text-figma-muted opacity-40 cursor-not-allowed select-none"
      title="Connect wallet to view profile"
    >
      <Icon className="w-5 h-5" />
      {label}
    </span>
  );
}

/**
 * Figma-sourced sidebar:
 *   - Width: 291px (token: --sidebar-w)
 *   - Background: var(--color-bg)  (#0E0E0E)
 *   - Active item: green left border + green text
 */
export function Sidebar() {
  const pathname = usePathname();
  const { address } = useAccount();

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
        {mainLinks.map((link) => (
          <NavLink
            key={link.href}
            {...link}
            active={isActiveLink(pathname, link.href)}
          />
        ))}

        <div className="pt-4 mt-4 border-t border-figma-surface" />

        {extraLinks.map((link) => {
          if (link.href === "/profile") {
            if (!address) {
              return (
                <DisabledNavLink
                  key={link.href}
                  label={link.label}
                  icon={link.icon}
                />
              );
            }
            const href = `/profile/${address}`;
            return (
              <NavLink
                key={link.href}
                href={href}
                label={link.label}
                icon={link.icon}
                active={isActiveLink(pathname, href)}
              />
            );
          }
          return (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
              active={isActiveLink(pathname, link.href)}
            />
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-figma-surface space-y-4">
        <div className="flex items-center gap-2 text-figma-xs text-figma-muted">
          <Zap className="w-3.5 h-3.5 text-figma-green" />
          <span>Built on Monad</span>
        </div>

        <div className="flex items-center gap-3">
          {socialLinks.map(({ href, label, icon: Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="text-figma-muted hover:text-figma-green transition-colors"
            >
              <Icon />
            </a>
          ))}
        </div>

        <p className="text-figma-xs text-figma-muted">
          © 2026 Lick.fun. All rights reserved
        </p>
      </div>
    </aside>
  );
}
