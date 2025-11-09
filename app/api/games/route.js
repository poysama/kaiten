import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

// Disable caching for this endpoint
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  try {
    const redis = getRedis();
    const { searchParams } = new URL(request.url);
    const roomCode = searchParams.get('roomCode');

    // Determine which key prefix to use
    const prefix = roomCode ? `room:${roomCode}:` : '';
    const idsKey = `${prefix}games:ids`;
    const gameKeyPrefix = `${prefix}game:`;

    const ids = await redis.smembers(idsKey);

    if (!ids || ids.length === 0) {
      return NextResponse.json({ games: [] });
    }

    const multi = redis.multi();
    ids.forEach(id => multi.get(`${gameKeyPrefix}${id}`));
    const vals = await multi.exec();
    const games = vals.map(([e, v]) => JSON.parse(v));

    return NextResponse.json({ games });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, names, meta, length, roomCode } = await request.json();

    const redis = getRedis();

    // Determine which key prefix to use
    const prefix = roomCode ? `room:${roomCode.toUpperCase()}:` : '';
    const idsKey = `${prefix}games:ids`;
    const gameKeyPrefix = `${prefix}game:`;
    const statsKeyPrefix = `${prefix}stats:game:`;

    // Bulk add multiple games
    if (names && Array.isArray(names)) {
      const addedGames = [];

      for (const gameName of names) {
        if (!gameName || !gameName.trim()) continue;

        const gameId = `g_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const obj = {
          id: gameId,
          name: gameName.trim(),
          length: length || 'medium',
          meta: meta || {}
        };

        await redis.set(`${gameKeyPrefix}${gameId}`, JSON.stringify(obj));
        await redis.sadd(idsKey, gameId);
        await redis.hset(`${statsKeyPrefix}${gameId}`, { played: 0, skipped: 0, picks: 0, weight: '1.000' });

        addedGames.push(obj);
      }

      return NextResponse.json({ ok: true, games: addedGames, count: addedGames.length });
    }

    // Single game add
    if (!name) {
      return NextResponse.json({ error: "name or names required" }, { status: 400 });
    }

    const gameId = `g_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const obj = {
      id: gameId,
      name,
      length: length || 'medium',
      meta: meta || {}
    };

    await redis.set(`${gameKeyPrefix}${gameId}`, JSON.stringify(obj));
    await redis.sadd(idsKey, gameId);
    await redis.hset(`${statsKeyPrefix}${gameId}`, { played: 0, skipped: 0, picks: 0, weight: '1.000' });

    return NextResponse.json({ ok: true, game: obj });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, name, meta, length, roomCode } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const redis = getRedis();
    const prefix = roomCode ? `room:${roomCode.toUpperCase()}:` : '';
    const gameKey = `${prefix}game:${id}`;

    const raw = await redis.get(gameKey);

    if (!raw) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const obj = JSON.parse(raw);
    if (name !== undefined) obj.name = name;
    if (meta !== undefined) obj.meta = meta;
    if (length !== undefined) obj.length = length;

    await redis.set(gameKey, JSON.stringify(obj));

    return NextResponse.json({ ok: true, game: obj });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { id, roomCode } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const redis = getRedis();
    const prefix = roomCode ? `room:${roomCode.toUpperCase()}:` : '';
    const gameKey = `${prefix}game:${id}`;
    const idsKey = `${prefix}games:ids`;
    const statsKey = `${prefix}stats:game:${id}`;

    await redis.del(gameKey);
    await redis.srem(idsKey, id);
    await redis.del(statsKey);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { id, length, stats, roomCode } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const redis = getRedis();
    const prefix = roomCode ? `room:${roomCode.toUpperCase()}:` : '';
    const gameKey = `${prefix}game:${id}`;
    const statsKey = `${prefix}stats:game:${id}`;

    // Update game length if provided
    if (length !== undefined) {
      const raw = await redis.get(gameKey);
      if (!raw) {
        return NextResponse.json({ error: "not found" }, { status: 404 });
      }

      const obj = JSON.parse(raw);
      obj.length = length;
      await redis.set(gameKey, JSON.stringify(obj));
    }

    // Update stats if provided
    if (stats) {
      await redis.hset(statsKey, {
        played: stats.played || 0,
        skipped: stats.skipped || 0,
        picks: stats.picks || 0,
        weight: String(stats.weight || '1.000')
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
