import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';
import { broadcastToRoom } from '@/lib/ws-broadcast';

function generateRoomCode() {
  // Generate a 6-character alphanumeric code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar looking chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request) {
  try {
    const { action, roomCode, userId, username, newHostId, name, kickUserId } = await request.json();
    const redis = getRedis();

    if (action === 'create') {
      // Create a new room
      let code = generateRoomCode();
      let exists = await redis.get(`room:${code}`);

      // Ensure unique code
      while (exists) {
        code = generateRoomCode();
        exists = await redis.get(`room:${code}`);
      }

      const room = {
        code,
        name: `Room ${code}`,
        hostId: userId,
        createdAt: Date.now(),
        members: [{
          id: userId,
          username: username || 'Admin',
          joinedAt: Date.now()
        }]
      };

      await redis.set(`room:${code}`, JSON.stringify(room));
      await redis.sadd('rooms:list', code); // Add to list of all rooms
      // Room expires after 24 hours of inactivity
      await redis.expire(`room:${code}`, 86400);

      console.log('[ROOM] Created room:', code, 'host:', userId, 'username:', username);

      return NextResponse.json({
        ok: true,
        room: {
          code,
          isHost: true
        }
      });
    }

    if (action === 'join') {
      if (!roomCode) {
        return NextResponse.json({ error: 'Room code required' }, { status: 400 });
      }

      if (!username) {
        return NextResponse.json({ error: 'Username required' }, { status: 400 });
      }

      const roomData = await redis.get(`room:${roomCode.toUpperCase()}`);

      if (!roomData) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }

      const room = JSON.parse(roomData);

      // Check if username is already taken by another user
      const usernameExists = room.members.some(m => m.username === username && m.id !== userId);
      if (usernameExists) {
        return NextResponse.json({
          error: `The username "${username}" is already taken. Please choose a different name.`
        }, { status: 400 });
      }

      // Add user to room if not already a member, or update username if they are
      const memberIndex = room.members.findIndex(m => m.id === userId);
      if (memberIndex === -1) {
        room.members.push({
          id: userId,
          username: username,
          joinedAt: Date.now()
        });
      } else {
        // Update username if user is rejoining
        room.members[memberIndex].username = username;
      }
      await redis.set(`room:${roomCode.toUpperCase()}`, JSON.stringify(room));
      await redis.expire(`room:${roomCode.toUpperCase()}`, 86400);

      console.log('[ROOM] User joined room:', roomCode, 'userId:', userId, 'username:', username);

      // Broadcast members update
      await broadcastToRoom(roomCode.toUpperCase(), {
        type: 'members_updated',
        members: room.members
      });

      return NextResponse.json({
        ok: true,
        room: {
          code: room.code,
          isHost: room.hostId === userId
        }
      });
    }

    if (action === 'get') {
      if (!roomCode) {
        return NextResponse.json({ error: 'Room code required' }, { status: 400 });
      }

      const roomData = await redis.get(`room:${roomCode.toUpperCase()}`);

      if (!roomData) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }

      const room = JSON.parse(roomData);

      return NextResponse.json({
        ok: true,
        room: {
          code: room.code,
          name: room.name,
          isHost: room.hostId === userId,
          hostId: room.hostId,
          members: room.members,
          memberCount: room.members.length
        }
      });
    }

    if (action === 'claim_host') {
      if (!roomCode) {
        return NextResponse.json({ error: 'Room code required' }, { status: 400 });
      }

      const roomData = await redis.get(`room:${roomCode.toUpperCase()}`);

      if (!roomData) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }

      const room = JSON.parse(roomData);

      // Only allow claiming if there's no host or host is not in members
      const hostInRoom = room.members.some(m => m.id === room.hostId);

      if (room.hostId && hostInRoom) {
        return NextResponse.json({ error: 'Room already has a host' }, { status: 400 });
      }

      // Set this user as host
      room.hostId = userId;
      await redis.set(`room:${roomCode.toUpperCase()}`, JSON.stringify(room));
      await redis.expire(`room:${roomCode.toUpperCase()}`, 86400);

      console.log('[ROOM] User claimed host:', roomCode, 'userId:', userId);

      // Broadcast host change and member update to all clients
      await broadcastToRoom(roomCode.toUpperCase(), {
        type: 'host_transferred',
        newHostId: userId,
        oldHostId: null
      });

      await broadcastToRoom(roomCode.toUpperCase(), {
        type: 'members_updated',
        members: room.members
      });

      return NextResponse.json({
        ok: true,
        isHost: true
      });
    }

    if (action === 'transfer_host') {
      if (!roomCode || !newHostId) {
        return NextResponse.json({ error: 'Room code and new host ID required' }, { status: 400 });
      }

      const roomData = await redis.get(`room:${roomCode.toUpperCase()}`);

      if (!roomData) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }

      const room = JSON.parse(roomData);

      // Only current host can transfer
      if (room.hostId !== userId) {
        return NextResponse.json({ error: 'Only host can transfer' }, { status: 403 });
      }

      // Check if new host is a member
      const newHostInRoom = room.members.some(m => m.id === newHostId);
      if (!newHostInRoom) {
        return NextResponse.json({ error: 'New host must be a room member' }, { status: 400 });
      }

      room.hostId = newHostId;
      await redis.set(`room:${roomCode.toUpperCase()}`, JSON.stringify(room));
      await redis.expire(`room:${roomCode.toUpperCase()}`, 86400);

      console.log('[ROOM] Host transferred:', roomCode, 'from:', userId, 'to:', newHostId);

      // Broadcast host transfer to all clients
      await broadcastToRoom(roomCode.toUpperCase(), {
        type: 'host_transferred',
        newHostId: newHostId,
        oldHostId: userId
      });

      return NextResponse.json({
        ok: true
      });
    }

    if (action === 'kick_member') {
      if (!roomCode || !kickUserId) {
        return NextResponse.json({ error: 'Room code and user ID required' }, { status: 400 });
      }

      const roomData = await redis.get(`room:${roomCode.toUpperCase()}`);

      if (!roomData) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }

      const room = JSON.parse(roomData);

      // Only host can kick members
      if (room.hostId !== userId) {
        return NextResponse.json({ error: 'Only host can kick members' }, { status: 403 });
      }

      // Can't kick yourself
      if (kickUserId === userId) {
        return NextResponse.json({ error: 'Cannot kick yourself' }, { status: 400 });
      }

      // Remove member from room
      room.members = room.members.filter(m => m.id !== kickUserId);

      await redis.set(`room:${roomCode.toUpperCase()}`, JSON.stringify(room));
      await redis.expire(`room:${roomCode.toUpperCase()}`, 86400);

      console.log('[ROOM] User kicked:', kickUserId, 'from room:', roomCode, 'by:', userId);

      // Broadcast members update
      await broadcastToRoom(roomCode.toUpperCase(), {
        type: 'members_updated',
        members: room.members
      });

      // Broadcast kick event to the kicked user
      await broadcastToRoom(roomCode.toUpperCase(), {
        type: 'user_kicked',
        userId: kickUserId
      });

      return NextResponse.json({
        ok: true
      });
    }

    if (action === 'update_name') {
      if (!roomCode || !name) {
        return NextResponse.json({ error: 'Room code and name required' }, { status: 400 });
      }

      const roomData = await redis.get(`room:${roomCode.toUpperCase()}`);

      if (!roomData) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }

      const room = JSON.parse(roomData);
      room.name = name;
      await redis.set(`room:${roomCode.toUpperCase()}`, JSON.stringify(room));
      await redis.expire(`room:${roomCode.toUpperCase()}`, 86400);

      console.log('[ROOM] Room name updated:', roomCode, 'name:', name);

      return NextResponse.json({
        ok: true,
        room: {
          code: room.code,
          name: room.name
        }
      });
    }

    if (action === 'delete') {
      if (!roomCode) {
        return NextResponse.json({ error: 'Room code required' }, { status: 400 });
      }

      // Delete room and all associated data
      await redis.del(`room:${roomCode.toUpperCase()}`);
      await redis.srem('rooms:list', roomCode.toUpperCase());

      // Delete room-specific game data
      const prefix = `room:${roomCode.toUpperCase()}:`;
      const keys = await redis.keys(`${prefix}*`);
      if (keys && keys.length > 0) {
        await redis.del(...keys);
      }

      console.log('[ROOM] Room deleted:', roomCode);

      return NextResponse.json({
        ok: true
      });
    }

    if (action === 'list_all') {
      const roomCodes = await redis.smembers('rooms:list');
      const rooms = [];

      for (const code of roomCodes) {
        const roomData = await redis.get(`room:${code}`);
        if (roomData) {
          const room = JSON.parse(roomData);
          rooms.push({
            code: room.code,
            name: room.name,
            createdAt: room.createdAt,
            memberCount: room.members.length
          });
        }
      }

      // Sort by creation date (newest first)
      rooms.sort((a, b) => b.createdAt - a.createdAt);

      return NextResponse.json({
        ok: true,
        rooms
      });
    }

    if (action === 'leave') {
      if (!roomCode || !userId) {
        return NextResponse.json({ error: 'Room code and user ID required' }, { status: 400 });
      }

      const roomData = await redis.get(`room:${roomCode.toUpperCase()}`);

      if (!roomData) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }

      const room = JSON.parse(roomData);

      // Remove user from members
      const beforeCount = room.members.length;
      room.members = room.members.filter(m => m.id !== userId);
      const afterCount = room.members.length;

      if (beforeCount !== afterCount) {
        await redis.set(`room:${roomCode.toUpperCase()}`, JSON.stringify(room));
        await redis.expire(`room:${roomCode.toUpperCase()}`, 86400);

        // Broadcast updated members list
        await broadcastToRoom(roomCode.toUpperCase(), {
          type: 'members_updated',
          members: room.members
        });

        console.log('[ROOM] User left room:', roomCode, 'userId:', userId, `(${beforeCount} -> ${afterCount} members)`);
      }

      return NextResponse.json({
        ok: true
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[ROOM] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
