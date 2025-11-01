import Redis from "ioredis";

let redis = null;

export function getRedis() {
  // Always reuse the same connection if it exists and is ready
  if (redis && redis.status === 'ready') {
    return redis;
  }

  // If connection is connecting or reconnecting, wait for it
  if (redis && (redis.status === 'connecting' || redis.status === 'reconnecting')) {
    return redis;
  }

  // Create new connection if none exists or previous one is closed/ended
  const url = process.env.REDIS_URL;
  if (!url) {
    console.error('[REDIS] REDIS_URL environment variable is not set');
    throw new Error("REDIS_URL not set");
  }

  console.log('[REDIS] Creating new Redis connection, status:', redis?.status || 'none');

  redis = new Redis(url, {
    connectTimeout: 10000,
    maxRetriesPerRequest: 3,
    lazyConnect: false,
    enableReadyCheck: true,
    retryStrategy(times) {
      if (times > 3) {
        console.error('[REDIS] Max retries reached');
        return null;
      }
      const delay = Math.min(times * 50, 2000);
      console.log(`[REDIS] Retry attempt ${times}, delay: ${delay}ms`);
      return delay;
    },
    reconnectOnError(err) {
      console.error('[REDIS] Reconnect on error:', err.message);
      // Only reconnect on connection errors
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
      if (targetErrors.some(e => err.message.includes(e))) {
        return true;
      }
      return false;
    }
  });

  redis.on('connect', () => {
    console.log('[REDIS] Connected successfully');
  });

  redis.on('ready', () => {
    console.log('[REDIS] Ready to accept commands');
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

  redis.on('end', () => {
    console.log('[REDIS] Connection ended');
    redis = null;
  });

  return redis;
}
