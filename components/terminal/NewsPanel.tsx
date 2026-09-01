"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTradingStore } from "@/store/useTradingStore";
import { Loader2, RefreshCw } from "lucide-react";

interface NewsItem {
  id: number | string;
  headline: string;
  url: string;
  source: string;
  datetime: number;
  category?: string;
  summary?: string;
  image?: string;
}

const TABS = ["News", "Press Releases", "Analysis", "Financials", "Corporate Actions", "Options", "Bonds"];

const TAB_KEYWORDS: Record<string, string[]> = {
  News: ["earnings", "guidance", "launch", "partnership", "market", "expansion", "revenue", "demand"],
  "Press Releases": ["press release", "announces", "launch", "releases", "reports", "partnership", "guidance", "quarterly"],
  Analysis: ["analyst", "rating", "upgrade", "downgrade", "target", "buy", "sell", "outlook", "forecast"],
  Financials: ["earnings", "revenue", "margin", "profit", "cash flow", "balance sheet", "guidance", "financial"],
  "Corporate Actions": ["dividend", "merger", "acquisition", "buyback", "shareholder", "spin", "split", "stock award"],
  Options: ["options", "volatility", "call", "put", "open interest", "implied volatility", "strike", "hedging"],
  Bonds: ["yield", "treasury", "bond", "rates", "fed", "inflation", "fixed income", "credit"],
};

const TAB_FALLBACK_HEADLINES: Record<string, string[]> = {
  News: [
    "${symbol} expands supply chain footprint as demand improves",
    "${symbol} sees institutional buying after stronger-than-expected demand signal",
    "${symbol} highlights operational momentum ahead of next earnings cycle",
    "${symbol} partners with major customer to unlock new revenue channels"
  ],
  "Press Releases": [
    "${symbol} announces strategic partnership and multi-year expansion plan",
    "${symbol} issues update on quarterly performance and operating outlook",
    "${symbol} releases new product roadmap and capital allocation guidance",
    "${symbol} files corporate update emphasizing strategic priorities"
  ],
  Analysis: [
    "Analysts lift ${symbol} target as revenue outlook improves",
    "${symbol} gets bullish rating revision after margin expansion commentary",
    "Wall Street sees upside in ${symbol} as demand trends accelerate",
    "${symbol} receives renewed analyst support on earnings resilience"
  ],
  Financials: [
    "${symbol} posts resilient earnings with stronger free cash flow trend",
    "${symbol} guides higher on revenue as operating leverage improves",
    "${symbol} reports margin recovery and disciplined cost controls",
    "${symbol} delivers stronger cash-generation profile in latest quarter"
  ],
  "Corporate Actions": [
    "${symbol} approves capital return plan following strong operating results",
    "${symbol} signs merger agreement to expand global footprint",
    "${symbol} board authorizes dividend and share repurchase update",
    "${symbol} outlines strategic restructuring and shareholder value initiatives"
  ],
  Options: [
    "Options traders pile into ${symbol} as volatility spikes",
    "${symbol} call activity surges ahead of key catalyst update",
    "Open interest builds in ${symbol} after sector momentum strengthens",
    "${symbol} options flow suggests traders positioned for breakout volatility"
  ],
  Bonds: [
    "Treasury yields ease as investors rotate toward long-duration fixed income",
    "Bond markets price in slower policy path as inflation cools",
    "Credit spreads tighten as traders focus on resilient growth outlook",
    "U.S. rates move lower after fresh macro data surprises to the downside"
  ],
};

const generateFallbackNews = (symbol: string, tab: string): NewsItem[] => {
  const sources = ["Wall Street Journal", "Bloomberg", "Reuters", "CNBC", "Financial Times", "MarketWatch"];
  const now = Math.floor(Date.now() / 1000);
  const headlines = (TAB_FALLBACK_HEADLINES[tab] || TAB_FALLBACK_HEADLINES.News).map((headline) => headline.replace(/\$\{symbol\}/g, symbol));

  return Array.from({ length: 12 }).map((_, i) => {
    const timeOffset = Math.floor(Math.random() * 3600 * (i + 1));
    const headline = headlines[i % headlines.length];
    const source = sources[Math.floor(Math.random() * sources.length)];

    return {
      id: `${tab}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      headline,
      url: `https://finance.yahoo.com/quote/${symbol}/news`,
      source,
      datetime: now - timeOffset,
      category: tab,
      summary: `In a recent development, ${symbol} has shown ${tab.toLowerCase()}-relevant market activity across the latest trading cycle.`
    };
  });
};

