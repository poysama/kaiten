import React, { useState } from 'react';

export default function AdminModal({ id, onAuth }) {
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    const expected = import.meta.env.VITE_ADMIN_JWT_SECRET;

    if (!expected) {
      setError('ADMIN_JWT_SECRET is not set in your .env file');
      return;
    }

    if (secret.trim() === expected.trim()) {
      onAuth(secret);
      setError('');
      document.getElementById(id)?.close();
    } else {
      setError('Invalid admin key');
    }
  };

  const handleClose = () => {
    setSecret('');
    setError('');
    document.getElementById(id)?.close();
  };

  return (
    <dialog id={id} className="rounded-2xl p-6 bg-white shadow-lg text-gray-900">
      <h2 className="text-xl font-semibold mb-4">Admin Access</h2>
      <p className="text-sm mb-4 text-gray-500">
        Enter your admin key to unlock special settings.
      </p>

      <input
        type="password"
        placeholder="Enter admin key"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        className="border border-gray-300 rounded-md p-2 w-full mb-2"
      />

      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={handleClose}
          className="px-3 py-1.5 rounded-md bg-gray-200 hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={handleLogin}
          className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          Login
        </button>
      </div>
    </dialog>
  );
}
