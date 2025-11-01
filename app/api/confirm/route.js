import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

export async function POST(request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const redis = getRedis();
    console.log('[CONFIRM] Incrementing played for game:', id);
    const newValue = await redis.hincrby(`stats:game:${id}`, 'played', 1);
    console.log('[CONFIRM] New played value:', newValue);

    return NextResponse.json({ ok: true, newValue });
  } catch (error) {
    console.error('[CONFIRM] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
