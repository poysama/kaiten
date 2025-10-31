import React, { useState, useEffect } from 'react'

export default function AdminPage() {
  const [games, setGames] = useState([])
  const [batchInput, setBatchInput] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchGames = async () => {
    const res = await fetch('/api/games')
    const data = await res.json()
    setGames(data)
  }

  useEffect(() => {
    fetchGames()
  }, [])

  const handleBatchAdd = async () => {
    const lines = batchInput.split('\n').map(l => l.trim()).filter(l => l)
    if (lines.length === 0) return alert('No valid game names found.')

    setLoading(true)
    await fetch('/api/games/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ games: lines })
    })
    setBatchInput('')
    await fetchGames()
    setLoading(false)
  }

  const handleResetStats = async () => {
    if (!confirm('Reset all stats to zero?')) return
    await fetch('/api/stats/reset', { method: 'POST' })
    alert('All stats reset!')
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-2">Admin Panel</h2>

      <div>
        <label className="block mb-2 font-semibold">Batch Add Games (one per line)</label>
        <textarea
          className="w-full h-40 border p-2 rounded"
          placeholder="Enter game names here, one per line..."
          value={batchInput}
          onChange={e => setBatchInput(e.target.value)}
        />
        <button
          onClick={handleBatchAdd}
          disabled={loading}
          className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          {loading ? 'Adding...' : 'Add Games'}
        </button>
      </div>

      <div>
        <button
          onClick={handleResetStats}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reset Stats
        </button>
      </div>

      <div>
        <h3 className="font-semibold mt-6 mb-2">Current Games ({games.length})</h3>
        <ul className="list-disc pl-6">
          {games.map((g, i) => (
            <li key={i}>{g}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
