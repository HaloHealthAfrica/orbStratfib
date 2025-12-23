import { fetchJson } from "@/lib/http/fetchJson";
import { requireEnv } from "@/lib/env";

// MarketData.app has multiple endpoints; we keep this minimal and safe.
export class MarketDataClient {
  private key: string;
  constructor() {
    this.key = requireEnv("MARKETDATA_API_KEY");
  }

  private headers() {
    return { Authorization: `Bearer ${this.key}`, Accept: "application/json" };
  }

  async getIVSnapshot(symbol: string) {
    // Placeholder path; endpoint details vary by subscription.
    // Keep contract: return raw JSON for auditing, or null if unavailable.
    const url = `https://api.marketdata.app/v1/stocks/options/iv/${encodeURIComponent(symbol)}`;
    return await fetchJson<any>(url, { headers: this.headers(), timeoutMs: 20_000 });
  }
}


