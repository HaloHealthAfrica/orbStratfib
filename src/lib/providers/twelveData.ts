import { fetchJson } from "@/lib/http/fetchJson";
import { requireEnv } from "@/lib/env";

type TwelveDataTimeSeries = {
  status?: string;
  message?: string;
  values?: Array<Record<string, string>>;
};

export class TwelveDataClient {
  private key: string;
  constructor() {
    this.key = requireEnv("TWELVEDATA_API_KEY");
  }

  async timeSeries(params: {
    symbol: string;
    interval: string; // "5min", "1h", "1day" etc
    outputsize?: number;
  }) {
    const url =
      `https://api.twelvedata.com/time_series?apikey=${encodeURIComponent(this.key)}` +
      `&symbol=${encodeURIComponent(params.symbol)}` +
      `&interval=${encodeURIComponent(params.interval)}` +
      `&outputsize=${encodeURIComponent(String(params.outputsize ?? 120))}` +
      `&format=JSON`;
    const data = await fetchJson<TwelveDataTimeSeries>(url, { timeoutMs: 20_000 });
    if (data.status === "error") throw new Error(`TwelveData error: ${data.message ?? "unknown"}`);
    const values = data.values ?? [];
    return values.map((v) => ({
      datetime: v.datetime,
      open: Number(v.open),
      high: Number(v.high),
      low: Number(v.low),
      close: Number(v.close),
      volume: v.volume ? Number(v.volume) : null,
    }));
  }
}


