"use client";

import { useMemo } from "react";
import { X, Droplets, Flame, User, Gift } from "lucide-react";
import { useFeeConfig, useFeeEvents, useVaultExecutions } from "@/lib/hooks/useFeeConfig";
import { formatAddress } from "@/lib/hooks/useData";

/* ─── Types ────────────────────────────────────────────────────────────────── */

interface FeeOverviewModalProps {
  tokenId: string;
  tokenSymbol: string;
  monUsdPrice?: number | null;
  onClose: () => void;
}

/* ─── Donut SVG ─────────────────────────────────────────────────────────────── */

interface DonutSegment {
  pct: number;
  color: string;
}

function DonutChart({ segments, total, subtitle }: { segments: DonutSegment[]; total: string; subtitle?: string }) {
  const R = 70;
  const STROKE = 22;
  const CX = 90;
  const CY = 90;
  const circumference = 2 * Math.PI * R;

  // Build stroke-dashoffset for each segment
  let cumulative = 0;
  const arcs = segments.map((seg) => {
    const dashLen = (seg.pct / 100) * circumference;
    const offset = circumference - cumulative * circumference / 100;
    cumulative += seg.pct;
    return { dashLen, offset, color: seg.color };
  });

  return (
    <div className="relative flex items-center justify-center">
      <svg width={180} height={180} viewBox="0 0 180 180">
        {/* background ring */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke="#1B1B1B"
          strokeWidth={STROKE}
        />
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={arc.color}
            strokeWidth={STROKE}
            strokeDasharray={`${arc.dashLen} ${circumference - arc.dashLen}`}
            strokeDashoffset={arc.offset}
            strokeLinecap="butt"
            style={{ transform: "rotate(-90deg)", transformOrigin: `${CX}px ${CY}px` }}
          />
        ))}
      </svg>
      {/* center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[10px] text-figma-muted font-medium">Fee Distribution</span>
        <span className="text-sm font-bold text-figma-white font-mono">{total}</span>
        {subtitle && <span className="text-[10px] text-figma-muted font-mono">{subtitle}</span>}
      </div>
    </div>
  );
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

function formatMon(val: bigint): string {
  const n = Number(val) / 1e18;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M MON`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K MON`;
  return `${n.toFixed(4)} MON`;
}

function formatUsd(val: bigint, monPrice: number): string {
  const usd = (Number(val) / 1e18) * monPrice;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(2)}K`;
  return `$${usd.toFixed(2)}`;
}

function bpsToPercent(bps: number): number {
  return bps / 100;
}

/** Formats a raw 18-decimal token amount into a compact human string (e.g. "998.43K"). */
function formatTokens(val: bigint): string {
  const n = Number(val) / 1e18;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(2);
}

/* ─── Slot component ────────────────────────────────────────────────────────── */

interface FeeSlotProps {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  percentage: number;
  totalMon: string;
  totalUsd?: string;
  claimAddress?: string;
  /** Number of FeeRouted events (one per trade that generated a fee). */
  tradesRouted?: number;
  lastRouted?: Date | null;
  /** Number of actual vault execute() calls (buyback/burn or LP-add). */
  executionCount?: number;
  lastExecuted?: Date | null;
  /** Result line for executions, e.g. "998.43K LICK burned" or "1.2 LP burned". */
  resultLabel?: string;
  resultValue?: string;
  /**
   * Actual MON spent across vault execute() calls (ground truth from VaultExecution
   * events). Shown separately from totalMon (which reflects fees routed from
   * trades) since the two can legitimately diverge — e.g. one-time manual
   * reconciliation deposits add to a vault's spendable balance without ever
   * emitting a FeeRouted event.
   */
  actualSpentMon?: string;
  /** Optional note shown at the bottom. */
  vaultNote?: string;
}

function FeeSlot({
  icon,
  label,
  subtitle,
  percentage,
  totalMon,
  totalUsd,
  claimAddress,
  tradesRouted,
  lastRouted,
  executionCount,
  lastExecuted,
  resultLabel,
  resultValue,
  actualSpentMon,
  vaultNote,
}: FeeSlotProps) {
  return (
    <div className="rounded-xl bg-figma-surface p-4 space-y-2.5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-figma-card flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-figma-white">{label}</span>
              <span className="text-[10px] text-figma-muted bg-figma-card px-1.5 py-0.5 rounded font-mono">
                {percentage.toFixed(0)}%
              </span>
            </div>
            <span className="text-[10px] text-figma-muted">{subtitle}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-figma-white font-mono">{actualSpentMon ?? totalMon}</div>
          {totalUsd && <div className="text-[10px] text-figma-muted font-mono">{totalUsd}</div>}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-figma-card" />

      {/* Detail rows */}
      <div className="space-y-1.5 text-[11px]">
        {actualSpentMon ? (
          <>
            <div className="flex justify-between text-figma-muted">
              <span>Actually Spent</span>
              <span className="font-mono text-figma-white">{actualSpentMon}</span>
            </div>
            <div className="flex justify-between text-figma-muted">
              <span>Fees Routed From Trades</span>
              <span className="font-mono text-figma-white">{totalMon}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between text-figma-muted">
            <span>Total Accumulated</span>
            <span className="font-mono text-figma-white">{totalMon}</span>
          </div>
        )}
        {claimAddress && (
          <div className="flex justify-between text-figma-muted">
            <span>Recipient</span>
            <span className="font-mono text-figma-green">{claimAddress}</span>
          </div>
        )}
        {tradesRouted !== undefined && (
          <div className="flex justify-between text-figma-muted">
            <span>Trades Routed</span>
            <span className="font-mono text-figma-white">{tradesRouted}</span>
          </div>
        )}
        {executionCount !== undefined && (
          <div className="flex justify-between text-figma-muted">
            <span>Executed</span>
            <span className="font-mono text-figma-white">
              {executionCount} {executionCount === 1 ? "Time" : "Times"}
            </span>
          </div>
        )}
        {resultLabel && resultValue && (
          <div className="flex justify-between text-figma-muted">
            <span>{resultLabel}</span>
            <span className="font-mono text-figma-white">{resultValue}</span>
          </div>
        )}
        {(executionCount !== undefined || lastExecuted || lastRouted) && (
          <div className="flex justify-between text-figma-muted">
            <span>{executionCount !== undefined ? "Last Executed" : "Last Routed"}</span>
            {(lastExecuted ?? lastRouted) ? (
              <span className="font-mono text-figma-white">
                {(lastExecuted ?? lastRouted)!.toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })}
                {" "}
                {(lastExecuted ?? lastRouted)!.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </span>
            ) : (
              <span className="text-figma-muted">—</span>
            )}
          </div>
        )}
        {vaultNote && (
          <div className="mt-1 pt-1.5 border-t border-figma-card text-[10px] text-figma-muted leading-relaxed">
            {vaultNote}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Modal ────────────────────────────────────────────────────────────── */

export function FeeOverviewModal({ tokenId, tokenSymbol, monUsdPrice, onClose }: FeeOverviewModalProps) {
  const { config } = useFeeConfig(tokenId);
  const { data: feeData } = useFeeEvents(tokenId);
  const { data: vaultExec } = useVaultExecutions(tokenId);

  // Default config (standard: LP 70%, Creator 20%, Burn 10%)
  const lpPct = config ? bpsToPercent(config.lpSupportBps) : 70;
  const creatorPct = config ? bpsToPercent(config.creatorShareBps) : 20;
  const burnPct = config ? bpsToPercent(config.buybackBurnBps) : 10;
  const giftPct = config ? bpsToPercent(config.giftBps) : 0;

  // Total fee collected — show in MON (the actual on-chain value)
  const totalMonFormatted = feeData
    ? (() => {
        const n = Number(feeData.totalAmount) / 1e18;
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M MON`;
        if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K MON`;
        return `${n.toFixed(4)} MON`;
      })()
    : "0 MON";

  // USD subtitle using real MON price (only if available)
  const totalUsdFormatted =
    feeData && monUsdPrice
      ? formatUsd(feeData.totalAmount, monUsdPrice)
      : null;

  // Donut segments
  const segments = useMemo((): DonutSegment[] => {
    const segs: DonutSegment[] = [];
    if (lpPct > 0) segs.push({ pct: lpPct, color: "#4C9EFF" }); // blue
    if (creatorPct > 0) segs.push({ pct: creatorPct, color: "#6E44D2" }); // purple
    if (burnPct > 0) segs.push({ pct: burnPct, color: "#F97316" }); // orange
    if (giftPct > 0) segs.push({ pct: giftPct, color: "#9B6FFF" }); // soft purple
    return segs;
  }, [lpPct, creatorPct, burnPct, giftPct]);

  // Actual spent totals (ground truth from VaultExecution events) — used to
  // display the true amount bought-back-and-burned / added-as-liquidity,
  // which can legitimately exceed the fee-routed total (see useFeeConfig.ts).
  const lpActualSpent =
    vaultExec && vaultExec.lp.count > 0 ? formatMon(vaultExec.lp.totalMon) : undefined;
  const buybackActualSpent =
    vaultExec && vaultExec.buyback.count > 0 ? formatMon(vaultExec.buyback.totalMon) : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg rounded-xl border border-figma-surface bg-figma-card max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-figma-surface sticky top-0 bg-figma-card z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-figma-muted bg-figma-surface px-2 py-0.5 rounded font-semibold">
                Customizable Fee: 1%
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-semibold text-figma-muted">Fee Overview</span>
              <span className="text-xs text-figma-white font-bold">{tokenSymbol}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-figma-muted hover:text-figma-white transition-colors p-1 rounded-lg hover:bg-figma-surface"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Fee allocation section */}
          <div>
            <h3 className="text-xs font-semibold text-figma-muted uppercase tracking-wider mb-3">
              Fee Allocation
            </h3>

            {/* Two-column layout: donut + legend */}
            <div className="flex items-center gap-6">
              {/* Donut */}
              <div className="shrink-0">
                <DonutChart segments={segments} total={totalMonFormatted} subtitle={totalUsdFormatted ?? undefined} />
              </div>

              {/* Legend + customizable fee strategy */}
              <div className="flex-1 space-y-3">
                <div className="text-xs font-semibold text-figma-white mb-2">
                  Customizable Fee Strategy
                </div>
                {lpPct > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "#4C9EFF" }} />
                    <Droplets className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="text-figma-white font-medium flex-1">LP Support</span>
                    <span className="text-figma-green font-bold font-mono">{lpPct.toFixed(0)}%</span>
                  </div>
                )}
                {creatorPct > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "#6E44D2" }} />
                    <User className="w-3.5 h-3.5 text-figma-purple shrink-0" />
                    <span className="text-figma-white font-medium flex-1">Creator</span>
                    <span className="text-figma-green font-bold font-mono">{creatorPct.toFixed(0)}%</span>
                  </div>
                )}
                {burnPct > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "#F97316" }} />
                    <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span className="text-figma-white font-medium flex-1">Buyback & Burn</span>
                    <span className="text-figma-green font-bold font-mono">{burnPct.toFixed(0)}%</span>
                  </div>
                )}
                {giftPct > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "#9B6FFF" }} />
                    <Gift className="w-3.5 h-3.5 text-figma-purple-soft shrink-0" />
                    <span className="text-figma-white font-medium flex-1">Gift</span>
                    <span className="text-figma-green font-bold font-mono">{giftPct.toFixed(0)}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detailed fee slots */}
          <div className="space-y-3">
            {lpPct > 0 && (
              <FeeSlot
                icon={<Droplets className="w-4 h-4 text-blue-400" />}
                label="LP Support"
                subtitle="Auto-adds liquidity at 50 MON."
                percentage={lpPct}
                totalMon={feeData ? formatMon(feeData.lpShare) : "—"}
                totalUsd={
                  feeData && monUsdPrice
                    ? formatUsd(vaultExec && vaultExec.lp.count > 0 ? vaultExec.lp.totalMon : feeData.lpShare, monUsdPrice)
                    : undefined
                }
                actualSpentMon={lpActualSpent}
                executionCount={vaultExec?.lp.count}
                lastExecuted={vaultExec?.lp.lastExecuted}
                resultLabel={vaultExec && vaultExec.lp.count > 0 ? "LP Burned" : undefined}
                resultValue={vaultExec && vaultExec.lp.count > 0 ? formatTokens(vaultExec.lp.totalResult) : undefined}
                vaultNote="MON accumulates per-token; once 50 MON is reached, liquidity is automatically added to the DEX pair and the LP tokens are burned."
              />
            )}

            {creatorPct > 0 && (
              <FeeSlot
                icon={<User className="w-4 h-4 text-figma-purple-soft" />}
                label="Creator"
                subtitle="Sent directly to creator each trade."
                percentage={creatorPct}
                totalMon={feeData ? formatMon(feeData.creatorShare) : "—"}
                totalUsd={feeData && monUsdPrice ? formatUsd(feeData.creatorShare, monUsdPrice) : undefined}
                claimAddress={config?.creator ? formatAddress(config.creator) : undefined}
                tradesRouted={feeData?.executionCount}
                lastRouted={feeData?.lastExecuted}
              />
            )}

            {burnPct > 0 && (
              <FeeSlot
                icon={<Flame className="w-4 h-4 text-orange-400" />}
                label="Buyback & Burn"
                subtitle="Auto-buys & burns at 50 MON."
                percentage={burnPct}
                totalMon={feeData ? formatMon(feeData.buybackShare) : "—"}
                totalUsd={
                  feeData && monUsdPrice
                    ? formatUsd(vaultExec && vaultExec.buyback.count > 0 ? vaultExec.buyback.totalMon : feeData.buybackShare, monUsdPrice)
                    : undefined
                }
                actualSpentMon={buybackActualSpent}
                executionCount={vaultExec?.buyback.count}
                lastExecuted={vaultExec?.buyback.lastExecuted}
                resultLabel={vaultExec && vaultExec.buyback.count > 0 ? `${tokenSymbol} Burned` : undefined}
                resultValue={vaultExec && vaultExec.buyback.count > 0 ? formatTokens(vaultExec.buyback.totalResult) : undefined}
                vaultNote="MON accumulates per-token; once 50 MON is reached, tokens are automatically bought back and burned, reducing supply. 'Actually Spent' reflects real on-chain vault executions and may occasionally exceed 'Fees Routed From Trades' due to one-time manual reconciliations of stranded vault balances."
              />
            )}

            {giftPct > 0 && config?.giftRecipient && (
              <FeeSlot
                icon={<Gift className="w-4 h-4 text-figma-purple-soft" />}
                label="Gift"
                subtitle="Sent directly to gift recipient each trade."
                percentage={giftPct}
                totalMon={feeData ? formatMon(feeData.lpShare) : "—"}
                claimAddress={formatAddress(config.giftRecipient)}
                tradesRouted={feeData?.executionCount}
                lastRouted={feeData?.lastExecuted}
              />
            )}
          </div>

          {/* Footer note */}
          <p className="text-[10px] text-figma-muted text-center pt-1">
            1% of every trade is routed through the Fee Router. Creator &amp; Gift shares are sent
            instantly; LP Support &amp; Buyback&amp;Burn accumulate per-token and execute automatically at 50 MON.
          </p>
        </div>
      </div>
    </div>
  );
}
