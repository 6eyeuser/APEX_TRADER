// store/useTradingStore.ts
import { create } from 'zustand';

export type Timeframe = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '1d';

export interface Candle {
  time: number; // Unix timestamp in seconds (UTC)
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface SymbolTick {
  symbol: string;
  name: string;
  type: 'crypto' | 'stock';
  rawSymbol: string;
  finnhubSymbol?: string;
  price: number;
  bid: number;
  ask: number;
  change: number;
  history: Candle[];
  prevPrice: number;
  flash: 'up' | 'down' | null;
  isLoading: boolean;
}

export interface Position {
  symbol: string;
  shares: number;
  averagePrice: number;
}

export interface TradeRecord {
  id: string;
  timestamp: number;
  symbol: string;
  action: 'BUY' | 'SELL';
  shares: number;
  price: number;
  total: number;
}

export interface OrderItem {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT';
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  shares: number;
  targetPrice: number;
  executedPrice?: number;
  totalCost?: number;
  createdAt: string;
}

interface TradingState {
  activeSymbol: string;
  activeTimeframe: Timeframe;
  ticks: Record<string, SymbolTick>;
  balance: number;
  positions: Position[];
  tradeHistory: TradeRecord[];
  orders: OrderItem[];
  sockets: WebSocket[];
  setActiveSymbol: (symbol: string) => void;
  setTimeframe: (timeframe: Timeframe) => void;
  addFunds: (amount: number) => void;
  initializeMarketData: () => Promise<void>;
  fetchHistoryForSymbol: (symbol: string, tf?: Timeframe) => Promise<void>;
  fetchOrders: () => Promise<void>;
  cancelOrder: (orderId: string) => Promise<{ success: boolean; message?: string }>;
  executeTrade: (action: 'BUY' | 'SELL', shares: number) => { success: boolean; message?: string };
}

const INSTRUMENTS: Array<{ symbol: string; name: string; type: 'crypto' | 'stock'; rawSymbol: string }> = [
  { symbol: "BTC/USD", name: "Bitcoin", type: "crypto", rawSymbol: "BTCUSDT" },
  { symbol: "ETH/USD", name: "Ethereum", type: "crypto", rawSymbol: "ETHUSDT" },
  { symbol: "SOL/USD", name: "Solana", type: "crypto", rawSymbol: "SOLUSDT" },
  { symbol: "DOGE/USD", name: "Dogecoin", type: "crypto", rawSymbol: "DOGEUSDT" },
  { symbol: "XRP/USD", name: "XRP", type: "crypto", rawSymbol: "XRPUSDT" },
  { symbol: "BNB/USD", name: "BNB", type: "crypto", rawSymbol: "BNBUSDT" },
  { symbol: "ADA/USD", name: "Cardano", type: "crypto", rawSymbol: "ADAUSDT" },
  { symbol: "AVAX/USD", name: "Avalanche", type: "crypto", rawSymbol: "AVAXUSDT" },
  { symbol: "NVDA", name: "NVIDIA Corp.", type: "stock", rawSymbol: "NVDA" },
  { symbol: "AAPL", name: "Apple Inc.", type: "stock", rawSymbol: "AAPL" },
  { symbol: "TSLA", name: "Tesla Inc.", type: "stock", rawSymbol: "TSLA" },
  { symbol: "MSFT", name: "Microsoft Corp.", type: "stock", rawSymbol: "MSFT" },
  { symbol: "AMZN", name: "Amazon.com Inc.", type: "stock", rawSymbol: "AMZN" },
  { symbol: "GOOGL", name: "Alphabet Inc.", type: "stock", rawSymbol: "GOOGL" },
  { symbol: "META", name: "Meta Platforms", type: "stock", rawSymbol: "META" },
  { symbol: "PLTR", name: "Palantir Tech", type: "stock", rawSymbol: "PLTR" },
  { symbol: "AMD", name: "Advanced Micro Devices", type: "stock", rawSymbol: "AMD" },
  { symbol: "COIN", name: "Coinbase Global", type: "stock", rawSymbol: "COIN" },
  { symbol: "SPY", name: "S&P 500 ETF", type: "stock", rawSymbol: "SPY" },
  { symbol: "QQQ", name: "Invesco QQQ", type: "stock", rawSymbol: "QQQ" },
];

export const useTradingStore = create<TradingState>((set, get) => ({
  activeSymbol: "BTC/USD",
  activeTimeframe: "1m",
  ticks: {},
  balance: 100000.0,
  positions: [],
  tradeHistory: [],
  orders: [],
  sockets: [],

  setActiveSymbol: (symbol) => {
    set({ activeSymbol: symbol });
    get().fetchHistoryForSymbol(symbol, get().activeTimeframe);
  },

  setTimeframe: (timeframe) => {
    set({ activeTimeframe: timeframe });
    get().fetchHistoryForSymbol(get().activeSymbol, timeframe);
  },

  addFunds: (amount) => set((state) => ({ balance: state.balance + amount })),

  fetchOrders: async () => {
    try {
      const res = await fetch('/api/auth/orders', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        set({ orders: data.orders || [] });
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    }
  },

  cancelOrder: async (orderId: string) => {
    try {
      const res = await fetch(`/api/auth/orders?id=${orderId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        // Refresh orders and user data after canceling (which refunds escrow)
        get().fetchOrders();
        return { success: true };
      }
      return { success: false, message: data.error || "Failed to cancel order" };
    } catch (err: any) {
      return { success: false, message: err.message || "Network error" };
    }
  },

  executeTrade: (action, shares) => {
    if (shares <= 0) return { success: false, message: "Invalid share quantity" };
    const state = get();
    const symbol = state.activeSymbol;
    const tick = state.ticks[symbol];
    if (!tick || tick.price <= 0) return { success: false, message: "Live market price unavailable" };

    const executionPrice = action === 'BUY' ? tick.ask : tick.bid;
    const totalCost = executionPrice * shares;
    const existingPosition = state.positions.find((p) => p.symbol === symbol);

    const newTrade: TradeRecord = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      symbol,
      action,
      shares,
      price: executionPrice,
      total: totalCost
    };

    if (action === 'BUY') {
      if (state.balance < totalCost) return { success: false, message: "Insufficient buying power" };
      const newBalance = state.balance - totalCost;
      if (existingPosition) {
        const totalShares = existingPosition.shares + shares;
        const newAvg = ((existingPosition.shares * existingPosition.averagePrice) + totalCost) / totalShares;
        set({ 
          balance: newBalance, 
          positions: state.positions.map((p) => p.symbol === symbol ? { ...p, shares: totalShares, averagePrice: newAvg } : p),
          tradeHistory: [newTrade, ...state.tradeHistory]
        });
      } else {
        set({ 
          balance: newBalance, 
          positions: [...state.positions, { symbol, shares, averagePrice: executionPrice }],
          tradeHistory: [newTrade, ...state.tradeHistory]
        });
      }
      return { success: true };
    } else {
      if (!existingPosition || existingPosition.shares < shares) return { success: false, message: "Insufficient shares to sell" };
      const newBalance = state.balance + totalCost;
      const remainingShares = existingPosition.shares - shares;
      set({ 
        balance: newBalance, 
        positions: remainingShares === 0 ? state.positions.filter((p) => p.symbol !== symbol) : state.positions.map((p) => p.symbol === symbol ? { ...p, shares: remainingShares } : p),
        tradeHistory: [newTrade, ...state.tradeHistory]
      });
      return { success: true };
    }
  },

  fetchHistoryForSymbol: async (symbol: string, tf: Timeframe = "1m") => {
    const item = INSTRUMENTS.find(i => i.symbol === symbol);
    if (!item) return;

    if (item.type === 'crypto') {
      try {
        const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${item.rawSymbol}&interval=${tf}&limit=1000`);
        if (!res.ok) return;
        const data: any[][] = await res.json();
        const realHistory: Candle[] = data.map((k) => ({
          time: Math.floor(k[0] / 1000),
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
        }));

        set((state) => {
          const current = state.ticks[symbol];
          const latestPrice = realHistory[realHistory.length - 1]?.close || current?.price || 0;
          return {
            ticks: {
              ...state.ticks,
              [symbol]: {
                ...current,
                history: realHistory,
                price: latestPrice,
                bid: +(latestPrice * 0.9999).toFixed(2),
                ask: +(latestPrice * 1.0001).toFixed(2),
                isLoading: false,
              }
            }
          };
        });
      } catch (e) {
        console.error(`Failed to fetch history for ${symbol}:`, e);
      }
    }
  },

  initializeMarketData: async () => {
    const alpacaKey = process.env.NEXT_PUBLIC_ALPACA_KEY;
    const alpacaSecret = process.env.NEXT_PUBLIC_ALPACA_SECRET;

    get().sockets.forEach((s) => {
      try { if (s.readyState === WebSocket.OPEN || s.readyState === WebSocket.CONNECTING) s.close(); } catch {}
    });

    const initialTicks: Record<string, SymbolTick> = {};
    INSTRUMENTS.forEach((item) => {
      initialTicks[item.symbol] = {
        symbol: item.symbol,
        name: item.name,
        type: item.type,
        rawSymbol: item.rawSymbol,
        price: 0,
        bid: 0,
        ask: 0,
        change: 0,
        history: [],
        prevPrice: 0,
        flash: null,
        isLoading: true,
      };
    });
    set({ ticks: initialTicks, sockets: [] });

    // Fetch initial user orders
    get().fetchOrders();

    const cryptoItems = INSTRUMENTS.filter((i) => i.type === 'crypto');
    await Promise.all(cryptoItems.map((item) => get().fetchHistoryForSymbol(item.symbol, get().activeTimeframe)));

    const stockItems = INSTRUMENTS.filter((i) => i.type === 'stock');
    if (stockItems.length > 0) {
      try {
        const stockSymbols = stockItems.map((s) => s.rawSymbol).join(',');
        const snapRes = await fetch(`/api/alpaca?symbols=${stockSymbols}`);
        const snapData = snapRes.ok ? await snapRes.json() : {};

        set((state) => {
          const updated = { ...state.ticks };
          stockItems.forEach((item) => {
            const snap = snapData[item.rawSymbol];
            if (snap) {
              const livePrice = snap.latestTrade?.p || snap.latestQuote?.ap || 0;
              const prevClose = snap.prevDailyBar ? snap.prevDailyBar.c : livePrice;
              const change = prevClose > 0 ? +(((livePrice - prevClose) / prevClose) * 100).toFixed(2) : 0;
              const bid = snap.latestQuote?.bp || +(livePrice * 0.9998).toFixed(2);
              const ask = snap.latestQuote?.ap || +(livePrice * 1.0002).toFixed(2);

              updated[item.symbol] = {
                ...updated[item.symbol],
                price: livePrice,
                bid,
                ask,
                change,
                prevPrice: prevClose,
                isLoading: false,
              };
            }
          });
          return { ticks: updated };
        });
      } catch (e) {
        console.error('Failed to load stock data:', e);
      }
    }

    const activeSockets: WebSocket[] = [];

    try {
      const cryptoStreams = cryptoItems.map((i) => `${i.rawSymbol.toLowerCase()}@trade`).join('/');
      const binanceWs = new WebSocket(`wss://stream.binance.com:9443/ws/${cryptoStreams}`);

      binanceWs.onmessage = (event) => {
        const trade = JSON.parse(event.data);
        if (!trade.s || !trade.p) return;

        const livePrice = parseFloat(trade.p);
        const match = cryptoItems.find((i) => i.rawSymbol.toLowerCase() === trade.s.toLowerCase());
        if (!match) return;

        set((state) => {
          const tick = state.ticks[match.symbol];
          if (!tick) return state;

          const flash = livePrice > tick.price ? 'up' : livePrice < tick.price ? 'down' : null;
          const updatedHistory = [...tick.history];

          if (updatedHistory.length > 0) {
            const lastCandle = { ...updatedHistory[updatedHistory.length - 1] };
            lastCandle.high = Math.max(lastCandle.high, livePrice);
            lastCandle.low = Math.min(lastCandle.low, livePrice);
            lastCandle.close = livePrice;
            updatedHistory[updatedHistory.length - 1] = lastCandle;
          }

          return {
            ticks: {
              ...state.ticks,
              [match.symbol]: {
                ...tick,
                prevPrice: tick.price,
                price: livePrice,
                bid: +(livePrice * 0.9999).toFixed(2),
                ask: +(livePrice * 1.0001).toFixed(2),
                flash,
                history: updatedHistory,
                change: updatedHistory[0]?.open > 0
                  ? +(((livePrice - updatedHistory[0].open) / updatedHistory[0].open) * 100).toFixed(2)
                  : tick.change,
              },
            },
          };
        });
      };
      activeSockets.push(binanceWs);
    } catch (err) {}

    if (alpacaKey && alpacaSecret) {
      try {
        const alpacaWs = new WebSocket(`wss://stream.data.alpaca.markets/v2/iex`);
        alpacaWs.onopen = () => {
          alpacaWs.send(JSON.stringify({ action: 'auth', key: alpacaKey, secret: alpacaSecret }));
        };
        alpacaWs.onmessage = (event) => {
          const messages = JSON.parse(event.data);
          messages.forEach((msg: any) => {
            if (msg.T === 'success' && msg.msg === 'authenticated') {
              const symbols = stockItems.map((s) => s.rawSymbol);
              alpacaWs.send(JSON.stringify({ action: 'subscribe', trades: symbols }));
            } else if (msg.T === 't') {
              const match = stockItems.find((s) => s.rawSymbol === msg.S);
              if (!match) return;
              const livePrice = msg.p;

              set((state) => {
                const tick = state.ticks[match.symbol];
                if (!tick) return state;
                const flash = livePrice > tick.price ? 'up' : livePrice < tick.price ? 'down' : null;
                const change = tick.prevPrice > 0 ? +(((livePrice - tick.prevPrice) / tick.prevPrice) * 100).toFixed(2) : tick.change;

                return {
                  ticks: {
                    ...state.ticks,
                    [match.symbol]: {
                      ...tick,
                      prevPrice: tick.price,
                      price: livePrice,
                      bid: +(livePrice * 0.9998).toFixed(2),
                      ask: +(livePrice * 1.0002).toFixed(2),
                      flash,
                      change,
                    },
                  },
                };
              });
            }
          });
        };
        activeSockets.push(alpacaWs);
      } catch (err) {}
    }

    set({ sockets: activeSockets });
  },
}));