const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');
const Redis = require('ioredis');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Store active connections by room code
const roomConnections = new Map();

// Store disconnect timeouts to handle page navigation
const disconnectTimeouts = new Map();

// Redis subscriber for pub/sub
const redisSubscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Create WebSocket server
  const wss = new WebSocketServer({ noServer: true });

  // Subscribe to all room channels
  const subscribedRooms = new Set();

  // Handle Redis pub/sub messages
  redisSubscriber.on('pmessage', (pattern, channel, message) => {
    try {
      const roomCode = channel.replace('room:', '');
      const event = JSON.parse(message);

      console.log(`[REDIS-PUBSUB] Received event for room ${roomCode}:`, event.type);

      // Broadcast to all clients in this room
      if (roomConnections.has(roomCode)) {
        const messageStr = JSON.stringify(event);
        roomConnections.get(roomCode).forEach((client) => {
          if (client.readyState === 1) { // 1 = OPEN
            client.send(messageStr);
          }
        });
      }
    } catch (error) {
      console.error('[REDIS-PUBSUB] Error processing message:', error);
    }
  });

  // Subscribe to room pattern
  redisSubscriber.psubscribe('room:*', (err, count) => {
    if (err) {
      console.error('[REDIS-PUBSUB] Error subscribing:', err);
    } else {
      console.log(`[REDIS-PUBSUB] Subscribed to room:* pattern (${count} subscriptions)`);
    }
  });

  wss.on('connection', (ws, request, roomCode, userId) => {
    console.log(`[WS] Client connected to room: ${roomCode}, userId: ${userId}`);

    // Cancel any pending disconnect timeout for this user
    const timeoutKey = `${roomCode}:${userId}`;
    if (disconnectTimeouts.has(timeoutKey)) {
      clearTimeout(disconnectTimeouts.get(timeoutKey));
      disconnectTimeouts.delete(timeoutKey);
      console.log(`[WS] Cancelled disconnect timeout for user ${userId} in room ${roomCode}`);
    }

    // Add connection to room
    if (!roomConnections.has(roomCode)) {
      roomConnections.set(roomCode, new Set());
    }
    roomConnections.get(roomCode).add(ws);

    // Store roomCode and userId on the WebSocket object
    ws.roomCode = roomCode;
    ws.userId = userId;

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log(`[WS] Received message from room ${roomCode}:`, data);

        // Broadcast to all clients in the same room (except sender)
        if (roomConnections.has(roomCode)) {
          roomConnections.get(roomCode).forEach((client) => {
            if (client !== ws && client.readyState === 1) { // 1 = OPEN
              client.send(JSON.stringify(data));
            }
          });
        }
      } catch (error) {
        console.error('[WS] Error processing message:', error);
      }
    });

    ws.on('close', async () => {
      console.log(`[WS] Client disconnected from room: ${roomCode}, userId: ${userId}`);

      // Remove from room connections
      if (roomConnections.has(roomCode)) {
        roomConnections.get(roomCode).delete(ws);
        if (roomConnections.get(roomCode).size === 0) {
          roomConnections.delete(roomCode);
        }
      }

      // Delay removing user from room members to handle page navigation
      // If user reconnects within 5 seconds, the timeout will be cancelled
      if (userId && roomCode) {
        const timeoutKey = `${roomCode}:${userId}`;

        // Clear any existing timeout for this user to avoid duplicate removals
        if (disconnectTimeouts.has(timeoutKey)) {
          clearTimeout(disconnectTimeouts.get(timeoutKey));
          console.log(`[WS] Cleared existing timeout for user ${userId} in room ${roomCode}`);
        }

        console.log(`[WS] Scheduling disconnect timeout for user ${userId} in room ${roomCode}`);

        const timeout = setTimeout(async () => {
          try {
            const Redis = require('ioredis');
            const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

            const roomCodeUpper = roomCode.toUpperCase();
            const roomData = await redis.get(`room:${roomCodeUpper}`);
            if (roomData) {
              const room = JSON.parse(roomData);

              // Remove this user from members
              const beforeCount = room.members.length;
              room.members = room.members.filter(m => m.id !== userId);
              const afterCount = room.members.length;

              if (beforeCount !== afterCount) {
                await redis.set(`room:${roomCodeUpper}`, JSON.stringify(room));
                await redis.expire(`room:${roomCodeUpper}`, 86400);

                // Broadcast updated members list
                await redis.publish(`room:${roomCodeUpper}`, JSON.stringify({
                  type: 'members_updated',
                  members: room.members
                }));

                console.log(`[WS] Removed user ${userId} from room ${roomCodeUpper} after timeout (${beforeCount} -> ${afterCount} members)`);
              } else {
                console.log(`[WS] User ${userId} not found in room ${roomCodeUpper} members`);
              }
            } else {
              console.log(`[WS] Room ${roomCodeUpper} not found in Redis`);
            }

            await redis.quit();

            // Remove the timeout from the map
            disconnectTimeouts.delete(timeoutKey);
          } catch (error) {
            console.error('[WS] Error removing user from room:', error);
          }
        }, 2000); // 2 second delay - enough for page navigation, quick for browser close

        disconnectTimeouts.set(timeoutKey, timeout);
      }
    });

    ws.on('error', (error) => {
      console.error(`[WS] Error in room ${roomCode}:`, error);
    });

    // Send connection confirmation
    ws.send(JSON.stringify({ type: 'connected', roomCode }));
  });

  // Handle upgrade requests
  server.on('upgrade', (request, socket, head) => {
    const { pathname, query } = parse(request.url, true);

    if (pathname === '/ws') {
      const roomCode = query.roomCode ? query.roomCode.toUpperCase() : null;
      const userId = query.userId;

      console.log('[WS] Upgrade request - roomCode:', roomCode, 'userId:', userId);

      if (!roomCode) {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, roomCode, userId);
      });
    } else {
      socket.destroy();
    }
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server ready on ws://${hostname}:${port}/ws`);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
