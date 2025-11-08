'use client';

import { useState, useEffect } from 'react';
import styles from './room-creator.module.css';

export default function RoomCreatorPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [rooms, setRooms] = useState([]);
  const [newRoomCode, setNewRoomCode] = useState('');
  const [roomCreating, setRoomCreating] = useState(false);
  const [editingRoomCode, setEditingRoomCode] = useState(null);
  const [editingRoomName, setEditingRoomName] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const res = await fetch('/api/room-auth');
    const data = await res.json();
    setAuthenticated(data.authenticated);
    setLoading(false);

    if (data.authenticated) {
      loadRooms();
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError('');

    const res = await fetch('/api/room-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', password })
    });

    const data = await res.json();

    if (data.ok) {
      setAuthenticated(true);
      setPassword('');
      loadRooms();
    } else {
      setLoginError(data.error || 'Login failed');
    }
  }

  async function handleLogout() {
    await fetch('/api/room-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' })
    });
    setAuthenticated(false);
    setRooms([]);
  }

  async function loadRooms() {
    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_all' })
      });
      const data = await res.json();
      if (data.ok) {
        setRooms(data.rooms || []);
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
    }
  }

  async function createRoom() {
    setRoomCreating(true);
    try {
      let userId = localStorage.getItem('userId');
      if (!userId) {
        userId = `creator_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        localStorage.setItem('userId', userId);
      }

      const username = 'Room Creator';

      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', userId, username })
      });

      const data = await res.json();

      if (data.ok) {
        setNewRoomCode(data.room.code);
        loadRooms();
        // Clear the new room code after 5 seconds
        setTimeout(() => setNewRoomCode(''), 5000);
      } else {
        alert(`Error creating room: ${data.error}`);
      }
    } catch (error) {
      alert(`Failed to create room: ${error.message}`);
    } finally {
      setRoomCreating(false);
    }
  }

  async function deleteRoom(roomCode) {
    if (!confirm(`Delete room ${roomCode}? This will delete all associated game data!`)) return;

    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', roomCode })
      });

      const data = await res.json();

      if (data.ok) {
        loadRooms();
      } else {
        alert(`Error deleting room: ${data.error}`);
      }
    } catch (error) {
      alert(`Failed to delete room: ${error.message}`);
    }
  }

  function startEditRoom(room) {
    setEditingRoomCode(room.code);
    setEditingRoomName(room.name);
  }

  async function saveRoomName() {
    if (!editingRoomName.trim()) return;

    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_name',
          roomCode: editingRoomCode,
          name: editingRoomName.trim()
        })
      });

      const data = await res.json();

      if (data.ok) {
        setEditingRoomCode(null);
        setEditingRoomName('');
        loadRooms();
      } else {
        alert(`Error updating room name: ${data.error}`);
      }
    } catch (error) {
      alert(`Failed to update room name: ${error.message}`);
    }
  }

  function cancelEditRoom() {
    setEditingRoomCode(null);
    setEditingRoomName('');
  }

  async function changePassword(e) {
    e.preventDefault();
    setPasswordChangeError('');

    if (newPassword !== confirmPassword) {
      setPasswordChangeError('New passwords do not match');
      return;
    }

    if (newPassword.length < 4) {
      setPasswordChangeError('Password must be at least 4 characters');
      return;
    }

    try {
      const res = await fetch('/api/room-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_password',
          password: currentPassword,
          newPassword
        })
      });

      const data = await res.json();

      if (data.ok) {
        alert('Password changed successfully!');
        setShowPasswordChange(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordChangeError(data.error || 'Failed to change password');
      }
    } catch (error) {
      setPasswordChangeError('Failed to change password');
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    alert(`Copied ${text} to clipboard!`);
  }

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!authenticated) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <div className={styles.header}>
            <img src="/logo.svg" alt="Kaiten Logo" className={styles.logo} />
            <h1>Room Creator Login</h1>
            <p className={styles.subtitle}>Enter password to manage rooms</p>
          </div>

          {loginError && (
            <div className={styles.error}>{loginError}</div>
          )}

          <form onSubmit={handleLogin} className={styles.loginForm}>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              autoFocus
            />
            <button type="submit" className={styles.loginButton}>
              Login
            </button>
          </form>

          <p className={styles.note}>
            First time? Enter any password to set it up.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.nav}>
        <div className={styles.navBrand}>
          <img src="/logo.svg" alt="Kaiten Logo" className={styles.logo} />
          <h1>Room Creator</h1>
        </div>
        <div className={styles.navLinks}>
          <button onClick={() => setShowPasswordChange(!showPasswordChange)} className={styles.settingsButton}>
            Change Password
          </button>
          <button onClick={handleLogout} className={styles.logoutButton}>
            Logout
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {showPasswordChange && (
          <div className={styles.passwordChangeSection}>
            <h2>Change Password</h2>
            {passwordChangeError && (
              <div className={styles.error}>{passwordChangeError}</div>
            )}
            <form onSubmit={changePassword} className={styles.passwordForm}>
              <input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={styles.input}
              />
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={styles.input}
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={styles.input}
              />
              <div className={styles.buttonGroup}>
                <button type="submit" className={styles.saveButton}>
                  Change Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordChange(false);
                    setPasswordChangeError('');
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className={styles.createSection}>
          <h2>Create New Room</h2>
          <button
            onClick={createRoom}
            disabled={roomCreating}
            className={styles.createButton}
          >
            {roomCreating ? 'Creating...' : 'Create Room'}
          </button>

          {newRoomCode && (
            <div className={styles.newRoomAlert}>
              <h3>Room Created!</h3>
              <div className={styles.roomCodeDisplay}>
                <span className={styles.roomCode}>{newRoomCode}</span>
                <button
                  onClick={() => copyToClipboard(newRoomCode)}
                  className={styles.copyButton}
                >
                  Copy Code
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={styles.roomsSection}>
          <h2>All Rooms ({rooms.length})</h2>

          {rooms.length === 0 ? (
            <p className={styles.emptyState}>No rooms created yet. Create one to get started!</p>
          ) : (
            <div className={styles.roomsList}>
              {rooms.map((room) => (
                <div key={room.code} className={styles.roomCard}>
                  <div className={styles.roomInfo}>
                    {editingRoomCode === room.code ? (
                      <input
                        type="text"
                        value={editingRoomName}
                        onChange={(e) => setEditingRoomName(e.target.value)}
                        className={styles.editInput}
                        autoFocus
                      />
                    ) : (
                      <h3>{room.name}</h3>
                    )}
                    <div className={styles.roomMeta}>
                      <span className={styles.roomCode}>
                        Code: <strong>{room.code}</strong>
                      </span>
                      <span>{room.memberCount} member{room.memberCount !== 1 ? 's' : ''}</span>
                      <span className={styles.roomDate}>
                        Created: {new Date(room.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className={styles.roomActions}>
                    {editingRoomCode === room.code ? (
                      <>
                        <button onClick={saveRoomName} className={styles.saveBtn}>
                          Save
                        </button>
                        <button onClick={cancelEditRoom} className={styles.cancelBtn}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => copyToClipboard(room.code)}
                          className={styles.copyBtn}
                        >
                          Copy Code
                        </button>
                        <button
                          onClick={() => startEditRoom(room)}
                          className={styles.editBtn}
                        >
                          Edit Name
                        </button>
                        <button
                          onClick={() => deleteRoom(room.code)}
                          className={styles.deleteBtn}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
