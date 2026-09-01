# ApexTrader — Target Architecture

What's in this zip is **Phase 1** (bold below). Everything else is the planned
structure for the phases that follow, so you can see where each future file
will land before it exists.

```
apex-trader/
├─ app/                              # Next.js App Router
│  ├─ (marketing)/
│  │  ├─ page.tsx                    # ✅ Landing page  — PHASE 1
│  │  └─ layout.tsx                  # ✅ PHASE 1
│  ├─ (auth)/
│  │  ├─ login/page.tsx              #    PHASE 2 — real auth gateway
│  │  └─ signup/page.tsx             #    PHASE 2
│  ├─ (dashboard)/
│  │  └─ terminal/page.tsx           #    PHASE 2 — MT5-style terminal shell
│  └─ api/
│     ├─ auth/[...nextauth]/route.ts #    PHASE 2 — JWT session handling
│     ├─ orders/route.ts             #    PHASE 3 — order create/close
│     └─ wallet/route.ts             #    PHASE 3 — deposit simulated funds
│
├─ components/
│  ├─ landing/                       # ✅ PHASE 1 (this zip)
│  │  ├─ Hero.tsx, TickerTape.tsx, FeatureGrid.tsx,
│  │  │  SecurityStrip.tsx, ClosingCta.tsx, Footer.tsx,
│  │  │  AuthModal.tsx (visual only), LiveTerminalPreview.tsx
│  ├─ terminal/                      #    PHASE 2
│  │  ├─ ChartPanel.tsx              #    lightweight-charts wrapper
│  │  ├─ MarketWatch.tsx             #    symbol list, search, filters
│  │  ├─ OrderTicket.tsx             #    market/limit/SL/TP entry
│  │  ├─ PositionsTable.tsx          #    open positions, one-click close
│  │  ├─ AccountSummaryBar.tsx       #    balance/equity/margin/level
│  │  └─ IndicatorModal.tsx          #    SMA/EMA/RSI/MACD/BB params
│  └─ ui/                            #    PHASE 2 — shared primitives
│
├─ store/                            #    PHASE 2 — Zustand, split by domain
│  ├─ useChartStore.ts               #    active symbol, timeframe, candles
│  ├─ useMarketWatchStore.ts         #    watchlist, live bid/ask
│  ├─ useWalletStore.ts              #    balance, equity, margin, P&L
│  └─ useIndicatorStore.ts           #    per-chart indicator config
│
├─ lib/
│  ├─ landing-data.ts                # ✅ PHASE 1 (this zip)
│  ├─ finance/                       #    PHASE 3 — pure calculation functions
│  │  ├─ pnl.ts                      #    (bid-entry) × units × contractSize
│  │  ├─ margin.ts                   #    notional / leverage
│  │  ├─ marginLevel.ts              #    (equity / margin) × 100
│  │  └─ indicators/                 #    sma.ts, ema.ts, rsi.ts, macd.ts, bbands.ts
│  └─ auth.ts                        #    PHASE 2
│
├─ services/                         #    PHASE 3 — I/O boundary
│  ├─ priceFeedClient.ts             #    Socket.io client + subscribe/unsubscribe
│  └─ ordersApi.ts                   #    typed fetch wrappers for /api/orders
│
├─ server/                           #    PHASE 3 — separate Node process
│  ├─ index.ts                       #    Express app
│  ├─ socket.ts                      #    Socket.io gateway, per-symbol rooms
│  ├─ priceSimulator.ts              #    seeds a believable tick stream
│  └─ stopOut.ts                     #    auto-liquidation sweep (margin level < 50%)
│
├─ prisma/                           #    PHASE 3
│  └─ schema.prisma                  #    User, Account, Wallet, Order, Transaction
│
├─ tailwind.config.ts                # ✅ PHASE 1
└─ PROJECT_STRUCTURE.md              # ✅ this file
```

## Why it's split into phases

The brief asks for a full production system: a Next.js frontend, an Express +
Socket.io realtime backend, and a Postgres/Prisma data layer. That's a real
multi-service app — it can't be meaningfully built or run inside a single
chat response, since there's no live database or long-running WebSocket
server available here. Splitting it this way means every phase is something
you can actually run and look at, rather than one large drop of code that
hasn't been checked against a real dev server.

## Suggested order for what's next

1. **Zustand store** (`store/`) — the state contracts everything else depends on
2. **Chart + Market Watch** — `lightweight-charts` wrapper and the symbol list
3. **Bottom terminal panel** — account summary bar and positions table, wired to the wallet store with mock local state (no backend yet)
4. **Formulas** — the P&L / margin / indicator math in `lib/finance/`, fully commented
5. **Backend** — Express + Socket.io price feed, then Prisma schema and the API routes

Say which of these you want next and I'll build it the same way — real files,
runnable, with the math commented inline.
