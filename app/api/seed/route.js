import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

export async function POST() {
  try {
    const redis = getRedis();

    // Example game scenarios with different weight characteristics
    const scenarios = [
      // Scenario 1: Frequently played game (low weight)
      {
        name: "Monopoly",
        length: "long",
        stats: {
          picks: 20,
          played: 18,
          skipped: 2,
          weight: 0.057 // Very low - played almost every time
        }
      },
      // Scenario 2: Frequently skipped game (high weight)
      {
        name: "Risk",
        length: "long",
        stats: {
          picks: 15,
          played: 2,
          skipped: 13,
          weight: 1.867 // Very high - skipped almost every time
        }
      },
      // Scenario 3: Never played before (neutral weight)
      {
        name: "Splendor",
        length: "medium",
        stats: {
          picks: 0,
          played: 0,
          skipped: 0,
          weight: 1.0 // Default weight
        }
      },
      // Scenario 4: Balanced play/skip ratio
      {
        name: "Catan",
        length: "medium",
        stats: {
          picks: 10,
          played: 5,
          skipped: 5,
          weight: 0.3 // Medium weight
        }
      },
      // Scenario 5: Highly played (very low weight)
      {
        name: "Ticket to Ride",
        length: "medium",
        stats: {
          picks: 30,
          played: 28,
          skipped: 2,
          weight: 0.037 // Extremely low
        }
      },
      // Scenario 6: Never played but picked often (high weight)
      {
        name: "Pandemic",
        length: "medium",
        stats: {
          picks: 10,
          played: 0,
          skipped: 10,
          weight: 2.0 // Very high
        }
      },
      // Scenario 7: Short game - rarely picked
      {
        name: "Love Letter",
        length: "short",
        stats: {
          picks: 3,
          played: 2,
          skipped: 1,
          weight: 0.6
        }
      },
      // Scenario 8: Short game - popular
      {
        name: "Uno",
        length: "short",
        stats: {
          picks: 25,
          played: 22,
          skipped: 3,
          weight: 0.047
        }
      },
      // Scenario 9: Long game - often skipped
      {
        name: "Twilight Imperium",
        length: "long",
        stats: {
          picks: 8,
          played: 1,
          skipped: 7,
          weight: 1.75
        }
      },
      // Scenario 10: Medium game - moderate play
      {
        name: "7 Wonders",
        length: "medium",
        stats: {
          picks: 12,
          played: 7,
          skipped: 5,
          weight: 0.188
        }
      }
    ];

    const multi = redis.multi();
    const gameIds = [];

    // Create each game and set its stats
    scenarios.forEach((scenario, index) => {
      const gameId = `g_seed_${Date.now()}_${index}`;
      gameIds.push(gameId);

      const game = {
        id: gameId,
        name: scenario.name,
        length: scenario.length,
        meta: {}
      };

      // Add game
      multi.set(`game:${gameId}`, JSON.stringify(game));
      multi.sadd("games:ids", gameId);

      // Set stats
      multi.hset(`stats:game:${gameId}`, 'picks', scenario.stats.picks.toString());
      multi.hset(`stats:game:${gameId}`, 'played', scenario.stats.played.toString());
      multi.hset(`stats:game:${gameId}`, 'skipped', scenario.stats.skipped.toString());
      multi.hset(`stats:game:${gameId}`, 'weight', scenario.stats.weight.toFixed(3));
    });

    await multi.exec();

    return NextResponse.json({
      ok: true,
      message: 'Test scenarios seeded successfully',
      gamesCreated: scenarios.length,
      scenarios: scenarios.map(s => ({
        name: s.name,
        length: s.length,
        picks: s.stats.picks,
        played: s.stats.played,
        skipped: s.stats.skipped,
        weight: s.stats.weight.toFixed(3)
      }))
    });
  } catch (error) {
    console.error('[SEED] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
