"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Compass,
  User,
  TrendingUp,
  BookOpen,
} from "lucide-react";

const links = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/markets", label: "Markets", icon: TrendingUp },
  { href: "/how-it-works", label: "Learn", icon: BookOpen },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex items-center justify-around h-16">
        {links.map((link) => {
          const isActive =
            pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg text-xs font-medium transition-all",
                isActive
                  ? "text-lick-orange-light"
                  : "text-muted-foreground"
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