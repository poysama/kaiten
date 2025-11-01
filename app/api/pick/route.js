import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';
import { weightedRandomPick, calculateGameWeight } from '@/lib/weightedSelection';

export async function POST(request) {
  try {
    const redis = getRedis();
    const ids = await redis.smembers("games:ids");

    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: "no games" }, { status: 400 });
    }

    // Get useWeighting and lengthFilter parameters from request body
    let useWeighting = true;
    let lengthFilter = 'all';
    try {
      const body = await request.json();
      useWeighting = body.useWeighting !== undefined ? body.useWeighting : true;
      lengthFilter = body.lengthFilter || 'all';
    } catch {
      // If no body or parsing fails, default to weighted and all lengths
      useWeighting = true;
      lengthFilter = 'all';
    }

    // Fetch all games and their stats
    const multi = redis.multi();
    ids.forEach(id => {
      multi.get(`game:${id}`);
      multi.hgetall(`stats:game:${id}`);
    });

    const results = await multi.exec();

    // Build games array and stats map
    const games = [];
    const statsMap = {};

    for (let i = 0; i < ids.length; i++) {
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

    // Calculate and store weight for all games
    const weightUpdate = redis.multi();
    games.forEach(game => {
      const weight = calculateGameWeight(statsMap[game.id]);
      weightUpdate.hset(`stats:game:${game.id}`, 'weight', weight.toFixed(3));
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
    await redis.hincrby(`stats:game:${pick.id}`, 'picks', 1);

    // Recalculate weight for the picked game after incrementing picks
    const updatedStats = {
      ...statsMap[pick.id],
      picks: statsMap[pick.id].picks + 1
    };
    const newWeight = calculateGameWeight(updatedStats);
    await redis.hset(`stats:game:${pick.id}`, 'weight', newWeight.toFixed(3));

    console.log('[PICK] New weight:', newWeight);

    return NextResponse.json({ index: idx, pick });
  } catch (error) {
    console.error('[PICK] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
