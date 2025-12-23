import crypto from "crypto";

export function deriveIdempotencyKey(rawBody: string) {
  return crypto.createHash("sha256").update(rawBody, "utf8").digest("hex");
}


