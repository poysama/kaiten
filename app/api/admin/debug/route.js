import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

// Force dynamic rendering - don't try to pre-render during build
export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to see all Redis data
 */
export async function GET() {
  try {
    const redis = getRedis();

    // Get all keys
    const allKeys = await redis.keys('*');

    // Get all data
    const data = {};

    for (const key of allKeys) {
      const type = await redis.type(key);

      if (type === 'string') {
        data[key] = await redis.get(key);
      } else if (type === 'hash') {
        data[key] = await redis.hgetall(key);
      } else if (type === 'set') {
        data[key] = await redis.smembers(key);
      } else if (type === 'list') {
        data[key] = await redis.lrange(key, 0, -1);
      } else {
        data[key] = `<${type}>`;
      }
    }

    return NextResponse.json({
      totalKeys: allKeys.length,
      keys: allKeys,
      data
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
