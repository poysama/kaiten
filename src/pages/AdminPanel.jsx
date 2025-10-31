import React, { useState } from 'react'

export default function AdminPanel() {
  const [gamesText, setGamesText] = useState('')
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleAddGames = async () => {
    const games = gamesText
      .split('\n')
      .map(g => g.trim())
      .filter(g => g.length > 0)

    if (games.length === 0) {
      setStatus('⚠️ Please enter at least one game name.')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ games }),
      })
      if (res.ok) {
        setStatus(`✅ Added ${games.length} game${games.length > 1 ? 's' : ''}!`)
        setGamesText('')
      } else {
        setStatus('❌ Failed to add games.')
      }
    } catch (err) {
      console.error(err)
      setStatus('❌ Server error.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetStats = async () => {
    if (!confirm('Are you sure you want to reset all stats?')) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/reset', { method: 'POST' })
      if (res.ok) setStatus('✅ Stats reset successfully!')
      else setStatus('❌ Failed to reset stats.')
    } catch (err) {
      console.error(err)
      setStatus('❌ Server error.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="admin-panel max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Admin Panel</h2>

      <div className="mb-4">
        <label className="block mb-2 font-semibold">
          Add Games (one per line)
        </label>
        <textarea
          className="w-full p-3 border rounded-md h-48"
          value={gamesText}
          onChange={e => setGamesText(e.target.value)}
          placeholder="Example:\nCatan\nWingspan\nTerraforming Mars"
        ></textarea>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleAddGames}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
        >
          {isLoading ? 'Adding...' : 'Add Games'}
        </button>
        <button
          onClick={handleResetStats}
          disabled={isLoading}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
        >
          Reset Stats
        </button>
      </div>

      {status && <p className="mt-4 text-lg">{status}</p>}
    </div>
  )
}
