import { kv } from '@vercel/kv';

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
      console.log('[API] Attempting to read from KV...');

      // Load data from Redis
      const data = await kv.get('spinner-data');

      console.log('[API] KV read result:', data ? 'Data found' : 'No data found');

      if (!data) {
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

      console.log('[API] Data validation passed, saving to KV...');
      console.log('[API] Games count:', data.games.length);
      console.log('[API] Players count:', data.players.length);

      // Store in Redis
      await kv.set('spinner-data', data);

      console.log('[API] Data saved successfully to KV');
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
