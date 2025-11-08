'use client';

import { useState, useEffect } from 'react';
import styles from './RoomMembers.module.css';

export default function RoomMembers() {
  const [roomInfo, setRoomInfo] = useState(null);
  const [userId, setUserId] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [canClaimHost, setCanClaimHost] = useState(false);

  useEffect(() => {
    const uid = localStorage.getItem('userId');
    const code = localStorage.getItem('roomCode');
    setUserId(uid);
    setRoomCode(code);

    if (uid && code) {
      loadRoomInfo();
      const interval = setInterval(loadRoomInfo, 2000);
      return () => clearInterval(interval);
    }
  }, []);

  async function loadRoomInfo() {
    try {
      const uid = localStorage.getItem('userId');
      const code = localStorage.getItem('roomCode');

      if (!uid || !code) return;

      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', roomCode: code, userId: uid })
      });

      const data = await res.json();

      if (data.ok) {
        setRoomInfo(data.room);

        // Check if user can claim host
        const hostInRoom = data.room.members.some(m => m.id === data.room.hostId);
        setCanClaimHost(!data.room.isHost && (!data.room.hostId || !hostInRoom));

        // Update local storage if host status changed
        localStorage.setItem('isHost', data.room.isHost.toString());
      }
    } catch (error) {
      console.error('Error loading room info:', error);
    }
  }

  async function claimHost() {
    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim_host', roomCode, userId })
      });

      const data = await res.json();

      if (data.ok) {
        alert('You are now the host!');
        localStorage.setItem('isHost', 'true');
        window.location.reload(); // Reload to update UI
      } else {
        alert(data.error || 'Failed to claim host');
      }
    } catch (error) {
      alert('Failed to claim host');
    }
  }

  async function transferHost(newHostId) {
    if (!confirm('Transfer host to this user?')) return;

    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'transfer_host', roomCode, userId, newHostId })
      });

      const data = await res.json();

      if (data.ok) {
        alert('Host transferred successfully!');
        localStorage.setItem('isHost', 'false');
        window.location.reload(); // Reload to update UI
      } else {
        alert(data.error || 'Failed to transfer host');
      }
    } catch (error) {
      alert('Failed to transfer host');
    }
  }

  function formatUsername(member) {
    // Display username, fallback to shortened user ID if username not available
    return member.username || (member.id.substring(0, 12) + '...');
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  }

  if (!roomInfo) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Room Members</h3>
        <span className={styles.count}>{roomInfo.memberCount}</span>
      </div>

      {canClaimHost && (
        <button onClick={claimHost} className={styles.claimHostBtn}>
          Claim Host
        </button>
      )}

      <ul className={styles.membersList}>
        {roomInfo.members.map((member) => (
          <li key={member.id} className={styles.memberItem}>
            <div className={styles.memberInfo}>
              <div className={styles.memberId}>
                {formatUsername(member)}
                {member.id === roomInfo.hostId && (
                  <span className={styles.hostBadge}>👑 Host</span>
                )}
                {member.id === userId && (
                  <span className={styles.youBadge}>(You)</span>
                )}
              </div>
              <div className={styles.memberTime}>
                Joined {formatTime(member.joinedAt)}
              </div>
            </div>
            {roomInfo.isHost && member.id !== userId && member.id !== roomInfo.hostId && (
              <button
                onClick={() => transferHost(member.id)}
                className={styles.transferBtn}
              >
                Make Host
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
