import crypto from "crypto";
import { requireEnv } from "@/lib/env";

type EncV1 = { v: 1; alg: "aes-256-gcm"; ivB64: string; ctB64: string; tagB64: string };

function getKey(): Buffer {
  const b64 = requireEnv("APP_ENCRYPTION_KEY_B64");
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) throw new Error("APP_ENCRYPTION_KEY_B64 must decode to 32 bytes (AES-256 key).");
  return key;
}

export function encryptAtRest(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload: EncV1 = {
    v: 1,
    alg: "aes-256-gcm",
    ivB64: iv.toString("base64"),
    ctB64: ct.toString("base64"),
    tagB64: tag.toString("base64"),
  };
  return `v1:${Buffer.from(JSON.stringify(payload), "utf8").toString("base64")}`;
}

export function decryptAtRest(ciphertext: string): string {
  const key = getKey();
  if (!ciphertext.startsWith("v1:")) throw new Error("Unknown ciphertext format.");
  const b64 = ciphertext.slice(3);
  const parsed = JSON.parse(Buffer.from(b64, "base64").toString("utf8")) as EncV1;
  if (parsed.v !== 1 || parsed.alg !== "aes-256-gcm") throw new Error("Unsupported ciphertext payload.");
  const iv = Buffer.from(parsed.ivB64, "base64");
  const ct = Buffer.from(parsed.ctB64, "base64");
  const tag = Buffer.from(parsed.tagB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}


