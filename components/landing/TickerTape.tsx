
"use client";

import React, { useEffect, useMemo } from "react";
import { useTradingStore } from "@/store/useTradingStore";


const FALLBACK_ITEMS = [
  { symbol: "BTC/USD", price: "---", isUp: true },
  { symbol: "ETH/USD", price: "---", isUp: true },
  { symbol: "SOL/USD", price: "---", isUp: true },
  { symbol: "NVDA", price: "---", isUp: true },
  { symbol: "AAPL", price: "---", isUp: true },
  { symbol: "TSLA", price: "---", isUp: true },
  { symbol: "SPY", price: "---", isUp: true },
  { symbol: "QQQ", price: "---", isUp: true },
];

export default function TickerTape() {
  const ticks = useTradingStore((state) => state.ticks);
  const initializeMarketData = useTradingStore((state) => state.initializeMarketData);

  
  useEffect(() => {
    if (Object.keys(ticks).length === 0) {
      initializeMarketData();
    }
  }, [ticks, initializeMarketData]);

  
  const tickerItems = useMemo(() => {
    const items = Object.values(ticks);
    if (items.length === 0) return FALLBACK_ITEMS;

    return items.map((tick) => ({
      symbol: tick.symbol,
      price: tick.price > 0 
        ? tick.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
        : "---",
      isUp: tick.change >= 0,
    }));
  }, [ticks]);

  return (
    <div className="w-full bg-[#0B0E14] border-b border-[#1E222D] overflow-hidden flex py-2.5 text-[13px] font-mono relative">
      
      {}
      <style>{`
        @keyframes ticker-marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          display: flex;
          width: max-content;
          animation: ticker-marquee 50s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
      
      {}
      <div className="animate-ticker">
        {[...tickerItems, ...tickerItems, ...tickerItems, ...tickerItems].map((item, i) => (
          <div key={i} className="flex items-center gap-2 mx-6 cursor-pointer whitespace-nowrap">
            <span className="text-[#7C8699] font-bold">{item.symbol}</span>
            <span className={item.isUp ? "text-[#00C853]" : "text-[#FF3B30]"}>
              {item.price !== "---" ? `$${item.price}` : item.price}
            </span>
            <span className={item.isUp ? "text-[#00C853]" : "text-[#FF3B30]"}>
              {item.isUp ? "▲" : "▼"}
            </span>
          </div>
        ))}
      </div>
      
    </div>
  );
}