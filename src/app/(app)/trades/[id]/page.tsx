import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function TradeDetailPage({ params }: { params: { id: string } }) {
  let row: any = null;
  let error: string | null = null;
  try {
    row = await prisma.trade.findUnique({
      where: { id: params.id },
      include: {
        signal: { include: { webhook: true } },
        orders: true,
        fills: true,
        pnlSnaps: { orderBy: { at: "desc" }, take: 50 },
      },
    });
  } catch (e: any) {
    error = String(e?.message ?? e);
  }

  if (error) return <div className="rounded-xl border bg-white p-4 text-sm text-red-700">DB error: {error}</div>;
  if (!row) return <div className="rounded-xl border bg-white p-4 text-sm text-zinc-700">Trade not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            Trade {row.symbol} — {row.status}
          </h1>
          <div className="mt-1 text-sm text-zinc-600">
            {row.mode} · {row.optionSym} · qty {row.qty} · PnL ${Number(row.pnlUsd).toFixed(2)}
          </div>
        </div>
        <Link className="text-blue-700 hover:underline" href="/trades">
          back
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Trade">
          <Json data={row} />
        </Card>
        <Card title="Signal + webhook">
          <div className="mb-2 text-sm text-zinc-700">
            <Link className="text-blue-700 hover:underline" href={`/signals/${row.signalId}`}>
              view signal detail
            </Link>
          </div>
          <Json data={row.signal} />
        </Card>
      </div>
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


