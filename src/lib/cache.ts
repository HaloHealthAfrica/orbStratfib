import { Redis } from "@upstash/redis";
import { getEnv } from "@/lib/env";

type Cache = {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
};

class MemoryCache implements Cache {
  private map = new Map<string, { exp: number; v: any }>();
  async get<T>(key: string) {
    const hit = this.map.get(key);
    if (!hit) return null;
    if (Date.now() > hit.exp) {
      this.map.delete(key);
      return null;
    }
    return hit.v as T;
  }
  async set<T>(key: string, value: T, ttlSeconds: number) {
    this.map.set(key, { v: value, exp: Date.now() + ttlSeconds * 1000 });
  }
}

class UpstashCache implements Cache {
  private redis: Redis;
  constructor(redis: Redis) {
    this.redis = redis;
  }
  async get<T>(key: string) {
    const v = await this.redis.get<T>(key);
    return v ?? null;
  }
  async set<T>(key: string, value: T, ttlSeconds: number) {
    await this.redis.set(key, value, { ex: ttlSeconds });
  }
}

let _cache: Cache | null = null;
export function getCache(): Cache {
  if (_cache) return _cache;
  const env = getEnv();
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    _cache = new UpstashCache(new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN }));
  } else {
    _cache = new MemoryCache();
  }
  return _cache;
}


