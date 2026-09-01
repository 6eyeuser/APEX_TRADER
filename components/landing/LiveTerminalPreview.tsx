"use client";

import { useEffect, useState } from "react";
import { jitter } from "@/lib/landing-data";

export default function LiveTerminalPreview() {
  const [series, setSeries] = useState<number[]>(() => {
    const arr: number[] = [];
    let p = 1.0842;
    for (let i = 0; i < 48; i++) {
      p = jitter(p, 0.0009);
      arr.push(p);
    }
    return arr;
  });
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setSeries((prev) => {
        const next = jitter(prev[prev.length - 1], 0.0011);
        return [...prev.slice(1), next];
      });
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 220);
      return () => clearTimeout(t);
    }, 850);
    return () => clearInterval(id);
  }, []);

  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 0.0001;
  const w = 480;
  const h = 190;
  const points = series.map((v, i) => {
    const x = (i / (series.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 24) - 12;
    return [x, y] as const;
  });
  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L${w},${h} L0,${h} Z`;

  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  const up = last >= prev;
  const trend = up ? "text-bull" : "text-bear";
  const stroke = up ? "#00C853" : "#FF3B30";

  return (
    <div className="rounded-2xl border border-panel bg-surface p-4 sm:p-5 w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-bull transition-shadow duration-200"
            style={{ boxShadow: `0 0 0 ${flash ? 5 : 3}px rgba(0,200,83,0.15)` }}
          />
          <span className="text-[11px] uppercase tracking-widest text-muted font-mono">Live · Sandbox feed</span>
        </div>
        <span className="text-[11px] text-muted font-mono">EUR/USD · M1</span>
      </div>

      <div className="flex items-baseline gap-3 mb-2">
        <span className={`text-2xl sm:text-3xl font-medium tabular-nums font-mono ${trend}`}>{last.toFixed(4)}</span>
        <span className={`text-xs tabular-nums font-mono ${trend}`}>
          {up ? "▲" : "▼"} {(Math.abs(last - prev) * 10000).toFixed(1)} pips
        </span>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32 sm:h-40" preserveAspectRatio="none">
        <defs>
          <linearGradient id="apex-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={w} y1={h * f} y2={h * f} stroke="#1E222D" strokeWidth={1} />
        ))}
        <path d={areaPath} fill="url(#apex-area)" stroke="none" />
        <path d={path} fill="none" stroke={stroke} strokeWidth={1.75} />
      </svg>

      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-panel">
        {[
          ["Balance", "100,000.00"],
          ["Equity", "100,000.00"],
          ["Margin level", "—"],
        ].map(([label, value]) => (
          <div key={label}>
            <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
            <div className="text-sm tabular-nums font-mono text-ink">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
