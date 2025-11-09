// Helper to broadcast WebSocket messages from API routes
// This uses a simple HTTP request to notify the WebSocket server

export async function broadcastToRoom(roomCode, event) {
  try {
    // In production, we would use Redis pub/sub or a shared event bus
    // For now, we store events in Redis with a short TTL and the WS server polls
    const { getRedis } = require('./redis');
    const redis = getRedis();

    const eventKey = `ws:events:${roomCode}:${Date.now()}`;
    await redis.set(eventKey, JSON.stringify(event));
    await redis.expire(eventKey, 5); // Event expires in 5 seconds

    // Also publish to Redis pub/sub for instant delivery
    await redis.publish(`room:${roomCode}`, JSON.stringify(event));

    console.log('[WS-BROADCAST] Published event to room', roomCode, ':', event.type);
  } catch (error) {
    console.error('[WS-BROADCAST] Error:', error);
  }
}
