import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  height?: "sm" | "md" | "lg";
  showLabel?: boolean;
  graduated?: boolean;
}

export function ProgressBar({
  value,
  className,
  height = "md",
  showLabel = false,
  graduated = false,
}: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 100);

  const heightClass = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  }[height];

  // Color: green if graduated, orange→yellow→green gradient based on progress
  const fillClass = graduated
    ? "bg-gradient-to-r from-green-500 to-green-400"
    : clamped >= 80
    ? "bg-gradient-to-r from-lick-orange via-yellow-400 to-green-400"
    : clamped >= 50
    ? "bg-gradient-to-r from-lick-orange to-yellow-400"
    : "bg-gradient-to-r from-lick-orange-dark to-lick-orange";

  return (
    <div className={cn("relative w-full rounded-full bg-secondary overflow-hidden", heightClass, className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-700 ease-out", fillClass)}
        style={{ width: `${clamped}%` }}
      />
      {showLabel && height === "lg" && (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/90 mix-blend-plus-lighter">
          {clamped.toFixed(1)}%
        </span>
      )}
    </div>
  );
}
