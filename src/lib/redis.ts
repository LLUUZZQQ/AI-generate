import IORedis from "ioredis";

let _redis: IORedis | null = null;

export function getRedis(): IORedis | null {
  if (!process.env.REDIS_URL) return null;
  if (!_redis) {
    try {
      _redis = new IORedis(process.env.REDIS_URL, {
        maxRetriesPerRequest: null,
        lazyConnect: true,
      });
    } catch {
      return null;
    }
  }
  return _redis;
}
