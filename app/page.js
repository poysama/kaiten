'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './spinner.module.css';
import GameHistory from './components/GameHistory';
import RoomMembers from './components/RoomMembers';
import { useWebSocket } from '@/lib/useWebSocket';

export default function SpinnerPage() {
  const router = useRouter();
  const [games, setGames] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(null);
  const [gameStats, setGameStats] = useState({});
  const [weightingEnabled, setWeightingEnabled] = useState(true);
  const [lengthFilter, setLengthFilter] = useState('all');
  const [isHost, setIsHost] = useState(false);
  const [roomCode, setRoomCode] = useState(null);
  const [userId, setUserId] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [votes, setVotes] = useState({ confirm: 0, skip: 0 });
  const [roomReady, setRoomReady] = useState(false);

  // WebSocket connection
  const { isConnected, send, on } = useWebSocket(roomCode);

  useEffect(() => {
    // Check if user is in a room
    const code = localStorage.getItem('roomCode');
    const host = localStorage.getItem('isHost') === 'true';
    const uid = localStorage.getItem('userId');

    if (!code || !uid) {
      // Redirect to room page
      router.push('/room');
      return;
    }

    setRoomCode(code);
    setIsHost(host);
    setUserId(uid);
    setRoomReady(true);

    loadGames();
    loadStats();

    // Load preferences from localStorage
    const savedWeighting = localStorage.getItem('weightingEnabled');
    if (savedWeighting !== null) {
      setWeightingEnabled(savedWeighting === 'true');
    }
    const savedLength = localStorage.getItem('lengthFilter');
    if (savedLength !== null) {
      setLengthFilter(savedLength);
    }
  }, []);

  // WebSocket event handlers
  useEffect(() => {
    if (!roomReady || !isConnected) return;

    // Handle spinning start event
    const unsubSpinning = on('session_spinning', (data) => {
      console.log('[WS] Received session_spinning:', data);
      if (!isHost) {
        setCurrentSession(data.session);
        setSpinning(true);
        setShowModal(false);

        // Flash through games randomly
        const flashDuration = 2500;
        const flashInterval = 100;
        const startTime = Date.now();

        const flashTimer = setInterval(() => {
          const randomIndex = Math.floor(Math.random() * games.length);
          setHighlightedIndex(randomIndex);

          if (Date.now() - startTime >= flashDuration) {
            clearInterval(flashTimer);
            setHighlightedIndex(null);
          }
        }, flashInterval);
      }
    });

    // Handle game selected event
    const unsubActive = on('session_active', (data) => {
      console.log('[WS] Received session_active:', data);
      if (!isHost) {
        const game = games.find(g => g.id === data.session.gameId);

        if (game) {
          setCurrentSession(data.session);
          setVotes(data.session.votes || { confirm: 0, skip: 0 });

          // Highlight the selected game
          const selectedIndex = games.findIndex(g => g.id === data.session.gameId);
          setHighlightedIndex(selectedIndex);

          // Wait for animation to complete (2.5s animation + 0.5s pause = 3s total)
          setTimeout(() => {
            setSelectedGame(game);
            setShowModal(true);
            setSpinning(false);
          }, 3000);
        }
      }
    });

    // Handle vote updates
    const unsubVotes = on('votes_updated', (data) => {
      console.log('[WS] Received votes_updated:', data);
      setVotes(data.votes);
    });

    // Handle session closed
    const unsubClosed = on('session_closed', (data) => {
      console.log('[WS] Received session_closed:', data);
      setShowModal(false);
      setSelectedGame(null);
      setCurrentSession(null);
      setVotes({ confirm: 0, skip: 0 });
      setSpinning(false);
      setHighlightedIndex(null);
    });

    // Handle room members update
    const unsubMembers = on('members_updated', (data) => {
      console.log('[WS] Received members_updated:', data);
      // RoomMembers component will handle this
    });

    // Handle host transfer
    const unsubHostTransfer = on('host_transferred', (data) => {
      console.log('[WS] Received host_transferred:', data);
      const isNewHost = data.newHostId === userId;

      // Update local state and storage
      setIsHost(isNewHost);
      localStorage.setItem('isHost', isNewHost.toString());
    });

    return () => {
      unsubSpinning();
      unsubActive();
      unsubVotes();
      unsubClosed();
      unsubMembers();
      unsubHostTransfer();
    };
  }, [roomReady, isConnected, games, isHost, userId, on]);

  function toggleWeighting() {
    const newValue = !weightingEnabled;
    setWeightingEnabled(newValue);
    localStorage.setItem('weightingEnabled', newValue.toString());
  }

  function handleLengthFilterChange(e) {
    const newValue = e.target.value;
    setLengthFilter(newValue);
    localStorage.setItem('lengthFilter', newValue);
  }

  async function loadGames() {
    const code = localStorage.getItem('roomCode');
    if (!code) return;

    const res = await fetch(`/api/games?roomCode=${code}`);
    const data = await res.json();
    setGames(data.games || []);
  }

  async function loadStats() {
    const code = localStorage.getItem('roomCode');
    if (!code) return;

    const res = await fetch(`/api/stats?roomCode=${code}`);
    const data = await res.json();
    // Convert array to object keyed by game id for easy lookup
    const statsMap = {};
    data.allGames.forEach(game => {
      statsMap[game.id] = {
        picks: game.picks,
        played: game.played,
        skipped: game.skipped,
        weight: game.weight
      };
    });
    setGameStats(statsMap);
  }


  function calculatePickProbability(gameWeight, allStats) {
    // Calculate total weight of all games
    const totalWeight = Object.values(allStats).reduce((sum, stat) => sum + (stat.weight || 1.0), 0);

    if (totalWeight === 0) return 0;

    // Probability is this game's weight divided by total weight
    const probability = (gameWeight / totalWeight) * 100;
    return probability;
  }

  async function spinWheel() {
    if (!isHost) {
      alert('Only the host can pick a game!');
      return;
    }
    if (spinning || games.length === 0) return;

    setSpinning(true);
    setShowModal(false);

    const res = await fetch('/api/pick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        useWeighting: weightingEnabled,
        lengthFilter: lengthFilter,
        roomCode: roomCode
      })
    });
    const data = await res.json();

    if (data.error) {
      alert(data.error);
      setSpinning(false);
      return;
    }

    // Flash through games randomly
    const flashDuration = 2500;
    const flashInterval = 100;
    const startTime = Date.now();

    const flashTimer = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * games.length);
      setHighlightedIndex(randomIndex);

      if (Date.now() - startTime >= flashDuration) {
        clearInterval(flashTimer);
        // Set to selected game
        const selectedIndex = games.findIndex(g => g.id === data.pick.id);
        setHighlightedIndex(selectedIndex);

        // Show modal after a brief pause
        setTimeout(() => {
          setSelectedGame(data.pick);
          setShowModal(true);
          setSpinning(false);
        }, 500);
      }
    }, flashInterval);
  }

  async function confirmGame() {
    // Everyone votes (including host)
    const isVote = true;

    const res = await fetch('/api/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedGame.id, isVote, roomCode })
    });

    const data = await res.json();

    if (data.sessionClosed) {
      // Close modal when session ends (majority reached)
      setShowModal(false);
      setSelectedGame(null);
    }
    // Otherwise, votes will update via WebSocket
  }

  async function skipGame() {
    // Everyone votes (including host)
    const isVote = true;

    const res = await fetch('/api/skip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedGame.id, isVote, roomCode })
    });

    const data = await res.json();

    if (data.sessionClosed) {
      // Close modal when session ends (majority reached)
      setShowModal(false);
      setSelectedGame(null);
    }
    // Otherwise, votes will update via WebSocket
  }

  function respin() {
    setShowModal(false);
    setSelectedGame(null);
    spinWheel();
  }

  async function leaveRoom() {
    if (confirm('Are you sure you want to leave this room?')) {
      try {
        // Call leave API to remove user from room members
        await fetch('/api/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'leave',
            roomCode: roomCode,
            userId: userId
          })
        });
      } catch (error) {
        console.error('[LEAVE] Error leaving room:', error);
      }

      localStorage.removeItem('roomCode');
      localStorage.removeItem('isHost');
      router.push('/room');
    }
  }

  if (!roomReady) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <div className={styles.navBrand}>
          <img src="/logo.svg" alt="Kaiten Logo" className={styles.logo} />
          <h1>Board Game Randomizer</h1>
        </div>
        <div className={styles.navCenter}>
          <div className={styles.roomInfo}>
            Room Code: <span className={styles.roomCode}>{roomCode}</span>
            {isHost && <span className={styles.hostBadge}>👑 Host</span>}
          </div>
        </div>
        <div className={styles.navLinks}>
          <a href="/stats">Statistics</a>
          <a href="/admin">Admin</a>
          <button onClick={leaveRoom} className={styles.leaveButton}>Leave Room</button>
        </div>
      </nav>

      <div className={styles.pageLayout}>
        <aside className={styles.sidebarLeft}>
          <GameHistory />
        </aside>

        <main className={styles.main}>
          <div className={styles.header}>
          <h2>Game Selection</h2>
          <div className={styles.controls}>
            <label className={styles.toggleContainer}>
              <input
                type="checkbox"
                checked={weightingEnabled}
                onChange={toggleWeighting}
                className={styles.toggleCheckbox}
              />
              <span className={styles.toggleLabel}>
                Weighted Selection {weightingEnabled ? 'ON' : 'OFF'}
              </span>
            </label>
            <div className={styles.filterContainer}>
              <label className={styles.filterLabel}>Game Length:</label>
              <select
                value={lengthFilter}
                onChange={handleLengthFilterChange}
                className={styles.filterSelect}
              >
                <option value="all">All</option>
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </select>
            </div>
          </div>
        </div>

        {games.length === 0 ? (
          <p>No games available. Add games in the Admin panel.</p>
        ) : (
          <div className={styles.gamePickerContainer}>
            <div className={styles.gameGrid}>
              {games
                .filter(game => {
                  // Filter by length - default to 'medium' for games without length property
                  const gameLength = game.length || 'medium';
                  return lengthFilter === 'all' || gameLength === lengthFilter;
                })
                .map((game, index) => {
                // Generate initials from game name
                const initials = game.name
                  .split(' ')
                  .map(word => word[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 4);

                // Get stats for this game
                const stats = gameStats[game.id] || { picks: 0, played: 0, skipped: 0, weight: 1.0 };
                const pickProbability = calculatePickProbability(stats.weight, gameStats);
                const tooltipText = `${game.name}\n\nWeight: ${stats.weight.toFixed(3)}\nPick Chance: ${pickProbability.toFixed(1)}%\n\nPicks: ${stats.picks}\nPlayed: ${stats.played}\nSkipped: ${stats.skipped}`;

                // Determine priority based on weight
                // Low weight (<0.3) = low priority = red border
                // High weight (>1.2) = high priority = default blue border
                const isLowPriority = stats.weight < 0.3;

                return (
                  <div
                    key={game.id}
                    className={`${styles.gameCard} ${
                      highlightedIndex === index ? styles.highlighted : ''
                    } ${isLowPriority ? styles.lowPriority : ''}`}
                    data-tooltip={tooltipText}
                  >
                    {initials}
                  </div>
                );
              })}
            </div>
            <div className={styles.buttonContainer}>
              <button
                className={styles.rollButton}
                onClick={spinWheel}
                disabled={spinning || !isHost}
              >
                {spinning ? 'Picking...' : isHost ? 'PICK GAME' : 'PICK GAME (Host Only)'}
              </button>
              {isHost && <span className={styles.hostBadge}>👑 You are the host</span>}
              {!isHost && <span className={styles.viewerBadge}>👥 Viewer</span>}
            </div>
          </div>
        )}
        </main>

        <aside className={styles.sidebarRight}>
          <RoomMembers />
        </aside>
      </div>

      {showModal && selectedGame && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>You got:</h2>
            <h1>{selectedGame.name}</h1>

            {votes && (
              <div className={styles.votingStatus}>
                <p>Vote to confirm or skip</p>
                <div className={styles.voteCount}>
                  ✓ Confirm: {votes.confirm} | ✗ Skip: {votes.skip}
                </div>
              </div>
            )}

            <div className={styles.modalButtons}>
              <button onClick={confirmGame} className={styles.confirmBtn}>
                Vote: Confirm
              </button>
              <button onClick={skipGame} className={styles.skipBtn}>
                Vote: Skip
              </button>
              {isHost && (
                <button onClick={respin} className={styles.respinBtn}>
                  Re-spin
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
