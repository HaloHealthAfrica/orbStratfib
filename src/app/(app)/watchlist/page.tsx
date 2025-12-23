import { prisma } from "@/lib/db";

export default async function WatchlistPage() {
  let lists: any[] = [];
  let error: string | null = null;
  try {
    lists = await prisma.watchlist.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: { items: { orderBy: { symbol: "asc" } } },
    });
  } catch (e: any) {
    error = String(e?.message ?? e);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Watchlist</h1>
      {error ? <div className="rounded-xl border bg-white p-4 text-sm text-red-700">DB error: {error}</div> : null}

      <div className="space-y-3">
        {lists.map((w) => (
          <div key={w.id} className="rounded-xl border bg-white p-4">
            <div className="flex items-baseline justify-between">
              <div className="font-medium">{w.name}</div>
              <div className="text-xs text-zinc-500">{w.items.length} symbols</div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {w.items.map((i: any) => (
                <span
                  key={i.id}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    i.enabled ? "bg-zinc-50" : "bg-zinc-100 text-zinc-400"
                  }`}
                >
                  {i.symbol}
                </span>
              ))}
              {!w.items.length ? <span className="text-sm text-zinc-500">No symbols yet.</span> : null}
            </div>
          </div>
        ))}
        {!lists.length && !error ? <div className="text-sm text-zinc-600">No watchlists yet.</div> : null}
      </div>

      <div className="rounded-xl border bg-white p-4 text-sm text-zinc-700">
        CRUD editing (create list, add/remove symbols, enable/disable) is the next step — the DB models are already in place.
      </div>
    </div>
  );
}


