import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

export async function POST(request) {
  try {
    const { id, weight, picks, played, skipped } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const redis = getRedis();

    // Update all stats fields
    await redis.hset(`stats:game:${id}`, 'weight', weight.toFixed(3));
    await redis.hset(`stats:game:${id}`, 'picks', picks.toString());
    await redis.hset(`stats:game:${id}`, 'played', played.toString());
    await redis.hset(`stats:game:${id}`, 'skipped', skipped.toString());

    console.log('[STATS UPDATE] Updated stats for game:', id, { weight, picks, played, skipped });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[STATS UPDATE] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
