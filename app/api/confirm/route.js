import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';
import { calculateGameWeight } from '@/lib/weightedSelection';
import { broadcastToRoom } from '@/lib/ws-broadcast';

export const dynamic = 'force-dynamic';

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

    // If this is a vote, increment vote count and check for majority
    if (isVote) {
      const sessionData = await redis.get(`game:session:${roomCode}`);
      if (!sessionData) {
        return NextResponse.json({ error: 'No active session' }, { status: 404 });
      }

      const session = JSON.parse(sessionData);
      session.votes.confirm++;

      await redis.set(`game:session:${roomCode}`, JSON.stringify(session));

      // Broadcast vote update
      await broadcastToRoom(roomCode, {
        type: 'votes_updated',
        votes: session.votes
      });

      // Get room to check member count
      const roomData = await redis.get(`room:${roomCode.toUpperCase()}`);
      const room = roomData ? JSON.parse(roomData) : null;
      const memberCount = room ? room.members.length : 1;
      const totalVotes = session.votes.confirm + session.votes.skip;
      const majority = Math.ceil(memberCount / 2);

      console.log('[CONFIRM] Votes:', session.votes, 'Member count:', memberCount, 'Majority:', majority);

      // Only finalize when ALL members have voted
      if (totalVotes >= memberCount) {
        const prefix = `room:${roomCode}:`;

        // If tied, default to skip
        if (session.votes.confirm === session.votes.skip) {
          console.log('[CONFIRM] Votes tied - defaulting to skip');
          await redis.hincrby(`${prefix}stats:game:${id}`, 'skipped', 1);

          // Recalculate weight
          const stats = await redis.hgetall(`${prefix}stats:game:${id}`);
          const weight = calculateGameWeight({
            picks: parseInt(stats.picks || 0),
            played: parseInt(stats.played || 0),
            skipped: parseInt(stats.skipped || 0)
          });
          await redis.hset(`${prefix}stats:game:${id}`, 'weight', weight.toFixed(3));

          // Get game for history
          const gameData = await redis.get(`${prefix}game:${id}`);
          const game = gameData ? JSON.parse(gameData) : null;

          let historyEntry = null;
          if (game) {
            historyEntry = {
              id: game.id,
              name: game.name,
              timestamp: Date.now(),
              status: 'skipped'
            };
            await redis.lpush(`${prefix}game:history`, JSON.stringify(historyEntry));
            await redis.ltrim(`${prefix}game:history`, 0, 49);
          }

          // Clear session
          await redis.del(`game:session:${roomCode}`);

          // Broadcast session closed
          await broadcastToRoom(roomCode, {
            type: 'session_closed'
          });

          if (historyEntry) {
            await broadcastToRoom(roomCode, {
              type: 'history_updated',
              entry: historyEntry
            });
          }

          return NextResponse.json({ ok: true, weight, sessionClosed: true });
        }

        // Confirm wins - finalize as confirmed
        if (session.votes.confirm > session.votes.skip) {
          console.log('[CONFIRM] All votes in - confirm wins');
          await redis.hincrby(`${prefix}stats:game:${id}`, 'played', 1);

          // Recalculate weight
          const stats = await redis.hgetall(`${prefix}stats:game:${id}`);
          const weight = calculateGameWeight({
            picks: parseInt(stats.picks || 0),
            played: parseInt(stats.played || 0),
            skipped: parseInt(stats.skipped || 0)
          });
          await redis.hset(`${prefix}stats:game:${id}`, 'weight', weight.toFixed(3));

          // Get game for history
          const gameData = await redis.get(`${prefix}game:${id}`);
          const game = gameData ? JSON.parse(gameData) : null;

          let historyEntry = null;
          if (game) {
            historyEntry = {
              id: game.id,
              name: game.name,
              timestamp: Date.now(),
              status: 'played'
            };
            await redis.lpush(`${prefix}game:history`, JSON.stringify(historyEntry));
            await redis.ltrim(`${prefix}game:history`, 0, 49);
          }

          // Clear session
          await redis.del(`game:session:${roomCode}`);

          // Broadcast session closed
          await broadcastToRoom(roomCode, {
            type: 'session_closed'
          });

          if (historyEntry) {
            await broadcastToRoom(roomCode, {
              type: 'history_updated',
              entry: historyEntry
            });
          }

          return NextResponse.json({ ok: true, weight, sessionClosed: true });
        }

        // Skip wins - finalize as skipped
        if (session.votes.skip > session.votes.confirm) {
          console.log('[CONFIRM] All votes in - skip wins');
          await redis.hincrby(`${prefix}stats:game:${id}`, 'skipped', 1);

          // Recalculate weight
          const stats = await redis.hgetall(`${prefix}stats:game:${id}`);
          const weight = calculateGameWeight({
            picks: parseInt(stats.picks || 0),
            played: parseInt(stats.played || 0),
            skipped: parseInt(stats.skipped || 0)
          });
          await redis.hset(`${prefix}stats:game:${id}`, 'weight', weight.toFixed(3));

          // Get game for history
          const gameData = await redis.get(`${prefix}game:${id}`);
          const game = gameData ? JSON.parse(gameData) : null;

          let historyEntry = null;
          if (game) {
            historyEntry = {
              id: game.id,
              name: game.name,
              timestamp: Date.now(),
              status: 'skipped'
            };
            await redis.lpush(`${prefix}game:history`, JSON.stringify(historyEntry));
            await redis.ltrim(`${prefix}game:history`, 0, 49);
          }

          // Clear session
          await redis.del(`game:session:${roomCode}`);

          // Broadcast session closed
          await broadcastToRoom(roomCode, {
            type: 'session_closed'
          });

          if (historyEntry) {
            await broadcastToRoom(roomCode, {
              type: 'history_updated',
              entry: historyEntry
            });
          }

          return NextResponse.json({ ok: true, weight, sessionClosed: true });
        }
      }

      return NextResponse.json({
        ok: true,
        votes: session.votes,
        isVote: true
      });
    }

    // If not a vote, this is the final action (host or majority reached)
    const prefix = `room:${roomCode}:`;

    console.log('[CONFIRM] Incrementing played for game:', id);
    await redis.hincrby(`${prefix}stats:game:${id}`, 'played', 1);

    // Recalculate weight after updating stats
    const stats = await redis.hgetall(`${prefix}stats:game:${id}`);
    const weight = calculateGameWeight({
      picks: parseInt(stats.picks || 0),
      played: parseInt(stats.played || 0),
      skipped: parseInt(stats.skipped || 0)
    });
    await redis.hset(`${prefix}stats:game:${id}`, 'weight', weight.toFixed(3));

    console.log('[CONFIRM] New weight:', weight);

    // Get game name for history
    const gameData = await redis.get(`${prefix}game:${id}`);
    const game = gameData ? JSON.parse(gameData) : null;

    // Add to history with 'played' status
    let historyEntry = null;
    if (game) {
      historyEntry = {
        id: game.id,
        name: game.name,
        timestamp: Date.now(),
        status: 'played'
      };
      await redis.lpush(`${prefix}game:history`, JSON.stringify(historyEntry));
      // Keep only last 50 entries
      await redis.ltrim(`${prefix}game:history`, 0, 49);
    }

    // Clear the session for this room
    await redis.del(`game:session:${roomCode}`);

    // Broadcast session closed and history update
    await broadcastToRoom(roomCode, {
      type: 'session_closed'
    });

    if (historyEntry) {
      await broadcastToRoom(roomCode, {
        type: 'history_updated',
        entry: historyEntry
      });
    }

    return NextResponse.json({ ok: true, weight, sessionClosed: true });
  } catch (error) {
    console.error('[CONFIRM] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
