"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { 
  createChart, 
  IChartApi, 
  ISeriesApi, 
  UTCTimestamp, 
  CrosshairMode,
  CandlestickSeries,
  LineSeries,
  AreaSeries
} from "lightweight-charts";
import { useTradingStore, Timeframe } from "@/store/useTradingStore";
import { Maximize, RotateCcw, Crosshair, Loader2, X } from "lucide-react";

const TIMEFRAMES: { label: string; value: Timeframe }[] = [
  { label: "1m", value: "1m" },
  { label: "3m", value: "3m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "30m", value: "30m" },
  { label: "1h", value: "1h" },
  { label: "2h", value: "2h" },
  { label: "4h", value: "4h" },
  { label: "1d", value: "1d" },
];

interface TradingChartProps {
  chartType?: 'candle' | 'line' | 'area';
  symbol?: string;
}

interface LogicalPattern {
  pattern: string;
  confidence: number;
  startTime: UTCTimestamp;
  endTime: UTCTimestamp;
  highPrice: number;
  lowPrice: number;
}

export default function TradingChart({ chartType = 'candle', symbol }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);

  const activeSymbol = useTradingStore((state) => state.activeSymbol);
  const activeTimeframe = useTradingStore((state) => state.activeTimeframe);
  const setTimeframe = useTradingStore((state) => state.setTimeframe);
  const ticks = useTradingStore((state) => state.ticks);
  const activeTick = ticks[activeSymbol];

  const [logicalPattern, setLogicalPattern] = useState<LogicalPattern | null>(null);
  const [boxCoords, setBoxCoords] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number, y: number } | null>(null);
  const [selectionCurrent, setSelectionCurrent] = useState<{ x: number, y: number } | null>(null);

  const [legend, setLegend] = useState<{ open: number; high: number; low: number; close: number; change: number; } | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { color: "#131722" }, textColor: "#7C8699" },
      grid: { vertLines: { color: "#1E222D" }, horzLines: { color: "#1E222D" } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#1E222D", autoScale: true },
      timeScale: { borderColor: "#1E222D", timeVisible: true, secondsVisible: false },
    });

    chartRef.current = chart;

    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time) return;
      const currentTick = useTradingStore.getState().ticks[useTradingStore.getState().activeSymbol];
      if (currentTick?.history) {
        const dataPoint = currentTick.history.find(c => c.time === param.time);
        if (dataPoint) {
          const chg = dataPoint.open > 0 ? ((dataPoint.close - dataPoint.open) / dataPoint.open) * 100 : 0;
          setLegend({ open: dataPoint.open, high: dataPoint.high, low: dataPoint.low, close: dataPoint.close, change: chg });
        }
      }
    });

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
        updateOverlayPosition();
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;
    try {
      if (seriesRef.current) chartRef.current.removeSeries(seriesRef.current);
    } catch {  }

    if (chartType === 'candle') {
      seriesRef.current = chartRef.current.addSeries(CandlestickSeries, { upColor: "#00C853", downColor: "#FF3B30", borderVisible: false, wickUpColor: "#00C853", wickDownColor: "#FF3B30" });
    } else if (chartType === 'line') {
      seriesRef.current = chartRef.current.addSeries(LineSeries, { color: '#2962FF', lineWidth: 2 });
    } else if (chartType === 'area') {
      seriesRef.current = chartRef.current.addSeries(AreaSeries, { lineColor: '#2962FF', topColor: 'rgba(41, 98, 255, 0.4)', bottomColor: 'rgba(41, 98, 255, 0.0)', lineWidth: 2 });
    }
    renderChartData();
  }, [chartType]);

  const renderChartData = () => {
    if (!seriesRef.current || !activeTick?.history || activeTick.history.length === 0) return;
    const formattedData = activeTick.history.map((c) => (chartType === 'candle' ? { time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close } : { time: c.time as UTCTimestamp, value: c.close }));
    seriesRef.current.setData(formattedData as any);
  };

  useEffect(() => {
    setLogicalPattern(null);
    setBoxCoords(null);
    renderChartData();
  }, [activeTick?.history?.length, activeSymbol, activeTimeframe, chartType]);

  useEffect(() => {
    if (!seriesRef.current || !activeTick?.history || activeTick.history.length === 0) return;
    const last = activeTick.history[activeTick.history.length - 1];
    if (last) {
      try {
        if (chartType === 'candle') seriesRef.current.update({ time: last.time as UTCTimestamp, open: last.open, high: last.high, low: last.low, close: last.close });
        else seriesRef.current.update({ time: last.time as UTCTimestamp, value: last.close });
      } catch { }
    }
  }, [activeTick?.price, chartType]);

  const updateOverlayPosition = useCallback(() => {
    if (!chartRef.current || !seriesRef.current || !logicalPattern) {
      setBoxCoords(null);
      return;
    }
    try {
      const timeScale = chartRef.current.timeScale();
      const startX = timeScale.timeToCoordinate(Number(logicalPattern.startTime) as UTCTimestamp);
      const endX = timeScale.timeToCoordinate(Number(logicalPattern.endTime) as UTCTimestamp);
      const startY = seriesRef.current.priceToCoordinate(logicalPattern.highPrice);
      const endY = seriesRef.current.priceToCoordinate(logicalPattern.lowPrice);

      if (startX !== null && endX !== null && startY !== null && endY !== null) {
        const padding = 15;
        setBoxCoords({ x: Math.min(startX, endX) - padding, y: Math.min(startY, endY) - padding, w: Math.abs(endX - startX) + (padding * 2), h: Math.abs(endY - startY) + (padding * 2) });
      }
    } catch (err) {}
  }, [logicalPattern]);

  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.timeScale().subscribeVisibleLogicalRangeChange(updateOverlayPosition);
    return () => chartRef.current?.timeScale().unsubscribeVisibleLogicalRangeChange(updateOverlayPosition);
  }, [updateOverlayPosition]);

  useEffect(() => { updateOverlayPosition(); }, [activeTick?.price, chartType, updateOverlayPosition, logicalPattern]);

  const toggleSelectionMode = () => {
    const newMode = !isSelectionMode;
    setIsSelectionMode(newMode);
    
    chartRef.current?.applyOptions({
      handleScroll: !newMode,
      handleScale: !newMode,
    });

    if (!newMode) {
      setSelectionStart(null);
      setSelectionCurrent(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isSelectionMode || !chartWrapperRef.current) return;
    const rect = chartWrapperRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSelectionStart({ x, y });
    setSelectionCurrent({ x, y });
    setLogicalPattern(null); 
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelectionMode || !selectionStart || !chartWrapperRef.current) return;
    const rect = chartWrapperRef.current.getBoundingClientRect();
    setSelectionCurrent({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseUp = async () => {
    if (!isSelectionMode || !selectionStart || !selectionCurrent || !chartRef.current) return;

    const minX = Math.min(selectionStart.x, selectionCurrent.x);
    const maxX = Math.max(selectionStart.x, selectionCurrent.x);

    const timeScale = chartRef.current.timeScale();
    const startTime = timeScale.coordinateToTime(minX as any);
    const endTime = timeScale.coordinateToTime(maxX as any);

    setSelectionStart(null);
    setSelectionCurrent(null);
    setIsSelectionMode(false);
    chartRef.current.applyOptions({ handleScroll: true, handleScale: true }); 

    if (!startTime || !endTime) return;

    const selectedCandles = activeTick?.history?.filter(c => Number(c.time) >= Number(startTime) && Number(c.time) <= Number(endTime)) || [];
    
    if (selectedCandles.length < 5) {
      alert("Selection too narrow. Please drag a wider box across more candles.");
      return;
    }

    await runAnalysis(selectedCandles);
  };

  const runAnalysis = async (candlesToAnalyze: any[]) => {
    setIsScanning(true);
    try {
      // PRODUCTION FIX: Automatically points to Render in prod, localhost in dev.
      const API_BASE_URL = process.env.NEXT_PUBLIC_CV_API_URL || "http://127.0.0.1:8000";
      
      const res = await fetch(`${API_BASE_URL}/api/analyze-ohlc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: activeSymbol, candles: candlesToAnalyze }),
      });
      if (!res.ok) throw new Error("Backend error");
      const data = await res.json();
      
      if (data.success && data.pattern) {
        setLogicalPattern(data.pattern);
        setTimeout(updateOverlayPosition, 50);
      }
    } catch (error) {
      console.error(error);
      alert(`Failed to connect to Python backend at ${process.env.NEXT_PUBLIC_CV_API_URL || 'localhost'}.`);
    } finally {
      setIsScanning(false);
    }
  };

  const isUp = (activeTick?.change || 0) >= 0;

  const getSelectionStyle = () => {
    if (!selectionStart || !selectionCurrent) return {};
    const left = Math.min(selectionStart.x, selectionCurrent.x);
    const top = Math.min(selectionStart.y, selectionCurrent.y);
    const width = Math.abs(selectionCurrent.x - selectionStart.x);
    const height = Math.abs(selectionCurrent.y - selectionStart.y);
    return { left, top, width, height };
  };

  return (
    <div className="flex-1 bg-[#131722] flex flex-col overflow-hidden relative min-h-[420px] w-full h-full">
      <div className="h-10 border-b border-[#1E222D] flex items-center justify-between px-3 bg-[#1A1E29]/50 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 pr-3 border-r border-[#1E222D]">
            <span className="font-bold text-white tracking-wide text-sm">{activeSymbol}</span>
            <span className={`font-mono font-medium text-xs ${isUp ? "text-[#00C853]" : "text-[#FF3B30]"}`}>${activeTick?.price?.toFixed(2) || "---"}</span>
            <span className={`text-[11px] font-medium ${isUp ? "text-[#00C853]" : "text-[#FF3B30]"}`}>{isUp ? "+" : ""}{activeTick?.change?.toFixed(2) || "0.00"}%</span>
          </div>
          <div className="flex items-center gap-1">
            {TIMEFRAMES.map((tf) => (
              <button key={tf.value} onClick={() => setTimeframe(tf.value)} className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors ${activeTimeframe === tf.value ? "text-[#2962FF] border-b-2 border-[#2962FF] bg-[#2962FF]/10" : "text-[#7C8699] hover:text-white hover:bg-[#1E222D]"}`}>{tf.label}</button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {logicalPattern && (
            <button onClick={() => { setLogicalPattern(null); setBoxCoords(null); }} className="flex items-center gap-1 text-[11px] bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 text-[#FF3B30] border border-[#FF3B30]/30 px-2 py-1 rounded transition">
              <X size={12} /><span>Clear Overlay</span>
            </button>
          )}

          <button
            onClick={toggleSelectionMode}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-colors ${
              isSelectionMode 
                ? "bg-[#00C853] text-[#052012] shadow-[0_0_15px_rgba(0,200,83,0.4)]" 
                : "bg-[#2962FF]/10 hover:bg-[#2962FF]/20 text-[#2962FF] border border-[#2962FF]/30"
            }`}
          >
            {isScanning ? <Loader2 size={13} className="animate-spin" /> : <Crosshair size={13} />}
            <span>{isScanning ? "Scanning..." : isSelectionMode ? "Draw Region Now..." : "Select Region"}</span>
          </button>

          <div className="w-px h-4 bg-[#1E222D]" />
          <button onClick={() => chartRef.current?.timeScale().fitContent()} className="text-[#7C8699] hover:text-white p-1 rounded hover:bg-[#1E222D]"><RotateCcw size={14} /></button>
          <button className="text-[#7C8699] hover:text-white p-1 rounded hover:bg-[#1E222D]"><Maximize size={14} /></button>
        </div>
      </div>

      <div className="h-7 px-3 flex items-center gap-4 text-xs font-mono bg-[#131722] border-b border-[#1E222D]/40 text-[#7C8699] shrink-0 select-none z-20 relative">
        {legend ? (
          <>
            <div>O <span className={legend.change >= 0 ? "text-[#00C853]" : "text-[#FF3B30]"}>${legend.open.toFixed(2)}</span></div>
            <div>H <span className={legend.change >= 0 ? "text-[#00C853]" : "text-[#FF3B30]"}>${legend.high.toFixed(2)}</span></div>
            <div>L <span className={legend.change >= 0 ? "text-[#00C853]" : "text-[#FF3B30]"}>${legend.low.toFixed(2)}</span></div>
            <div>C <span className={legend.change >= 0 ? "text-[#00C853]" : "text-[#FF3B30]"}>${legend.close.toFixed(2)}</span></div>
          </>
        ) : <span className="text-[11px]">Hover to view data</span>}
      </div>

      <div 
        ref={chartWrapperRef} 
        className={`flex-1 w-full h-full relative overflow-hidden ${isSelectionMode ? "cursor-crosshair" : ""}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} 
      >
        <div ref={chartContainerRef} className={`absolute inset-0 [&_a]:!hidden ${isSelectionMode ? "pointer-events-none" : ""}`} />

        {isSelectionMode && selectionStart && selectionCurrent && (
          <div 
            className="absolute border-2 border-[#2962FF] bg-[#2962FF]/20 pointer-events-none z-40 backdrop-blur-[1px]"
            style={getSelectionStyle()}
          />
        )}

        {logicalPattern && boxCoords && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-30">
            <g>
              <rect
                x={boxCoords.x} y={boxCoords.y} width={boxCoords.w} height={boxCoords.h}
                fill="rgba(0, 200, 83, 0.12)"
                stroke={logicalPattern.pattern.includes("Bull") ? "#00C853" : (logicalPattern.pattern.includes("Bear") ? "#FF3B30" : "#FF9500")}
                strokeWidth="2" strokeDasharray="4 4" rx="4"
              />
              <rect
                x={boxCoords.x} y={Math.max(18, boxCoords.y) - 18} width={200} height={18}
                fill={logicalPattern.pattern.includes("Bull") ? "#00C853" : (logicalPattern.pattern.includes("Bear") ? "#FF3B30" : "#FF9500")}
                rx="3"
              />
              <text
                x={boxCoords.x + 6} y={Math.max(18, boxCoords.y) - 5}
                fill="#052012" fontSize="11" fontWeight="bold" fontFamily="monospace"
              >
                {logicalPattern.pattern} ({(logicalPattern.confidence * 100).toFixed(0)}%)
              </text>
            </g>
          </svg>
        )}
      </div>
    </div>
  );
}