import { kv } from '@vercel/kv';

// CORS headers for frontend requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  try {
    if (req.method === 'GET') {
      // Load data from Redis
      const data = await kv.get('spinner-data');

      if (!data) {
        // Return default data if nothing stored yet
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

      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      // Save data to Redis
      const data = req.body;

      // Validate data structure
      if (!data.games || !data.players || !data.stats) {
        return res.status(400).json({ error: 'Invalid data structure' });
      }

      // Store in Redis
      await kv.set('spinner-data', data);

      return res.status(200).json({ success: true, message: 'Data saved successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

export const config = {
  runtime: 'edge',
};
