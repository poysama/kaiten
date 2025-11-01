'use client';

import { useState, useEffect } from 'react';
import styles from './admin.module.css';

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
            <button onClick={resetStats} className={styles.resetBtn}>
              Reset Statistics
            </button>
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
                          Edit
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
    </div>
  );
}
