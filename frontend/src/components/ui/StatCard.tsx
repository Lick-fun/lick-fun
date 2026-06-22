import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  iconColor?: string;
  valueColor?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = "text-lick-orange-light",
  valueColor,
  className,
  size = "md",
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card flex flex-col gap-1",
        size === "sm" && "p-3",
        size === "md" && "p-4",
        size === "lg" && "p-5",
        className
      )}
    >
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className={cn("shrink-0", iconColor, size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4")} />}
        <span className={cn("text-muted-foreground", size === "sm" ? "text-xs" : "text-xs")}>{label}</span>
      </div>
      <div
        className={cn(
          "font-bold font-mono",
          size === "sm" && "text-base",
          size === "md" && "text-xl",
          size === "lg" && "text-2xl",
          valueColor ?? "text-foreground"
        )}
      >
        {value}
      </div>
    </div>
  );
}
