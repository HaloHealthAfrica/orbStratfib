import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";

export default async function SettingsPage() {
  const env = getEnv();

  let owner: any = null;
  let configs: any[] = [];
  let error: string | null = null;

  try {
    owner = env.OWNER_USER_EMAIL ? await prisma.user.findUnique({ where: { email: env.OWNER_USER_EMAIL } }) : null;
    configs = owner
      ? await prisma.strategyConfig.findMany({ where: { userId: owner.id }, orderBy: { updatedAt: "desc" }, take: 100 })
      : [];
  } catch (e: any) {
    error = String(e?.message ?? e);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <div className="rounded-xl border bg-white p-4">
        <div className="text-sm text-zinc-600">Owner user</div>
        <div className="mt-1 font-medium">{env.OWNER_USER_EMAIL ?? "(set OWNER_USER_EMAIL)"}</div>
        <div className="mt-2 text-xs text-zinc-500">
          Current build is single-tenant for auto-trading (routes decisions to the owner). Multi-user routing can be added
          once your webhook payload includes a user key.
        </div>
      </div>

      {error ? <div className="rounded-xl border bg-white p-4 text-sm text-red-700">DB error: {error}</div> : null}

      <div className="rounded-xl border bg-white p-4">
        <div className="mb-3 font-medium">Strategy configs</div>
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


