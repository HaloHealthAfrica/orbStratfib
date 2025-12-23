# OrbStrat Trader (ORB Strat + Fib) — Vercel-native options decision engine

TradingView webhook → store-first → async processing (QStash) → explainable decision → options selection → paper/live execution (Tradier).

## What’s in this repo

- **Next.js App Router (TS)** UI pages:
  - `/dashboard`, `/webhooks`, `/signals`, `/signals/[id]`, `/trades`, `/trades/[id]`, `/watchlist`, `/settings`, `/pnl`
- **API routes**:
  - `POST /api/webhooks/tradingview` (store-first + enqueue)
  - `POST /api/jobs/processWebhook` (worker)
  - `POST /api/jobs/updatePnl` (cron)
  - `GET /api/debug/webhook/[id]` (debug)
- **Database**: Prisma schema + SQL migrations under `prisma/`

## Local setup

1) Create env file:

- Copy `env.example` → `.env.local` and fill in `DATABASE_URL` at minimum.

2) Generate Prisma client:

```bash
npx prisma generate
```

3) Apply migrations

This repo includes raw SQL migrations (`prisma/migrations/*/migration.sql`).
Apply them to your Postgres (Neon/Supabase) using your tool of choice, or run Prisma migrations once you have a DB available.

4) Run dev:

```bash
npm run dev
```

## Vercel deployment checklist

### Required env vars (minimum)
- `DATABASE_URL`
- `NEXTAUTH_SECRET` (recommended in prod)
- `APP_BASE_URL` (needed for QStash callback URLs)

### Webhook endpoint
- Send TradingView webhooks to: `POST /api/webhooks/tradingview`
- Use header `X-WEBHOOK-TOKEN: <WEBHOOK_SECRET>`
- Optional signature header: `X-Signature` (HMAC-SHA256 over raw body with `WEBHOOK_SECRET`)

### QStash worker
- Configure `QSTASH_TOKEN` and signing keys
- QStash publishes to: `POST /api/jobs/processWebhook`

### Vercel Cron (PnL)
- Create a cron job calling: `POST /api/jobs/updatePnl`
- Add header `X-CRON-SECRET: <WEBHOOK_SECRET>`

### Tradier live trading safety
Live order placement requires **both**:
- `StrategyConfig.mode = LIVE`
- `LIVE_TRADING_ENABLED=true`

## Auth
Auth.js is wired via `/api/auth/[...nextauth]`. GitHub OAuth works when you set:
- `GITHUB_ID`, `GITHUB_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`

