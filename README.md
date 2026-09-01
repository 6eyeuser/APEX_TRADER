# ApexTrader — Landing Page Starter (Phase 1 of 4)

This is a working Next.js 14 (App Router) + TypeScript + Tailwind implementation of the
public marketing landing page described in the project brief. It is phase 1 of the
full build — see `PROJECT_STRUCTURE.md` for the complete target architecture and
what's still to come.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## What's implemented here

- Hero with the live-updating mock terminal preview (client-side random walk —
  no real market data yet, that arrives with the WebSocket layer in phase 3)
- Scrolling ticker tape (EUR/USD, BTC/USD, AAPL, NVDA, Gold)
- Feature showcase grid, security/trust section, closing CTA, footer
- A visual-only "Create Free Account" modal previewing the future auth gateway
- Full dark theme using the brief's exact palette (`tailwind.config.ts`)

## One deliberate naming change

The brief's subheadline referenced "MT5 mechanics." I rewrote that to
"institutional-terminal execution mechanics" everywhere in the UI copy.
"MetaTrader 5," "MQL5," and the "MetaQuotes-Demo" badge are trademarks of
MetaQuotes Software Corp., and I'd avoid using them as literal on-screen
branding in a public product — even a demo one — since it reads as claiming
an affiliation that doesn't exist. The *layout pattern* (dark theme, chart +
market watch + bottom account panel) is a standard, non-proprietary trading
UI convention and is fine to draw on; the specific trademarked names and
badge text aren't. When we build the terminal itself in phase 2, I'll use
the same approach: MT5-style layout and mechanics, ApexTrader's own naming.

## Not built yet (see PROJECT_STRUCTURE.md)

- The MT5-style trading terminal (chart, market watch, order ticket, positions panel)
- The Zustand store powering multi-asset switching and indicator state
- The wallet / margin engine (balance, equity, margin level, stop-out logic)
- The Express + Socket.io price feed and the Prisma/PostgreSQL schema
- Real authentication (JWT) behind the signup modal shown here

This is genuinely a multi-week, multi-service build once you get past the
landing page — a browser chat session isn't the right place to stand up a
live database and WebSocket server. I can keep writing the source for each
piece here, but you'll want to run and wire the backend in a real dev
environment. Claude Code is a good fit for that next stretch, since it can
run the dev server, hit the database, and iterate against real errors as we
go — happy to keep going here too if you'd rather build it out file by file.
