import { cn } from "@/lib/utils";
import type { Tier } from "@/lib/hooks/useData";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "live" | "graduated" | "starter" | "established" | "verified" | "default";
  className?: string;
  size?: "sm" | "md";
}

export function Badge({ children, variant = "default", className, size = "sm" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium rounded-full border",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        variant === "live" && "bg-lick-orange/10 border-lick-orange/30 text-lick-orange-light",
        variant === "graduated" && "bg-green-500/10 border-green-500/30 text-green-400",
        variant === "starter" && "bg-gray-500/10 border-gray-500/30 text-gray-400",
        variant === "established" && "bg-blue-500/10 border-blue-500/30 text-blue-400",
        variant === "verified" && "bg-amber-500/10 border-amber-500/30 text-amber-400",
        variant === "default" && "bg-secondary border-border text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}

export function TierBadge({ tier, size = "sm" }: { tier: Tier; size?: "sm" | "md" }) {
  const variant = tier === "Verified" ? "verified" : tier === "Established" ? "established" : "starter";
  const emoji = tier === "Verified" ? "👑" : tier === "Established" ? "⭐" : "🌱";
  return (
    <Badge variant={variant} size={size}>
      {emoji} {tier}
    </Badge>
  );
}
