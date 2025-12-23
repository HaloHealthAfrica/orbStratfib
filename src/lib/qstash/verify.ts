import { Receiver } from "@upstash/qstash";
import { getEnv } from "@/lib/env";

export async function verifyQStashRequest(req: Request, rawBody: string) {
  const env = getEnv();
  if (!env.QSTASH_CURRENT_SIGNING_KEY && !env.QSTASH_NEXT_SIGNING_KEY) {
    // Allow local/dev without QStash signature verification when keys are not configured.
    return { ok: false as const, reason: "missing_qstash_signing_keys" };
  }
  const receiver = new Receiver({
    currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY ?? "",
    nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY ?? "",
  });
  const signature = req.headers.get("upstash-signature") ?? "";
  const ok = await receiver.verify({ body: rawBody, signature });
  return ok ? ({ ok: true as const } as const) : ({ ok: false as const, reason: "bad_signature" } as const);
}


