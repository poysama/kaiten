'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './room.module.css';

export default function RoomPage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Generate or retrieve user ID
    let uid = localStorage.getItem('userId');
    if (!uid) {
      uid = `user_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      localStorage.setItem('userId', uid);
    }
    setUserId(uid);

    // Load saved username
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
      setUsername(savedUsername);
    }

    // Check if already in a room
    const existingRoom = localStorage.getItem('roomCode');
    if (existingRoom && savedUsername) {
      // Verify room still exists
      verifyAndJoinRoom(existingRoom, uid, savedUsername);
    }
  }, []);

  async function verifyAndJoinRoom(code, uid, uname) {
    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', roomCode: code, userId: uid, username: uname })
      });

      const data = await res.json();

      if (data.ok) {
        localStorage.setItem('roomCode', code);
        localStorage.setItem('isHost', data.room.isHost.toString());
        localStorage.setItem('username', uname);
        router.push('/');
      } else {
        // Room doesn't exist anymore
        localStorage.removeItem('roomCode');
        localStorage.removeItem('isHost');
      }
    } catch (err) {
      console.error('Error verifying room:', err);
      localStorage.removeItem('roomCode');
      localStorage.removeItem('isHost');
    }
  }

  async function joinRoom() {
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          roomCode: roomCode.toUpperCase().trim(),
          userId,
          username: username.trim()
        })
      });

      const data = await res.json();

      if (data.ok) {
        localStorage.setItem('roomCode', data.room.code);
        localStorage.setItem('isHost', data.room.isHost.toString());
        localStorage.setItem('username', username.trim());
        router.push('/');
      } else {
        setError(data.error || 'Failed to join room');
      }
    } catch (err) {
      setError('Failed to join room. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <img src="/logo.svg" alt="Kaiten Logo" className={styles.logo} />
          <h1>Board Game Randomizer</h1>
          <p className={styles.subtitle}>Enter a room code to get started</p>
        </div>

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        <div className={styles.section}>
          <h2>Join Room</h2>
          <p className={styles.description}>
            Enter the room code and choose a username
          </p>
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={styles.input}
            maxLength={20}
            disabled={loading}
            style={{ marginBottom: '1rem' }}
          />
          <input
            type="text"
            placeholder="Enter room code (e.g., ABC123)"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            className={styles.input}
            maxLength={6}
            disabled={loading}
          />
          <button
            onClick={joinRoom}
            disabled={loading || !roomCode.trim() || !username.trim()}
            className={styles.joinButton}
          >
            {loading ? 'Joining...' : 'Join Room'}
          </button>
        </div>

        <div className={styles.adminNote}>
          <p>Need to create a new room? Visit the <a href="/room-creator">Room Creator</a></p>
        </div>
      </div>
    </div>
  );
}
