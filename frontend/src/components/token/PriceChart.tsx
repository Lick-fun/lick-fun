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
  IPriceLine,
} from "lightweight-charts";

/* ── Design tokens — pulled from Figma "Trading View Chart (Community)" ──────
 * file (uZWT8dMBh9JRlXXJOPnHMz): dark #191919 canvas, subtle #212121 grid,
 * light-gray #E0E0E0 text, teal #28A79B accent (bullish / buy), red #E10000
 * (bearish / sell), Sora ExtraBold typography for all chart chrome.
 * ─────────────────────────────────────────────────────────────────────────── */
const C = {
  bg: "#191919",
  grid: "#212121",
  border: "#242424",
  text: "#E0E0E0",
  textMuted: "rgba(224, 224, 224, 0.55)",
  teal: "#28A79B",       // bullish candles, buy volume, OHLC values, active accents
  red: "#E10000",        // bearish candles, sell volume
  sma: "#F0B90B",         // SMA line colour (amber — stays legible on dark bg)

  lastPrice: "#28A79B",
  volGreenBg: "#101C0E",  // buy-volume pill background
  volRedBg: "#1C0E0E",    // sell-volume pill background
  volGreen: "rgba(40, 167, 155, 0.25)",
  volRed: "rgba(225, 16, 0, 0.25)",
} as const;

const CHART_FONT = "'Sora', sans-serif";

