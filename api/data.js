import { Redis } from '@upstash/redis';

// Initialize Redis client
function getRedisConfig() {
  // First, try to use the REST API env vars if available
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.log('[Redis] Using UPSTASH_REDIS_REST_URL and token');
    return {
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN
    };
  }

  // Fallback: Try to parse REDIS_URL
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('No Redis environment variables found. Need either UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN or REDIS_URL');
  }

  console.log('[Redis] Parsing REDIS_URL as fallback');

  // Parse the Redis URL (redis://default:password@host:port or rediss://)
  const url = new URL(redisUrl);
  const password = url.password || url.username;
  const host = url.hostname;

  // For Upstash Redis, the REST API URL needs the full path
  const restUrl = `https://${host}`;

  console.log('[Redis] Constructed REST URL:', restUrl.substring(0, 30) + '...');

  return {
    url: restUrl,
    token: password
  };
}

let redis;
try {
  const redisConfig = getRedisConfig();
  redis = new Redis(redisConfig);
  console.log('[Redis] Client initialized successfully');
} catch (error) {
  console.error('[Redis] Failed to initialize client:', error.message);
  throw error;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log(`[API] ${req.method} request received`);

    if (req.method === 'GET') {
      console.log('[API] Attempting to read from Redis...');

      // Load data from Redis
      const rawData = await redis.get('spinner-data');

      console.log('[API] Redis read result:', rawData ? 'Data found' : 'No data found');

      if (!rawData) {
        // Return default data if nothing stored yet
        console.log('[API] Returning default data structure');
        return res.status(200).json({
          games: [],
          players: [],
          stats: {
            gamesPlayed: {},
            gamesSkipped: {},
            lastPlayed: {},
            rerollsToday: 0,
            lastRerollDate: null
          }
        });
      }

      // Parse the JSON data
      const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

      console.log('[API] Returning stored data');
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      console.log('[API] Attempting to save to KV...');

      // Save data to Redis
      const data = req.body;

      // Validate data structure
      if (!data.games || !data.players || !data.stats) {
        console.error('[API] Invalid data structure received');
        return res.status(400).json({ error: 'Invalid data structure' });
      }

      console.log('[API] Data validation passed, saving to Redis...');
      console.log('[API] Games count:', data.games.length);
      console.log('[API] Players count:', data.players.length);

      // Store in Redis
      await redis.set('spinner-data', JSON.stringify(data));

      console.log('[API] Data saved successfully to Redis');
      return res.status(200).json({ success: true, message: 'Data saved successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[API] Error occurred:', error);
    console.error('[API] Error message:', error.message);
    console.error('[API] Error stack:', error.stack);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
