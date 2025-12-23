import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
  DATABASE_URL: z.string().min(1).optional(),

  // App
  APP_BASE_URL: z.string().url().optional(), // e.g. https://miyagi-trader.vercel.app

  // Webhook
  WEBHOOK_SECRET: z.string().optional(),
  ALLOW_UNSIGNED_WEBHOOKS: z.string().optional(), // "true" to allow

  // Auth.js
  NEXTAUTH_SECRET: z.string().min(1).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  GITHUB_ID: z.string().optional(),
  GITHUB_SECRET: z.string().optional(),

  // QStash
  QSTASH_TOKEN: z.string().optional(),
  QSTASH_CURRENT_SIGNING_KEY: z.string().optional(),
  QSTASH_NEXT_SIGNING_KEY: z.string().optional(),

  // Upstash Redis (caching + rate limiting)
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Encryption for ApiKey.keyEnc (32-byte base64)
  APP_ENCRYPTION_KEY_B64: z.string().optional(),

  // Broker + data providers
  TRADIER_BASE_URL: z.string().url().optional(), // https://api.tradier.com/v1 or https://sandbox.tradier.com/v1
  TRADIER_ACCESS_TOKEN: z.string().optional(),
  TRADIER_ACCOUNT_ID: z.string().optional(),
  TWELVEDATA_API_KEY: z.string().optional(),
  MARKETDATA_API_KEY: z.string().optional(),

  // Safety toggle for live trading
  LIVE_TRADING_ENABLED: z.string().optional(), // "true" to allow live order placement

  // Single-tenant auto-trade owner
  OWNER_USER_EMAIL: z.string().email().optional(),
});

let _env: z.infer<typeof schema> | null = null;

export function getEnv() {
  if (_env) return _env;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // Don't throw during module import; only throw when a caller needs env.
    throw new Error(
      `Invalid environment variables:\n${parsed.error.issues
        .map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("\n")}`
    );
  }
  _env = parsed.data;
  return _env;
}

export function requireEnv<K extends keyof z.infer<typeof schema>>(key: K): NonNullable<z.infer<typeof schema>[K]> {
  const e = getEnv();
  const v = e[key];
  if (v === undefined || v === null || v === "") throw new Error(`Missing required env var: ${String(key)}`);
  return v as NonNullable<z.infer<typeof schema>[K]>;
}


