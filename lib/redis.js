import Redis from "ioredis";

let redis;

export function getRedis() {
  if (!redis) {
    const url = process.env.REDIS_URL;
    if (!url) {
      console.error('[REDIS] REDIS_URL environment variable is not set');
      throw new Error("REDIS_URL not set");
    }

    console.log('[REDIS] Connecting to Redis...');
    redis = new Redis(url, {
      connectTimeout: 10000,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        console.log(`[REDIS] Retry attempt ${times}, delay: ${delay}ms`);
        return delay;
      },
      reconnectOnError(err) {
        console.error('[REDIS] Reconnect on error:', err.message);
        return true;
      }
    });

    redis.on('connect', () => {
      console.log('[REDIS] Connected successfully');
    });

    redis.on('error', (err) => {
      console.error('[REDIS] Connection error:', err.message);
    });

    redis.on('close', () => {
      console.log('[REDIS] Connection closed');
    });

    redis.on('reconnecting', () => {
      console.log('[REDIS] Reconnecting...');
    });
  }
  return redis;
}
