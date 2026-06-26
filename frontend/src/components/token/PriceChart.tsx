"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { OHLCBar, ChartResolution } from "@/lib/hooks/useData";
import {
  BarChart2,
  TrendingUp,
  CandlestickChart,
  Maximize2,
  Minimize2,
  LogIn,
} from "lucide-react";

// lightweight-charts is imported dynamically inside the effect to avoid SSR
// issues (it relies on `window`). The types-only import is fine for TypeScript.
import type {
  IChartApi,
  ISeriesApi,
  CandlestickData,
  SingleValueData,
  BarData,
  Time,
  MouseEventParams,
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
  volGreen: "rgba(44,192,84,0.5)",
  volRed: "rgba(239,68,68,0.5)",
} as const;

/* ── Timeframe groups ─────────────────────────────────────────────────────── */
const INTRADAY: { label: string; value: ChartResolution }[] = [
  { label: "1m", value: "1" },
  { label: "5m", value: "5" },
  { label: "15m", value: "15" },
  { label: "1H", value: "60" },
  { label: "4H", value: "240" },
];

const DAILY: { label: string; value: ChartResolution }[] = [
  { label: "1D", value: "1D" },
  { label: "1W", value: "1W" },
  { label: "1M", value: "1M" },
];

/* ── Chart type ───────────────────────────────────────────────────────────── */
type ChartType = "candle" | "line" | "bar";
type QuoteMode = "MON" | "USD";
type DisplayMode = "price" | "mcap";

/* ── Total supply for MCap calculation ───────────────────────────────────── */
const TOTAL_SUPPLY = 1_000_000_000;

/* ── OHLC header info ─────────────────────────────────────────────────────── */
interface OHLCInfo {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number; // % change open→close
}

function formatPrice(n: number): string {
  if (n === 0) return "0";
  if (n < 0.000001) return n.toExponential(4);
  if (n < 0.001) return n.toFixed(8);
  if (n < 1) return n.toFixed(6);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(4);
}

