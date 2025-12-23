import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PnlPage() {
  let error: string | null = null;
  let rows: any[] = [];
  try {
    const trades = await prisma.trade.findMany({
      orderBy: { openedAt: "desc" },
      take: 500,
      select: { openedAt: true, closedAt: true, pnlUsd: true, status: true, mode: true, symbol: true },
    });

    // Basic aggregation by day (UTC) over last 500 trades.
    const byDay = new Map<string, { day: string; pnl: number; count: number; wins: number; losses: number }>();
    for (const t of trades) {
      const d = (t.closedAt ?? t.openedAt).toISOString().slice(0, 10);
      const cur = byDay.get(d) ?? { day: d, pnl: 0, count: 0, wins: 0, losses: 0 };
      cur.pnl += Number(t.pnlUsd ?? 0);
      cur.count += 1;
      if (Number(t.pnlUsd ?? 0) > 0) cur.wins += 1;
      if (Number(t.pnlUsd ?? 0) < 0) cur.losses += 1;
      byDay.set(d, cur);
    }
    rows = Array.from(byDay.values()).sort((a, b) => (a.day < b.day ? 1 : -1));
  } catch (e: any) {
    error = String(e?.message ?? e);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">P&L</h1>
      {error ? <div className="rounded-xl border bg-white p-4 text-sm text-red-700">DB error: {error}</div> : null}

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-600">
            <tr>
              <th className="px-4 py-3">Day</th>
              <th className="px-4 py-3">Trades</th>
              <th className="px-4 py-3">Wins</th>
              <th className="px-4 py-3">Losses</th>
              <th className="px-4 py-3">Net PnL</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.day} className="border-t">
                <td className="px-4 py-3">{r.day}</td>
                <td className="px-4 py-3">{r.count}</td>
                <td className="px-4 py-3">{r.wins}</td>
                <td className="px-4 py-3">{r.losses}</td>
                <td className="px-4 py-3">{r.pnl.toFixed(2)}</td>
              </tr>
            ))}
            {!rows.length && !error ? (
              <tr>
                <td className="px-4 py-6 text-sm text-zinc-600" colSpan={5}>
                  No trades yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}


