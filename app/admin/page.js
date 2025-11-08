'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './admin.module.css';
import { calculateGameWeight } from '@/lib/weightedSelection';

export default function RoomAdminPage() {
  const router = useRouter();
  const [games, setGames] = useState([]);
  const [bulkGames, setBulkGames] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
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
  const [roomCode, setRoomCode] = useState(null);
  const [roomName, setRoomName] = useState('');
  const [isHost, setIsHost] = useState(false);

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
    loadGames(code);
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

  async function loadGames(code) {
    const res = await fetch(`/api/games?roomCode=${code || roomCode}`);
    const data = await res.json();
    setGames(data.games || []);
  }

  async function deleteGame(id) {
    if (!confirm('Are you sure you want to delete this game?')) return;

    await fetch('/api/games', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, roomCode })
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
      body: JSON.stringify({ id: editingId, name: editingName.trim(), roomCode })
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

    const res = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names: gameNames, roomCode })
    });

    if (res.ok) {
      setBulkGames('');
      loadGames();
    }
  }

  async function openStatsModal(game) {
    // Fetch current stats
    const res = await fetch(`/api/stats?roomCode=${roomCode}`);
    const data = await res.json();
    const gameStats = data.allGames.find(g => g.id === game.id);

    if (gameStats) {
      setEditingStats({
        id: game.id,
        name: game.name,
        length: game.length || 'medium',
        weight: parseFloat(gameStats.weight || 1.0),
        picks: parseInt(gameStats.picks || 0),
        played: parseInt(gameStats.played || 0),
        skipped: parseInt(gameStats.skipped || 0)
      });
    } else {
      setEditingStats({
        id: game.id,
        name: game.name,
        length: game.length || 'medium',
        weight: 1.0,
        picks: 0,
        played: 0,
        skipped: 0
      });
    }

    setShowStatsModal(true);
  }

  async function saveStats() {
    const newWeight = calculateGameWeight({
      picks: editingStats.picks,
      played: editingStats.played,
      skipped: editingStats.skipped
    });

    await fetch('/api/games', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingStats.id,
        length: editingStats.length,
        stats: {
          picks: editingStats.picks,
          played: editingStats.played,
          skipped: editingStats.skipped,
          weight: newWeight
        },
        roomCode
      })
    });

    loadGames();
    closeStatsModal();
  }

  function closeStatsModal() {
    setShowStatsModal(false);
  }

  const filteredGames = games.filter(game =>
    game.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!roomCode) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.roomInfo}>
            <h1>Room Admin: {roomName}</h1>
            <span className={styles.roomCode}>Code: {roomCode}</span>
            {isHost && <span className={styles.hostBadge}>👑 Host</span>}
          </div>
          <div className={styles.navLinks}>
            <a href="/">← Back to Room</a>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h2>Add Games</h2>
          <form onSubmit={bulkAddGames}>
            <textarea
              className={styles.textarea}
              rows="10"
              placeholder="Enter game names (one per line)"
              value={bulkGames}
              onChange={(e) => setBulkGames(e.target.value)}
            />
            <button type="submit" className={styles.addButton}>
              Add Games
            </button>
          </form>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Manage Games ({games.length})</h2>
            <input
              type="text"
              placeholder="Search games..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {filteredGames.length === 0 ? (
            <p className={styles.emptyState}>No games found. Add some games to get started!</p>
          ) : (
            <div className={styles.gamesList}>
              {filteredGames.map((game) => (
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
                        <button
                          onClick={() => openStatsModal(game)}
                          className={styles.statsBtn}
                        >
                          Stats
                        </button>
                        <button
                          onClick={() => startEdit(game)}
                          className={styles.editBtn}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteGame(game.id)}
                          className={styles.deleteBtn}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showStatsModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Edit Stats: {editingStats.name}</h2>

            <div className={styles.formGroup}>
              <label>Game Length</label>
              <select
                value={editingStats.length}
                onChange={(e) => setEditingStats({ ...editingStats, length: e.target.value })}
                className={styles.select}
              >
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Picks</label>
              <input
                type="number"
                value={editingStats.picks}
                onChange={(e) => setEditingStats({ ...editingStats, picks: parseInt(e.target.value) || 0 })}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Played</label>
              <input
                type="number"
                value={editingStats.played}
                onChange={(e) => setEditingStats({ ...editingStats, played: parseInt(e.target.value) || 0 })}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Skipped</label>
              <input
                type="number"
                value={editingStats.skipped}
                onChange={(e) => setEditingStats({ ...editingStats, skipped: parseInt(e.target.value) || 0 })}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Calculated Weight</label>
              <input
                type="text"
                value={calculateGameWeight({
                  picks: editingStats.picks,
                  played: editingStats.played,
                  skipped: editingStats.skipped
                }).toFixed(3)}
                disabled
                className={styles.input}
              />
            </div>

            <div className={styles.modalActions}>
              <button onClick={saveStats} className={styles.saveButton}>
                Save Changes
              </button>
              <button onClick={closeStatsModal} className={styles.cancelButton}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
