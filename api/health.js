import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // Test Redis connection
    const testKey = 'health-check-' + Date.now();
    const testValue = JSON.stringify({ test: true, timestamp: new Date().toISOString() });

    // Try to write
    await redis.set(testKey, testValue, { ex: 60 }); // Expires in 60 seconds

    // Try to read
    const readValue = await redis.get(testKey);

    // Check environment variables
    const hasRedisUrl = !!process.env.REDIS_URL;
    const hasUpstashUrl = !!process.env.UPSTASH_REDIS_REST_URL;
    const hasUpstashToken = !!process.env.UPSTASH_REDIS_REST_TOKEN;

    // Get existing data
    const existingDataRaw = await redis.get('spinner-data');
    const existingData = existingDataRaw ? (typeof existingDataRaw === 'string' ? JSON.parse(existingDataRaw) : existingDataRaw) : null;

    return res.status(200).json({
      status: 'ok',
      redis_connected: true,
      environment_vars: {
        REDIS_URL: hasRedisUrl ? 'Set' : 'Missing',
        UPSTASH_REDIS_REST_URL: hasUpstashUrl ? 'Set' : 'Missing',
        UPSTASH_REDIS_REST_TOKEN: hasUpstashToken ? 'Set' : 'Missing'
      },
      test: {
        write: 'success',
        read: readValue ? 'success' : 'failed',
        match: readValue === testValue
      },
      existing_data: {
        exists: !!existingData,
        games_count: existingData?.games?.length || 0,
        players_count: existingData?.players?.length || 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      redis_connected: false,
      error: error.message,
      stack: error.stack,
      environment_vars: {
        REDIS_URL: !!process.env.REDIS_URL ? 'Set' : 'Missing',
        UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL ? 'Set' : 'Missing',
        UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN ? 'Set' : 'Missing'
      }
    });
  }
}
