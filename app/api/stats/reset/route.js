import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

export async function POST() {
  try {
    const redis = getRedis();

    // First, delete ALL old stats keys (including orphaned ones)
    const allStatsKeys = await redis.keys('stats:game:*');
    if (allStatsKeys.length > 0) {
      await redis.del(...allStatsKeys);
    }

    // Get current game IDs
    const ids = await redis.smembers("games:ids");

    if (!ids || ids.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'All stats cleared, no games to initialize'
      });
    }

    // Initialize fresh stats for all current games
    const multi = redis.multi();
    ids.forEach(id => {
      multi.hset(`stats:game:${id}`, { played: '0', skipped: '0', picks: '0' });
    });

    await multi.exec();

    return NextResponse.json({
      ok: true,
      message: `Stats reset for ${ids.length} games`,
      gamesReset: ids.length
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
