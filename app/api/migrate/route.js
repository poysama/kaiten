import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';
import { calculateGameWeight } from '@/lib/weightedSelection';

/**
 * Migration endpoint to update existing games with new properties
 *
 * Changes to migrate:
 * 1. Add 'length' property to all games (default: 'medium')
 * 2. Ensure all stats have 'weight' field calculated correctly
 * 3. Ensure all stats fields exist (picks, played, skipped, weight)
 */
export async function POST(request) {
  try {
    const redis = getRedis();

    // Get authentication/safety check from request body
    const body = await request.json();
    if (body.confirm !== 'MIGRATE') {
      return NextResponse.json({
        error: "Must send { confirm: 'MIGRATE' } to proceed with migration"
      }, { status: 400 });
    }

    console.log('[MIGRATE] Starting migration...');

    const report = {
      gamesUpdated: 0,
      gamesWithoutLength: [],
      statsFixed: 0,
      statsCreated: 0,
      errors: []
    };

    // Get all game IDs
    const gameIds = await redis.smembers("games:ids");
    console.log(`[MIGRATE] Found ${gameIds.length} games to check`);

    if (gameIds.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'No games found to migrate',
        report
      });
    }

    // Process each game
    for (const gameId of gameIds) {
      try {
        // 1. Check and update game object
        const gameJson = await redis.get(`game:${gameId}`);

        if (!gameJson) {
          report.errors.push(`Game ${gameId} not found in redis`);
          continue;
        }

        const game = JSON.parse(gameJson);
        let gameUpdated = false;

        // Add length property if missing
        if (!game.length) {
          game.length = 'medium';
          gameUpdated = true;
          report.gamesWithoutLength.push(game.name || gameId);
        }

        // Ensure meta object exists
        if (!game.meta) {
          game.meta = {};
          gameUpdated = true;
        }

        if (gameUpdated) {
          await redis.set(`game:${gameId}`, JSON.stringify(game));
          report.gamesUpdated++;
          console.log(`[MIGRATE] Updated game: ${game.name}`);
        }

        // 2. Check and fix stats
        const stats = await redis.hgetall(`stats:game:${gameId}`);

        if (!stats || Object.keys(stats).length === 0) {
          // Create fresh stats if none exist
          await redis.hset(`stats:game:${gameId}`, {
            picks: '0',
            played: '0',
            skipped: '0',
            weight: '1.000'
          });
          report.statsCreated++;
          console.log(`[MIGRATE] Created stats for: ${game.name}`);
        } else {
          // Ensure all stat fields exist and are valid
          let statsUpdated = false;
          const updates = {};

          // Ensure numeric fields exist
          if (!stats.picks) {
            updates.picks = '0';
            statsUpdated = true;
          }
          if (!stats.played) {
            updates.played = '0';
            statsUpdated = true;
          }
          if (!stats.skipped) {
            updates.skipped = '0';
            statsUpdated = true;
          }

          // Recalculate weight to ensure it's correct
          const picks = parseInt(stats.picks || 0);
          const played = parseInt(stats.played || 0);
          const skipped = parseInt(stats.skipped || 0);

          const calculatedWeight = calculateGameWeight({
            picks,
            played,
            skipped
          });

          const currentWeight = parseFloat(stats.weight || 1.0);

          // Update weight if it's different (accounting for floating point precision)
          if (Math.abs(currentWeight - calculatedWeight) > 0.001) {
            updates.weight = calculatedWeight.toFixed(3);
            statsUpdated = true;
          }

          if (statsUpdated) {
            await redis.hset(`stats:game:${gameId}`, updates);
            report.statsFixed++;
            console.log(`[MIGRATE] Fixed stats for: ${game.name}`);
          }
        }

      } catch (error) {
        console.error(`[MIGRATE] Error processing game ${gameId}:`, error);
        report.errors.push(`${gameId}: ${error.message}`);
      }
    }

    console.log('[MIGRATE] Migration completed');
    console.log('[MIGRATE] Report:', report);

    return NextResponse.json({
      ok: true,
      message: 'Migration completed successfully',
      report: {
        totalGames: gameIds.length,
        gamesUpdated: report.gamesUpdated,
        statsFixed: report.statsFixed,
        statsCreated: report.statsCreated,
        gamesWithoutLength: report.gamesWithoutLength,
        errors: report.errors
      }
    });

  } catch (error) {
    console.error('[MIGRATE] Fatal error:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check what needs migration without making changes
 */
export async function GET() {
  try {
    const redis = getRedis();

    const report = {
      totalGames: 0,
      gamesNeedingLength: 0,
      gamesWithoutStats: 0,
      gamesWithIncorrectWeight: 0,
      details: []
    };

    const gameIds = await redis.smembers("games:ids");
    report.totalGames = gameIds.length;

    for (const gameId of gameIds) {
      try {
        const gameJson = await redis.get(`game:${gameId}`);
        if (!gameJson) continue;

        const game = JSON.parse(gameJson);
        const stats = await redis.hgetall(`stats:game:${gameId}`);

        const issues = [];

        // Check for missing length
        if (!game.length) {
          report.gamesNeedingLength++;
          issues.push('missing length property');
        }

        // Check for missing stats
        if (!stats || Object.keys(stats).length === 0) {
          report.gamesWithoutStats++;
          issues.push('no stats exist');
        } else {
          // Check weight calculation
          const picks = parseInt(stats.picks || 0);
          const played = parseInt(stats.played || 0);
          const skipped = parseInt(stats.skipped || 0);
          const currentWeight = parseFloat(stats.weight || 1.0);
          const calculatedWeight = calculateGameWeight({ picks, played, skipped });

          if (Math.abs(currentWeight - calculatedWeight) > 0.001) {
            report.gamesWithIncorrectWeight++;
            issues.push(`weight mismatch (current: ${currentWeight.toFixed(3)}, should be: ${calculatedWeight.toFixed(3)})`);
          }
        }

        if (issues.length > 0) {
          report.details.push({
            id: gameId,
            name: game.name,
            issues
          });
        }

      } catch (error) {
        report.details.push({
          id: gameId,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      ok: true,
      needsMigration: report.gamesNeedingLength > 0 ||
                       report.gamesWithoutStats > 0 ||
                       report.gamesWithIncorrectWeight > 0,
      report
    });

  } catch (error) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
