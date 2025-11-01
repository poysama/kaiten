import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

export async function POST(request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const redis = getRedis();
    await redis.hincrby(`stats:game:${id}`, 'played', 1);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
