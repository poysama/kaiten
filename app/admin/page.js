'use client';

import { useState, useEffect } from 'react';
import styles from './admin.module.css';
import { calculateGameWeight } from '@/lib/weightedSelection';

export default function AdminPage() {
  const [games, setGames] = useState([]);
  const [bulkGames, setBulkGames] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [editingStats, setEditingStats] = useState({
    id: '',
    name: '',
    length: 'medium',
    weight: 1.0,
    picks: 0,
    played: 0,
    skipped: 0
  });

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const res = await fetch('/api/auth/check');
    const data = await res.json();
    setAuthenticated(data.authenticated);
    setLoading(false);

    if (data.authenticated) {
      loadGames();
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (res.ok) {
      setAuthenticated(true);
      setPassword('');
      loadGames();
    } else {
      setLoginError('Invalid credentials');
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAuthenticated(false);
    setGames([]);
  }

  useEffect(() => {
    if (authenticated) {
      loadGames();
    }
  }, [authenticated]);

  async function loadGames() {
    const res = await fetch('/api/games');
    const data = await res.json();
    setGames(data.games || []);
  }

  async function deleteGame(id) {
    if (!confirm('Are you sure you want to delete this game?')) return;

    await fetch('/api/games', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });

    loadGames();
  }

  async function startEdit(game) {
    setEditingId(game.id);
    setEditingName(game.name);
  }

  async function saveEdit() {
    if (!editingName.trim()) return;

    await fetch('/api/games', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingId, name: editingName.trim() })
    });

    setEditingId(null);
    setEditingName('');
    loadGames();
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName('');
  }

  async function bulkAddGames(e) {
    e.preventDefault();
    if (!bulkGames.trim()) return;

    const gameNames = bulkGames
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (gameNames.length === 0) return;

    // Add games sequentially
    for (const name of gameNames) {
      await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
    }

    setBulkGames('');
    loadGames();
  }

  async function resetStats() {
    if (!confirm('Are you sure you want to reset all statistics? This cannot be undone!')) return;

    try {
      const res = await fetch('/api/stats/reset', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        alert(`Success! ${data.message}\nDeleted ${data.deletedKeys} old keys, reset ${data.gamesReset} games.`);
      } else {
        alert(`Error: ${data.error}\n\nCheck console for details.`);
        console.error('Reset error:', data);
      }
    } catch (error) {
      alert(`Failed to reset statistics: ${error.message}`);
      console.error('Reset error:', error);
    }
  }

  async function checkMigration() {
    try {
      const res = await fetch('/api/migrate');
      const data = await res.json();

      if (!res.ok) {
        alert(`Error checking migration: ${data.error}`);
        return;
      }

      if (!data.needsMigration) {
        alert('✅ No migration needed!\n\nAll games have the required properties.');
        return;
      }

      const details = [];
      details.push(`Total games: ${data.report.totalGames}`);
      details.push(`Games needing length: ${data.report.gamesNeedingLength}`);
      details.push(`Games without stats: ${data.report.gamesWithoutStats}`);
      details.push(`Games with incorrect weight: ${data.report.gamesWithIncorrectWeight}`);

      const message = `Migration Status:\n\n${details.join('\n')}\n\nClick "Run Migration" to fix these issues.`;
      alert(message);

    } catch (error) {
      alert(`Failed to check migration: ${error.message}`);
      console.error('Migration check error:', error);
    }
  }

  async function runMigration() {
    if (!confirm('Run data migration?\n\nThis will:\n• Add length property to games\n• Fix missing stats\n• Recalculate weights\n\nThis is safe and non-destructive.')) {
      return;
    }

    try {
      const res = await fetch('/api/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'MIGRATE' })
      });
      const data = await res.json();

      if (res.ok) {
        const details = [];
        details.push(`Total games: ${data.report.totalGames}`);
        details.push(`Games updated: ${data.report.gamesUpdated}`);
        details.push(`Stats fixed: ${data.report.statsFixed}`);
        details.push(`Stats created: ${data.report.statsCreated}`);

        if (data.report.errors && data.report.errors.length > 0) {
          details.push(`\nErrors: ${data.report.errors.length}`);
        }

        alert(`✅ Migration completed!\n\n${details.join('\n')}`);
        loadGames(); // Reload games to show updated data
      } else {
        alert(`Error: ${data.error}\n\nCheck console for details.`);
        console.error('Migration error:', data);
      }
    } catch (error) {
      alert(`Failed to run migration: ${error.message}`);
      console.error('Migration error:', error);
    }
  }

  async function openStatsModal(game) {
    // Fetch current stats for this game
    const res = await fetch('/api/stats');
    const data = await res.json();
    const gameStats = data.allGames.find(g => g.id === game.id);

    setEditingStats({
      id: game.id,
      name: game.name,
      length: game.length || 'medium',
      weight: gameStats?.weight || 1.0,
      picks: gameStats?.picks || 0,
      played: gameStats?.played || 0,
      skipped: gameStats?.skipped || 0
    });
    setShowStatsModal(true);
  }

  function closeStatsModal() {
    setShowStatsModal(false);
  }

  async function saveStats() {
    // Update stats
    await fetch('/api/stats/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingStats.id,
        weight: parseFloat(editingStats.weight),
        picks: parseInt(editingStats.picks),
        played: parseInt(editingStats.played),
        skipped: parseInt(editingStats.skipped)
      })
    });

    // Update game length
    await fetch('/api/games', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingStats.id,
        length: editingStats.length
      })
    });

    setShowStatsModal(false);
    loadGames();
    alert('Stats updated successfully!');
  }

  function updateStatField(field, value) {
    setEditingStats(prev => {
      const updated = {
        ...prev,
        [field]: value
      };

      // Auto-calculate weight when picks, played, or skipped changes
      if (field === 'picks' || field === 'played' || field === 'skipped') {
        const weight = calculateGameWeight({
          picks: parseInt(field === 'picks' ? value : updated.picks) || 0,
          played: parseInt(field === 'played' ? value : updated.played) || 0,
          skipped: parseInt(field === 'skipped' ? value : updated.skipped) || 0
        });
        updated.weight = weight;
      }

      return updated;
    });
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <nav className={styles.nav}>
          <div className={styles.navBrand}>
            <img src="/logo.svg" alt="Kaiten Logo" className={styles.logo} />
            <h1>Board Game Randomizer - Admin</h1>
          </div>
          <div className={styles.navLinks}>
            <a href="/">Randomizer</a>
            <a href="/stats">Statistics</a>
            <a href="/admin">Admin</a>
          </div>
        </nav>
        <main className={styles.main}>
          <p>Loading...</p>
        </main>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className={styles.container}>
        <nav className={styles.nav}>
          <div className={styles.navBrand}>
            <img src="/logo.svg" alt="Kaiten Logo" className={styles.logo} />
            <h1>Board Game Randomizer - Admin</h1>
          </div>
          <div className={styles.navLinks}>
            <a href="/">Randomizer</a>
            <a href="/stats">Statistics</a>
            <a href="/admin">Admin</a>
          </div>
        </nav>
        <main className={styles.main}>
          <div className={styles.loginCard}>
            <h2>Admin Login</h2>
            <form onSubmit={handleLogin} className={styles.loginForm}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className={styles.input}
                required
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className={styles.input}
                required
              />
              {loginError && <p className={styles.error}>{loginError}</p>}
              <button type="submit" className={styles.addButton}>
                Login
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <div className={styles.navBrand}>
          <img src="/logo.svg" alt="Kaiten Logo" className={styles.logo} />
          <h1>Board Game Randomizer - Admin</h1>
        </div>
        <div className={styles.navLinks}>
          <a href="/">Randomizer</a>
          <a href="/stats">Statistics</a>
          <a href="/admin">Admin</a>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.card}>
          <h2>Add Games</h2>
          <form onSubmit={bulkAddGames} className={styles.bulkForm}>
            <textarea
              value={bulkGames}
              onChange={(e) => setBulkGames(e.target.value)}
              placeholder="Enter game names, one per line..."
              className={styles.textarea}
              rows={8}
            />
            <button type="submit" className={styles.addButton}>
              Add Games
            </button>
          </form>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Manage Games ({games.length})</h2>
            <div className={styles.headerButtons}>
              <button onClick={checkMigration} className={styles.migrateCheckBtn}>
                Check Migration
              </button>
              <button onClick={runMigration} className={styles.migrateBtn}>
                Run Migration
              </button>
              <button onClick={resetStats} className={styles.resetBtn}>
                Reset Statistics
              </button>
            </div>
          </div>
          <div className={styles.searchContainer}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games..."
              className={styles.searchInput}
            />
          </div>
          <div className={styles.gamesList}>
            {games.length === 0 ? (
              <p className={styles.emptyState}>No games yet. Add your first game above!</p>
            ) : (() => {
              const filteredGames = games.filter(game =>
                game.name.toLowerCase().includes(searchQuery.toLowerCase())
              );

              if (filteredGames.length === 0) {
                return <p className={styles.emptyState}>No games found matching "{searchQuery}"</p>;
              }

              return filteredGames.map((game) => (
                <div key={game.id} className={styles.gameItem}>
                  {editingId === game.id ? (
                    <>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className={styles.editInput}
                        autoFocus
                      />
                      <div className={styles.gameActions}>
                        <button onClick={saveEdit} className={styles.saveBtn}>
                          Save
                        </button>
                        <button onClick={cancelEdit} className={styles.cancelBtn}>
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className={styles.gameName}>{game.name}</span>
                      <div className={styles.gameActions}>
                        <button onClick={() => startEdit(game)} className={styles.editBtn}>
                          Edit Name
                        </button>
                        <button onClick={() => openStatsModal(game)} className={styles.statsBtn}>
                          Edit Stats
                        </button>
                        <button onClick={() => deleteGame(game.id)} className={styles.deleteBtn}>
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ));
            })()}
          </div>
        </div>
      </main>

      {showStatsModal && (
        <div className={styles.modalOverlay} onClick={closeStatsModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>Edit Stats - {editingStats.name}</h2>
            <div className={styles.statsForm}>
              <div className={styles.formGroup}>
                <label>Game Length</label>
                <select
                  value={editingStats.length}
                  onChange={(e) => updateStatField('length', e.target.value)}
                  className={styles.input}
                >
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Weight (Auto-calculated)</label>
                <input
                  type="text"
                  value={editingStats.weight.toFixed(3)}
                  readOnly
                  className={styles.inputReadonly}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Picks</label>
                <input
                  type="number"
                  value={editingStats.picks}
                  onChange={(e) => updateStatField('picks', e.target.value)}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Played</label>
                <input
                  type="number"
                  value={editingStats.played}
                  onChange={(e) => updateStatField('played', e.target.value)}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Skipped</label>
                <input
                  type="number"
                  value={editingStats.skipped}
                  onChange={(e) => updateStatField('skipped', e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button onClick={saveStats} className={styles.saveBtn}>
                Save Stats
              </button>
              <button onClick={closeStatsModal} className={styles.cancelBtn}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
