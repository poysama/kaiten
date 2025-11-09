import { useEffect, useRef, useState, useCallback } from 'react';

export function useWebSocket(roomCode) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const messageHandlersRef = useRef(new Map());

  const connect = useCallback(() => {
    if (!roomCode || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const userId = localStorage.getItem('userId');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const roomCodeUpper = roomCode.toUpperCase();
    const wsUrl = `${protocol}//${window.location.host}/ws?roomCode=${roomCodeUpper}&userId=${userId}`;

    console.log('[WS] Connecting to:', wsUrl, 'with userId:', userId);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[WS] Connected to room:', roomCode);
      setIsConnected(true);

      // Clear any pending reconnect attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[WS] Received:', data);
        setLastMessage(data);

        // Call registered handlers for this message type
        if (data.type && messageHandlersRef.current.has(data.type)) {
          const handlers = messageHandlersRef.current.get(data.type);
          handlers.forEach(handler => handler(data));
        }
      } catch (error) {
        console.error('[WS] Error parsing message:', error);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected from room:', roomCode);
      setIsConnected(false);

      // Attempt to reconnect after 2 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('[WS] Attempting to reconnect...');
        connect();
      }, 2000);
    };

    ws.onerror = (error) => {
      console.error('[WS] Error:', error);
      setIsConnected(false);
    };

    wsRef.current = ws;
  }, [roomCode]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      console.log('[WS] Sent:', data);
      return true;
    } else {
      console.warn('[WS] Cannot send, not connected');
      return false;
    }
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

  return {
    isConnected,
    lastMessage,
    send,
    on,
    connect,
    disconnect
  };
}
