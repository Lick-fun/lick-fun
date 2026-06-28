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

/* ── Design token colours ─────────────────────────────────────────────────── */
const C = {
  bg: "#0d0d0d",
  surface: "#111111",
  grid: "#161616",        // subtler gridlines
  border: "#222222",
  textMuted: "#5A6272",
  green: "#2CC054",       // original Lickfun green for candles
  greenBright: "#70E000",
  red: "#EF4444",         // original Lickfun red for candles
  connectLine: "rgba(44,192,84,0.5)",  // thin line joining candle gaps
  sma: "#F0B90B",         // SMA line colour (amber — visible on dark bg)
  lastPrice: "#70E000",   // last-price dashed line
  volGreen: "rgba(44,192,84,0.25)",
  volRed: "rgba(239,68,68,0.25)",
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
  const connectLineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const barSeriesRef = useRef<ISeriesApi<"Bar"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const lastPriceLineRef = useRef<IPriceLine | null>(null);
  const wheelHandlerRef = useRef<((e: WheelEvent) => void) | null>(null);
  const barsRef = useRef<OHLCBar[]>(bars);

  const [chartType, setChartType] = useState<ChartType>("candle");
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

  /* ── SMA computation ──────────────────────────────────────────────────── */
  const computeSma = useCallback((b: OHLCBar[], period: number, mult: number): SingleValueData<Time>[] => {
    const result: SingleValueData<Time>[] = [];
    for (let i = period - 1; i < b.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += b[i - j].close;
      result.push({ time: b[i].time as Time, value: (sum / period) * mult });
    }
    return result;
  }, []);

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

    // Connecting line (joins sparse candles — always tracks close price)
    if (connectLineSeriesRef.current) {
      const connectData: SingleValueData<Time>[] = b.map((bar) => ({
        time: bar.time as Time,
        value: bar.close * mult,
      }));
      connectLineSeriesRef.current.setData(connectData);
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
          fontFamily: "'JetBrains Mono', monospace",
        },
        grid: {
          vertLines: { color: C.grid, style: LineStyle.Solid },
          horzLines: { color: C.grid, style: LineStyle.Solid },
        },
        crosshair: {
          mode: 1, // CrosshairMode.Normal
          vertLine: {
            color: "#444",
            width: 1,
            style: LineStyle.Dashed,
            labelBackgroundColor: "#222",
          },
          horzLine: {
            color: "#444",
            width: 1,
            style: LineStyle.Dashed,
            labelBackgroundColor: "#222",
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

      // ── Connecting line — drawn BEHIND candles to join sparse gaps ──
      // Renders at close price so gaps between infrequent candles are bridged
      // (nad.fun style). Added first so it sits below candles in z-order.
      const connectLine = chart.addSeries(LineSeries, {
        color: C.connectLine,
        lineWidth: 1,
        priceScaleId: "right",
        crosshairMarkerVisible: false,
        priceLineVisible: false,
        lastValueVisible: false,
        lineStyle: 0, // Solid
      });
      connectLineSeriesRef.current = connectLine;

      // ── Candle series (main) ──
      const candles = chart.addSeries(CandlestickSeries, {
        upColor: C.green,
        downColor: C.red,
        borderVisible: false,
        wickUpColor: C.green,
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
        color: C.green,
        lineWidth: 2,
        priceScaleId: "right",
        visible: false,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      lineSeriesRef.current = line;

      // ── Bar series (hidden by default) ──
      const bars2 = chart.addSeries(BarSeries, {
        upColor: C.green,
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
      connectLineSeriesRef.current = null;
      smaSeriesRef.current = null;
      lastPriceLineRef.current = null;
      setChartReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only on mount

  /* ── Update data when bars / valueMult change ─────────────────────────── */
  useEffect(() => {
    if (!chartReady) return;
    // Re-enable autoScale on every fresh data load so the chart fits the new
    // resolution correctly (user wheel-zoom on axis is per-session only)
    chartRef.current?.priceScale("right").setAutoScale(true);
    applyBarsToChart(bars);
    // Only fitContent on the first data load — preserve user zoom/pan on live updates
    if (bars.length > 0 && !hasInitialFitRef.current) {
      chartRef.current?.timeScale().fitContent();
      hasInitialFitRef.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars, chartReady, valueMult]);

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
        isFullscreen && "fixed inset-0 z-50 bg-[#0d0d0d] p-3"
      )}
    >
      {/* ── Top toolbar: token label + OHLC + right-side controls ──────── */}
      <div className="flex items-center gap-1 flex-wrap mb-0.5 px-0.5">
        {/* Token label */}
        <span className="text-figma-white text-xs font-bold font-mono mr-1">
          {tokenSymbol || "—"}
          {tokenName && (
            <span className="text-figma-muted font-normal ml-1">· {tokenName}</span>
          )}
        </span>

        {/* Timeframe buttons sit inline in top bar */}
        <div className="flex items-center gap-0.5">
          {INTRADAY.map((r) => (
            <button
              key={r.value}
              onClick={() => setResolution(r.value)}
              className={cn(
                "px-2 py-1 rounded text-[11px] font-bold transition-colors",
                resolution === r.value
                  ? "bg-figma-green/20 text-figma-green"
                  : "text-figma-muted hover:text-figma-white hover:bg-white/5"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <span className="text-white/10 mx-0.5 select-none">|</span>

        <div className="flex items-center gap-0.5">
          {DAILY.map((r) => (
            <button
              key={r.value}
              onClick={() => setResolution(r.value)}
              className={cn(
                "px-2 py-1 rounded text-[11px] font-bold transition-colors",
                resolution === r.value
                  ? "bg-figma-green/20 text-figma-green"
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

          {/* SMA toggle */}
          <button
            onClick={() => setShowSma((v) => !v)}
            title="Toggle SMA 9"
            className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors border",
              showSma
                ? "bg-[#F0B90B]/20 text-[#F0B90B] border-[#F0B90B]/40"
                : "text-figma-muted border-transparent hover:text-figma-white hover:border-white/10"
            )}
          >
            SMA
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
        <div className="flex items-center gap-2.5 text-[11px] font-mono px-0.5 mb-0.5 flex-wrap leading-tight">
          <span className="text-[#5A6272]">O <span className="text-white">{quoteMode === "USD" ? "$" : ""}{formatPrice(displayOHLC.open)}</span></span>
          <span className="text-[#5A6272]">H <span className="text-[#26a69a]">{quoteMode === "USD" ? "$" : ""}{formatPrice(displayOHLC.high)}</span></span>
          <span className="text-[#5A6272]">L <span className="text-[#ef5350]">{quoteMode === "USD" ? "$" : ""}{formatPrice(displayOHLC.low)}</span></span>
          <span className="text-[#5A6272]">C <span className="text-white">{quoteMode === "USD" ? "$" : ""}{formatPrice(displayOHLC.close)}</span></span>
          <span className={cn("font-semibold", displayOHLC.change >= 0 ? "text-[#26a69a]" : "text-[#ef5350]")}>
            {displayOHLC.change >= 0 ? "+" : ""}{displayOHLC.change.toFixed(2)}%
          </span>
          {showSma && (
            <span className="text-[#5A6272]">SMA <span className="text-[#F0B90B]">9</span></span>
          )}
          <span className="text-[#5A6272] ml-auto">Vol <span className="text-white">{formatVol(displayOHLC.volume)} MON</span></span>
        </div>
      )}

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

      {/* ── Bottom bar: scale mode label + lickfun.xyz watermark ────────── */}
      <div className="flex items-center justify-between text-[10px] text-[#5A6272] px-0.5 mt-1">
        <span className="font-mono">
          {displayMode === "mcap" ? "MCap" : "Price"} / {quoteSymbol}
          {logScale && <span className="ml-2 text-figma-green font-bold">log</span>}
        </span>
        <span className="opacity-30 font-mono">lickfun.xyz</span>
      </div>
    </div>
  );
}
