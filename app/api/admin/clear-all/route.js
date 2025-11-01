import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

/**
 * DANGEROUS: This endpoint completely clears ALL Redis data
 * Use this to start fresh when migrating or debugging
 */
export async function POST() {
  try {
    const redis = getRedis();

    // Get all keys
    const allKeys = await redis.keys('*');

    if (allKeys.length === 0) {
      return NextResponse.json({
        message: 'No keys to delete',
        keysDeleted: 0
      });
    }

    // Delete all keys
    await redis.del(...allKeys);

    return NextResponse.json({
      message: 'All Redis data cleared successfully',
      keysDeleted: allKeys.length,
      deletedKeys: allKeys
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
