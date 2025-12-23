import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { upsertStrategyConfigAction } from "@/app/(app)/settings/actions";
import { getCurrentUserId } from "@/lib/auth/currentUser";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const env = getEnv();

  let userId: string | null = null;
  let owner: any = null;
  let configs: any[] = [];
  let error: string | null = null;

  try {
    userId = await getCurrentUserId();
    owner = await prisma.user.findUnique({ where: { id: userId } });
    configs = await prisma.strategyConfig.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 100 });
  } catch (e: any) {
    error = String(e?.message ?? e);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <div className="rounded-xl border bg-white p-4">
        <div className="text-sm text-zinc-600">Owner user</div>
        <div className="mt-1 font-medium">{owner?.email ?? env.OWNER_USER_EMAIL ?? "(sign in or set OWNER_USER_EMAIL)"}</div>
        <div className="mt-2 text-xs text-zinc-500">
          If signed in, settings are stored per-user. If not signed in, the app falls back to OWNER_USER_EMAIL for now.
        </div>
      </div>

      {error ? <div className="rounded-xl border bg-white p-4 text-sm text-red-700">DB error: {error}</div> : null}

      <div className="rounded-xl border bg-white p-4">
        <div className="mb-3 font-medium">Strategy configs</div>
        <div className="mb-4 rounded-lg border bg-zinc-50 p-3 text-xs text-zinc-700">
          Live trading requires BOTH: Strategy mode = LIVE AND `LIVE_TRADING_ENABLED=true` in env.
        </div>

        <details className="mb-4 rounded-lg border bg-white p-3">
          <summary className="cursor-pointer text-sm font-medium">Add / update strategy config</summary>
          <form action={upsertStrategyConfigAction} className="mt-3 grid gap-3 md:grid-cols-3">
            <input name="id" placeholder="(leave blank to create)" className="rounded-lg border px-3 py-2 text-sm" />
            <input name="strategyId" placeholder="strategyId (required)" className="rounded-lg border px-3 py-2 text-sm" />

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="enabled" defaultChecked />
              Enabled
            </label>

            <select name="mode" className="rounded-lg border px-3 py-2 text-sm">
              <option value="PAPER">PAPER</option>
              <option value="LIVE">LIVE</option>
            </select>

            <input name="topN" defaultValue="1" className="rounded-lg border px-3 py-2 text-sm" placeholder="topN" />
            <input
              name="decayPerMinute"
              defaultValue="0.6"
              className="rounded-lg border px-3 py-2 text-sm"
              placeholder="decayPerMinute"
            />
            <input
              name="autoCancelMins"
              defaultValue="30"
              className="rounded-lg border px-3 py-2 text-sm"
              placeholder="autoCancelMins"
            />

            <input
              name="maxTradesPerDay"
              defaultValue="5"
              className="rounded-lg border px-3 py-2 text-sm"
              placeholder="maxTradesPerDay"
            />
            <input
              name="maxConcurrent"
              defaultValue="2"
              className="rounded-lg border px-3 py-2 text-sm"
              placeholder="maxConcurrent"
            />
            <input
              name="maxDailyLossUsd"
              defaultValue="250"
              className="rounded-lg border px-3 py-2 text-sm"
              placeholder="maxDailyLossUsd"
            />
            <input
              name="riskPerTradeUsd"
              defaultValue="50"
              className="rounded-lg border px-3 py-2 text-sm"
              placeholder="riskPerTradeUsd"
            />

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="allowOutsideRTH" />
              Allow outside RTH
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="allowLunch" defaultChecked />
              Allow lunch
            </label>

            <input name="rthStart" defaultValue="09:30" className="rounded-lg border px-3 py-2 text-sm" placeholder="rthStart" />
            <input name="rthEnd" defaultValue="16:00" className="rounded-lg border px-3 py-2 text-sm" placeholder="rthEnd" />
            <input
              name="lunchStart"
              defaultValue="12:00"
              className="rounded-lg border px-3 py-2 text-sm"
              placeholder="lunchStart"
            />
            <input
              name="lunchEnd"
              defaultValue="13:30"
              className="rounded-lg border px-3 py-2 text-sm"
              placeholder="lunchEnd"
            />
            <input
              name="timezone"
              defaultValue="America/New_York"
              className="rounded-lg border px-3 py-2 text-sm"
              placeholder="timezone"
            />

            <div className="md:col-span-3">
              <button className="rounded-lg border bg-zinc-50 px-3 py-2 text-sm hover:bg-zinc-100" type="submit">
                Save
              </button>
            </div>
          </form>
        </details>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-600">
              <tr>
                <th className="px-3 py-2">Strategy</th>
                <th className="px-3 py-2">Enabled</th>
                <th className="px-3 py-2">Mode</th>
                <th className="px-3 py-2">TopN</th>
                <th className="px-3 py-2">Decay/min</th>
                <th className="px-3 py-2">AutoCancel</th>
                <th className="px-3 py-2">RTH</th>
                <th className="px-3 py-2">Lunch</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-3 py-2">{c.strategyId}</td>
                  <td className="px-3 py-2">{c.enabled ? "yes" : "no"}</td>
                  <td className="px-3 py-2">{c.mode}</td>
                  <td className="px-3 py-2">{c.topN}</td>
                  <td className="px-3 py-2">{Number(c.decayPerMinute).toFixed(2)}</td>
                  <td className="px-3 py-2">{c.autoCancelMins}m</td>
                  <td className="px-3 py-2">
                    {c.allowOutsideRTH ? "allowed" : "blocked"} ({c.rthStart}-{c.rthEnd} {c.timezone})
                  </td>
                  <td className="px-3 py-2">
                    {c.allowLunch ? "allowed" : "blocked"} ({c.lunchStart}-{c.lunchEnd})
                  </td>
                </tr>
              ))}
              {!configs.length && !error ? (
                <tr>
                  <td className="px-3 py-3 text-sm text-zinc-600" colSpan={8}>
                    No configs found. Create rows in DB first (UI editor can be added next).
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


