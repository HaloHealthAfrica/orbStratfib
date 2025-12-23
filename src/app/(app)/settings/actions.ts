"use server";

import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth/currentUser";

function getStr(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}
function getNum(formData: FormData, key: string) {
  const s = getStr(formData, key);
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`Invalid number for ${key}`);
  return n;
}
function getBool(formData: FormData, key: string) {
  const v = formData.get(key);
  return v === "on" || v === "true" || v === "1";
}

export async function upsertStrategyConfigAction(formData: FormData) {
  const userId = await getCurrentUserId();
  const id = getStr(formData, "id");
  const strategyId = getStr(formData, "strategyId");
  if (!strategyId) throw new Error("strategyId required");

  const data: any = {
    userId,
    strategyId,
    enabled: getBool(formData, "enabled"),
    mode: getStr(formData, "mode") === "LIVE" ? "LIVE" : "PAPER",
    topN: Math.max(1, Math.trunc(getNum(formData, "topN"))),
    decayPerMinute: getNum(formData, "decayPerMinute"),
    autoCancelMins: Math.max(1, Math.trunc(getNum(formData, "autoCancelMins"))),

    maxTradesPerDay: Math.max(0, Math.trunc(getNum(formData, "maxTradesPerDay"))),
    maxConcurrent: Math.max(0, Math.trunc(getNum(formData, "maxConcurrent"))),
    maxDailyLossUsd: getNum(formData, "maxDailyLossUsd"),
    riskPerTradeUsd: getNum(formData, "riskPerTradeUsd"),

    allowOutsideRTH: getBool(formData, "allowOutsideRTH"),
    allowLunch: getBool(formData, "allowLunch"),
    rthStart: getStr(formData, "rthStart") || "09:30",
    rthEnd: getStr(formData, "rthEnd") || "16:00",
    lunchStart: getStr(formData, "lunchStart") || "12:00",
    lunchEnd: getStr(formData, "lunchEnd") || "13:30",
    timezone: getStr(formData, "timezone") || "America/New_York",
  };

  if (id) {
    const existing = await prisma.strategyConfig.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) throw new Error("Not found");
    await prisma.strategyConfig.update({ where: { id }, data });
  } else {
    await prisma.strategyConfig.create({ data });
  }
}


