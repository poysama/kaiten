import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

export async function GET() {
  try {
    const redis = getRedis();
    const ids = await redis.smembers("games:ids");

    if (!ids || ids.length === 0) {
      return NextResponse.json({ mostPlayed: [], mostSkipped: [], allGames: [] });
    }

    const multi = redis.multi();
    ids.forEach(id => {
      multi.hgetall(`stats:game:${id}`);
      multi.get(`game:${id}`);
    });

    const results = await multi.exec();
    const detailed = [];

    for (let i = 0; i < ids.length; i++) {
      const stats = results[i * 2][1] || {};
      const game = JSON.parse(results[i * 2 + 1][1]);

      detailed.push({
        id: ids[i],
        name: game.name,
        played: parseInt(stats.played || 0),
        skipped: parseInt(stats.skipped || 0),
        picks: parseInt(stats.picks || 0)
      });
    }

    const mostPlayed = [...detailed].sort((a, b) => b.played - a.played);
    const mostSkipped = [...detailed].sort((a, b) => b.skipped - a.skipped);

    // Sort allGames by picks descending (most picked first)
    const allGames = [...detailed].sort((a, b) => b.picks - a.picks);

    return NextResponse.json({
      mostPlayed,
      mostSkipped,
      allGames
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
