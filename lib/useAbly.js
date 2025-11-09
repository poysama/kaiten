import { useEffect, useRef, useState, useCallback } from 'react';
import Ably from 'ably';

export function useAbly(roomCode) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const ablyRef = useRef(null);
  const channelRef = useRef(null);
  const messageHandlersRef = useRef(new Map());

  const connect = useCallback(async () => {
    if (!roomCode || channelRef.current) {
      return;
    }

    try {
      const userId = localStorage.getItem('userId');
      const roomCodeUpper = roomCode.toUpperCase();

      console.log('[ABLY] Connecting to room:', roomCodeUpper, 'with userId:', userId);

      // Create Ably client with token auth
      const ably = new Ably.Realtime({
        authUrl: `/api/ably/auth?clientId=${userId}`,
        authMethod: 'GET'
      });

      // Get channel for this room
      const channel = ably.channels.get(`room:${roomCodeUpper}`);

      // Enter presence to track active users
      await channel.presence.enter({ userId, timestamp: Date.now() });

      // Listen for presence leave events to immediately sync
      channel.presence.subscribe('leave', async (member) => {
        console.log('[ABLY] User left presence:', member.clientId);
        // Immediately sync when someone leaves
        try {
          await fetch('/api/presence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomCode: roomCodeUpper })
          });
        } catch (error) {
          console.error('[ABLY] Error syncing on presence leave:', error);
        }
      });

      // Subscribe to all messages on this channel
      await channel.subscribe((message) => {
        try {
          const data = message.data;
          console.log('[ABLY] Received:', data);
          setLastMessage(data);

          // Call registered handlers for this message type
          if (data.type && messageHandlersRef.current.has(data.type)) {
            const handlers = messageHandlersRef.current.get(data.type);
            handlers.forEach(handler => handler(data));
          }
        } catch (error) {
          console.error('[ABLY] Error processing message:', error);
        }
      });

      // Handle connection state changes
      ably.connection.on('connected', async () => {
        console.log('[ABLY] Connected to room:', roomCodeUpper);
        setIsConnected(true);
        // Re-enter presence on reconnect
        await channel.presence.enter({ userId, timestamp: Date.now() });
      });

      ably.connection.on('disconnected', () => {
        console.log('[ABLY] Disconnected from room:', roomCodeUpper);
        setIsConnected(false);
      });

      ably.connection.on('failed', (error) => {
        console.error('[ABLY] Connection failed:', error);
        setIsConnected(false);
      });

      ablyRef.current = ably;
      channelRef.current = channel;

      setIsConnected(ably.connection.state === 'connected');
    } catch (error) {
      console.error('[ABLY] Connection error:', error);
      setIsConnected(false);
    }
  }, [roomCode]);

  const disconnect = useCallback(async () => {
    if (channelRef.current) {
      try {
        // Leave presence before disconnecting
        await channelRef.current.presence.leave();
      } catch (error) {
        console.error('[ABLY] Error leaving presence:', error);
      }
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    if (ablyRef.current) {
      ablyRef.current.close();
      ablyRef.current = null;
    }

    setIsConnected(false);
  }, []);

  const send = useCallback((data) => {
    // Note: Ably uses server-side publishing for security
    // Client shouldn't publish directly, this is kept for API compatibility
    // but won't be used - all publishing happens via API routes
    console.warn('[ABLY] Direct client publishing not used - messages sent via API');
    return false;
  }, []);

  const on = useCallback((type, handler) => {
    if (!messageHandlersRef.current.has(type)) {
      messageHandlersRef.current.set(type, new Set());
    }
    messageHandlersRef.current.get(type).add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = messageHandlersRef.current.get(type);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          messageHandlersRef.current.delete(type);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (roomCode) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [roomCode, connect, disconnect]);

  // Sync presence with Redis periodically
  useEffect(() => {
    if (!roomCode || !isConnected) return;

    const syncPresence = async () => {
      try {
        await fetch('/api/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomCode: roomCode.toUpperCase() })
        });
      } catch (error) {
        console.error('[ABLY] Error syncing presence:', error);
      }
    };

    // Sync immediately on connect
    syncPresence();

    // Sync every 10 seconds
    const interval = setInterval(syncPresence, 10000);

    // Sync on page visibility change (handles tab switching)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncPresence();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Sync on beforeunload (handles browser close)
    const handleBeforeUnload = () => {
      // Use fetch with keepalive for reliable delivery during page unload
      fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: roomCode.toUpperCase() }),
        keepalive: true
      }).catch(() => {
        // Ignore errors during unload
      });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [roomCode, isConnected]);

  return {
    isConnected,
    lastMessage,
    send,
    on,
    connect,
    disconnect
  };
}
