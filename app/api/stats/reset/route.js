import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

export async function POST() {
  try {
    const redis = getRedis();

    // First, delete ALL old stats keys (including orphaned ones)
    const allStatsKeys = await redis.keys('stats:game:*');
    console.log('Found stats keys to delete:', allStatsKeys);

    if (allStatsKeys.length > 0) {
      // Delete keys one by one to avoid issues with spread operator
      for (const key of allStatsKeys) {
        await redis.del(key);
      }
    }

    // Get current game IDs
    const ids = await redis.smembers("games:ids");
    console.log('Current game IDs:', ids);

    if (!ids || ids.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'All stats cleared, no games to initialize',
        deletedKeys: allStatsKeys.length
      });
    }

    // Initialize fresh stats for all current games
    const multi = redis.multi();
    ids.forEach(id => {
      // Set each field separately to ensure they're stored correctly
      multi.hset(`stats:game:${id}`, 'played', '0');
      multi.hset(`stats:game:${id}`, 'skipped', '0');
      multi.hset(`stats:game:${id}`, 'picks', '0');
    });

    const results = await multi.exec();
    console.log('Reset results:', results);

    return NextResponse.json({
      ok: true,
      message: `Stats reset for ${ids.length} games`,
      gamesReset: ids.length,
      deletedKeys: allStatsKeys.length
    });
  } catch (error) {
    console.error('Stats reset error:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
