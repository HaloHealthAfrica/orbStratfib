import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Miyagi Trader</h1>
        <p className="mt-3 text-zinc-700">
          Options trading decision engine: TradingView webhook → store first → async processing → explainable decision →
          optional execution (paper/live).
        </p>

        <div className="mt-8 rounded-xl border bg-white p-4">
          <div className="text-sm font-medium">Quick links</div>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link className="rounded-lg border bg-zinc-50 px-3 py-2 hover:bg-zinc-100" href="/dashboard">
              Dashboard
            </Link>
            <Link className="rounded-lg border bg-zinc-50 px-3 py-2 hover:bg-zinc-100" href="/webhooks">
              Webhooks
            </Link>
            <Link className="rounded-lg border bg-zinc-50 px-3 py-2 hover:bg-zinc-100" href="/signals">
              Signals
            </Link>
            <Link className="rounded-lg border bg-zinc-50 px-3 py-2 hover:bg-zinc-100" href="/trades">
              Trades
            </Link>
            <Link className="rounded-lg border bg-zinc-50 px-3 py-2 hover:bg-zinc-100" href="/watchlist">
              Watchlist
            </Link>
            <Link className="rounded-lg border bg-zinc-50 px-3 py-2 hover:bg-zinc-100" href="/settings">
              Settings
            </Link>
          </div>
        </div>

        <div className="mt-8 rounded-xl border bg-white p-4">
          <div className="text-sm font-medium">Endpoints</div>
          <ul className="mt-3 space-y-1 text-sm text-zinc-700">
            <li>
              <span className="font-mono">POST /api/webhooks/tradingview</span> (store first + enqueue)
            </li>
            <li>
              <span className="font-mono">POST /api/jobs/processWebhook</span> (QStash worker)
            </li>
            <li>
              <span className="font-mono">POST /api/jobs/updatePnl</span> (Vercel Cron)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}


