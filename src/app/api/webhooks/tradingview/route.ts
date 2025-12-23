import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEnv, requireEnv } from "@/lib/env";
import { readRawBody } from "@/lib/http/rawBody";
import { verifyHmacSha256 } from "@/lib/webhook/verifySignature";
import { deriveIdempotencyKey } from "@/lib/webhook/idempotency";
import { getQStashClient } from "@/lib/qstash/client";
import { getRatelimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const env = getEnv();

  // Rate limit (best-effort). Key off IP if available; otherwise global bucket.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ratelimit = getRatelimit();
  if (ratelimit) {
    const rl = await ratelimit.limit(`tv-webhook:${ip}`);
    if (!rl.success) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }
  }

  // Shared secret header token (fast reject).
  const tokenHeader = req.headers.get("x-webhook-token");
  const expected = env.WEBHOOK_SECRET;
  if (expected && tokenHeader !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Read raw body so we can (optionally) verify TradingView HMAC signature.
  const { raw, json } = await readRawBody(req);
  if (!raw || json === null) {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const xSig = req.headers.get("x-signature");
  const allowUnsigned =
    env.ALLOW_UNSIGNED_WEBHOOKS?.toLowerCase() === "true" ||
    env.ALLOW_UNSIGNED_WEBHOOKS === "1" ||
    env.ALLOW_UNSIGNED_WEBHOOKS?.toLowerCase() === "yes";

  let signatureOk = false;
  if (xSig) {
    const secret = requireEnv("WEBHOOK_SECRET");
    signatureOk = verifyHmacSha256({ rawBody: raw, signatureHex: xSig, secret });
    if (!signatureOk) {
      // Persist anyway? Spec says store first, but also "security & safety". We'll reject bad signatures.
      return NextResponse.json({ ok: false, error: "bad_signature" }, { status: 401 });
    }
  } else if (!allowUnsigned) {
    return NextResponse.json({ ok: false, error: "missing_signature" }, { status: 401 });
  }

  // Strict idempotency: allow payload-provided key, else derive from raw payload.
  const providedKey =
    typeof (json as any)?.idempotency_key === "string" ? ((json as any).idempotency_key as string) : null;
  const idempotencyKey = providedKey ?? deriveIdempotencyKey(raw);

  // Store FIRST (raw payload), dedupe by idempotencyKey.
  const existing = await prisma.webhookEvent.findUnique({
    where: { idempotencyKey },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ ok: true, deduped: true, id: existing.id });
  }

  const created = await prisma.webhookEvent.create({
    data: {
      status: "RECEIVED",
      idempotencyKey,
      signatureOk,
      ip,
      userAgent: req.headers.get("user-agent") ?? undefined,
      payload: json as any,
    },
    select: { id: true },
  });

  // Enqueue processing job (do not process inline).
  // QStash will call our job endpoint with the webhook ID.
  if (env.QSTASH_TOKEN) {
    const base = env.APP_BASE_URL ?? env.NEXTAUTH_URL;
    if (!base) {
      // Keep the webhook stored; caller can retry after env is fixed.
      await prisma.webhookEvent.update({
        where: { id: created.id },
        data: { status: "ERROR", error: "Missing APP_BASE_URL (or NEXTAUTH_URL) for QStash callback URL." },
      });
      return NextResponse.json({ ok: true, id: created.id, queued: false, error: "missing_base_url" });
    }

    const client = getQStashClient();
    await client.publishJSON({
      url: `${base.replace(/\\/$/, "")}/api/jobs/processWebhook`,
      body: { id: created.id },
      retries: 3,
    });

    await prisma.webhookEvent.update({
      where: { id: created.id },
      data: { status: "QUEUED" },
    });
  }

  return NextResponse.json({ ok: true, id: created.id });
}


