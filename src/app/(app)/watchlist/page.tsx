import { prisma } from "@/lib/db";
import {
  addSymbolAction,
  createWatchlistAction,
  deleteWatchlistItemAction,
  toggleWatchlistItemAction,
} from "@/app/(app)/watchlist/actions";
import { getCurrentUserId } from "@/lib/auth/currentUser";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  let lists: any[] = [];
  let error: string | null = null;
  try {
    const userId = await getCurrentUserId();
    lists = await prisma.watchlist.findMany({
      where: { userId },
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
        <div className="rounded-xl border bg-white p-4">
          <div className="mb-2 text-sm font-medium">Create watchlist</div>
          <form action={createWatchlistAction} className="flex flex-col gap-2 sm:flex-row">
            <input
              name="name"
              placeholder="e.g. ORB A-list"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
            <button className="rounded-lg border bg-zinc-50 px-3 py-2 text-sm hover:bg-zinc-100" type="submit">
              Create
            </button>
          </form>
        </div>

        {lists.map((w) => (
          <div key={w.id} className="rounded-xl border bg-white p-4">
            <div className="flex items-baseline justify-between">
              <div className="font-medium">{w.name}</div>
              <div className="text-xs text-zinc-500">{w.items.length} symbols</div>
            </div>

            <form action={addSymbolAction} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input type="hidden" name="watchlistId" value={w.id} />
              <input
                name="symbol"
                placeholder="Add symbol (e.g. SPY)"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <button className="rounded-lg border bg-zinc-50 px-3 py-2 text-sm hover:bg-zinc-100" type="submit">
                Add
              </button>
            </form>

            <div className="mt-3 flex flex-wrap gap-2">
              {w.items.map((i: any) => (
                <div key={i.id} className="flex items-center gap-1">
                  <form action={toggleWatchlistItemAction}>
                    <input type="hidden" name="itemId" value={i.id} />
                    <button
                      type="submit"
                      className={`rounded-full border px-3 py-1 text-xs ${
                        i.enabled ? "bg-zinc-50" : "bg-zinc-100 text-zinc-400"
                      }`}
                      title="Toggle enabled"
                    >
                      {i.symbol}
                    </button>
                  </form>
                  <form action={deleteWatchlistItemAction}>
                    <input type="hidden" name="itemId" value={i.id} />
                    <button
                      type="submit"
                      className="rounded-full border bg-white px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50"
                      title="Remove"
                    >
                      ×
                    </button>
                  </form>
                </div>
              ))}
              {!w.items.length ? <span className="text-sm text-zinc-500">No symbols yet.</span> : null}
            </div>
          </div>
        ))}
        {!lists.length && !error ? <div className="text-sm text-zinc-600">No watchlists yet.</div> : null}
      </div>

      <div className="rounded-xl border bg-white p-4 text-sm text-zinc-700">
        Tip: watchlist items are now editable (add/remove/toggle). Next step is linking watchlists into top‑N scanning logic.
      </div>
    </div>
  );
}


