import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';
import Ably from 'ably';
import { broadcastToRoom } from '@/lib/ws-broadcast';

export const dynamic = 'force-dynamic';

/**
 * Sync Ably presence with Redis room members
 * This endpoint is called periodically to keep room members in sync
 */
export async function POST(request) {
  try {
    const { roomCode } = await request.json();

    if (!roomCode) {
      return NextResponse.json({ error: 'Room code required' }, { status: 400 });
    }

    const redis = getRedis();
    const ably = new Ably.Rest(process.env.ABLY_API_KEY);
    const roomCodeUpper = roomCode.toUpperCase();

    // Get presence members from Ably
    const channel = ably.channels.get(`room:${roomCodeUpper}`);
    const presenceSet = await channel.presence.get();

    // Get active user IDs from presence
    const activeUserIds = Array.from(presenceSet).map(member => member.clientId);

    console.log('[PRESENCE] Active users in Ably:', activeUserIds);

    // Get room from Redis
    const roomData = await redis.get(`room:${roomCodeUpper}`);
    if (!roomData) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const room = JSON.parse(roomData);
    const beforeCount = room.members.length;

    // Only remove members who have been absent from presence for some time
    // Keep recently joined members (joined within last 60 seconds) even if not yet in presence
    const now = Date.now();
    room.members = room.members.filter(member => {
      // Keep if user is in Ably presence
      if (activeUserIds.includes(member.id)) {
        return true;
      }

      // Keep if user just joined (within last 60 seconds)
      const joinedRecently = member.joinedAt && (now - member.joinedAt) < 60000;
      if (joinedRecently) {
        console.log('[PRESENCE] Keeping recently joined user:', member.id);
        return true;
      }

      // Always keep the host (even if temporarily disconnected)
      if (member.id === room.hostId) {
        console.log('[PRESENCE] Keeping host:', member.id);
        return true;
      }

      // Remove if user is not in presence and didn't just join
      console.log('[PRESENCE] Removing inactive user:', member.id);
      return false;
    });

    const afterCount = room.members.length;

    // If members changed, update Redis and broadcast
    if (beforeCount !== afterCount) {
      await redis.set(`room:${roomCodeUpper}`, JSON.stringify(room));
      await redis.expire(`room:${roomCodeUpper}`, 86400);

      console.log('[PRESENCE] Updated room members:', `${beforeCount} -> ${afterCount}`);

      // Broadcast updated members list
      await broadcastToRoom(roomCodeUpper, {
        type: 'members_updated',
        members: room.members
      });
    }

    return NextResponse.json({
      ok: true,
      activeUsers: activeUserIds.length,
      members: room.members.length
    });
  } catch (error) {
    console.error('[PRESENCE] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
