import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

export async function POST() {
  try {
    const redis = getRedis();
    const ids = await redis.smembers("games:ids");

    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: "no games" }, { status: 400 });
    }

    const idx = Math.floor(Math.random() * ids.length);
    const id = ids[idx];
    const raw = await redis.get(`game:${id}`);
    const pick = JSON.parse(raw);

    console.log('[PICK] Incrementing picks for game:', id, pick.name);
    const newValue = await redis.hincrby(`stats:game:${id}`, 'picks', 1);
    console.log('[PICK] New picks value:', newValue);

    return NextResponse.json({ index: idx, pick });
  } catch (error) {
    console.error('[PICK] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
