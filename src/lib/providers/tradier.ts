import { fetchJson } from "@/lib/http/fetchJson";
import { requireEnv } from "@/lib/env";

type TradierQuoteResponse = {
  quotes?: {
    quote?: any;
  };
};

type TradierOptionsChainResponse = {
  options?: {
    option?: any[];
  };
};

type TradierExpirationsResponse = {
  expirations?: {
    date?: string[] | string;
  };
};

export class TradierClient {
  private baseUrl: string;
  private token: string;
  constructor() {
    this.baseUrl = (process.env.TRADIER_BASE_URL ?? "https://api.tradier.com/v1").replace(/\/$/, "");
    this.token = requireEnv("TRADIER_ACCESS_TOKEN");
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: "application/json",
    };
  }

  async getQuote(symbol: string) {
    const url = `${this.baseUrl}/markets/quotes?symbols=${encodeURIComponent(symbol)}`;
    const data = await fetchJson<TradierQuoteResponse>(url, { headers: this.headers() });
    const q = data.quotes?.quote;
    if (!q) return null;
    // Tradier sometimes returns array when multiple symbols. We request 1.
    return Array.isArray(q) ? q[0] : q;
  }

  async getOptionExpirations(symbol: string) {
    const url = `${this.baseUrl}/markets/options/expirations?symbol=${encodeURIComponent(symbol)}&includeAllRoots=true&strikes=false`;
    const data = await fetchJson<TradierExpirationsResponse>(url, { headers: this.headers() });
    const d = data.expirations?.date;
    if (!d) return [];
    return Array.isArray(d) ? d : [d];
  }

  async getOptionsChain(symbol: string, expiration: string) {
    const url = `${this.baseUrl}/markets/options/chains?symbol=${encodeURIComponent(symbol)}&expiration=${encodeURIComponent(
      expiration
    )}&greeks=true`;
    const data = await fetchJson<TradierOptionsChainResponse>(url, { headers: this.headers() });
    const arr = data.options?.option ?? [];
    return Array.isArray(arr) ? arr : [];
  }

  async placeOrder(params: {
    accountId: string;
    class: "option";
    symbol: string; // option symbol
    side: "buy_to_open" | "sell_to_close" | "sell_to_open" | "buy_to_close";
    quantity: number;
    type: "market" | "limit";
    duration?: "day" | "gtc";
    price?: number;
    tag?: string;
  }) {
    const url = `${this.baseUrl}/accounts/${encodeURIComponent(params.accountId)}/orders`;
    const form = new URLSearchParams();
    form.set("class", params.class);
    form.set("symbol", params.symbol);
    form.set("side", params.side);
    form.set("quantity", String(params.quantity));
    form.set("type", params.type);
    form.set("duration", params.duration ?? "day");
    if (params.price !== undefined) form.set("price", String(params.price));
    if (params.tag) form.set("tag", params.tag);

    // Tradier expects form urlencoded
    const res = await fetch(url, {
      method: "POST",
      headers: { ...this.headers(), "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      cache: "no-store",
    });
    const text = await res.text();
    const parsed = text ? (JSON.parse(text) as any) : {};
    if (!res.ok) throw new Error(`Tradier order failed: HTTP ${res.status} ${text.slice(0, 2000)}`);
    return parsed;
  }
}


