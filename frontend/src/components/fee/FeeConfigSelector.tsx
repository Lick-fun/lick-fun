"use client";

import { useState, useCallback } from "react";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import * as Label from "@radix-ui/react-label";
import { Info, AlertCircle, Lock } from "lucide-react";
import clsx from "clsx";

/**
 * FeeConfigSelector — Tier-based fee configuration UI.
 *
 * Allows the user to pick a preset (STARTER / CREATOR EXTRA / CREATOR + LP SUPPORT / CUSTOM)
 * or define a custom split for CUSTOM (Diamond) tier tokens.
 *
 * CUSTOM (Diamond) is fully customisable — any split that sums to 100% is valid.
 * No minimum on any field.
 *
 * The component is purely presentational — it emits the selected preset
 * and (for CUSTOM) the custom config via the `onChange` callback.
 *
 * Reputation gating: pass `allowedPresets` to restrict which tiers are selectable
 * based on the connected wallet's reputation tier. Locked tiers are shown greyed-out
 * with a tooltip explaining the requirement.
 */

export type FeePreset = "LIGHT" | "STANDARD_A" | "STANDARD_B" | "DIAMOND";

export interface CustomFeeConfig {
  /** Creator share in basis points (0–10000). */
  creatorBps: number;
  /** LP support share in basis points (0–10000). */
  lpBps: number;
  /** Buyback & burn share in basis points (0–10000). */
  burnBps: number;
}

interface FeeConfigSelectorProps {
  /** Called whenever the user changes the preset or custom config.
   *  `isValid` indicates whether the current selection is a valid, submittable config
   *  (presets are always valid; CUSTOM is valid only when shares sum to 100%). */
  onChange?: (
    preset: FeePreset,
    customConfig?: CustomFeeConfig,
    isValid?: boolean,
  ) => void;
  /** Initial preset selection. Defaults to "LIGHT". */
  defaultPreset?: FeePreset;
  /** Optional list of presets the connected wallet is allowed to select.
   *  If omitted, all presets are available. Locked presets are shown greyed-out. */
  allowedPresets?: FeePreset[];
}

const BPS_DENOM = 10_000;

const PRESET_INFO: Record<
  FeePreset,
  { name: string; split: string; description: string }
> = {
  LIGHT: {
    name: "STARTER",
    split: "10% creator · 80% LP · 10% burn",
    description: "Entry tier — minimal creator share, maximum LP support",
  },
  STANDARD_A: {
    name: "CREATOR EXTRA",
    split: "30% creator · 60% LP · 10% burn",
    description: "Builder tier — balanced creator earnings",
  },
  STANDARD_B: {
    name: "CREATOR + LP SUPPORT",
    split: "20% creator · 70% LP · 10% burn",
    description: "Community-focused split",
  },
  DIAMOND: {
    name: "CUSTOM",
    split: "Custom — you choose",
    description: "Fully customisable — set any allocation you want",
  },
};

/** Reputation tier required to access each preset. */
const PRESET_MIN_TIER: Record<FeePreset, "Starter" | "Established" | "Verified"> = {
  LIGHT: "Starter",
  STANDARD_A: "Established",
  STANDARD_B: "Established",
  DIAMOND: "Verified",
};

