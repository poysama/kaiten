import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { roomCode } = await request.json();

    if (!roomCode) {
      return NextResponse.json({ error: 'Room code required' }, { status: 400 });
    }

    const redis = getRedis();

    // Verify room exists
    const roomData = await redis.get(`room:${roomCode}`);
    if (!roomData) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    let gamesCloned = 0;
    let statsCloned = 0;
    let historyCloned = 0;

    // Clone all games from global to room-specific
    const globalGameIds = await redis.smembers('games:ids');

    if (globalGameIds && globalGameIds.length > 0) {
      const multi = redis.multi();

      for (const gameId of globalGameIds) {
        // Get game data
        const gameData = await redis.get(`game:${gameId}`);
        if (gameData) {
          // Store in room-specific key
          multi.set(`room:${roomCode}:game:${gameId}`, gameData);
          multi.sadd(`room:${roomCode}:games:ids`, gameId);
          gamesCloned++;
        }

        // Get stats data
        const statsData = await redis.hgetall(`stats:game:${gameId}`);
        if (statsData && Object.keys(statsData).length > 0) {
          multi.hset(`room:${roomCode}:stats:game:${gameId}`, statsData);
          statsCloned++;
        }
      }

      await multi.exec();
    }

    // Clone game history
    const history = await redis.lrange('game:history', 0, 49);
    if (history && history.length > 0) {
      const multi = redis.multi();
      history.forEach(entry => {
        multi.rpush(`room:${roomCode}:game:history`, entry);
      });
      await multi.exec();
      historyCloned = history.length;
    }

    console.log(`[CLONE] Cloned data to room ${roomCode}: ${gamesCloned} games, ${statsCloned} stats, ${historyCloned} history entries`);

    return NextResponse.json({
      ok: true,
      gamesCloned,
      statsCloned,
      historyCloned
    });
  } catch (error) {
    console.error('[CLONE] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
