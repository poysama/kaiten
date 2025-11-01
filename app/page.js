'use client';

import { useState, useEffect } from 'react';
import styles from './spinner.module.css';

export default function SpinnerPage() {
  const [games, setGames] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(null);
  const [gameStats, setGameStats] = useState({});
  const [weightingEnabled, setWeightingEnabled] = useState(true);
  const [lengthFilter, setLengthFilter] = useState('all');

  useEffect(() => {
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
    const res = await fetch('/api/games');
    const data = await res.json();
    setGames(data.games || []);
  }

  async function loadStats() {
    const res = await fetch('/api/stats');
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
    if (spinning || games.length === 0) return;

    setSpinning(true);
    setShowModal(false);

    const res = await fetch('/api/pick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        useWeighting: weightingEnabled,
        lengthFilter: lengthFilter
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
    await fetch('/api/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedGame.id })
    });
    setShowModal(false);
    setSelectedGame(null);
  }

  async function skipGame() {
    await fetch('/api/skip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedGame.id })
    });
    setShowModal(false);
    setSelectedGame(null);
  }

  function respin() {
    setShowModal(false);
    setSelectedGame(null);
    spinWheel();
  }

  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <div className={styles.navBrand}>
          <img src="/logo.svg" alt="Kaiten Logo" className={styles.logo} />
          <h1>Board Game Randomizer</h1>
        </div>
        <div className={styles.navLinks}>
          <a href="/">Randomizer</a>
          <a href="/stats">Statistics</a>
          <a href="/admin">Admin</a>
        </div>
      </nav>

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
            <button
              className={styles.rollButton}
              onClick={spinWheel}
              disabled={spinning}
            >
              {spinning ? 'Picking...' : 'PICK GAME'}
            </button>
          </div>
        )}
      </main>

      {showModal && selectedGame && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>You got:</h2>
            <h1>{selectedGame.name}</h1>
            <div className={styles.modalButtons}>
              <button onClick={confirmGame} className={styles.confirmBtn}>
                Confirm - Let's Play!
              </button>
              <button onClick={skipGame} className={styles.skipBtn}>
                Skip
              </button>
              <button onClick={respin} className={styles.respinBtn}>
                Re-spin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
