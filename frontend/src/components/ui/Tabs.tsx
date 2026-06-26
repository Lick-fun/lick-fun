"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Tabs — lightweight, no Radix dependency                                          */
/* ──────────────────────────────────────────────────────────────────────────────── */

interface TabsContextValue {
  value: string;
  onChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("Tabs components must be used within <Tabs>");
  return ctx;
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Root                                                                              */
/* ──────────────────────────────────────────────────────────────────────────────── */

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onChange: onValueChange }}>
      <div className={cn("flex flex-col gap-4", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* List (the tab strip)                                                              */
/* ──────────────────────────────────────────────────────────────────────────────── */

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 p-1 bg-figma-surface rounded-pill",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Trigger (individual tab button)                                                  */
/* ──────────────────────────────────────────────────────────────────────────────── */

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  /** Optional badge count to show next to the label */
  count?: number;
}

export function TabsTrigger({ value, children, className, count }: TabsTriggerProps) {
  const { value: active, onChange } = useTabsContext();
  const isActive = active === value;

  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-pill text-figma-xs font-medium transition-all",
        isActive
          ? "bg-figma-green text-figma-bg"
          : "text-figma-muted hover:text-figma-white hover:bg-figma-card-alt",
        className
      )}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold",
            isActive
              ? "bg-figma-bg text-figma-green"
              : "bg-figma-card-alt text-figma-muted"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────── */
/* Content (panel for each tab)                                                      */
/* ──────────────────────────────────────────────────────────────────────────────── */

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const { value: active } = useTabsContext();
  if (active !== value) return null;
  return <div className={cn("w-full", className)}>{children}</div>;
}