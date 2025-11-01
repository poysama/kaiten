import Redis from "ioredis";

let redis;

export function getRedis() {
  if (!redis) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("REDIS_URL not set");
    redis = new Redis(url, {
      connectTimeout: 10000,
      maxRetriesPerRequest: 1
    });
  }
  return redis;
}
