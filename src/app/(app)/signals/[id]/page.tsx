import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function SignalDetailPage({ params }: { params: { id: string } }) {
  let row: any = null;
  let error: string | null = null;
  try {
    row = await prisma.signal.findUnique({
      where: { id: params.id },
      include: {
        webhook: true,
        trade: { include: { orders: true, fills: true, pnlSnaps: { orderBy: { at: "desc" }, take: 10 } } },
      },
    });
  } catch (e: any) {
    error = String(e?.message ?? e);
  }

  if (error) {
    return <div className="rounded-xl border bg-white p-4 text-sm text-red-700">DB error: {error}</div>;
  }
  if (!row) {
    return <div className="rounded-xl border bg-white p-4 text-sm text-zinc-700">Signal not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            Signal {row.symbol} — {row.decision}
          </h1>
          <div className="mt-1 text-sm text-zinc-600">
            Score {Number(row.finalScore).toFixed(1)} · Strategy {row.strategyId} · TF {row.timeframe}
          </div>
        </div>
        <div className="text-sm">
          <Link className="text-blue-700 hover:underline" href="/signals">
            back
          </Link>
        </div>
      </div>

      <Card title="Decision reasons">
        <pre className="whitespace-pre-wrap text-xs text-zinc-800">{row.decisionWhy ?? "(none)"}</pre>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Enrichment snapshot">
          <Json data={row.enrichment} />
        </Card>
        <Card title="Option pick snapshot">
          <Json data={row.optionPick} />
        </Card>
      </div>

      <Card title="Webhook (normalized + raw)">
        <div className="mb-2 text-sm text-zinc-600">
          <Link className="text-blue-700 hover:underline" href={`/api/debug/webhook/${row.webhookId}`}>
            open raw webhook json
          </Link>
        </div>
        <Json data={row.webhook} />
      </Card>

      <Card title="Trade">
        {row.trade ? (
          <div className="space-y-3">
            <div className="text-sm text-zinc-700">
              <Link className="text-blue-700 hover:underline" href={`/trades/${row.trade.id}`}>
                view trade {row.trade.id}
              </Link>
            </div>
            <Json data={row.trade} />
          </div>
        ) : (
          <div className="text-sm text-zinc-600">No trade created for this signal.</div>
        )}
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-2 text-sm font-medium">{title}</div>
      {children}
    </div>
  );
}

function Json({ data }: { data: any }) {
  return (
    <pre className="max-h-[520px] overflow-auto rounded-lg bg-zinc-50 p-3 text-xs text-zinc-800">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}


