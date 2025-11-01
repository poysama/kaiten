import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

/**
 * Test endpoint to directly check Redis operations
 */
export async function GET() {
  try {
    const redis = getRedis();
    const testKey = 'test:counter';

    // Test 1: Set a value
    await redis.set(testKey, '0');
    const val1 = await redis.get(testKey);
    console.log('[TEST] Initial value:', val1);

    // Test 2: Increment
    const newVal = await redis.incr(testKey);
    console.log('[TEST] After increment:', newVal);

    // Test 3: Read back
    const val2 = await redis.get(testKey);
    console.log('[TEST] Read back:', val2);

    // Test 4: Hash operations
    const hashKey = 'test:hash';
    await redis.hset(hashKey, 'counter', '0');
    const hashVal1 = await redis.hget(hashKey, 'counter');
    console.log('[TEST] Hash initial:', hashVal1);

    const hashNewVal = await redis.hincrby(hashKey, 'counter', 1);
    console.log('[TEST] Hash after hincrby:', hashNewVal);

    const hashVal2 = await redis.hget(hashKey, 'counter');
    console.log('[TEST] Hash read back:', hashVal2);

    // Test 5: Check actual game stat
    const gameId = 'g_1761979596486_161';
    const played = await redis.hget(`stats:game:${gameId}`, 'played');
    console.log('[TEST] Actual game played value:', played);

    // Cleanup
    await redis.del(testKey, hashKey);

    return NextResponse.json({
      ok: true,
      tests: {
        stringSet: val1,
        stringIncrement: newVal,
        stringReadBack: val2,
        hashSet: hashVal1,
        hashIncrement: hashNewVal,
        hashReadBack: hashVal2,
        actualGamePlayed: played
      }
    });
  } catch (error) {
    console.error('[TEST] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