export function FeeConfigSelector({
  onChange,
  defaultPreset = "LIGHT",
  allowedPresets,
}: FeeConfigSelectorProps) {
  const [preset, setPreset] = useState<FeePreset>(defaultPreset);
  const [custom, setCustom] = useState<CustomFeeConfig>({
    creatorBps: 0,
    lpBps: 8000,
    burnBps: 2000,
  });

  const isAllowed = useCallback(
    (p: FeePreset) => !allowedPresets || allowedPresets.includes(p),
    [allowedPresets],
  );

  const handlePresetChange = useCallback(
    (value: string) => {
      if (!value) return;
      const newPreset = value as FeePreset;
      if (!isAllowed(newPreset)) return;
      setPreset(newPreset);
      if (newPreset === "DIAMOND") {
        // For CUSTOM, validity depends on the current custom split.
        const valid = custom.creatorBps + custom.lpBps + custom.burnBps === BPS_DENOM;
        onChange?.(newPreset, custom, valid);
      } else {
        onChange?.(newPreset, undefined, true);
      }
    },
    [onChange, custom, isAllowed],
  );

  const handleCustomChange = useCallback(
    (field: keyof CustomFeeConfig, value: number) => {
      const newCustom = { ...custom, [field]: value };
      setCustom(newCustom);
      const valid = newCustom.creatorBps + newCustom.lpBps + newCustom.burnBps === BPS_DENOM;
      onChange?.("DIAMOND", newCustom, valid);
    },
    [custom, onChange],
  );

  const sumValid =
    custom.creatorBps + custom.lpBps + custom.burnBps === BPS_DENOM;

  return (
    <div className="w-full space-y-4">
      {/* ─── Preset selector ─────────────────────────────────────────────── */}
      <div>
        <Label.Root className="mb-2 block text-figma-md font-medium text-figma-white">
          Fee Tier
        </Label.Root>
        <ToggleGroup.Root
          type="single"
          value={preset}
          onValueChange={handlePresetChange}
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          {(Object.keys(PRESET_INFO) as FeePreset[]).map((p) => {
            const allowed = isAllowed(p);
            return (
              <ToggleGroup.Item
                key={p}
                value={p}
                disabled={!allowed}
                title={
                  allowed
                    ? undefined
                    : `Requires ${PRESET_MIN_TIER[p]} reputation`
                }
                className={clsx(
                  "relative rounded-pill border px-3 py-3 text-left transition-colors",
                  allowed
                    ? "data-[state=on]:border-figma-green data-[state=on]:bg-figma-green/10 data-[state=off]:border-figma-surface data-[state=off]:bg-figma-card hover:border-figma-green/50"
                    : "border-figma-surface bg-figma-card/40 opacity-40 cursor-not-allowed",
                )}
              >
                {!allowed && (
                  <Lock className="absolute right-2 top-2 h-3 w-3 text-figma-muted" />
                )}
                <div className="text-figma-md font-semibold text-figma-white">
                  {PRESET_INFO[p].name}
                </div>
                <div className="mt-1 text-figma-xs text-figma-muted">
                  {PRESET_INFO[p].split}
                </div>
              </ToggleGroup.Item>
            );
          })}
        </ToggleGroup.Root>
        {allowedPresets && (
          <p className="mt-2 text-figma-xs text-figma-muted">
            Locked tiers require a higher reputation score.
          </p>
        )}
      </div>

      {/* ─── DIAMOND custom sliders ───────────────────────────────────────── */}
      {preset === "DIAMOND" && (
        <div className="animate-slide-up space-y-4 rounded-card border border-figma-surface bg-figma-card p-4">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-figma-green" />
            <p className="text-figma-sm text-figma-muted">
              Fully customisable — set any allocation you want. All three shares
              must total 100%.
            </p>
          </div>

          {/* Creator slider */}
          <div>
            <div className="mb-1 flex justify-between">
              <Label.Root className="text-figma-sm text-figma-white">
                Creator
              </Label.Root>
              <span className="text-figma-sm text-figma-muted">
                {(custom.creatorBps / 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={BPS_DENOM}
              step={100}
              value={custom.creatorBps}
              onChange={(e) =>
                handleCustomChange("creatorBps", Number(e.target.value))
              }
              className="w-full accent-figma-green"
            />
          </div>

          {/* LP slider — no floor */}
          <div>
            <div className="mb-1 flex justify-between">
              <Label.Root className="text-figma-sm text-figma-white">
                LP Support
              </Label.Root>
              <span className="text-figma-sm text-figma-muted">
                {(custom.lpBps / 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={BPS_DENOM}
              step={100}
              value={custom.lpBps}
              onChange={(e) =>
                handleCustomChange("lpBps", Number(e.target.value))
              }
              className="w-full accent-figma-green"
            />
          </div>

          {/* Burn slider */}
          <div>
            <div className="mb-1 flex justify-between">
              <Label.Root className="text-figma-sm text-figma-white">
                Buyback &amp; Burn
              </Label.Root>
              <span className="text-figma-sm text-figma-muted">
                {(custom.burnBps / 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={BPS_DENOM}
              step={100}
              value={custom.burnBps}
              onChange={(e) =>
                handleCustomChange("burnBps", Number(e.target.value))
              }
              className="w-full accent-figma-green"
            />
          </div>

          {/* Sum validation */}
          {!sumValid && (
            <div className="flex items-center gap-1 text-figma-xs text-figma-red">
              <AlertCircle className="h-3 w-3" />
              Splits must total 100%
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FeeConfigSelector;