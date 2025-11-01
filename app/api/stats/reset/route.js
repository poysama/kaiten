import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

export async function POST() {
  try {
    const redis = getRedis();
    const ids = await redis.smembers("games:ids");

    if (!ids || ids.length === 0) {
      return NextResponse.json({ ok: true });
    }

    // Reset all game statistics
    const multi = redis.multi();
    ids.forEach(id => {
      multi.hset(`stats:game:${id}`, { played: 0, skipped: 0, picks: 0 });
    });

    await multi.exec();

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
