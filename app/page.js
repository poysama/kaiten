'use client';

import { useState, useEffect } from 'react';
import styles from './spinner.module.css';

export default function SpinnerPage() {
  const [games, setGames] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(null);

  useEffect(() => {
    loadGames();
  }, []);

  async function loadGames() {
    const res = await fetch('/api/games');
    const data = await res.json();
    setGames(data.games || []);
  }

  async function spinWheel() {
    if (spinning || games.length === 0) return;

    setSpinning(true);
    setShowModal(false);

    const res = await fetch('/api/pick', { method: 'POST' });
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
        <h1>Board Game Randomizer</h1>
        <div className={styles.navLinks}>
          <a href="/">Randomizer</a>
          <a href="/stats">Statistics</a>
          <a href="/admin">Admin</a>
        </div>
      </nav>

      <main className={styles.main}>
        <h2>Pick a Game!</h2>

        {games.length === 0 ? (
          <p>No games available. Add games in the Admin panel.</p>
        ) : (
          <div className={styles.gamePickerContainer}>
            <div className={styles.gameGrid}>
              {games.map((game, index) => {
                // Generate initials from game name
                const initials = game.name
                  .split(' ')
                  .map(word => word[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 4);

                return (
                  <div
                    key={game.id}
                    className={`${styles.gameCard} ${
                      highlightedIndex === index ? styles.highlighted : ''
                    }`}
                    title={game.name}
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
