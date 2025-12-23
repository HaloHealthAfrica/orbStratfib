import crypto from "crypto";

export function verifyHmacSha256({
  rawBody,
  signatureHex,
  secret,
}: {
  rawBody: string;
  signatureHex: string;
  secret: string;
}): boolean {
  const mac = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  try {
    const a = Buffer.from(mac, "hex");
    const b = Buffer.from(signatureHex.trim(), "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}


