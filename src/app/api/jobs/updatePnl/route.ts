import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { TradierClient } from "@/lib/providers/tradier";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const env = getEnv();
  const secret = req.headers.get("x-cron-secret");
  if (env.WEBHOOK_SECRET && secret !== env.WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const openTrades = await prisma.trade.findMany({
    where: { status: "OPEN" },
    select: { id: true, optionSym: true, qty: true, entryPrice: true },
    take: 250,
  });

  if (!env.TRADIER_ACCESS_TOKEN) {
    return NextResponse.json({ ok: true, updated: 0, note: "TRADIER_ACCESS_TOKEN not configured" });
  }

  const tradier = new TradierClient();
  let updated = 0;

  for (const t of openTrades) {
    try {
      const q = await tradier.getQuote(t.optionSym);
      const bid = q?.bid != null ? Number(q.bid) : null;
      const ask = q?.ask != null ? Number(q.ask) : null;
      const last = q?.last != null ? Number(q.last) : null;
      const mark = last ?? (bid != null && ask != null ? (bid + ask) / 2 : bid ?? ask);
      if (mark == null || !Number.isFinite(mark)) continue;
      const entry = t.entryPrice ?? mark;
      const pnl = (mark - entry) * t.qty * 100;

      await prisma.trade.update({
        where: { id: t.id },
        data: {
          pnlUsd: pnl,
          pnlSnaps: {
            create: {
              markPrice: mark,
              pnlUsd: pnl,
              raw: { quote: q },
            },
          },
        },
      });
      updated++;
    } catch {
      // swallow per-trade errors; cron should keep going
    }
  }

  return NextResponse.json({ ok: true, updated });
}


