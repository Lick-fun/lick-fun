"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { OHLCBar, ChartResolution } from "@/lib/hooks/useData";

// lightweight-charts is imported dynamically inside the effect to avoid SSR
// issues (it relies on `window`). The types-only import is fine for TypeScript.
import type {
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
} from "lightweight-charts";

/* ── Design token colours ─────────────────────────────────────────────────── */
const C = {
  bg: "#0a0a0a",
  surface: "#111111",
  grid: "#1A1A1A",
  border: "#2A2A2A",
  textMuted: "#6B7280",
  green: "#2CC054",
  greenBright: "#70E000",
  red: "#EF4444",
  wick: "#555555",
} as const;

const RESOLUTIONS: { label: string; value: ChartResolution }[] = [
  { label: "1m", value: "1" },
  { label: "5m", value: "5" },
  { label: "15m", value: "15" },
  { label: "1H", value: "60" },
  { label: "4H", value: "240" },
  { label: "1D", value: "1D" },
];

interface PriceChartProps {
  bars: OHLCBar[];
  resolution: ChartResolution;
  setResolution: (r: ChartResolution) => void;
  isLoading?: boolean;
  tokenSymbol?: string;
}

export function PriceChart({
  bars,
  resolution,
  setResolution,
  isLoading = false,
  tokenSymbol = "",
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  // Keep latest bars in a ref so the async init can apply them after creating series
  const barsRef = useRef<OHLCBar[]>(bars);

  // Track current bars in ref for access inside async callbacks
  useEffect(() => {
    barsRef.current = bars;
  }, [bars]);

  /* ── Create chart on mount ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;
    let chart: IChartApi | null = null;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && chartRef.current) {
        chartRef.current.applyOptions({ width: entry.contentRect.width });
      }
    });

    (async () => {
      const { createChart, CandlestickSeries } = await import("lightweight-charts");

      if (destroyed || !containerRef.current) return;

      chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 380,
        layout: {
          background: { color: C.bg },
          textColor: C.textMuted,
        },
        grid: {
          vertLines: { color: C.grid },
          horzLines: { color: C.grid },
        },
        crosshair: {
          vertLine: { color: C.border, labelBackgroundColor: C.surface },
          horzLine: { color: C.border, labelBackgroundColor: C.surface },
        },
        rightPriceScale: {
          borderColor: C.border,
          textColor: C.textMuted,
        },
        timeScale: {
          borderColor: C.border,
          timeVisible: true,
          secondsVisible: false,
        },
      });

      chartRef.current = chart;

      const series = chart.addSeries(CandlestickSeries, {
        upColor: C.green,
        downColor: C.red,
        borderUpColor: C.green,
        borderDownColor: C.red,
        wickUpColor: C.green,
        wickDownColor: C.red,
      });

      seriesRef.current = series;

      // Apply any bars that loaded before the chart was ready
      if (barsRef.current.length > 0) {
        const data: CandlestickData<Time>[] = barsRef.current.map((b) => ({
          time: b.time as Time,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
        }));
        series.setData(data);
        chart.timeScale().fitContent();
      }

      if (containerRef.current) resizeObserver.observe(containerRef.current);
    })();

    return () => {
      destroyed = true;
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      seriesRef.current = null;
    };
  }, []); // only on mount

  /* ── Update data when bars change ─────────────────────────────────────── */
  useEffect(() => {
    if (!seriesRef.current || bars.length === 0) return;

    const data: CandlestickData<Time>[] = bars.map((b) => ({
      time: b.time as Time,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }));

    seriesRef.current.setData(data);
    chartRef.current?.timeScale().fitContent();
  }, [bars]);

  /* ── Empty / loading states ────────────────────────────────────────────── */
  const isEmpty = !isLoading && bars.length === 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Resolution tab bar */}
      <div className="flex items-center gap-1">
        {tokenSymbol && (
          <span className="text-figma-muted text-xs font-mono mr-2">${tokenSymbol}</span>
        )}
        <div className="flex items-center gap-1 ml-auto">
          {RESOLUTIONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setResolution(r.value)}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-bold transition-colors",
                resolution === r.value
                  ? "bg-figma-green text-black"
                  : "text-figma-muted hover:text-figma-white hover:bg-figma-card-alt"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart container */}
      <div className="relative rounded-lg overflow-hidden">
        <div
          ref={containerRef}
          className="w-full"
          style={{ height: "380px", background: C.bg }}
        />

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="text-figma-muted text-sm animate-pulse">Loading chart…</span>
          </div>
        )}

        {/* Empty state overlay */}
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="text-figma-muted text-sm">No trade data yet</span>
          </div>
        )}
      </div>
    </div>
  );
}
