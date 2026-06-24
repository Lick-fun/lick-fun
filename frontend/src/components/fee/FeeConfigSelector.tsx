"use client";

import { useState, useCallback } from "react";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import * as Label from "@radix-ui/react-label";
import { Info, AlertCircle } from "lucide-react";
import clsx from "clsx";

/**
 * FeeConfigSelector — Phase 2 tier-based fee configuration UI.
 *
 * Allows the user to pick a preset (LIGHT / STANDARD_A / STANDARD_B / DIAMOND)
 * or define a custom split for DIAMOND tier tokens.
 *
 * DIAMOND enforces:
 *   - LP support ≥ 80% (8000 bps)
 *   - All three shares must sum to 100% (10000 bps)
 *
 * The component is purely presentational — it emits the selected preset
 * and (for DIAMOND) the custom config via the `onChange` callback.
 */

export type FeePreset = "LIGHT" | "STANDARD_A" | "STANDARD_B" | "DIAMOND";

export interface CustomFeeConfig {
  /** Creator share in basis points (0–10000). */
  creatorBps: number;
  /** LP support share in basis points (must be ≥ 8000 for DIAMOND). */
  lpBps: number;
  /** Buyback & burn share in basis points (0–10000). */
  burnBps: number;
}

interface FeeConfigSelectorProps {
  /** Called whenever the user changes the preset or custom config.
   *  `isValid` indicates whether the current selection is a valid, submittable config
   *  (presets are always valid; DIAMOND is valid only when LP ≥ 80% and shares sum to 100%). */
  onChange?: (
    preset: FeePreset,
    customConfig?: CustomFeeConfig,
    isValid?: boolean,
  ) => void;
  /** Initial preset selection. Defaults to "LIGHT". */
  defaultPreset?: FeePreset;
}

const LP_FLOOR_BPS = 8000; // 80% — DIAMOND floor
const BPS_DENOM = 10_000;

const PRESET_INFO: Record<
  FeePreset,
  { name: string; split: string; description: string }
> = {
  LIGHT: {
    name: "LIGHT",
    split: "10% creator · 80% LP · 10% burn",
    description: "Entry tier — minimal creator share, maximum LP support",
  },
  STANDARD_A: {
    name: "STANDARD A",
    split: "30% creator · 60% LP · 10% burn",
    description: "Builder tier — balanced creator earnings",
  },
  STANDARD_B: {
    name: "STANDARD B",
    split: "20% creator · 70% LP · 10% burn",
    description: "Ecosystem tier — community-focused split",
  },
  DIAMOND: {
    name: "DIAMOND",
    split: "Custom — you choose",
    description: "Custom split — LP must be ≥ 80%",
  },
};

export function FeeConfigSelector({
  onChange,
  defaultPreset = "LIGHT",
}: FeeConfigSelectorProps) {
  const [preset, setPreset] = useState<FeePreset>(defaultPreset);
  const [custom, setCustom] = useState<CustomFeeConfig>({
    creatorBps: 0,
    lpBps: LP_FLOOR_BPS,
    burnBps: BPS_DENOM - LP_FLOOR_BPS,
  });

  const handlePresetChange = useCallback(
    (value: string) => {
      if (!value) return;
      const newPreset = value as FeePreset;
      setPreset(newPreset);
      if (newPreset === "DIAMOND") {
        // Presets other than DIAMOND are always valid; for DIAMOND,
        // validity depends on the current custom split — compute from latest `custom`.
        const valid =
          custom.lpBps >= LP_FLOOR_BPS &&
          custom.creatorBps + custom.lpBps + custom.burnBps === BPS_DENOM;
        onChange?.(newPreset, custom, valid);
      } else {
        onChange?.(newPreset, undefined, true);
      }
    },
    [onChange, custom],
  );

  const handleCustomChange = useCallback(
    (field: keyof CustomFeeConfig, value: number) => {
      const newCustom = { ...custom, [field]: value };
      setCustom(newCustom);
      const valid =
        newCustom.lpBps >= LP_FLOOR_BPS &&
        newCustom.creatorBps + newCustom.lpBps + newCustom.burnBps === BPS_DENOM;
      onChange?.("DIAMOND", newCustom, valid);
    },
    [custom, onChange],
  );

  const lpBelowFloor = custom.lpBps < LP_FLOOR_BPS;
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
          {(Object.keys(PRESET_INFO) as FeePreset[]).map((p) => (
            <ToggleGroup.Item
              key={p}
              value={p}
              className={clsx(
                "rounded-pill border px-3 py-3 text-left transition-colors",
                "data-[state=on]:border-figma-green data-[state=on]:bg-figma-green/10",
                "data-[state=off]:border-figma-surface data-[state=off]:bg-figma-card",
                "hover:border-figma-green/50",
              )}
            >
              <div className="text-figma-md font-semibold text-figma-white">
                {PRESET_INFO[p].name}
              </div>
              <div className="mt-1 text-figma-xs text-figma-muted">
                {PRESET_INFO[p].split}
              </div>
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>
      </div>

      {/* ─── DIAMOND custom sliders ───────────────────────────────────────── */}
      {preset === "DIAMOND" && (
        <div className="animate-slide-up space-y-4 rounded-card border border-figma-surface bg-figma-card p-4">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-figma-green" />
            <p className="text-figma-sm text-figma-muted">
              Custom split — LP support must be at least 80%. All three shares
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

          {/* LP slider — min 80% */}
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
              min={LP_FLOOR_BPS}
              max={BPS_DENOM}
              step={100}
              value={custom.lpBps}
              onChange={(e) =>
                handleCustomChange("lpBps", Number(e.target.value))
              }
              className="w-full accent-figma-green"
            />
            {lpBelowFloor && (
              <div className="mt-1 flex items-center gap-1 text-figma-xs text-figma-red">
                <AlertCircle className="h-3 w-3" />
                LP support must be at least 80%
              </div>
            )}
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