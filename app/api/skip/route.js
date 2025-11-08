import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';
import { calculateGameWeight } from '@/lib/weightedSelection';

export async function POST(request) {
  try {
    const { id, isVote, roomCode } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    if (!roomCode) {
      return NextResponse.json({ error: "Room code required" }, { status: 400 });
    }

    const redis = getRedis();

    // If this is a vote, increment vote count but don't finalize yet
    if (isVote) {
      const sessionData = await redis.get(`game:session:${roomCode}`);
      if (!sessionData) {
        return NextResponse.json({ error: 'No active session' }, { status: 404 });
      }

      const session = JSON.parse(sessionData);
      session.votes.skip++;

      await redis.set(`game:session:${roomCode}`, JSON.stringify(session));

      return NextResponse.json({
        ok: true,
        votes: session.votes,
        isVote: true
      });
    }

    // If not a vote, this is the final action (host or majority reached)
    const prefix = `room:${roomCode}:`;

    console.log('[SKIP] Incrementing skipped for game:', id);
    await redis.hincrby(`${prefix}stats:game:${id}`, 'skipped', 1);

    // Recalculate weight after updating stats
    const stats = await redis.hgetall(`${prefix}stats:game:${id}`);
    const weight = calculateGameWeight({
      picks: parseInt(stats.picks || 0),
      played: parseInt(stats.played || 0),
      skipped: parseInt(stats.skipped || 0)
    });
    await redis.hset(`${prefix}stats:game:${id}`, 'weight', weight.toFixed(3));

    console.log('[SKIP] New weight:', weight);

    // Get game name for history
    const gameData = await redis.get(`${prefix}game:${id}`);
    const game = gameData ? JSON.parse(gameData) : null;

    // Add to history with 'skipped' status
    if (game) {
      const historyEntry = JSON.stringify({
        id: game.id,
        name: game.name,
        timestamp: Date.now(),
        status: 'skipped'
      });
      await redis.lpush(`${prefix}game:history`, historyEntry);
      // Keep only last 50 entries
      await redis.ltrim(`${prefix}game:history`, 0, 49);
    }

    // Clear the session for this room
    await redis.del(`game:session:${roomCode}`);

    return NextResponse.json({ ok: true, weight, sessionClosed: true });
  } catch (error) {
    console.error('[SKIP] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
