import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.ALPACA_API_KEY;
    const apiSecret = process.env.ALPACA_API_SECRET;

    if (apiKey && apiSecret) {
      const response = await fetch("https://data.alpaca.markets/v1beta1/news?limit=20", {
        headers: {
          "APCA-API-KEY-ID": apiKey,
          "APCA-API-SECRET-KEY": apiSecret,
        },
        next: { revalidate: 60 }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.news && data.news.length > 0) {
          return NextResponse.json({ articles: data.news });
        }
      }
    }

    const fallbackNews = [
      {
        id: 1,
        headline: "Bitcoin Surges Past Key Resistance as Institutional Inflows Accelerate",
        summary: "Spot ETF volumes hit record daily highs as market participants anticipate liquidity expansion across global crypto markets.",
        author: "Apex Market Wire",
        created_at: new Date().toISOString(),
        url: "https://finance.yahoo.com/topic/crypto/", 
        symbols: ["BTC/USD", "ETH/USD"],
        images: [{ size: "large", url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80" }]
      },
      {
        id: 2,
        headline: "NVIDIA Outlines Next-Gen AI Silicon Roadmap Ahead of Earnings",
        summary: "Semiconductor giant details architecture enhancements designed to address enterprise inference and compute bottlenecks.",
        author: "TechDesk Financial",
        created_at: new Date(Date.now() - 3600000).toISOString(),
        url: "https://www.cnbc.com/technology/",
        symbols: ["NVDA", "AMD"],
        images: [{ size: "large", url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80" }]
      },
      {
        id: 3,
        headline: "Federal Reserve Signals Data-Dependent Stance on Benchmark Interest Rates",
        summary: "Treasury yields stabilize following morning economic releases reflecting sustained employment and moderate wage growth.",
        author: "Global Macro Report",
        created_at: new Date(Date.now() - 7200000).toISOString(),
        url: "https://www.bloomberg.com/markets", 
        symbols: ["SPY", "QQQ"],
        images: [{ size: "large", url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80" }]
      }
    ];

    return NextResponse.json({ articles: fallbackNews });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch news" }, { status: 500 });
  }
}