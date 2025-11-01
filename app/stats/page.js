'use client';

import { useState, useEffect } from 'react';
import styles from './stats.module.css';

export default function StatsPage() {
  const [stats, setStats] = useState({
    mostPlayed: [],
    mostSkipped: [],
    allGames: []
  });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const res = await fetch('/api/stats');
    const data = await res.json();
    setStats(data);
  }

  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <h1>Board Game Randomizer - Statistics</h1>
        <div className={styles.navLinks}>
          <a href="/">Randomizer</a>
          <a href="/stats">Statistics</a>
          <a href="/admin">Admin</a>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.overviewCard}>
          <h2>All Games Overview</h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Game</th>
                  <th>Picks</th>
                  <th>Played</th>
                  <th>Skipped</th>
                  <th>Play Rate</th>
                </tr>
              </thead>
              <tbody>
                {stats.allGames.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                      No games yet
                    </td>
                  </tr>
                ) : (
                  stats.allGames.map((game) => {
                    const playRate = game.picks > 0
                      ? ((game.played / game.picks) * 100).toFixed(1)
                      : '0.0';
                    return (
                      <tr key={game.id}>
                        <td>{game.name}</td>
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
