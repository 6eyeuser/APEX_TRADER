# APEX TRADER ⚡

> Multi-modal trading terminal, Web3 portfolio manager, and voice-driven algorithmic execution engine.

---

## 📌 Overview

**ApexTrader** bridges high-frequency market streaming, voice execution, computer vision, and on-chain settlement into one unified interface.

Traditional trading platforms isolate web dashboards, mobile bots, and Web3 wallets. ApexTrader breaks down these barriers: execute market orders hands-free using natural speech, analyze technical candlestick structures from raw pixels via computer vision, link mobile Telegram bots with one-click cryptographic deep links, and consolidate off-chain paper trades with live on-chain Sepolia transactions into a single unified ledger.

* **Web Application & Terminal:** [github.com/6eyeuser/APEX_TRADER](https://github.com/6eyeuser/APEX_TRADER)
* **Computer Vision Engine:** [github.com/6eyeuser/cv_apex_trader](https://github.com/6eyeuser/cv_apex_trader)
* **Live Deployment:** [apex-trader-x6rq.vercel.app](https://apex-trader-x6rq.vercel.app/)

---

## ✨ Key Architectural Features

### 1. 🎙️ Sub-Second Voice-to-Trade Pipeline

* **Multi-Channel Voice Execution:** Speak orders directly via the in-browser floating microphone or send native audio notes inside Telegram while on the move.
* **Audio-to-Intent Pipeline:** Audio buffers stream to **Deepgram Nova-2** for sub-second speech-to-text (STT). The transcribed text passes to **Groq-hosted Llama-3**, which enforces strict JSON extraction:
```json
{
  "action": "BUY",
  "symbol": "SOL/USD",
  "shares": 1.0,
  "orderType": "MARKET"
}

```


* **Interactive Confirmations:** Telegram users receive instant inline keyboard confirmation cards before executing transactions into the database.

### 2. 👁️ Computer Vision Chart Pattern Recognition

* **Pixel-Based Pattern Detection:** Eliminates manual trendline charting by passing raw candlestick charts through a dedicated visual pipeline.
* **Automated Technical Breakdowns:** Identifies key market structures (support/resistance levels, breakouts, double bottoms, engulfing candles) and computes entry, target, and stop-loss levels.

### 3. 🤖 Zero-Friction Telegram Deep Linking

* **No API Keys or Manual Setup:** Replaces complex webhook registration with one-click cryptographic authentication.
* **Ephemeral Auth Flow:** Generates a secure deep link payload (`/start <token>`), binding the user's `telegramChatId` directly to their PostgreSQL account.

### 4. ⛓️ Unified Hybrid Activity Ledger

* **Off-Chain + On-Chain Reconciliation:** Normalizes standard terminal trades (stocks/crypto) and live on-chain testnet transfers into a single chronological ledger.
* **Multi-Provider Web3 Indexing:** Leverages **RainbowKit** and **Wagmi** for browser wallet connections alongside the **Etherscan V2 API** (Chain ID: `11155111` for Sepolia) to index incoming and outgoing transactions across all registered user wallets.

### 5. 📈 High-Water Mark & Real-Time Performance Analytics

* **Streaming Market Data:** Integrated with low-latency market data streams via **Alpaca Market Data** and **WebSockets**.
* **Real-Time Financial Metrics:** Computes live equity, unrealized PnL, cost basis, and automated **High-Water Mark** profit tracking across price ticks without requiring page refreshes.

### 6. 🧠 Context-Aware AI Copilot

* **Atomic Multi-Leg Rebalancing:** Supports multi-step strategic prompts (e.g., *"Liquidate my SOL position, hold enough cash reserve for 1 Bitcoin, and allocate the rest to ETH"*).
* **Prisma Atomic Transactions:** Calculates real-time asset costs, reserves designated cash buffers, and executes multi-order trades atomically in PostgreSQL.

---

## 🛠️ System Architecture

```text
               ┌───────────────────────┐
               │    ApexTrader Web     │
               │  (Next.js 14 App Rtr) │
               └───────────┬───────────┘
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Voice & AI  │    │  Alpaca WS   │    │  Web3 Rails  │
│  Deepgram    │    │  Market Data │    │  RainbowKit  │
│  Groq/Llama3 │    │  Live Ticks  │    │  Wagmi/Viem  │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           ▼
               ┌───────────────────────┐
               │   Prisma ORM / Supa   │
               │  PostgreSQL Database  │
               └───────────▲───────────┘
                           │
               ┌───────────┴───────────┐
               │  Telegram Bot Engine  │
               │ (Deep Link / Webhook) │
               └───────────────────────┘

```

---

## 💻 Tech Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Lucide Icons |
| **State Management** | Zustand (Global market store, order state, broadcast channel sync) |
| **Web3 & Blockchain** | Wagmi, RainbowKit, Viem, Etherscan V2 API (Ethereum Sepolia Testnet) |
| **Backend & APIs** | Next.js Route Handlers, Node.js, Webhooks, Telegram Bot API |
| **Database & ORM** | PostgreSQL (Supabase), Prisma ORM |
| **AI & Multi-Modal** | Deepgram Nova-2 (STT), Groq (Llama-3 inference), PyTorch / OpenCV |
| **Market Data** | Alpaca Market API, Live WebSocket Feeds |

---

## 🚀 Getting Started

### Prerequisites

* Node.js 18.17+ or higher
* PostgreSQL database instance (or Supabase project)
* API Keys: Deepgram, Groq, Alpaca, Etherscan, Telegram Bot Token

### 1. Clone the Repositories

```bash
# Clone the main trading terminal
git clone https://github.com/6eyeuser/APEX_TRADER.git
cd APEX_TRADER

# (Optional) Clone the computer vision module
git clone https://github.com/6eyeuser/cv_apex_trader.git

```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install

```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/apextrader?schema=public"

# Auth & Security
JWT_SECRET="your-jwt-secret-key"

# Market Feeds (Alpaca)
ALPACA_API_KEY="your-alpaca-key"
ALPACA_API_SECRET="your-alpaca-secret"

# Voice & AI Inference
DEEPGRAM_API_KEY="your-deepgram-key"
GROQ_API_KEY="your-groq-key"

# Telegram Bot
TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Web3 & Blockchain
ETHERSCAN_API_KEY="your-etherscan-api-key"
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID="your-wallet-connect-id"

```

### 4. Database Setup & Migrations

```bash
# Push Prisma schema to your database
npx prisma db push

# Generate the Prisma Client
npx prisma generate

```

### 5. Run Development Server

```bash
npm run dev

```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```text
├── app/
│   ├── api/
│   │   ├── auth/              # JWT auth and profile verification
│   │   ├── copilot/           # AI copilot reasoning and rebalance logic
│   │   ├── telegram/          # Cryptographic link & webhook handlers
│   │   ├── trade/             # Order execution & Prisma transactions
│   │   ├── voice-trade/       # Deepgram & Groq transcription routing
│   │   └── wallet/            # Multi-wallet persistence & Etherscan V2 sync
│   ├── dashboard/             # Live analytics, positions & unified ledger
│   ├── terminal/              # High-frequency trading charts & order book
│   ├── wallet/                # RainbowKit multi-wallet management
│   └── copilot/               # Conversational execution interface
├── components/
│   ├── UnifiedTradeHistory.tsx# Hybrid off-chain & on-chain ledger table
│   ├── VoiceTrade.tsx         # Floating in-browser voice interface
│   └── Navigation.tsx         # Terminal header & quick navigation
├── lib/
│   └── prisma.ts              # Global Prisma client singleton
├── store/
│   └── useTradingStore.ts     # Zustand store for ticks, equity, and positions
├── prisma/
│   └── schema.prisma          # Database models (User, Wallet, Trade, Position)
└── public/                    # Static assets

```

---

## 🛡️ License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 👨‍💻 Author

**Kartik**

* GitHub: [@6eyeuser](https://www.google.com/search?q=https://github.com/6eyeuser)
* Project: [ApexTrader Live Deployment](https://apex-trader-x6rq.vercel.app/)
