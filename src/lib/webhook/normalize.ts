export type NormalizedWebhook = {
  source?: string;
  version?: string;
  strategyId?: string;
  event?: string;
  side?: string;
  symbol?: string;
  timeframe?: string;
  timestampMs?: bigint;
  confidence?: number;
  breakoutLevel?: number;
};

function pickString(x: unknown): string | undefined {
  return typeof x === "string" && x.trim().length ? x.trim() : undefined;
}

function pickNumber(x: unknown): number | undefined {
  return typeof x === "number" && Number.isFinite(x) ? x : undefined;
}

function pickIntMs(x: unknown): bigint | undefined {
  if (typeof x === "number" && Number.isFinite(x)) return BigInt(Math.trunc(x));
  if (typeof x === "string" && x.trim().length) {
    const n = Number(x);
    if (Number.isFinite(n)) return BigInt(Math.trunc(n));
  }
  return undefined;
}

/**
 * Best-effort normalizer:
 * - Preserves raw JSON in WebhookEvent.payload
 * - Extracts common fields for indexing/search
 */
export function normalizeTradingViewWebhook(payload: any): NormalizedWebhook {
  const strategyId = pickString(payload?.strategy_id ?? payload?.strategyId);
  const event = pickString(payload?.event ?? payload?.signal ?? payload?.type);
  const side = pickString(payload?.side ?? payload?.direction);
  const symbol = pickString(payload?.symbol ?? payload?.ticker);
  const timeframe = pickString(payload?.timeframe ?? payload?.tf);

  const confidence =
    pickNumber(payload?.confidence_score) ??
    pickNumber(payload?.confidence) ??
    pickNumber(payload?.score);

  const ts =
    pickIntMs(payload?.timestamp_ms) ??
    pickIntMs(payload?.timestampMs) ??
    pickIntMs(payload?.timestamp);

  const breakoutLevel =
    pickNumber(payload?.breakout_level) ??
    pickNumber(payload?.breakoutLevel) ??
    pickNumber(payload?.key_level) ??
    pickNumber(payload?.keyLevel) ??
    pickNumber(payload?.level);

  return {
    source: pickString(payload?.source) ?? "tradingview",
    version: pickString(payload?.version),
    strategyId,
    event,
    side,
    symbol,
    timeframe,
    timestampMs: ts,
    confidence,
    breakoutLevel,
  };
}


