'use client';

import { useState, useEffect } from 'react';
import styles from './GameHistory.module.css';
import { useWebSocket } from '@/lib/useWebSocket';

export default function GameHistory() {
  const [history, setHistory] = useState([]);
  const [roomCode, setRoomCode] = useState('');

  // WebSocket connection
  const { isConnected, on } = useWebSocket(roomCode);

  useEffect(() => {
    const code = localStorage.getItem('roomCode');
    setRoomCode(code);
    loadHistory();
  }, []);

  // Listen for history updates via WebSocket
  useEffect(() => {
    if (!isConnected) return;

    const unsubHistory = on('history_updated', (data) => {
      console.log('[GameHistory] Received history update:', data);
      // Prepend new entry to history
      setHistory(prev => [data.entry, ...prev].slice(0, 50));
    });

    return () => {
      unsubHistory();
    };
  }, [isConnected, on]);

  async function loadHistory() {
    try {
      const roomCode = localStorage.getItem('roomCode');
      if (!roomCode) return;

      const res = await fetch(`/api/history?roomCode=${roomCode}`);
      const data = await res.json();
      setHistory(data.history || []);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  function getStatusIcon(status) {
    if (status === 'played') return '✓';
    if (status === 'skipped') return '✗';
    return '○';
  }

  function getStatusClass(status) {
    if (status === 'played') return styles.played;
    if (status === 'skipped') return styles.skipped;
    return styles.pending;
  }

  return (
    <div className={styles.historyContainer}>
      <h3 className={styles.title}>Recent Rolls</h3>
      {history.length === 0 ? (
        <p className={styles.empty}>No games rolled yet</p>
      ) : (
        <ul className={styles.historyList}>
          {history.map((entry, index) => (
            <li key={`${entry.id}-${entry.timestamp}`} className={styles.historyItem}>
              <div className={styles.itemNumber}>#{index + 1}</div>
              <div className={styles.itemContent}>
                <div className={styles.itemHeader}>
                  <span className={`${styles.statusIcon} ${getStatusClass(entry.status)}`}>
                    {getStatusIcon(entry.status)}
                  </span>
                  <span className={styles.time}>{formatTime(entry.timestamp)}</span>
                </div>
                <div className={styles.gameName}>{entry.name}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
