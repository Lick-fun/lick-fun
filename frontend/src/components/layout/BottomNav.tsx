"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Compass, TrendingUp, BookOpen, Plus } from "lucide-react";

const leftLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/discover", label: "Explore", icon: Compass },
];
const rightLinks = [
  { href: "/markets", label: "Markets", icon: TrendingUp },
  { href: "/how-it-works", label: "Learn", icon: BookOpen },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

function NavItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; active: boolean }) {
  return (
    <Link href={href} className={cn("flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors", active ? "text-figma-purple-soft" : "text-figma-muted hover:text-figma-white")}>
      <Icon className="size-5" />
      <span>{label}</span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const createActive = isActive(pathname, "/create");

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-figma-purple/20 bg-figma-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Mobile navigation">
      <div className="relative flex h-16 items-stretch px-1">
        {leftLinks.map((link) => <NavItem key={link.href} {...link} active={isActive(pathname, link.href)} />)}
        <div className="w-16 shrink-0" aria-hidden="true" />
        {rightLinks.map((link) => <NavItem key={link.href} {...link} active={isActive(pathname, link.href)} />)}
        <Link href="/create" aria-label="Launch a token" className="absolute left-1/2 -top-5 flex -translate-x-1/2 flex-col items-center gap-1">
          <span className={cn("flex size-13 items-center justify-center rounded-2xl border-4 border-figma-bg text-figma-white shadow-glow-purple transition-transform hover:-translate-y-0.5", createActive ? "bg-figma-purple-soft" : "bg-figma-purple")}>
            <Plus className="size-6" strokeWidth={3} />
          </span>
          <span className={cn("text-[10px] font-extrabold uppercase tracking-wide", createActive ? "text-figma-purple-soft" : "text-figma-muted")}>Launch</span>
        </Link>
      </div>
    </nav>
  );
}