/* ── Timeframe groups ─────────────────────────────────────────────────────── */
const INTRADAY: { label: string; value: ChartResolution }[] = [
  { label: "30s", value: "30S" },
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
  buyVolume: number;
  sellVolume: number;
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

/**
 * Buckets with only a single trade have open === high === low === close —
 * zero range, which lightweight-charts renders as an invisible sliver (no
 * body, no wick). Pad the high/low by a tiny fraction of price so every
 * candle renders as a small but clearly visible colored tick, matching how
 * most trading platforms display low-liquidity single-print candles.
 * Multi-trade candles (which already have real range) are left untouched.
 */
const FLAT_CANDLE_PAD_PCT = 0.0015; // ±0.15%
function padFlatCandle(open: number, high: number, low: number, close: number) {
  if (high !== low) return { open, high, low, close };
  const pad = Math.max(high * FLAT_CANDLE_PAD_PCT, Number.EPSILON);
  return { open, high: high + pad, low: low - pad, close };
}

/**
 * Formats a bar's real Unix timestamp for the time axis / crosshair label.
 * Used instead of lightweight-charts' built-in time formatting because we
 * plot candles at sequential integer indices (see index-based spacing note
 * below), not their real timestamps.
 */
function formatBarTime(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * Index-based candle spacing.
 *
 * lightweight-charts positions candles on the x-axis using their literal
 * "time" value. For illiquid tokens where trades are infrequent, that means
 * either large dead gaps between real candles (if we plot at real
 * timestamps) or a "picket fence" of fabricated flat candles (if we
 * forward-fill empty buckets — tried this, looked terrible and misrepresents
 * activity). The standard fix used by real trading platforms for sparse
 * markets is to plot each REAL candle at a sequential integer index
 * (0, 1, 2, ...) instead of its timestamp, so candles always sit snugly next
 * to each other regardless of how much real time passed between trades.
 * The actual timestamp is preserved in `bars` (by array position) and looked
 * up for axis labels / crosshair tooltips via formatBarTime().
 */
function indexTime(i: number): Time {
  return i as unknown as Time;
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
  const smaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const lastPriceLineRef = useRef<IPriceLine | null>(null);
  const wheelHandlerRef = useRef<((e: WheelEvent) => void) | null>(null);
  const barsRef = useRef<OHLCBar[]>(bars);

  const [chartType, setChartType] = useState<ChartType>("line");

  const [quoteMode, setQuoteMode] = useState<QuoteMode>("USD");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("mcap");
  const [logScale, setLogScale] = useState(false);
  const [showSma, setShowSma] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ohlcInfo, setOhlcInfo] = useState<OHLCInfo | null>(null);
  // Whether chart is initialised (async)
  const [chartReady, setChartReady] = useState(false);
  const chartReadyRef = useRef(false);
  // Only fitContent on the first data load — preserve user zoom/pan on live updates
  const hasInitialFitRef = useRef(false);
  // Tracks which resolution the chart's current zoom/pan viewport was fitted
  // for. Index-based x-axis spacing (see indexTime()) means each resolution
  // has a totally different index range (e.g. 5m might have 3 bars while 1H
  // has 40) — without forcing a refit on resolution change, switching
  // timeframes leaves the viewport zoomed into a tiny/stale slice of the new
  // data, which looks like "only one candle is showing".
  const lastFitResolutionRef = useRef<ChartResolution | null>(null);


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

  /* ── SMA computation (index-based time) ─────────────────────────────────
   * Computed over the real candle sequence only — no forward-filled fake
   * candles to skew the average.
   */
  const computeSma = useCallback((b: OHLCBar[], period: number, mult: number): SingleValueData<Time>[] => {
    const result: SingleValueData<Time>[] = [];
    for (let i = period - 1; i < b.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += b[i - j].close;
      result.push({ time: indexTime(i), value: (sum / period) * mult });
    }
    return result;
  }, []);

  /* ── Helpers: apply series data ───────────────────────────────────────── */
  const applyBarsToChart = useCallback((b: OHLCBar[]) => {
    if (!chartReadyRef.current) return;
    const mult = valueMult;

    if (candleSeriesRef.current) {
      const data: CandlestickData<Time>[] = b.map((bar, i) => {
        const padded = padFlatCandle(
          bar.open * mult,
          bar.high * mult,
          bar.low * mult,
          bar.close * mult
        );
        return { time: indexTime(i), ...padded };
      });
      candleSeriesRef.current.setData(data);
    }

    if (lineSeriesRef.current) {
      const data: SingleValueData<Time>[] = b.map((bar, i) => ({
        time: indexTime(i),
        value: bar.close * mult,
      }));
      lineSeriesRef.current.setData(data);
    }

    if (barSeriesRef.current) {
      const data: BarData<Time>[] = b.map((bar, i) => {
        const padded = padFlatCandle(
          bar.open * mult,
          bar.high * mult,
          bar.low * mult,
          bar.close * mult
        );
        return { time: indexTime(i), ...padded };
      });
      barSeriesRef.current.setData(data);
    }

    if (volumeSeriesRef.current) {
      const volData = b.map((bar, i) => ({
        time: indexTime(i),
        value: bar.volume,
        color: bar.close >= bar.open ? C.volGreen : C.volRed,
      }));
      volumeSeriesRef.current.setData(volData);
    }

    // SMA (9-period)
    if (smaSeriesRef.current) {
      smaSeriesRef.current.setData(computeSma(b, 9, mult));
    }

    // Update last-price dashed line
    if (candleSeriesRef.current && b.length > 0) {
      const lastClose = b[b.length - 1].close * mult;
      if (lastPriceLineRef.current) {
        lastPriceLineRef.current.applyOptions({ price: lastClose });
      }
    }
  }, [valueMult, computeSma]);


  /* ── Create chart on mount ─────────────────────────────────────────────── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let destroyed = false;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && chartRef.current) {
        chartRef.current.applyOptions({ width: entry.contentRect.width });
      }
    });

    let wheelCleanup: (() => void) | null = null;

    (async () => {
      const {
        createChart,
        CandlestickSeries,
        LineSeries,
        BarSeries,
        HistogramSeries,
        PriceScaleMode,
      } = await import("lightweight-charts");

      if (destroyed || !container) return;

      const { LineStyle } = await import("lightweight-charts");

      const chart = createChart(container, {
        width: container.clientWidth,
        height: 420,
        layout: {
          background: { color: C.bg },
          textColor: C.textMuted,
          fontSize: 11,
          fontFamily: CHART_FONT,
        },
        grid: {
          vertLines: { color: C.grid, style: LineStyle.Solid },
          horzLines: { color: C.grid, style: LineStyle.Solid },
        },
        crosshair: {
          mode: 1, // CrosshairMode.Normal
          vertLine: {
            color: "#3a3a3a",
            width: 1,
            style: LineStyle.Dashed,
            labelBackgroundColor: C.border,
          },
          horzLine: {
            color: "#3a3a3a",
            width: 1,
            style: LineStyle.Dashed,
            labelBackgroundColor: C.border,
          },
        },
        rightPriceScale: {
          borderColor: C.border,
          textColor: C.textMuted,
          mode: logScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
          scaleMargins: { top: 0.08, bottom: 0.12 },
        },
        timeScale: {
          borderColor: C.border,
          timeVisible: true,
          secondsVisible: false,
          barSpacing: 8,
          minBarSpacing: 3,
          rightOffset: 5,
          fixLeftEdge: false,
          fixRightEdge: false,
          // Bars are plotted at sequential integer indices (see indexTime()),
          // not real timestamps, so lightweight-charts' default time
          // formatting is meaningless here. Resolve the index back to the
          // real trade timestamp via barsRef and format it ourselves.
          tickMarkFormatter: (time: Time) => {
            const idx = time as unknown as number;
            const bar = barsRef.current[idx];
            return bar ? formatBarTime(bar.time) : "";
          },
        },

        // Mouse wheel over chart = time-scale zoom (NOT pan/scroll).
        // Mouse wheel over right price axis = price-scale zoom (handled by
        // the axis itself when mouseWheel scale is enabled).
        // Left-click drag = horizontal pan only (pressedMouseMove locks to
        // time axis because axisPressedMouseMove.price is false).
        handleScroll: {
          mouseWheel: false,       // wheel does NOT pan the chart
          pressedMouseMove: true,  // left-drag pans horizontally
          horzTouchDrag: true,
          vertTouchDrag: false,    // no vertical dragging on touch
        },
        handleScale: {
          mouseWheel: true,                              // wheel zooms time axis
          pinch: true,                                   // pinch zooms time axis
          axisPressedMouseMove: { time: true, price: true }, // drag each axis to resize it
          axisDoubleClickReset: true,                    // double-click axis to reset
        },
      });

      chartRef.current = chart;

      // ── Candle series (main) ──

      const candles = chart.addSeries(CandlestickSeries, {
        upColor: C.teal,
        downColor: C.red,
        borderVisible: false,
        wickUpColor: C.teal,
        wickDownColor: C.red,
        priceScaleId: "right",
        priceLineVisible: false,
        lastValueVisible: false,
      });
      candleSeriesRef.current = candles;

      // ── Last-price dashed line ──
      const lastPriceLine = candles.createPriceLine({
        price: 0,
        color: C.lastPrice,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "",
      });
      lastPriceLineRef.current = lastPriceLine;

      // ── SMA (9-period) overlay ──
      const sma = chart.addSeries(LineSeries, {
        color: C.sma,
        lineWidth: 1,
        priceScaleId: "right",
        crosshairMarkerVisible: false,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      smaSeriesRef.current = sma;

      // ── Line series (hidden by default) ──
      const line = chart.addSeries(LineSeries, {
        color: C.teal,
        lineWidth: 2,
        priceScaleId: "right",
        visible: false,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      lineSeriesRef.current = line;

      // ── Bar series (hidden by default) ──
      const bars2 = chart.addSeries(BarSeries, {
        upColor: C.teal,
        downColor: C.red,
        priceScaleId: "right",
        visible: false,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      barSeriesRef.current = bars2;

      // ── Volume histogram — sits at bottom 15% of chart ──
      const volume = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
        color: C.volGreen,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      volume.priceScale().applyOptions({
        // Top 0.88 = volume bars only use bottom 12% of chart area
        scaleMargins: { top: 0.88, bottom: 0 },
      });
      volumeSeriesRef.current = volume;

      // ── Crosshair listener → update OHLC header ──
      // param.time is the sequential index (indexTime()), not a real
      // timestamp — look the bar up by array position.
      chart.subscribeCrosshairMove((param: MouseEventParams<Time>) => {
        if (param.time === undefined || !candleSeriesRef.current) {
          setOhlcInfo(null);
          return;
        }
        const idx = param.time as unknown as number;
        const b = barsRef.current[idx];
        if (!b) return;

        const mult = valueMultRef.current;
        const change = b.open !== 0 ? ((b.close - b.open) / b.open) * 100 : 0;
        setOhlcInfo({
          open: b.open * mult,
          high: b.high * mult,
          low: b.low * mult,
          close: b.close * mult,
          volume: b.volume,
          buyVolume: b.buyVolume,
          sellVolume: b.sellVolume,
          change,
        });
      });

      chartReadyRef.current = true;
      setChartReady(true);

      // ── Custom wheel zoom for the right MC/price axis only ──────────────
      // Exactly like nad.fun: scrolling over the right axis zooms the visible
      // price range in/out around its midpoint — candles stay centred, the Y
      // scale values change (more or fewer price levels visible).
      // Uses setVisibleRange / getVisibleRange so the behaviour is identical
      // to dragging the axis — no margin hacks, no chart jumping.
      const PRICE_AXIS_WIDTH = 72; // px region on the right that counts as the axis
      const onWheel = (e: WheelEvent) => {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const overAxis = e.clientX >= rect.right - PRICE_AXIS_WIDTH;
        if (!overAxis) return; // let the chart handle wheel over the body

        // Intercept so the chart's time-zoom does not also fire
        e.preventDefault();
        e.stopPropagation();

        const priceScale = chart.priceScale("right");
        const range = priceScale.getVisibleRange();
        if (!range) return;

        const { from, to } = range;
        const mid = (from + to) / 2;
        const halfSpan = (to - from) / 2;

        // Scroll up (deltaY < 0) = zoom in (smaller range = fewer price levels),
        // scroll down = zoom out (more price levels visible)
        const factor = e.deltaY < 0 ? 0.85 : 1.15;
        const newHalfSpan = halfSpan * factor;

        // Disable autoScale so our range sticks; user can double-click axis to reset
        priceScale.setAutoScale(false);
        priceScale.setVisibleRange({ from: mid - newHalfSpan, to: mid + newHalfSpan });
      };
      container.addEventListener("wheel", onWheel, { passive: false });
      wheelCleanup = () => container.removeEventListener("wheel", onWheel);
      wheelHandlerRef.current = onWheel;

      // Apply bars that loaded before the chart was ready
      if (barsRef.current.length > 0) {
        applyBarsToChart(barsRef.current);
        chart.timeScale().fitContent();
        hasInitialFitRef.current = true;
        lastFitResolutionRef.current = resolution;
      }


      if (container) resizeObserver.observe(container);
    })();

    return () => {
      destroyed = true;
      resizeObserver.disconnect();
      if (wheelCleanup) wheelCleanup();
      wheelHandlerRef.current = null;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      candleSeriesRef.current = null;
      lineSeriesRef.current = null;
      barSeriesRef.current = null;
      volumeSeriesRef.current = null;
      chartReadyRef.current = false;
      hasInitialFitRef.current = false;
      smaSeriesRef.current = null;

      lastPriceLineRef.current = null;
      setChartReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only on mount

  /* ── Update data when bars / valueMult / resolution change ────────────────
   * Refit the viewport whenever:
   *   - this is the very first data load, OR
   *   - the timeframe (resolution) changed since the last fit.
   * Index-based x-axis spacing means each resolution has a completely
   * different index range, so switching timeframes without refitting leaves
   * the chart zoomed into a stale/tiny slice of the new data (looks like
   * "only one candle showing"). Live polling updates on the SAME resolution
   * still preserve the user's zoom/pan as before.
   */
  useEffect(() => {
    if (!chartReady) return;
    // Re-enable autoScale on every fresh data load so the chart fits the new
    // resolution correctly (user wheel-zoom on axis is per-session only)
    chartRef.current?.priceScale("right").setAutoScale(true);
    applyBarsToChart(bars);

    const resolutionChanged = lastFitResolutionRef.current !== resolution;
    if (bars.length > 0 && (!hasInitialFitRef.current || resolutionChanged)) {
      chartRef.current?.timeScale().fitContent();
      hasInitialFitRef.current = true;
      lastFitResolutionRef.current = resolution;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars, chartReady, valueMult, resolution]);


  /* ── Switch chart type visibility ────────────────────────────────────── */
  useEffect(() => {
    if (!chartReady) return;
    candleSeriesRef.current?.applyOptions({ visible: chartType === "candle" });
    lineSeriesRef.current?.applyOptions({ visible: chartType === "line" });
    barSeriesRef.current?.applyOptions({ visible: chartType === "bar" });
    // SMA only shown in candle mode (looks odd on line/bar)
    smaSeriesRef.current?.applyOptions({ visible: chartType === "candle" && showSma });
  }, [chartType, chartReady, showSma]);

  /* ── Toggle SMA visibility ────────────────────────────────────────────── */
  useEffect(() => {
    if (!chartReady) return;
    smaSeriesRef.current?.applyOptions({ visible: chartType === "candle" && showSma });
  }, [showSma, chartReady, chartType]);

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
    const container = containerRef.current;
    const chart = chartRef.current;
    if (!chart || !container) return;
    // After CSS transition, trigger resize
    const tid = setTimeout(() => {
      if (container && chart) {
        chart.applyOptions({ width: container.clientWidth });
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
        buyVolume: lastBar.buyVolume,
        sellVolume: lastBar.sellVolume,
        change: lastBar.open !== 0 ? ((lastBar.close - lastBar.open) / lastBar.open) * 100 : 0,
      }
    : null);

  const isEmpty = !isLoading && bars.length === 0;
  const quoteSymbol = quoteMode === "USD" ? "$" : "MON";
  const resolutionLabel =
    [...INTRADAY, ...DAILY].find((r) => r.value === resolution)?.label ?? resolution;
  // Real data sparsity, not a bug: this timeframe simply doesn't have many
  // real trades yet. Show a subtle hint pointing users to a longer interval
  // rather than silently showing a near-empty chart.
  const SPARSE_BAR_THRESHOLD = 5;
  const isSparse = !isLoading && bars.length > 0 && bars.length < SPARSE_BAR_THRESHOLD;


  return (
    <div
      ref={wrapperRef}
      className={cn(
        "flex flex-col gap-0 font-sora",
        isFullscreen && "fixed inset-0 z-50 p-3"
      )}
      style={{ background: isFullscreen ? C.bg : undefined }}
    >
      {/* ── Top toolbar: timeframe buttons + right-side controls ────────── */}
      <div className="flex items-center gap-1 flex-wrap mb-1.5 px-0.5">
        {/* Token label */}
        <span
          className="text-xs font-extrabold mr-1"
          style={{ color: C.text }}
        >
          {tokenSymbol || "—"}
          {tokenName && (
            <span className="font-normal ml-1" style={{ color: C.textMuted }}>
              · {tokenName}
            </span>
          )}
        </span>

        {/* Timeframe buttons */}
        <div className="flex items-center gap-0.5">
          {INTRADAY.map((r) => (
            <button
              key={r.value}
              onClick={() => setResolution(r.value)}
              className="px-2 py-1 rounded text-[11px] font-extrabold transition-colors"
              style={
                resolution === r.value
                  ? { backgroundColor: "rgba(40,167,155,0.18)", color: C.teal }
                  : { color: C.textMuted }
              }
              onMouseEnter={(e) => {
                if (resolution !== r.value) e.currentTarget.style.color = C.text;
              }}
              onMouseLeave={(e) => {
                if (resolution !== r.value) e.currentTarget.style.color = C.textMuted;
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        <span className="mx-0.5 select-none" style={{ color: "rgba(224,224,224,0.12)" }}>|</span>

        <div className="flex items-center gap-0.5">
          {DAILY.map((r) => (
            <button
              key={r.value}
              onClick={() => setResolution(r.value)}
              className="px-2 py-1 rounded text-[11px] font-extrabold transition-colors"
              style={
                resolution === r.value
                  ? { backgroundColor: "rgba(40,167,155,0.18)", color: C.teal }
                  : { color: C.textMuted }
              }
              onMouseEnter={(e) => {
                if (resolution !== r.value) e.currentTarget.style.color = C.text;
              }}
              onMouseLeave={(e) => {
                if (resolution !== r.value) e.currentTarget.style.color = C.textMuted;
              }}
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
            className="p-1 rounded transition-colors"
            style={{ color: chartType === "candle" ? C.teal : C.textMuted }}
          >
            <CandlestickChart className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setChartType("bar")}
            title="Bar"
            className="p-1 rounded transition-colors"
            style={{ color: chartType === "bar" ? C.teal : C.textMuted }}
          >
            <BarChart2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setChartType("line")}
            title="Line"
            className="p-1 rounded transition-colors"
            style={{ color: chartType === "line" ? C.teal : C.textMuted }}
          >
            <TrendingUp className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3 mx-0.5" style={{ backgroundColor: C.border }} />

          {/* SMA toggle */}
          <button
            onClick={() => setShowSma((v) => !v)}
            title="Toggle SMA 9"
            className="px-1.5 py-0.5 rounded text-[10px] font-extrabold transition-colors border"
            style={
              showSma
                ? { backgroundColor: "rgba(240,185,11,0.15)", color: "#F0B90B", borderColor: "rgba(240,185,11,0.4)" }
                : { color: C.textMuted, borderColor: "transparent" }
            }
          >
            SMA
          </button>

          <div className="w-px h-3 mx-0.5" style={{ backgroundColor: C.border }} />

          {/* MCap / Price toggle */}
          <button
            onClick={() => setDisplayMode((m) => (m === "price" ? "mcap" : "price"))}
            className="px-1.5 py-0.5 rounded text-[10px] font-extrabold transition-colors border"
            style={
              displayMode === "mcap"
                ? { backgroundColor: "rgba(40,167,155,0.18)", color: C.teal, borderColor: "rgba(40,167,155,0.4)" }
                : { color: C.textMuted, borderColor: "transparent" }
            }
            title="Toggle between Price and Market Cap"
          >
            {displayMode === "price" ? "MCap" : "Price"}
          </button>

          {/* USD / MON toggle */}
          {monUsdPrice && (
            <button
              onClick={() => setQuoteMode((m) => (m === "MON" ? "USD" : "MON"))}
              className="px-1.5 py-0.5 rounded text-[10px] font-extrabold transition-colors border"
              style={
                quoteMode === "USD"
                  ? { backgroundColor: "rgba(40,167,155,0.18)", color: C.teal, borderColor: "rgba(40,167,155,0.4)" }
                  : { color: C.textMuted, borderColor: "transparent" }
              }
              title="Toggle MON / USD quote"
            >
              {quoteMode}
            </button>
          )}

          {/* Log scale toggle */}
          <button
            onClick={() => setLogScale((v) => !v)}
            title="Toggle log scale"
            className="px-1.5 py-0.5 rounded text-[10px] font-extrabold transition-colors border"
            style={
              logScale
                ? { backgroundColor: "rgba(40,167,155,0.18)", color: C.teal, borderColor: "rgba(40,167,155,0.4)" }
                : { color: C.textMuted, borderColor: "transparent" }
            }
          >
            <LogIn className="w-3 h-3" />
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen((v) => !v)}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            className="p-1 rounded transition-colors"
            style={{ color: C.textMuted }}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ── Chart container ───────────────────────────────────────────────── */}
      <div className="relative rounded-lg overflow-hidden">
        <div
          ref={containerRef}
          className="w-full"
          style={{
            height: isFullscreen ? "calc(100vh - 140px)" : "420px",
            background: C.bg,
          }}
        />

        {/* ── OHLC + Volume legend — overlaid top-left on the chart pane,
             mirroring the Figma "Trading View Chart" reference design ──── */}
        {displayOHLC && (
          <div className="absolute top-2 left-2 z-10 pointer-events-none select-none">
            <div className="flex items-center gap-2 flex-wrap text-[12px] font-extrabold" style={{ color: C.text }}>
              <span>{tokenSymbol || "—"}/{quoteMode}</span>
              <span className="text-[11px]" style={{ color: C.textMuted }}>{resolutionLabel}</span>
              {showSma && chartType === "candle" && (
                <span className="text-[11px]" style={{ color: C.textMuted }}>SMA 9</span>
              )}
            </div>
            <div className="flex items-center gap-2.5 text-[11px] font-extrabold mt-0.5 flex-wrap leading-tight">
              <span style={{ color: C.textMuted }}>O <span style={{ color: C.teal }}>{quoteMode === "USD" ? "$" : ""}{formatPrice(displayOHLC.open)}</span></span>
              <span style={{ color: C.textMuted }}>H <span style={{ color: C.teal }}>{quoteMode === "USD" ? "$" : ""}{formatPrice(displayOHLC.high)}</span></span>
              <span style={{ color: C.textMuted }}>L <span style={{ color: C.teal }}>{quoteMode === "USD" ? "$" : ""}{formatPrice(displayOHLC.low)}</span></span>
              <span style={{ color: C.textMuted }}>C <span style={{ color: C.teal }}>{quoteMode === "USD" ? "$" : ""}{formatPrice(displayOHLC.close)}</span></span>
              <span className="font-extrabold" style={{ color: displayOHLC.change >= 0 ? C.teal : C.red }}>
                {displayOHLC.change >= 0 ? "+" : ""}{displayOHLC.change.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[11px] font-extrabold" style={{ color: C.textMuted }}>Volume</span>
              <span
                className="px-2 py-0.5 rounded text-[10px] font-extrabold"
                style={{ backgroundColor: C.volGreenBg, color: C.teal }}
              >
                {formatVol(displayOHLC.buyVolume)}
              </span>
              <span
                className="px-2 py-0.5 rounded text-[10px] font-extrabold"
                style={{ backgroundColor: C.volRedBg, color: C.red }}
              >
                {formatVol(displayOHLC.sellVolume)}
              </span>
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="text-sm animate-pulse" style={{ color: C.textMuted }}>Loading chart…</span>
          </div>
        )}

        {/* Empty state overlay */}
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="text-sm" style={{ color: C.textMuted }}>No trade data yet</span>
          </div>
        )}
      </div>

      {/* ── Sparse-data hint — shown when this timeframe has very few real
           candles (real data, not a bug). Points users to a longer interval
           for a fuller view instead of leaving them staring at 1-2 candles. ── */}
      {isSparse && (
        <div
          className="px-2 py-1 mt-1 rounded text-[10px] font-semibold"
          style={{ color: C.textMuted, backgroundColor: "rgba(224,224,224,0.06)" }}
        >
          Limited trades at {resolutionLabel} — try a longer interval (1H, 4H, 1D) for a fuller view
        </div>
      )}

      {/* ── Bottom bar: scale mode label + lickfun.xyz watermark ────────── */}

      <div className="flex items-center justify-between text-[10px] px-0.5 mt-1" style={{ color: C.textMuted }}>
        <span className="font-extrabold">
          {displayMode === "mcap" ? "MCap" : "Price"} / {quoteSymbol}
          {logScale && <span className="ml-2 font-extrabold" style={{ color: C.teal }}>log</span>}
        </span>
        <span className="opacity-40 font-extrabold">lickfun.xyz</span>
      </div>
    </div>
  );
}
