import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  let counts: { webhooks: number; signals: number; openTrades: number } | null = null;
  let error: string | null = null;
  try {
    const [webhooks, signals, openTrades] = await Promise.all([
      prisma.webhookEvent.count(),
      prisma.signal.count(),
      prisma.trade.count({ where: { status: "OPEN" } }),
    ]);
    counts = { webhooks, signals, openTrades };
  } catch (e: any) {
    error = String(e?.message ?? e);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {error ? (
        <div className="rounded-xl border bg-white p-4 text-sm text-red-700">
          DB error: {error}
          <div className="mt-2 text-xs text-zinc-500">
            Configure `DATABASE_URL` and apply Prisma migrations before using the UI.
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Stat label="Webhook events" value={counts?.webhooks ?? 0} />
          <Stat label="Signals" value={counts?.signals ?? 0} />
          <Stat label="Open trades" value={counts?.openTrades ?? 0} />
        </div>
      )}

      <div className="rounded-xl border bg-white p-4 text-sm text-zinc-700">
        <div className="font-medium">Operational shortcuts</div>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link className="rounded-lg border bg-zinc-50 px-3 py-2 hover:bg-zinc-100" href="/webhooks">
            View ingested webhooks
          </Link>
          <Link className="rounded-lg border bg-zinc-50 px-3 py-2 hover:bg-zinc-100" href="/signals">
            View decisions/signals
          </Link>
          <Link className="rounded-lg border bg-zinc-50 px-3 py-2 hover:bg-zinc-100" href="/trades">
            View trades
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-sm text-zinc-600">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}


