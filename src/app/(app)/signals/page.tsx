import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SignalsPage({
  searchParams,
}: {
  searchParams?: { webhookId?: string; symbol?: string; decision?: string };
}) {
  const where: any = {};
  if (searchParams?.webhookId) where.webhookId = searchParams.webhookId;
  if (searchParams?.symbol) where.symbol = searchParams.symbol.toUpperCase();
  if (searchParams?.decision) where.decision = searchParams.decision;

  let rows: any[] = [];
  let error: string | null = null;
  try {
    rows = await prisma.signal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        createdAt: true,
        strategyId: true,
        symbol: true,
        timeframe: true,
        event: true,
        finalScore: true,
        decision: true,
        decisionWhy: true,
        scannerRank: true,
        scannerTotal: true,
        webhookId: true,
        trade: { select: { id: true, status: true, pnlUsd: true, mode: true } },
      },
    });
  } catch (e: any) {
    error = String(e?.message ?? e);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold">Signals</h1>
        <div className="text-xs text-zinc-500">Latest 200</div>
      </div>

      {error ? <div className="rounded-xl border bg-white p-4 text-sm text-red-700">DB error: {error}</div> : null}

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-600">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3">TF</th>
              <th className="px-4 py-3">Strategy</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Decision</th>
              <th className="px-4 py-3">Top‑N</th>
              <th className="px-4 py-3">Links</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t align-top">
                <td className="px-4 py-3 whitespace-nowrap">{r.createdAt.toISOString()}</td>
                <td className="px-4 py-3">{r.symbol}</td>
                <td className="px-4 py-3">{r.timeframe}</td>
                <td className="px-4 py-3">{r.strategyId}</td>
                <td className="px-4 py-3">{r.event}</td>
                <td className="px-4 py-3">{Number(r.finalScore).toFixed(1)}</td>
                <td className="px-4 py-3">{r.decision}</td>
                <td className="px-4 py-3">
                  {r.scannerRank != null && r.scannerTotal != null ? `${r.scannerRank}/${r.scannerTotal}` : "-"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <Link className="text-blue-700 hover:underline" href={`/signals/${r.id}`}>
                      detail
                    </Link>
                    <Link className="text-blue-700 hover:underline" href={`/api/debug/webhook/${r.webhookId}`}>
                      webhook json
                    </Link>
                    {r.trade ? (
                      <Link className="text-blue-700 hover:underline" href={`/trades/${r.trade.id}`}>
                        trade {r.trade.mode} {r.trade.status} (${Number(r.trade.pnlUsd).toFixed(2)})
                      </Link>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && !error ? (
              <tr>
                <td className="px-4 py-6 text-sm text-zinc-600" colSpan={9}>
                  No signals yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}


