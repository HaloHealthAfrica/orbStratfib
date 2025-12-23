export type Bar = { t: number; o: number; h: number; l: number; c: number; v: number };

function ema(values: number[], length: number) {
  const k = 2 / (length + 1);
  let e = values[0] ?? 0;
  for (let i = 1; i < values.length; i++) e = values[i] * k + e * (1 - k);
  return e;
}

function sma(values: number[], length: number) {
  if (values.length < length) return values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1);
  const slice = values.slice(values.length - length);
  return slice.reduce((a, b) => a + b, 0) / length;
}

function rsi(closes: number[], length = 14) {
  if (closes.length < length + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - length; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const rs = losses === 0 ? 999 : gains / losses;
  return 100 - 100 / (1 + rs);
}

export function computeLtfScore(args: {
  bars: Bar[];
  side: "LONG" | "SHORT";
  breakoutLevel?: number;
}): { ltfScore: number; ltfWhy: string[]; failedBreakout: boolean } {
  const why: string[] = [];
  const bars = args.bars;
  if (!bars || bars.length < 30) return { ltfScore: 50, ltfWhy: ["LTF_INSUFFICIENT_BARS"], failedBreakout: false };

  const closes = bars.map((b) => b.c);
  const vols = bars.map((b) => b.v);

  const ema9 = ema(closes.slice(-50), 9);
  const ema21 = ema(closes.slice(-50), 21);
  const r = rsi(closes.slice(-60), 14);

  const volNow = vols[vols.length - 1] ?? 0;
  const volAvg = sma(vols, 20);

  let trendPts = 0;
  if (args.side === "LONG") trendPts = ema9 > ema21 ? 35 : 10;
  else trendPts = ema9 < ema21 ? 35 : 10;

  let rsiPts = 0;
  if (args.side === "LONG") rsiPts = r >= 45 && r <= 70 ? 35 : r > 70 ? 20 : 10;
  else rsiPts = r <= 55 && r >= 30 ? 35 : r < 30 ? 20 : 10;

  let boPts = 20;
  let failedBreakout = false;

  if (typeof args.breakoutLevel === "number") {
    const last = bars[bars.length - 1]!;
    const closesBeyond = args.side === "LONG" ? last.c > args.breakoutLevel : last.c < args.breakoutLevel;
    const volOk = volNow >= volAvg * 1.1;

    if (closesBeyond && volOk) {
      boPts = 30;
      why.push("LTF_BREAKOUT_CONFIRMED");
    } else if (!closesBeyond && volOk) {
      boPts = 10;
      failedBreakout = true;
      why.push("LTF_FAILED_BREAKOUT");
    } else {
      boPts = 15;
      why.push("LTF_WEAK_CONFIRMATION");
    }
  } else {
    why.push("LTF_NO_LEVEL_GIVEN");
  }

  if (volNow >= volAvg * 1.3) why.push("LTF_VOL_SPIKE");
  if (volNow < volAvg * 0.7) why.push("LTF_VOL_THIN");

  const score = Math.max(0, Math.min(100, trendPts + rsiPts + boPts));
  return { ltfScore: score, ltfWhy: why, failedBreakout };
}


