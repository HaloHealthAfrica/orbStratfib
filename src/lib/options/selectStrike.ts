export type OptionContract = {
  symbol: string; // option symbol
  strike: number;
  expiration: string; // YYYY-MM-DD
  type: "call" | "put";
  bid: number;
  ask: number;
  volume?: number;
  openInterest?: number;
  delta?: number;
  iv?: number;
};

export type StrikeSelectConfig = {
  minOi: number;
  minVolume: number;
  maxSpreadPct: number;
  minOptionPrice: number;
  deltaMin: number;
  deltaMax: number;
};

export function pickBestContract(contracts: OptionContract[], cfg: StrikeSelectConfig): {
  best?: OptionContract;
  ranked: { c: OptionContract; score: number; why: string }[];
} {
  const filtered = contracts.filter((c) => {
    const mid = (c.bid + c.ask) / 2;
    const spreadPct = c.ask > 0 ? (c.ask - c.bid) / c.ask : 1;
    const oiOk = (c.openInterest ?? 0) >= cfg.minOi;
    const volOk = (c.volume ?? 0) >= cfg.minVolume;
    return c.bid > 0 && c.ask > 0 && mid >= cfg.minOptionPrice && spreadPct <= cfg.maxSpreadPct && oiOk && volOk;
  });

  const targetDelta = (cfg.deltaMin + cfg.deltaMax) / 2;

  const ranked = filtered
    .map((c) => {
      const mid = (c.bid + c.ask) / 2;
      const spreadPct = (c.ask - c.bid) / c.ask;
      const delta = c.delta ?? targetDelta;
      const deltaPenalty = Math.abs(delta - targetDelta);
      const oi = c.openInterest ?? 0;
      const vol = c.volume ?? 0;
      const score = 100 - 120 * deltaPenalty - 80 * spreadPct + 0.01 * oi + 0.02 * vol + 5 * Math.log(1 + mid);
      const why = `delta=${delta.toFixed(2)} spreadPct=${spreadPct.toFixed(2)} oi=${oi} vol=${vol} mid=${mid.toFixed(
        2
      )}`;
      return { c, score, why };
    })
    .sort((a, b) => b.score - a.score);

  return { best: ranked[0]?.c, ranked };
}


