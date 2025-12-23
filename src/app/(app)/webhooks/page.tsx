import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function WebhooksPage() {
  let rows: any[] = [];
  let error: string | null = null;
  try {
    rows = await prisma.webhookEvent.findMany({
      orderBy: { receivedAt: "desc" },
      take: 100,
      select: {
        id: true,
        receivedAt: true,
        status: true,
        strategyId: true,
        symbol: true,
        timeframe: true,
        event: true,
        signatureOk: true,
        idempotencyKey: true,
        error: true,
      },
    });
  } catch (e: any) {
    error = String(e?.message ?? e);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold">Webhooks</h1>
        <div className="text-xs text-zinc-500">Latest 100</div>
      </div>

      {error ? <div className="rounded-xl border bg-white p-4 text-sm text-red-700">DB error: {error}</div> : null}

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-600">
            <tr>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3">TF</th>
              <th className="px-4 py-3">Strategy</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Sig</th>
              <th className="px-4 py-3">Links</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t align-top">
                <td className="px-4 py-3 whitespace-nowrap">{r.receivedAt.toISOString()}</td>
                <td className="px-4 py-3">{r.status}</td>
                <td className="px-4 py-3">{r.symbol ?? "-"}</td>
                <td className="px-4 py-3">{r.timeframe ?? "-"}</td>
                <td className="px-4 py-3">{r.strategyId ?? "-"}</td>
                <td className="px-4 py-3">{r.event ?? "-"}</td>
                <td className="px-4 py-3">{r.signatureOk ? "ok" : "n/a"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <Link className="text-blue-700 hover:underline" href={`/signals?webhookId=${r.id}`}>
                      view signals
                    </Link>
                    <Link className="text-blue-700 hover:underline" href={`/api/debug/webhook/${r.id}`}>
                      raw json
                    </Link>
                    {r.error ? <div className="text-xs text-red-700">{r.error}</div> : null}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && !error ? (
              <tr>
                <td className="px-4 py-6 text-sm text-zinc-600" colSpan={8}>
                  No webhooks yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}


