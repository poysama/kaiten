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

    if (!roomCode) {
      return NextResponse.json({ error: 'Room code required' }, { status: 400 });
    }

    // Get history entries from room-specific key
    const prefix = `room:${roomCode}:`;
    const historyKeys = await redis.lrange(`${prefix}game:history`, 0, 9); // Get last 10

    if (!historyKeys || historyKeys.length === 0) {
      return NextResponse.json({ history: [] });
    }

    // Parse history entries
    const history = historyKeys.map(entry => JSON.parse(entry));

    return NextResponse.json({ history });
  } catch (error) {
    console.error('[HISTORY] Error fetching history:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
