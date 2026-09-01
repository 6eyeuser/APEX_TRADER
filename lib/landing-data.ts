export const TICKER_SEED = [
  { symbol: "EUR/USD", price: 1.0842 },
  { symbol: "BTC/USD", price: 61230.5 },
  { symbol: "AAPL", price: 221.14 },
  { symbol: "NVDA", price: 128.77 },
  { symbol: "GOLD", price: 2418.3 },
];

export const FEATURES = [
  {
    icon: "Repeat" as const,
    title: "Real-Time Multi-Asset Switching",
    description:
      "Seamlessly switch between stock CFDs, forex pairs, and cryptocurrencies with zero frame drop and persistent indicator settings.",
  },
  {
    icon: "Layers" as const,
    title: "Institutional Order Types & Hedging",
    description:
      "Full support for market instant execution, limit orders, stop loss, take profit, and real-time position margin calculations.",
  },
  {
    icon: "Wallet" as const,
    title: "Virtual Funding & Ledger Wallet",
    description:
      "An integrated double-entry paper wallet. Add simulated USD funds instantly, allocate positions, and monitor margin level in real time.",
  },
  {
    icon: "Activity" as const,
    title: "Full Technical Analysis Toolkit",
    description:
      "30+ technical indicators — SMA, EMA, RSI, MACD, Bollinger Bands, Volume VWAP — across every timeframe from M1 to MN.",
  },
];

export const TRUST = [
  {
    icon: "Lock" as const,
    title: "Bank-grade session encryption",
    description: "Every session is encrypted end to end, the same standard used by regulated brokerages.",
  },
  {
    icon: "ShieldCheck" as const,
    title: "Segregated demo ledger",
    description: "Simulated funds live in an isolated ledger that never touches a real market or a real order book.",
  },
  {
    icon: "Gauge" as const,
    title: "Built for institutional load",
    description: "The same execution and risk infrastructure a live desk would run, sized down for practice.",
  },
];

/** Small bounded random-walk step, used to animate mock prices client-side. */
export function jitter(value: number, pct: number): number {
  const delta = value * pct * (Math.random() - 0.5) * 2;
  return value + delta;
}

export function formatPrice(symbol: string, value: number): string {
  if (symbol === "EUR/USD") return value.toFixed(4);
  return value.toFixed(2);
}
