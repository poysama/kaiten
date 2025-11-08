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

    // Get current session data for this room
    const sessionData = await redis.get(`game:session:${roomCode}`);

    if (!sessionData) {
      return NextResponse.json({
        session: null
      });
    }

    const session = JSON.parse(sessionData);

    return NextResponse.json({
      session
    });
  } catch (error) {
    console.error('[SESSION] Error fetching session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { action, sessionId, vote } = await request.json();
    const redis = getRedis();

    if (action === 'claim_host') {
      // Check if there's already a host
      const existingHost = await redis.get('game:session:host');
      if (existingHost) {
        return NextResponse.json({
          ok: false,
          error: 'Host already exists',
          isHost: false
        });
      }

      // Claim host
      const hostId = `host_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      await redis.set('game:session:host', hostId);

      return NextResponse.json({
        ok: true,
        hostId,
        isHost: true
      });
    }

    if (action === 'check_host') {
      const { hostId } = await request.json();
      const currentHost = await redis.get('game:session:host');

      return NextResponse.json({
        isHost: currentHost === hostId
      });
    }

    if (action === 'clear_session') {
      // Clear current active pick session
      await redis.del('game:session:current');
      return NextResponse.json({ ok: true });
    }

    if (action === 'vote') {
      // Add vote to current session
      if (!sessionId) {
        return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
      }

      const sessionData = await redis.get('game:session:current');
      if (!sessionData) {
        return NextResponse.json({ error: 'No active session' }, { status: 404 });
      }

      const session = JSON.parse(sessionData);
      if (session.id !== sessionId) {
        return NextResponse.json({ error: 'Session mismatch' }, { status: 400 });
      }

      // Record vote
      if (!session.votes) {
        session.votes = { confirm: 0, skip: 0 };
      }

      if (vote === 'confirm') {
        session.votes.confirm++;
      } else if (vote === 'skip') {
        session.votes.skip++;
      }

      await redis.set('game:session:current', JSON.stringify(session));

      return NextResponse.json({ ok: true, votes: session.votes });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[SESSION] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
