import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TradesPage() {
  let trades: any[] = [];
  let error: string | null = null;
  try {
    trades = await prisma.trade.findMany({
      orderBy: { openedAt: "desc" },
      take: 200,
      select: {
        id: true,
        openedAt: true,
        closedAt: true,
        mode: true,
        symbol: true,
        optionSym: true,
        side: true,
        qty: true,
        entryPrice: true,
        exitPrice: true,
        status: true,
        pnlUsd: true,
      },
    });
  } catch (e: any) {
    error = String(e?.message ?? e);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold">Trades</h1>
        <div className="text-xs text-zinc-500">Latest 200</div>
      </div>

      {error ? <div className="rounded-xl border bg-white p-4 text-sm text-red-700">DB error: {error}</div> : null}

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-600">
            <tr>
              <th className="px-4 py-3">Opened</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3">Underlying</th>
              <th className="px-4 py-3">Option</th>
              <th className="px-4 py-3">Side</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Entry</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">PnL</th>
              <th className="px-4 py-3">Links</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="px-4 py-3 whitespace-nowrap">{t.openedAt.toISOString()}</td>
                <td className="px-4 py-3">{t.mode}</td>
                <td className="px-4 py-3">{t.symbol}</td>
                <td className="px-4 py-3">{t.optionSym}</td>
                <td className="px-4 py-3">{t.side}</td>
                <td className="px-4 py-3">{t.qty}</td>
                <td className="px-4 py-3">{t.entryPrice?.toFixed(2) ?? "-"}</td>
                <td className="px-4 py-3">{t.status}</td>
                <td className="px-4 py-3">{Number(t.pnlUsd).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <Link className="text-blue-700 hover:underline" href={`/trades/${t.id}`}>
                    detail
                  </Link>
                </td>
              </tr>
            ))}
            {!trades.length && !error ? (
              <tr>
                <td className="px-4 py-6 text-sm text-zinc-600" colSpan={10}>
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


