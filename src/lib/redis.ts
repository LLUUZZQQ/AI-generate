import "dotenv/config";
import IORedis from "ioredis";

const globalForRedis = globalThis as unknown as { redis: IORedis };

export const redis = globalForRedis.redis ?? new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
