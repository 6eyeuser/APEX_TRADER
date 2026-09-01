import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WATCHLIST_SYMBOLS = [
  "AAPL", "NVDA", "MSFT", "AMZN", "GOOGL", 
  "META", "TSLA", "NFLX", "AMD", "INTC", 
  "AVGO", "QCOM", "ARM", "ORCL", "CRM", "PLTR"
];

export async function GET() {
  const API_KEY = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

  if (!API_KEY) {
    return NextResponse.json({ error: "Finnhub API key not configured" }, { status: 500 });
  }

  try {
    // Fetch quotes in parallel across all tracked symbols
    const quotePromises = WATCHLIST_SYMBOLS.map(async (symbol) => {
      const res = await fetch(
        "https://finnhub.io/api/v1/quote?symbol=" + symbol + "&token=" + API_KEY,
        { next: { revalidate: 60 } }
      );
      
      if (!res.ok) {
        throw new Error("Failed to fetch quote for " + symbol);
      }
      
      const data = await res.json();
      return {
        symbol,
        currentPrice: data.c || 0,
        highPrice: data.h || 0,
        lowPrice: data.l || 0,
        openPrice: data.o || 0,
        previousClose: data.pc || 0,
        change: data.d || 0,
        changePercent: data.dp || 0,
      };
    });

    const quotes = await Promise.all(quotePromises);
    return NextResponse.json({ success: true, quotes });
  } catch (error: any) {
    console.error("Failed to fetch initial market quotes:", error);
    return NextResponse.json({ error: error.message || "Failed to load quotes" }, { status: 500 });
  }
}