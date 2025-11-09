import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';
import { weightedRandomPick, calculateGameWeight } from '@/lib/weightedSelection';
import { broadcastToRoom } from '@/lib/ws-broadcast';

export async function POST(request) {
  try {
    const redis = getRedis();
    const ids = await redis.smembers("games:ids");

    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: "no games" }, { status: 400 });
    }

    // Get useWeighting, lengthFilter, and roomCode parameters from request body
    let useWeighting = true;
    let lengthFilter = 'all';
    let roomCode = null;
    try {
      const body = await request.json();
      useWeighting = body.useWeighting !== undefined ? body.useWeighting : true;
      lengthFilter = body.lengthFilter || 'all';
      roomCode = body.roomCode;
    } catch {
      // If no body or parsing fails, default to weighted and all lengths
      useWeighting = true;
      lengthFilter = 'all';
    }

    if (!roomCode) {
      return NextResponse.json({ error: "Room code required" }, { status: 400 });
    }

    // Use room-specific keys
    const prefix = `room:${roomCode}:`;
    const idsKey = `${prefix}games:ids`;
    const roomIds = await redis.smembers(idsKey);

    if (!roomIds || roomIds.length === 0) {
      return NextResponse.json({ error: "No games in this room" }, { status: 400 });
    }

    // Fetch all games and their stats from room-specific keys
    const multi = redis.multi();
    roomIds.forEach(id => {
      multi.get(`${prefix}game:${id}`);
      multi.hgetall(`${prefix}stats:game:${id}`);
    });

    const results = await multi.exec();

    // Build games array and stats map
    const games = [];
    const statsMap = {};

    for (let i = 0; i < roomIds.length; i++) {
      const gameData = results[i * 2][1];
      const statsData = results[i * 2 + 1][1] || {};

      if (gameData) {
        const game = JSON.parse(gameData);

        // Ensure game has a length property (default to 'medium' for older games)
        if (!game.length) {
          game.length = 'medium';
        }

        // Filter by length if specified
        if (lengthFilter === 'all' || game.length === lengthFilter) {
          games.push(game);

          statsMap[game.id] = {
            picks: parseInt(statsData.picks || 0),
            played: parseInt(statsData.played || 0),
            skipped: parseInt(statsData.skipped || 0)
          };
        }
      }
    }

    // Check if any games match the filter
    if (games.length === 0) {
      return NextResponse.json({ error: "No games available with selected length" }, { status: 400 });
    }

    // Create a session with "spinning" status FIRST so viewers can see the animation
    const sessionId = `session_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const spinningSession = {
      id: sessionId,
      roomCode: roomCode,
      gameId: null, // Not picked yet
      gameName: null,
      timestamp: Date.now(),
      votes: { confirm: 0, skip: 0 },
      status: 'spinning' // Indicates animation in progress
    };

    await redis.set(`game:session:${roomCode}`, JSON.stringify(spinningSession));
    await redis.expire(`game:session:${roomCode}`, 600);

    console.log('[PICK] Created spinning session:', sessionId, 'for room:', roomCode);

    // Broadcast spinning event to all clients
    await broadcastToRoom(roomCode, {
      type: 'session_spinning',
      session: spinningSession
    });

    // Calculate and store weight for all games
    const weightUpdate = redis.multi();
    games.forEach(game => {
      const weight = calculateGameWeight(statsMap[game.id]);
      weightUpdate.hset(`${prefix}stats:game:${game.id}`, 'weight', weight.toFixed(3));
    });
    await weightUpdate.exec();

    // Use weighted or random selection based on preference
    let pick;
    if (useWeighting) {
      pick = weightedRandomPick(games, statsMap);
    } else {
      // Pure random selection
      const randomIndex = Math.floor(Math.random() * games.length);
      pick = games[randomIndex];
    }
    const idx = games.findIndex(g => g.id === pick.id);

    console.log('[PICK] Selected game:', pick.id, pick.name);
    console.log('[PICK] Stats:', statsMap[pick.id]);

    // Increment pick count and recalculate weight for picked game
    await redis.hincrby(`${prefix}stats:game:${pick.id}`, 'picks', 1);

    // Recalculate weight for the picked game after incrementing picks
    const updatedStats = {
      ...statsMap[pick.id],
      picks: statsMap[pick.id].picks + 1
    };
    const newWeight = calculateGameWeight(updatedStats);
    await redis.hset(`${prefix}stats:game:${pick.id}`, 'weight', newWeight.toFixed(3));

    console.log('[PICK] New weight:', newWeight);

    // Update the session with the picked game and change status to 'active'
    const session = {
      id: sessionId,
      roomCode: roomCode,
      gameId: pick.id,
      gameName: pick.name,
      timestamp: Date.now(),
      votes: { confirm: 0, skip: 0 },
      status: 'active'
    };

    await redis.set(`game:session:${roomCode}`, JSON.stringify(session));
    await redis.expire(`game:session:${roomCode}`, 600);

    console.log('[PICK] Updated session to active:', sessionId, 'game:', pick.name);

    // Broadcast active session event to all clients
    await broadcastToRoom(roomCode, {
      type: 'session_active',
      session: session
    });

    return NextResponse.json({ index: idx, pick, sessionId });
  } catch (error) {
    console.error('[PICK] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
