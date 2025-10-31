import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // Test KV connection
    const testKey = 'health-check-' + Date.now();
    const testValue = { test: true, timestamp: new Date().toISOString() };

    // Try to write
    await kv.set(testKey, testValue, { ex: 60 }); // Expires in 60 seconds

    // Try to read
    const readValue = await kv.get(testKey);

    // Check environment variables
    const hasKvUrl = !!process.env.KV_REST_API_URL;
    const hasKvToken = !!process.env.KV_REST_API_TOKEN;

    // Get existing data
    const existingData = await kv.get('spinner-data');

    return res.status(200).json({
      status: 'ok',
      kv_connected: true,
      environment_vars: {
        KV_REST_API_URL: hasKvUrl ? 'Set' : 'Missing',
        KV_REST_API_TOKEN: hasKvToken ? 'Set' : 'Missing'
      },
      test: {
        write: 'success',
        read: readValue ? 'success' : 'failed',
        match: JSON.stringify(readValue) === JSON.stringify(testValue)
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
      kv_connected: false,
      error: error.message,
      stack: error.stack,
      environment_vars: {
        KV_REST_API_URL: !!process.env.KV_REST_API_URL ? 'Set' : 'Missing',
        KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN ? 'Set' : 'Missing'
      }
    });
  }
}