function formatVol(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

interface PriceChartProps {
  bars: OHLCBar[];
  resolution: ChartResolution;
  setResolution: (r: ChartResolution) => void;
  isLoading?: boolean;
  tokenSymbol?: string;
  tokenName?: string;
  /** Current MON/USD price for USD conversion; supply from a price feed or leave undefined */
  monUsdPrice?: number;
}

export function PriceChart({
  bars,
  resolution,
  setResolution,
  isLoading = false,
  tokenSymbol = "",
  tokenName = "",
  monUsdPrice,
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const barSeriesRef = useRef<ISeriesApi<"Bar"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const barsRef = useRef<OHLCBar[]>(bars);

  const [chartType, setChartType] = useState<ChartType>("candle");
  const [quoteMode, setQuoteMode] = useState<QuoteMode>("MON");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("price");
  const [logScale, setLogScale] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ohlcInfo, setOhlcInfo] = useState<OHLCInfo | null>(null);
  // Whether chart is initialised (async)
  const [chartReady, setChartReady] = useState(false);
  const chartReadyRef = useRef(false);

  // USD conversion multiplier
  const usdMult = quoteMode === "USD" && monUsdPrice ? monUsdPrice : 1;
  // MCap multiplier (if displayMode === mcap, multiply price by total supply)
  const mcapMult = displayMode === "mcap" ? TOTAL_SUPPLY : 1;
  const valueMult = usdMult * mcapMult;
  // Keep valueMult in a ref so the crosshair callback always reads the latest value
  const valueMultRef = useRef(valueMult);
  useEffect(() => { valueMultRef.current = valueMult; }, [valueMult]);

  /* ── Keep barsRef current ─────────────────────────────────────────────── */
  useEffect(() => {
    barsRef.current = bars;
  }, [bars]);

  /* ── Helpers: apply series data ───────────────────────────────────────── */
  const applyBarsToChart = useCallback((b: OHLCBar[]) => {
    if (!chartReadyRef.current) return;
    const mult = valueMult;

    if (candleSeriesRef.current) {
      const data: CandlestickData<Time>[] = b.map((bar) => ({
        time: bar.time as Time,
        open: bar.open * mult,
        high: bar.high * mult,
        low: bar.low * mult,
        close: bar.close * mult,
      }));
      candleSeriesRef.current.setData(data);
    }

    if (lineSeriesRef.current) {
      const data: SingleValueData<Time>[] = b.map((bar) => ({
        time: bar.time as Time,
        value: bar.close * mult,
      }));
      lineSeriesRef.current.setData(data);
    }

    if (barSeriesRef.current) {
      const data: BarData<Time>[] = b.map((bar) => ({
        time: bar.time as Time,
        open: bar.open * mult,
        high: bar.high * mult,
        low: bar.low * mult,
        close: bar.close * mult,
      }));
      barSeriesRef.current.setData(data);
    }

    if (volumeSeriesRef.current) {
      const volData = b.map((bar) => ({
        time: bar.time as Time,
        value: bar.volume,
        color: bar.close >= bar.open ? C.volGreen : C.volRed,
      }));
      volumeSeriesRef.current.setData(volData);
    }
  }, [valueMult]);

  /* ── Create chart on mount ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && chartRef.current) {
        chartRef.current.applyOptions({ width: entry.contentRect.width });
      }
    });

    (async () => {
      const {
        createChart,
        CandlestickSeries,
        LineSeries,
        BarSeries,
        HistogramSeries,
        PriceScaleMode,
      } = await import("lightweight-charts");

      if (destroyed || !containerRef.current) return;

      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 340,
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
          mode: logScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
        },
        timeScale: {
          borderColor: C.border,
          timeVisible: true,
          secondsVisible: false,
        },
      });

      chartRef.current = chart;

      // ── Candle series (main) ──
      const candles = chart.addSeries(CandlestickSeries, {
        upColor: C.green,
        downColor: C.red,
        borderUpColor: C.green,
        borderDownColor: C.red,
        wickUpColor: C.green,
        wickDownColor: C.red,
        priceScaleId: "right",
      });
      candleSeriesRef.current = candles;

      // ── Line series (hidden by default) ──
      const line = chart.addSeries(LineSeries, {
        color: C.green,
        lineWidth: 2,
        priceScaleId: "right",
        visible: false,
      });
      lineSeriesRef.current = line;

      // ── Bar series (hidden by default) ──
      const bars2 = chart.addSeries(BarSeries, {
        upColor: C.green,
        downColor: C.red,
        priceScaleId: "right",
        visible: false,
      });
      barSeriesRef.current = bars2;

      // ── Volume histogram (separate pane via overlay on price scale overlay) ──
      const volume = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
        color: C.volGreen,
      });
      volume.priceScale().applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      volumeSeriesRef.current = volume;

      // ── Crosshair listener → update OHLC header ──
      chart.subscribeCrosshairMove((param: MouseEventParams<Time>) => {
        if (!param.time || !candleSeriesRef.current) {
          setOhlcInfo(null);
          return;
        }
        const b = barsRef.current.find((bar) => bar.time === (param.time as unknown as number));
        if (!b) return;
        const mult = valueMultRef.current;
        const change = b.open !== 0 ? ((b.close - b.open) / b.open) * 100 : 0;
        setOhlcInfo({
          open: b.open * mult,
          high: b.high * mult,
          low: b.low * mult,
          close: b.close * mult,
          volume: b.volume,
          change,
        });
      });

      chartReadyRef.current = true;
      setChartReady(true);

      // Apply bars that loaded before the chart was ready
      if (barsRef.current.length > 0) {
        applyBarsToChart(barsRef.current);
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
      candleSeriesRef.current = null;
      lineSeriesRef.current = null;
      barSeriesRef.current = null;
      volumeSeriesRef.current = null;
      chartReadyRef.current = false;
      setChartReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only on mount

  /* ── Update data when bars / valueMult change ─────────────────────────── */
  useEffect(() => {
    if (!chartReady) return;
    applyBarsToChart(bars);
    if (bars.length > 0) chartRef.current?.timeScale().fitContent();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars, chartReady, valueMult]);

  /* ── Switch chart type visibility ────────────────────────────────────── */
  useEffect(() => {
    if (!chartReady) return;
    candleSeriesRef.current?.applyOptions({ visible: chartType === "candle" });
    lineSeriesRef.current?.applyOptions({ visible: chartType === "line" });
    barSeriesRef.current?.applyOptions({ visible: chartType === "bar" });
  }, [chartType, chartReady]);

  /* ── Toggle log scale ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (!chartRef.current) return;
    import("lightweight-charts").then(({ PriceScaleMode }) => {
      chartRef.current?.priceScale("right").applyOptions({
        mode: logScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
      });
    });
  }, [logScale]);

  /* ── Fullscreen: resize chart when wrapper size changes ───────────────── */
  useEffect(() => {
    if (!chartRef.current || !containerRef.current) return;
    // After CSS transition, trigger resize
    const tid = setTimeout(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    }, 50);
    return () => clearTimeout(tid);
  }, [isFullscreen]);

  /* ── Derive last bar OHLC for header when crosshair is idle ──────────── */
  const lastBar = bars.length > 0 ? bars[bars.length - 1] : null;
  const displayOHLC: OHLCInfo | null = ohlcInfo ?? (lastBar
    ? {
        open: lastBar.open * valueMult,
        high: lastBar.high * valueMult,
        low: lastBar.low * valueMult,
        close: lastBar.close * valueMult,
        volume: lastBar.volume,
        change: lastBar.open !== 0 ? ((lastBar.close - lastBar.open) / lastBar.open) * 100 : 0,
      }
    : null);

  const isEmpty = !isLoading && bars.length === 0;
  const quoteSymbol = quoteMode === "USD" ? "$" : "MON";

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "flex flex-col gap-0",
        isFullscreen && "fixed inset-0 z-50 bg-[#0a0a0a] p-3"
      )}
    >
      {/* ── Top toolbar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 flex-wrap mb-1 px-0.5">
        {/* Token label */}
        <span className="text-figma-white text-xs font-bold font-mono mr-1">
          {tokenSymbol || "—"}
          {tokenName && (
            <span className="text-figma-muted font-normal ml-1">· {tokenName}</span>
          )}
        </span>

        {/* Intraday timeframes */}
        <div className="flex items-center gap-0.5">
          {INTRADAY.map((r) => (
            <button
              key={r.value}
              onClick={() => setResolution(r.value)}
              className={cn(
                "px-2 py-1 rounded text-[11px] font-bold transition-colors",
                resolution === r.value
                  ? "bg-figma-green text-black"
                  : "text-figma-muted hover:text-figma-white hover:bg-white/5"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <span className="text-figma-surface mx-0.5 select-none">|</span>

        {/* Daily+ timeframes */}
        <div className="flex items-center gap-0.5">
          {DAILY.map((r) => (
            <button
              key={r.value}
              onClick={() => setResolution(r.value)}
              className={cn(
                "px-2 py-1 rounded text-[11px] font-bold transition-colors",
                resolution === r.value
                  ? "bg-figma-green text-black"
                  : "text-figma-muted hover:text-figma-white hover:bg-white/5"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Right-side controls */}
        <div className="flex items-center gap-1 ml-auto">
          {/* Chart type */}
          <button
            onClick={() => setChartType("candle")}
            title="Candlestick"
            className={cn(
              "p-1 rounded transition-colors",
              chartType === "candle" ? "text-figma-green" : "text-figma-muted hover:text-figma-white"
            )}
          >
            <CandlestickChart className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setChartType("bar")}
            title="Bar"
            className={cn(
              "p-1 rounded transition-colors",
              chartType === "bar" ? "text-figma-green" : "text-figma-muted hover:text-figma-white"
            )}
          >
            <BarChart2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setChartType("line")}
            title="Line"
            className={cn(
              "p-1 rounded transition-colors",
              chartType === "line" ? "text-figma-green" : "text-figma-muted hover:text-figma-white"
            )}
          >
            <TrendingUp className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3 bg-figma-border mx-0.5" />

          {/* MCap / Price toggle */}
          <button
            onClick={() => setDisplayMode((m) => (m === "price" ? "mcap" : "price"))}
            className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors",
              displayMode === "mcap"
                ? "bg-figma-green/20 text-figma-green border border-figma-green/40"
                : "text-figma-muted hover:text-figma-white border border-transparent hover:border-white/10"
            )}
            title="Toggle between Price and Market Cap"
          >
            {displayMode === "price" ? "MCap" : "Price"}
          </button>

          {/* USD / MON toggle */}
          {monUsdPrice && (
            <button
              onClick={() => setQuoteMode((m) => (m === "MON" ? "USD" : "MON"))}
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors",
                quoteMode === "USD"
                  ? "bg-figma-green/20 text-figma-green border border-figma-green/40"
                  : "text-figma-muted hover:text-figma-white border border-transparent hover:border-white/10"
              )}
              title="Toggle MON / USD quote"
            >
              {quoteMode}
            </button>
          )}

          {/* Log scale toggle */}
          <button
            onClick={() => setLogScale((v) => !v)}
            title="Toggle log scale"
            className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors border",
              logScale
                ? "bg-figma-green/20 text-figma-green border-figma-green/40"
                : "text-figma-muted border-transparent hover:text-figma-white hover:border-white/10"
            )}
          >
            <LogIn className="w-3 h-3" />
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen((v) => !v)}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            className="p-1 rounded text-figma-muted hover:text-figma-white transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ── OHLC header ──────────────────────────────────────────────────── */}
      {displayOHLC && (
        <div className="flex items-center gap-2 text-[11px] font-mono px-0.5 mb-1 flex-wrap">
          <span className="text-figma-muted">
            O <span className="text-figma-white">{quoteMode === "USD" ? "$" : ""}{formatPrice(displayOHLC.open)}</span>
          </span>
          <span className="text-figma-muted">
            H <span className="text-figma-green">{quoteMode === "USD" ? "$" : ""}{formatPrice(displayOHLC.high)}</span>
          </span>
          <span className="text-figma-muted">
            L <span className="text-red-400">{quoteMode === "USD" ? "$" : ""}{formatPrice(displayOHLC.low)}</span>
          </span>
          <span className="text-figma-muted">
            C <span className="text-figma-white">{quoteMode === "USD" ? "$" : ""}{formatPrice(displayOHLC.close)}</span>
          </span>
          <span className={displayOHLC.change >= 0 ? "text-figma-green" : "text-red-400"}>
            {displayOHLC.change >= 0 ? "+" : ""}{displayOHLC.change.toFixed(2)}%
          </span>
          <span className="text-figma-muted ml-auto">
            Vol <span className="text-figma-white">{formatVol(displayOHLC.volume)} MON</span>
          </span>
        </div>
      )}

      {/* ── Chart container ───────────────────────────────────────────────── */}
      <div className="relative rounded-lg overflow-hidden">
        <div
          ref={containerRef}
          className="w-full"
          style={{
            height: isFullscreen ? "calc(100vh - 140px)" : "380px",
            background: C.bg,
          }}
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

      {/* ── Bottom: quote label ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-[10px] text-figma-muted px-0.5 mt-1">
        <span>
          {displayMode === "mcap" ? "MCap" : "Price"} / {quoteSymbol}
          {logScale && <span className="ml-2 text-figma-green">LOG</span>}
        </span>
        <span className="opacity-40">lick.fun</span>
      </div>
    </div>
  );
}
