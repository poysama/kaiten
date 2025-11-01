import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';
import { calculateGameWeight } from '@/lib/weightedSelection';

export async function POST(request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const redis = getRedis();
    console.log('[CONFIRM] Incrementing played for game:', id);
    await redis.hincrby(`stats:game:${id}`, 'played', 1);

    // Recalculate weight after updating stats
    const stats = await redis.hgetall(`stats:game:${id}`);
    const weight = calculateGameWeight({
      picks: parseInt(stats.picks || 0),
      played: parseInt(stats.played || 0),
      skipped: parseInt(stats.skipped || 0)
    });
    await redis.hset(`stats:game:${id}`, 'weight', weight.toFixed(3));

    console.log('[CONFIRM] New weight:', weight);

    return NextResponse.json({ ok: true, weight });
  } catch (error) {
    console.error('[CONFIRM] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