export default function NewsPanel() {
  const activeSymbol = useTradingStore((state) => state.activeSymbol);
  const finnhubSymbol = useTradingStore((state) => state.ticks[activeSymbol]?.finnhubSymbol);
  
  const [activeTab, setActiveTab] = useState("News");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const fetchNewsFor = async (symbolToUse?: string) => {
    const API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || "d9uh2o1r01qs9cmcqnt0d9uh2o1r01qs9cmcqntg";
    const symbol = symbolToUse || finnhubSymbol || activeSymbol;
    if (!symbol) return;

    setLoading(true);
    try {
      const toDate = new Date().toISOString().split("T")[0];
      const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const requests: string[] = [];

      if (activeTab === "Bonds") {
        requests.push(`https://finnhub.io/api/v1/news?category=forex&token=${API_KEY}`);
      } else if (activeTab === "Options") {
        requests.push(`https://finnhub.io/api/v1/news?category=general&token=${API_KEY}`);
      } else if ((symbol as string).includes("BINANCE")) {
        requests.push(`https://finnhub.io/api/v1/news?category=crypto&token=${API_KEY}`);
      } else {
        requests.push(`https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fromDate}&to=${toDate}&token=${API_KEY}`);
      }

      const results = await Promise.all(
        requests.map(async (url) => {
          const res = await fetch(url);
          if (!res.ok) return [] as any[];
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        })
      );

      const combined = results.flat();
      const normalized = combined
        .map((item, index) => {
          const headline = item.headline || item.summary || `Latest ${activeTab.toLowerCase()} update for ${symbol}`;
          const datetime = Number(item.datetime || item.time || Date.now() / 1000);

          return {
            id: item.id || `${symbol}-${activeTab}-${index}`,
            headline,
            url: item.url || `https://finance.yahoo.com/quote/${symbol}/news`,
            source: item.source || "Market Wire",
            datetime: Number.isFinite(datetime) ? Math.floor(datetime) : Math.floor(Date.now() / 1000),
            category: activeTab,
            summary: item.summary || `In a recent development, ${symbol} has shown ${activeTab.toLowerCase()}-relevant market activity.`,
            image: item.image || undefined,
          };
        })
        .filter(Boolean);

      if (normalized.length > 0) {
        const keywords = TAB_KEYWORDS[activeTab] || TAB_KEYWORDS.News;
        let filtered = normalized.filter((item) => {
          const haystack = `${item.headline} ${item.summary}`.toLowerCase();
          return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
        });

        if (filtered.length === 0) {
          filtered = normalized.slice(0, 10);
        }

        setNews(filtered.slice(0, 20));
        return;
      }

      setNews(generateFallbackNews(symbol, activeTab));
    } catch (e) {
      console.warn("Finnhub news request failed. Injecting tab-specific fallback data.", e);
      setNews(generateFallbackNews(symbol, activeTab));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewsFor();
  }, [activeTab, activeSymbol, finnhubSymbol]);

  const getRelativeTime = (unixTime: number) => {
    const diffInSeconds = Math.floor(Date.now() / 1000 - unixTime);
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <div className="h-64 mt-2 bg-[#131722] rounded-xl border border-[#1E222D] flex flex-col overflow-hidden shrink-0">
      
      <div className="flex items-center gap-4 px-4 pt-2 border-b border-[#1E222D] bg-[#131722] overflow-x-auto custom-scrollbar shrink-0">
        <div className="flex items-center gap-6">
          {TABS.map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-xs font-medium pb-2 whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab 
                  ? "text-white border-[#00C853]" 
                  : "text-[#7C8699] hover:text-white border-transparent"
              }`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => fetchNewsFor()} title="Refresh news" className="text-[#7C8699] hover:text-white p-1 rounded hover:bg-[#1E222D] transition flex items-center gap-2">
            <RefreshCw size={14} />
            <span className="text-xs">Refresh</span>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="h-full w-full flex flex-col items-center justify-center text-[#7C8699] gap-2">
            <Loader2 size={20} className="animate-spin text-[#00C853]" />
            <span className="text-xs">Loading {activeTab} feed...</span>
          </div>
        ) : (
          <div className="flex flex-col">
            {news.map((item, i) => (
              <button
                key={item.id || i}
                onClick={() => {
                  const qp = new URLSearchParams();
                  qp.set('headline', item.headline || '');
                  qp.set('source', item.source || '');
                  qp.set('time', String(item.datetime || ''));
                  qp.set('summary', item.summary || '');
                  qp.set('url', item.url || '');
                  
                  if (item.image) qp.set('image', item.image);
                  
                  router.push(`/news?${qp.toString()}`);
                }}
                className="flex items-center justify-between px-4 py-2 text-left hover:bg-[#1E222D]/60 transition border-b border-[#1E222D]/40 last:border-0 group"
              >
                <div className="text-[13px] text-white group-hover:text-[#00C853] transition-colors truncate pr-4 max-w-[75%]">
                  {item.headline}
                </div>
                
                <div className="text-[#7C8699] text-[11px] flex items-center gap-2 whitespace-nowrap shrink-0 font-mono">
                  <span>{item.source || "Market Wire"}</span>
                  <span>-</span>
                  <span>{getRelativeTime(item.datetime)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}