import { Client } from "@upstash/qstash";
import { requireEnv } from "@/lib/env";

export function getQStashClient() {
  const token = requireEnv("QSTASH_TOKEN");
  return new Client({ token });
}


