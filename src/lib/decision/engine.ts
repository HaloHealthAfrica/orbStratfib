export type Decision = "TRADE" | "SKIP" | "WATCH" | "CANCEL";

export type EngineInput = {
  nowMs: number;
  webhook: {
    id: string;
    strategyId: string;
    event: string;
    side: "LONG" | "SHORT";
    symbol: string;
    timeframe: string;
    timestampMs: number;
    confidence?: number; // 0-100
    payload: any;
  };
  config: {
    tradeThreshold: number;
    watchThreshold: number;
    decayPerMinute: number;
    autoCancelMins: number;
  };
  enrichment: {
    htfAligned: boolean | null;
    ltfQualityScore: number; // 0-100
    timeGateScore: number; // 0-100
    volExpansionScore: number; // 0-100
    failedBreakout: boolean;
  };
  risk: {
    allowed: boolean;
    reasonIfBlocked?: string;
  };
};

export type EngineOutput = {
  decision: Decision;
  baseScore: number;
  finalScore: number;
  reasons: string[];
  expiresAtMs?: number;
};

export function decide(input: EngineInput): EngineOutput {
  const reasons: string[] = [];
  const minutesOld = Math.max(0, (input.nowMs - input.webhook.timestampMs) / 60000);

  const S_webhook = clamp(input.webhook.confidence ?? 50, 0, 100);
  const S_time = clamp(input.enrichment.timeGateScore, 0, 100);
  const S_htf = input.enrichment.htfAligned === null ? 50 : input.enrichment.htfAligned ? 80 : 20;
  const S_ltf = clamp(input.enrichment.ltfQualityScore, 0, 100);
  const S_vol = clamp(input.enrichment.volExpansionScore, 0, 100);

  if (input.enrichment.failedBreakout) {
    reasons.push("failed_breakout_protection");
    return { decision: "SKIP", baseScore: S_webhook, finalScore: 0, reasons };
  }

  // Updated weights now that LTF is real and session gating is hard upstream.
  const rawScore = 0.35 * S_webhook + 0.1 * S_time + 0.25 * S_htf + 0.25 * S_ltf + 0.05 * S_vol;
  const finalScore = rawScore - input.config.decayPerMinute * minutesOld;

  reasons.push(
    `SCORES:web=${S_webhook.toFixed(1)},time=${S_time.toFixed(1)},htf=${S_htf.toFixed(1)},ltf=${S_ltf.toFixed(
      1
    )},vol=${S_vol.toFixed(1)}`
  );

  if (minutesOld > 0) reasons.push(`confidence_decay_minutes:${minutesOld.toFixed(1)}`);

  const expiresAtMs = input.webhook.timestampMs + input.config.autoCancelMins * 60_000;
  if (input.nowMs > expiresAtMs) {
    reasons.push("auto_cancel_expired");
    return { decision: "CANCEL", baseScore: S_webhook, finalScore, reasons, expiresAtMs };
  }

  if (!input.risk.allowed) {
    reasons.push(`risk_blocked:${input.risk.reasonIfBlocked ?? "unknown"}`);
    return { decision: "SKIP", baseScore: S_webhook, finalScore, reasons, expiresAtMs };
  }

  if (finalScore >= input.config.tradeThreshold) {
    reasons.push("meets_trade_threshold");
    return { decision: "TRADE", baseScore: S_webhook, finalScore, reasons, expiresAtMs };
  }
  if (finalScore >= input.config.watchThreshold) {
    reasons.push("meets_watch_threshold");
    return { decision: "WATCH", baseScore: S_webhook, finalScore, reasons, expiresAtMs };
  }
  reasons.push("below_thresholds");
  return { decision: "SKIP", baseScore: S_webhook, finalScore, reasons, expiresAtMs };
}

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}


