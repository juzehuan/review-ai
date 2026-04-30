import Redis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var __reviewAiRedis__: Redis | undefined;
}

export function getRedis() {
  if (!globalThis.__reviewAiRedis__) {
    const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
    globalThis.__reviewAiRedis__ = new Redis(url, {
      maxRetriesPerRequest: null,
      lazyConnect: true
    });
  }

  return globalThis.__reviewAiRedis__;
}
