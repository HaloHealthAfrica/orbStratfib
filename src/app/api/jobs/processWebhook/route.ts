import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { readRawBody } from "@/lib/http/rawBody";
import { verifyQStashRequest } from "@/lib/qstash/verify";
import { normalizeTradingViewWebhook } from "@/lib/webhook/normalize";
import { decide } from "@/lib/decision/engine";
import { hardSessionGate, sessionTimeScore } from "@/lib/decision/timeGates";
import { computeLtfScore, type Bar } from "@/lib/decision/ltfScore";
import { getCache } from "@/lib/cache";
import { TradierClient } from "@/lib/providers/tradier";
import { TwelveDataClient } from "@/lib/providers/twelveData";
import { pickBestContract, type OptionContract } from "@/lib/options/selectStrike";
import { createLiveTradeViaTradier, createPaperTrade } from "@/lib/trading/execute";

export const runtime = "nodejs";

type Body = { id?: string };

export async function POST(req: Request) {
  const env = getEnv();
  const { raw, json } = await readRawBody(req);
  if (!raw || json === null) return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });

  // If called by QStash, verify signature (when signing keys are configured).
  const qv = await verifyQStashRequest(req, raw);
  if (!qv.ok && qv.reason !== "missing_qstash_signing_keys") {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = json as Body;
  if (!body.id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });

  const webhook = await prisma.webhookEvent.findUnique({ where: { id: body.id } });
  if (!webhook) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  // Transition to processing (best-effort); we don't have a separate jobs table yet.
  await prisma.webhookEvent.update({ where: { id: webhook.id }, data: { status: "NORMALIZED" } });

  const normalized = normalizeTradingViewWebhook(webhook.payload as any);

  await prisma.webhookEvent.update({
    where: { id: webhook.id },
    data: {
      source: normalized.source,
      version: normalized.version,
      strategyId: normalized.strategyId,
      event: normalized.event,
      side: normalized.side,
      symbol: normalized.symbol,
      timeframe: normalized.timeframe,
      timestampMs: normalized.timestampMs,
      confidence: normalized.confidence,
    },
  });

  const cache = getCache();
  const nowMs = Date.now();

  const symbol = normalized.symbol ?? "unknown";

  // Enrichment (cached)
  const quoteKey = `quote:${symbol}`;
  const quote =
    (await cache.get<any>(quoteKey)) ??
    (env.TRADIER_ACCESS_TOKEN
      ? await new TradierClient().getQuote(symbol).catch(() => null)
      : null);
  if (quote) await cache.set(quoteKey, quote, 10);

  // HTF/LTF candles via TwelveData (best-effort)
  const td = env.TWELVEDATA_API_KEY ? new TwelveDataClient() : null;
  const ltfKey = `bars:${symbol}:5min`;
  const htfKey = `bars:${symbol}:1h`;
  const ltfBars = (await cache.get<any[]>(ltfKey)) ?? (td ? await td.timeSeries({ symbol, interval: "5min" }).catch(() => []) : []);
  const htfBars = (await cache.get<any[]>(htfKey)) ?? (td ? await td.timeSeries({ symbol, interval: "1h" }).catch(() => []) : []);
  if (ltfBars?.length) await cache.set(ltfKey, ltfBars, 60);
  if (htfBars?.length) await cache.set(htfKey, htfBars, 300);

  const ltfBarsForScore: Bar[] = (ltfBars ?? [])
    .map((b: any) => ({
      t: typeof b.datetime === "string" ? Date.parse(b.datetime) : nowMs,
      o: Number(b.open),
      h: Number(b.high),
      l: Number(b.low),
      c: Number(b.close),
      v: Number(b.volume ?? 0),
    }))
    .filter((b) => Number.isFinite(b.c));

  // Very basic HTF alignment heuristic: last close vs prev close relative to side.
  const htfAligned = (() => {
    if (!htfBars || htfBars.length < 2) return null;
    const last = htfBars[0]?.close;
    const prev = htfBars[1]?.close;
    if (typeof last !== "number" || typeof prev !== "number") return null;
    const trendUp = last >= prev;
    const side = (normalized.side ?? "").toUpperCase();
    if (side.includes("SHORT")) return !trendUp;
    return trendUp;
  })();

  const timestampMs = Number(normalized.timestampMs ?? BigInt(nowMs));

  // Resolve strategy config (single-tenant for now via OWNER_USER_EMAIL).
  const ownerEmail = env.OWNER_USER_EMAIL;
  const owner =
    ownerEmail
      ? await prisma.user.findUnique({ where: { email: ownerEmail } })
      : null;
  const strategyId = normalized.strategyId ?? "default";
  const strategyConf =
    owner
      ? await prisma.strategyConfig.findFirst({ where: { userId: owner.id, strategyId } })
      : null;

  const cfg = {
    tradeThreshold: 75,
    watchThreshold: 60,
    decayPerMinute: strategyConf?.decayPerMinute ?? 0.6,
    autoCancelMins: strategyConf?.autoCancelMins ?? 30,
    topN: strategyConf?.topN ?? 1,
    mode: strategyConf?.mode ?? "PAPER",
    minOi: strategyConf?.minOi ?? 500,
    minVolume: strategyConf?.minVolume ?? 100,
    maxSpreadPct: strategyConf?.maxSpreadPct ?? 0.2,
    minOptionPrice: strategyConf?.minOptionPrice ?? 0.3,
    intradayDeltaMin: strategyConf?.intradayDeltaMin ?? 0.35,
    intradayDeltaMax: strategyConf?.intradayDeltaMax ?? 0.5,
    intradayMinDte: strategyConf?.intradayMinDte ?? 0,
    intradayMaxDte: strategyConf?.intradayMaxDte ?? 7,

    // session gating (hard)
    timezone: strategyConf?.timezone ?? "America/New_York",
    rthStart: strategyConf?.rthStart ?? "09:30",
    rthEnd: strategyConf?.rthEnd ?? "16:00",
    lunchStart: strategyConf?.lunchStart ?? "12:00",
    lunchEnd: strategyConf?.lunchEnd ?? "13:30",
    allowOutsideRTH: strategyConf?.allowOutsideRTH ?? false,
    allowLunch: strategyConf?.allowLunch ?? true,
  };

  // Hard session gate (before scoring)
  const gate = hardSessionGate(nowMs, {
    timezone: cfg.timezone,
    rthStart: cfg.rthStart,
    rthEnd: cfg.rthEnd,
    lunchStart: cfg.lunchStart,
    lunchEnd: cfg.lunchEnd,
    allowOutsideRTH: cfg.allowOutsideRTH,
    allowLunch: cfg.allowLunch,
  });
  if (!gate.allowed) {
    const signal = await prisma.signal.create({
      data: {
        webhookId: webhook.id,
        strategyId,
        symbol: normalized.symbol ?? "unknown",
        side: normalized.side ?? "unknown",
        timeframe: normalized.timeframe ?? "unknown",
        event: normalized.event ?? "unknown",
        baseScore: normalized.confidence ?? 50,
        finalScore: 0,
        decision: "SKIP",
        decisionWhy: `SESSION_${gate.reason}`,
        enrichment: { normalized, sessionGate: gate } as any,
      },
      select: { id: true },
    });
    await prisma.webhookEvent.update({ where: { id: webhook.id }, data: { status: "PROCESSED" } });
    return NextResponse.json({ ok: true, webhookId: webhook.id, signalId: signal.id, decision: "SKIP" });
  }
  const timeScore = sessionTimeScore(gate.session);

  // Risk checks (very basic; expanded later)
  const risk = await (async () => {
    if (!owner) return { allowed: false as const, reasonIfBlocked: "missing_OWNER_USER_EMAIL_or_user" };
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayTrades = await prisma.trade.count({
      where: { userId: owner.id, openedAt: { gte: startOfDay } },
    });
    if (todayTrades >= (strategyConf?.maxTradesPerDay ?? 5))
      return { allowed: false as const, reasonIfBlocked: "max_trades_per_day" };
    const openTrades = await prisma.trade.count({ where: { userId: owner.id, status: "OPEN" } });
    if (openTrades >= (strategyConf?.maxConcurrent ?? 2))
      return { allowed: false as const, reasonIfBlocked: "max_concurrent" };
    return { allowed: true as const };
  })();

  // Real LTF score (no placeholders)
  const ltfSide = (normalized.side?.toUpperCase() === "SHORT" ? "SHORT" : "LONG") as "LONG" | "SHORT";
  const ltf = computeLtfScore({
    bars: ltfBarsForScore,
    side: ltfSide,
    breakoutLevel: normalized.breakoutLevel ?? undefined,
  });

  if (ltf.failedBreakout) {
    const signal = await prisma.signal.create({
      data: {
        webhookId: webhook.id,
        strategyId,
        symbol: normalized.symbol ?? "unknown",
        side: normalized.side ?? "unknown",
        timeframe: normalized.timeframe ?? "unknown",
        event: normalized.event ?? "unknown",
        baseScore: normalized.confidence ?? 50,
        finalScore: 0,
        decision: "SKIP",
        decisionWhy: ["FAILED_BREAKOUT", ...ltf.ltfWhy].join(", "),
        enrichment: { normalized, ltf, quote, session: gate.session } as any,
      },
      select: { id: true },
    });
    await prisma.webhookEvent.update({ where: { id: webhook.id }, data: { status: "PROCESSED" } });
    return NextResponse.json({ ok: true, webhookId: webhook.id, signalId: signal.id, decision: "SKIP" });
  }

  const engineOut = decide({
    nowMs,
    webhook: {
      id: webhook.id,
      strategyId,
      event: normalized.event ?? "unknown",
      side: ltfSide,
      symbol: normalized.symbol ?? "unknown",
      timeframe: normalized.timeframe ?? "unknown",
      timestampMs,
      confidence: normalized.confidence,
      payload: webhook.payload,
    },
    config: {
      tradeThreshold: cfg.tradeThreshold,
      watchThreshold: cfg.watchThreshold,
      decayPerMinute: cfg.decayPerMinute,
      autoCancelMins: cfg.autoCancelMins,
    },
    enrichment: {
      htfAligned,
      ltfQualityScore: ltf.ltfScore,
      timeGateScore: timeScore,
      volExpansionScore: 50,
      failedBreakout: false,
    },
    risk,
  });

  // Correct, deterministic Top-N gating (includes current candidate)
  type Candidate = { id: string; symbol: string; finalScore: number; ts: number };
  function stableSortCandidates<T>(arr: T[], key: (x: T) => number, tie: (x: T) => string) {
    return arr.slice().sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      if (kb !== ka) return kb - ka;
      return tie(a).localeCompare(tie(b));
    });
  }
  async function computeTopNDecision(args: { cfgTopN: number; windowMs: number; nowMs: number; current: Candidate }) {
    if (!args.cfgTopN || args.cfgTopN <= 0) return { allowed: true as const, rank: 1, total: 1 };
    const since = new Date(args.nowMs - args.windowMs);
    const recent = await prisma.signal.findMany({
      where: { strategyId, timeframe: normalized.timeframe ?? "unknown", createdAt: { gte: since } },
      select: { id: true, symbol: true, finalScore: true, createdAt: true },
    });
    const candidates: Candidate[] = [
      ...recent.map((s) => ({
        id: s.id,
        symbol: s.symbol,
        finalScore: s.finalScore ?? 0,
        ts: new Date(s.createdAt).getTime(),
      })),
      args.current,
    ];
    const sorted = stableSortCandidates(candidates, (c) => c.finalScore, (c) => `${c.symbol}:${c.id}`);
    const idx = sorted.findIndex((c) => c.id === args.current.id);
    const rank = idx >= 0 ? idx + 1 : candidates.length;
    return { allowed: rank <= args.cfgTopN, rank, total: candidates.length };
  }

  let finalDecision = engineOut.decision;
  let topN: { allowed: boolean; rank: number; total: number } | null = null;
  if (finalDecision === "TRADE") {
    topN = await computeTopNDecision({
      cfgTopN: cfg.topN,
      windowMs: 10 * 60_000,
      nowMs,
      current: { id: `candidate:${webhook.id}`, symbol: normalized.symbol ?? "unknown", finalScore: engineOut.finalScore, ts: nowMs },
    });
    if (!topN.allowed) finalDecision = "WATCH";
  }

  // Create 1 signal per webhook (default).
  const signal = await prisma.signal.create({
    data: {
      webhookId: webhook.id,
      strategyId,
      symbol: normalized.symbol ?? "unknown",
      side: normalized.side ?? "unknown",
      timeframe: normalized.timeframe ?? "unknown",
      event: normalized.event ?? "unknown",
      baseScore: normalized.confidence ?? 50,
      finalScore: engineOut.finalScore,
      decision: finalDecision === "CANCEL" ? "CANCEL" : (finalDecision as any),
      decisionWhy: [...engineOut.reasons, ...ltf.ltfWhy, ...(topN ? [`TOPN_RANK_${topN.rank}_OF_${topN.total}`] : [])].join(", "),
      scannerRank: topN?.rank ?? null,
      scannerTotal: topN?.total ?? null,
      scannerWindowSec: topN ? 600 : null,
      expiresAt: engineOut.expiresAtMs ? new Date(engineOut.expiresAtMs) : undefined,
      enrichment: {
        normalized,
        quote,
        ltfBarsCount: ltfBars?.length ?? 0,
        htfBarsCount: htfBars?.length ?? 0,
        session: gate.session,
        sessionCfg: {
          timezone: cfg.timezone,
          rthStart: cfg.rthStart,
          rthEnd: cfg.rthEnd,
          lunchStart: cfg.lunchStart,
          lunchEnd: cfg.lunchEnd,
          allowOutsideRTH: cfg.allowOutsideRTH,
          allowLunch: cfg.allowLunch,
        },
        ltf,
      } as any,
    },
  });

  // If TRADE and we have owner + tradier, pick a contract (best-effort).
  let optionPick: any = null;
  let tradeId: string | null = null;
  if (finalDecision === "TRADE" && env.TRADIER_ACCESS_TOKEN && normalized.symbol && owner) {
    try {
      const tradier = new TradierClient();
      const expirations = await tradier.getOptionExpirations(normalized.symbol);
      const chosenExp =
        expirations[cfg.intradayMinDte] ?? expirations[0];
      if (chosenExp) {
        const chain = await tradier.getOptionsChain(normalized.symbol, chosenExp);
        const wantType = (normalized.side ?? "").toUpperCase().includes("SHORT") ? "put" : "call";
        const contracts: OptionContract[] = chain
          .filter((c: any) => (c.option_type ?? c.type) === wantType)
          .map((c: any) => ({
            symbol: String(c.symbol),
            strike: Number(c.strike),
            expiration: String(c.expiration_date ?? chosenExp),
            type: wantType as "call" | "put",
            bid: Number(c.bid ?? 0),
            ask: Number(c.ask ?? 0),
            volume: c.volume != null ? Number(c.volume) : undefined,
            openInterest: c.open_interest != null ? Number(c.open_interest) : undefined,
            delta: c.greeks?.delta != null ? Number(c.greeks.delta) : undefined,
            iv: c.greeks?.iv != null ? Number(c.greeks.iv) : undefined,
          }));

        const picked = pickBestContract(contracts, {
          minOi: cfg.minOi,
          minVolume: cfg.minVolume,
          maxSpreadPct: cfg.maxSpreadPct,
          minOptionPrice: cfg.minOptionPrice,
          deltaMin: cfg.intradayDeltaMin,
          deltaMax: cfg.intradayDeltaMax,
        });
        optionPick = { best: picked.best, rankedTop5: picked.ranked.slice(0, 5) };

        await prisma.signal.update({
          where: { id: signal.id },
          data: { optionPick: optionPick as any },
        });

        // Don't trade if no viable contract
        if (!picked.best) {
          await prisma.signal.update({
            where: { id: signal.id },
            data: { decision: "WATCH", decisionWhy: `${signal.decisionWhy ?? ""}${signal.decisionWhy ? ", " : ""}NO_VIABLE_CONTRACT` },
          });
          await prisma.webhookEvent.update({ where: { id: webhook.id }, data: { status: "PROCESSED" } });
          return NextResponse.json({ ok: true, webhookId: webhook.id, signalId: signal.id, decision: "WATCH", optionPicked: false, tradeId: null });
        }

        // Optional execution (paper default; live only when strategyConfig.mode == LIVE)
        if (picked.best) {
          const mid = (picked.best.bid + picked.best.ask) / 2;
          const side = (normalized.side ?? "").toUpperCase().includes("SHORT") ? ("BUY_PUT" as const) : ("BUY_CALL" as const);
          const qty = 1; // TODO: size by risk budget / option price
          const audit = {
            decision: finalDecision,
            reasons: engineOut.reasons,
            config: cfg,
            optionPick: picked.ranked.slice(0, 10),
            quote,
          };
          const trade =
            cfg.mode === "LIVE"
              ? await createLiveTradeViaTradier({
                  userId: owner.id,
                  signalId: signal.id,
                  symbol,
                  optionSym: picked.best.symbol,
                  side,
                  qty,
                  audit,
                })
              : await createPaperTrade({
                  userId: owner.id,
                  signalId: signal.id,
                  symbol,
                  optionSym: picked.best.symbol,
                  side,
                  qty,
                  midPrice: mid,
                  audit,
                });
          tradeId = trade.id;
        }
      }
    } catch (e: any) {
      await prisma.signal.update({
        where: { id: signal.id },
        data: { optionPick: { error: String(e?.message ?? e) } as any },
      });
    }
  }

  await prisma.webhookEvent.update({
    where: { id: webhook.id },
    data: { status: "PROCESSED" },
  });

  // Auto-trade is implemented later (needs strategy config + broker clients).
  return NextResponse.json({
    ok: true,
    webhookId: webhook.id,
    signalId: signal.id,
    decision: finalDecision,
    optionPicked: Boolean(optionPick?.best),
    tradeId,
  });
}


