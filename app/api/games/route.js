import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

// Disable caching for this endpoint
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const redis = getRedis();
    const ids = await redis.smembers("games:ids");

    if (!ids || ids.length === 0) {
      return NextResponse.json({ games: [] });
    }

    const multi = redis.multi();
    ids.forEach(id => multi.get(`game:${id}`));
    const vals = await multi.exec();
    const games = vals.map(([e, v]) => JSON.parse(v));

    return NextResponse.json({ games });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, meta } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    const redis = getRedis();
    const gameId = `g_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const obj = { id: gameId, name, meta: meta || {} };

    await redis.set(`game:${gameId}`, JSON.stringify(obj));
    await redis.sadd("games:ids", gameId);
    await redis.hset(`stats:game:${gameId}`, { played: 0, skipped: 0, picks: 0 });

    return NextResponse.json({ ok: true, game: obj });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, name, meta } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const redis = getRedis();
    const raw = await redis.get(`game:${id}`);

    if (!raw) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const obj = JSON.parse(raw);
    if (name) obj.name = name;
    if (meta) obj.meta = meta;

    await redis.set(`game:${id}`, JSON.stringify(obj));

    return NextResponse.json({ ok: true, game: obj });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const redis = getRedis();
    await redis.del(`game:${id}`);
    await redis.srem("games:ids", id);
    await redis.del(`stats:game:${id}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
