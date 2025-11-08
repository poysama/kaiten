'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './stats.module.css';

export default function StatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    mostPlayed: [],
    mostSkipped: [],
    allGames: []
  });
  const [roomCode, setRoomCode] = useState(null);
  const [roomName, setRoomName] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is in a room
    const code = localStorage.getItem('roomCode');
    const host = localStorage.getItem('isHost') === 'true';

    if (!code) {
      // Redirect to room page if not in a room
      router.push('/room');
      return;
    }

    setRoomCode(code);
    setIsHost(host);
    loadRoomInfo(code);
    loadStats(code);
  }, []);

  async function loadRoomInfo(code) {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', roomCode: code, userId })
      });
      const data = await res.json();
      if (data.ok) {
        setRoomName(data.room.name);
      }
    } catch (error) {
      console.error('Error loading room info:', error);
    }
  }

  async function loadStats(code) {
    try {
      const res = await fetch(`/api/stats?roomCode=${code || roomCode}`);
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!roomCode) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.roomInfo}>
            <h1>Statistics: {roomName}</h1>
            <span className={styles.roomCode}>Code: {roomCode}</span>
            {isHost && <span className={styles.hostBadge}>👑 Host</span>}
          </div>
          <div className={styles.navLinks}>
            <a href="/">← Back to Room</a>
          </div>
        </div>
      </div>

      <main className={styles.main}>
        <div className={styles.overviewCard}>
          <h2>All Games Overview</h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Game</th>
                  <th>Weight</th>
                  <th>Picks</th>
                  <th>Played</th>
                  <th>Skipped</th>
                  <th>Play Rate</th>
                </tr>
              </thead>
              <tbody>
                {stats.allGames.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                      No games yet
                    </td>
                  </tr>
                ) : (
                  stats.allGames.map((game) => {
                    const playRate = game.picks > 0
                      ? ((game.played / game.picks) * 100).toFixed(1)
                      : '0.0';
                    const weight = game.weight || 1.0;
                    // Red highlight for low priority games (weight < 0.3)
                    const weightClass = weight < 0.3 ? styles.lowPriority : '';
                    return (
                      <tr key={game.id}>
                        <td>{game.name}</td>
                        <td className={weightClass}>{weight.toFixed(3)}</td>
                        <td>{game.picks}</td>
                        <td>{game.played}</td>
                        <td>{game.skipped}</td>
                        <td>{playRate}%</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.card}>
            <h2>Most Played Games</h2>
            <div className={styles.statsList}>
              {stats.mostPlayed.length === 0 ? (
                <p className={styles.emptyState}>No games played yet</p>
              ) : (
                stats.mostPlayed.slice(0, 10).map((game, index) => (
                  <div key={game.id} className={styles.statItem}>
                    <span className={styles.rank}>#{index + 1}</span>
                    <span className={styles.gameName}>{game.name}</span>
                    <span className={styles.statValue}>{game.played} plays</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={styles.card}>
            <h2>Most Skipped Games</h2>
            <div className={styles.statsList}>
              {stats.mostSkipped.length === 0 ? (
                <p className={styles.emptyState}>No games skipped yet</p>
              ) : (
                stats.mostSkipped.slice(0, 10).map((game, index) => (
                  <div key={game.id} className={styles.statItem}>
                    <span className={styles.rank}>#{index + 1}</span>
                    <span className={styles.gameName}>{game.name}</span>
                    <span className={styles.statValue}>{game.skipped} skips</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
