"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 rounded-full",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        // Sizes
        size === "sm" && "px-4 py-1.5 text-xs",
        size === "md" && "px-6 py-2.5 text-sm",
        size === "lg" && "px-8 py-3.5 text-base",
        size === "icon" && "w-10 h-10 p-0",
        // Variants
        variant === "primary" &&
          "bg-gradient-to-r from-lick-orange to-lick-orange-dark text-black shadow-md shadow-lick-orange/20 hover:from-lick-orange-light hover:to-lick-orange hover:shadow-lick-orange/40 hover:scale-[1.02] active:scale-[0.98]",
        variant === "outline" &&
          "border border-lick-orange/50 text-lick-orange-light hover:bg-lick-orange/10 hover:border-lick-orange/80 hover:scale-[1.02] active:scale-[0.98]",
        variant === "ghost" &&
          "text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg",
        variant === "danger" &&
          "bg-red-500 text-white hover:bg-red-600 active:scale-[0.98]",
        variant === "success" &&
          "bg-green-500 text-black hover:bg-green-600 active:scale-[0.98]",
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
