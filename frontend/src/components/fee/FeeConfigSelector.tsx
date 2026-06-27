"use client";

import { useState, useCallback } from "react";
import * as Label from "@radix-ui/react-label";
import { AlertCircle, Flame, Droplets, User, Gift } from "lucide-react";
import clsx from "clsx";
import { isAddress } from "viem";

/**
 * FeeConfigSelector — Custom fee allocation UI.
 *
 * Four fee destinations: Buyback & Burn · LP Support · Creator · Gift
 * Each row has an ON/OFF toggle and a % input in the summary.
 * Gift row reveals a wallet address input when toggled ON.
 *
 * All enabled shares must sum to exactly 100%. The component emits
 * (config, isValid) on every change. isValid is false when sum ≠ 100%
 * or when gift is ON but no valid address is entered.
 *
 * No tier gating — available to all users.
 */

// ─── Exported types ──────────────────────────────────────────────────────────

/** @deprecated kept for backwards compat — only DIAMOND is used now */
export type FeePreset = "LIGHT" | "STANDARD_A" | "STANDARD_B" | "DIAMOND";

export interface CustomFeeConfig {
  creatorBps: number;
  lpBps: number;
  burnBps: number;
  giftBps: number;
  giftRecipient: string;
}

export interface FeeConfigSelectorProps {
  onChange?: (config: CustomFeeConfig, isValid: boolean) => void;
  defaultConfig?: CustomFeeConfig;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BPS_DENOM = 10_000;

const DEFAULT_CONFIG: CustomFeeConfig = {
  burnBps: 1000,    // 10%
  lpBps: 8000,      // 80%
  creatorBps: 1000, // 10%
  giftBps: 0,
  giftRecipient: "",
};

type RowKey = "burn" | "lp" | "creator" | "gift";

interface RowDef {
  key: RowKey;
  label: string;
  description: string;
  icon: React.ReactNode;
  configKey: keyof Pick<CustomFeeConfig, "burnBps" | "lpBps" | "creatorBps" | "giftBps">;
}

const ROWS: RowDef[] = [
  {
    key: "burn",
    label: "Buyback & Burn",
    description: "Used to buy back and burn tokens, reducing supply",
    icon: <Flame className="h-4 w-4 text-orange-400" />,
    configKey: "burnBps",
  },
  {
    key: "lp",
    label: "LP Support",
    description: "Feeds into liquidity pools to deepen token liquidity",
    icon: <Droplets className="h-4 w-4 text-blue-400" />,
    configKey: "lpBps",
  },
  {
    key: "creator",
    label: "Creator",
    description: "Sent directly to your wallet on every trade",
    icon: <User className="h-4 w-4 text-figma-green" />,
    configKey: "creatorBps",
  },
  {
    key: "gift",
    label: "Gift",
    description: "Split to any wallet — team, partner or community fund",
    icon: <Gift className="h-4 w-4 text-figma-purple-soft" />,
    configKey: "giftBps",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function FeeConfigSelector({
  onChange,
  defaultConfig = DEFAULT_CONFIG,
}: FeeConfigSelectorProps) {
  const [config, setConfig] = useState<CustomFeeConfig>(defaultConfig);
  // Gift defaults OFF; all others default ON
  const [enabled, setEnabled] = useState<Record<RowKey, boolean>>({
    burn: true,
    lp: true,
    creator: true,
    gift: false,
  });

  const totalBps =
    config.burnBps + config.lpBps + config.creatorBps + config.giftBps;
  const totalPct = totalBps / 100;
  const sumValid = totalBps === BPS_DENOM;
  const giftAddressValid =
    !enabled.gift || (config.giftBps === 0) || isAddress(config.giftRecipient);
  const _isValid = sumValid && giftAddressValid;

  const emit = useCallback(
    (next: CustomFeeConfig, nextEnabled: Record<RowKey, boolean>) => {
      const total =
        next.burnBps + next.lpBps + next.creatorBps + next.giftBps;
      const giftOk =
        !nextEnabled.gift || next.giftBps === 0 || isAddress(next.giftRecipient);
      onChange?.(next, total === BPS_DENOM && giftOk);
    },
    [onChange],
  );

  // Toggle a row ON / OFF
  const handleToggle = useCallback(
    (key: RowKey) => {
      const nowEnabled = !enabled[key];
      const nextEnabled = { ...enabled, [key]: nowEnabled };

      let nextConfig = { ...config };
      if (!nowEnabled) {
        // Turning OFF — zero out its bps
        const bpsKey = ROWS.find((r) => r.key === key)!.configKey;
        nextConfig = { ...nextConfig, [bpsKey]: 0 };
        if (key === "gift") nextConfig.giftRecipient = "";
      }

      setEnabled(nextEnabled);
      setConfig(nextConfig);
      emit(nextConfig, nextEnabled);
    },
    [enabled, config, emit],
  );

  // % input change
  const handlePctChange = useCallback(
    (key: RowKey, rawValue: string) => {
      const bpsKey = ROWS.find((r) => r.key === key)!.configKey;
      const pct = Number(rawValue);
      const bps = Number.isFinite(pct) ? Math.round(Math.min(100, Math.max(0, pct)) * 100) : 0;
      const nextConfig = { ...config, [bpsKey]: bps };
      setConfig(nextConfig);
      emit(nextConfig, enabled);
    },
    [config, enabled, emit],
  );

  // Gift address change
  const handleAddressChange = useCallback(
    (value: string) => {
      const nextConfig = { ...config, giftRecipient: value };
      setConfig(nextConfig);
      emit(nextConfig, enabled);
    },
    [config, enabled, emit],
  );

  const getBps = (key: RowKey) =>
    config[ROWS.find((r) => r.key === key)!.configKey];

  return (
    <div className="w-full space-y-3">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div>
        <Label.Root className="block text-figma-md font-semibold text-figma-white">
          Fee Strategy{" "}
          <span className="font-normal text-figma-muted">(Required)</span>
        </Label.Root>
        <p className="mt-0.5 text-figma-xs text-figma-muted">
          Allocate the 1% creator fee collected on every trade.
        </p>
      </div>

      {/* ─── Toggle rows ─────────────────────────────────────────────────── */}
      <div className="divide-y divide-figma-surface rounded-card border border-figma-surface overflow-hidden">
        {ROWS.map((row) => {
          const isOn = enabled[row.key];
          return (
            <div key={row.key} className="bg-figma-surface/50">
              {/* Row header */}
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="shrink-0">{row.icon}</span>
                  <div className="min-w-0">
                    <div className="text-figma-sm font-semibold text-figma-white">
                      {row.label}
                    </div>
                    <div className="text-figma-xs text-figma-muted leading-tight mt-0.5 truncate">
                      {row.description}
                    </div>
                  </div>
                </div>

                {/* Toggle switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isOn}
                  onClick={() => handleToggle(row.key)}
                  className={clsx(
                    "relative shrink-0 h-6 w-11 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-figma-green",
                    isOn ? "bg-figma-green" : "bg-figma-surface border border-white/20",
                  )}
                >
                  <span
                    className={clsx(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
                      isOn ? "translate-x-5" : "translate-x-0.5",
                    )}
                  />
                </button>
              </div>

              {/* Gift address input — shown only when gift is ON */}
              {row.key === "gift" && isOn && (
                <div className="px-4 pb-3">
                  <input
                    type="text"
                    placeholder="Recipient wallet address (0x…)"
                    value={config.giftRecipient}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    className={clsx(
                      "w-full rounded-pill border bg-figma-card px-3 py-2 text-figma-sm text-figma-white placeholder-figma-muted/60 outline-none transition-colors",
                      config.giftRecipient && !isAddress(config.giftRecipient)
                        ? "border-figma-red focus:border-figma-red"
                        : "border-figma-surface focus:border-figma-green",
                    )}
                  />
                  {config.giftRecipient && !isAddress(config.giftRecipient) && (
                    <p className="mt-1 flex items-center gap-1 text-figma-xs text-figma-red">
                      <AlertCircle className="h-3 w-3" />
                      Enter a valid wallet address
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Summary bar ─────────────────────────────────────────────────── */}
      <div className="rounded-card border border-figma-surface bg-figma-card p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <span className="text-figma-xs font-semibold uppercase tracking-wider text-figma-muted">
            Summary <span className="font-normal normal-case">(Total 1% Fee)</span>
          </span>
          <span
            className={clsx(
              "text-figma-sm font-bold tabular-nums",
              sumValid ? "text-figma-green" : "text-figma-red",
            )}
          >
            {totalPct.toFixed(0)}% / 100%
          </span>
        </div>

        {/* Allocation rows — only enabled destinations */}
        <div className="space-y-2">
          {ROWS.filter((r) => enabled[r.key]).map((row) => (
            <div key={row.key} className="flex items-center gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="shrink-0">{row.icon}</span>
                <span className="text-figma-sm text-figma-white truncate">
                  {row.label}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={getBps(row.key) / 100}
                  onChange={(e) => handlePctChange(row.key, e.target.value)}
                  className="w-14 rounded-pill border border-figma-surface bg-figma-surface px-2 py-1 text-right text-figma-sm text-figma-white tabular-nums outline-none focus:border-figma-green [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <span className="text-figma-sm text-figma-muted">%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Validation error */}
        {!sumValid && (
          <div className="flex items-center gap-1.5 text-figma-xs text-figma-red pt-1 border-t border-figma-surface">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>Total allocation must equal 100%</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default FeeConfigSelector;