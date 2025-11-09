// Helper to broadcast messages to room via Ably
import Ably from 'ably';

let ablyClient = null;

function getAblyClient() {
  if (!ablyClient) {
    ablyClient = new Ably.Rest(process.env.ABLY_API_KEY);
  }
  return ablyClient;
}

export async function broadcastToRoom(roomCode, event) {
  try {
    const ably = getAblyClient();
    const channel = ably.channels.get(`room:${roomCode.toUpperCase()}`);

    await channel.publish('message', event);

    console.log('[ABLY-BROADCAST] Published event to room', roomCode, ':', event.type);
  } catch (error) {
    console.error('[ABLY-BROADCAST] Error:', error);
  }
}
