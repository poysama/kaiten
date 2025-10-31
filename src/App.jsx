import React, {useEffect, useState, useRef} from 'react'
import Wheel from './components/Wheel'

export default function App(){
  const [games, setGames] = useState([])
  const [current, setCurrent] = useState(null)
  const [message, setMessage] = useState('')
  const [stats, setStats] = useState(null)
  const rerollLimit = 3
  const [rerollsLeft, setRerollsLeft] = useState(rerollLimit)

  useEffect(()=> { fetchGames() ; fetchStats() }, [])

  async function fetchGames(){
    const res = await fetch('/api/admin/games', {method:'GET'})
    const data = await res.json()
    setGames(data.games || [])
  }

  async function fetchStats(){
    const res = await fetch('/api/stats')
    const data = await res.json()
    setStats(data)
  }

  async function pick(){
    if (rerollsLeft === 0){
      setMessage('No rerolls left')
      return
    }
    const res = await fetch('/api/pick')
    const data = await res.json()
    if (data.error){ setMessage(data.error); return }
    setCurrent(data.pick)
    setMessage('Picked: ' + data.pick.name)
    setRerollsLeft((s)=> s-1)
  }

  async function confirm(){
    if (!current) return
    const res = await fetch('/api/confirm', {
      method:'POST',
      headers:{'content-type':'application/json'},
      body: JSON.stringify({id: current.id})
    })
    const j = await res.json()
    setMessage(j.ok ? 'Confirmed!' : 'Error')
    setCurrent(null)
    setRerollsLeft(rerollLimit)
    fetchStats()
  }

  async function skip(){
    if (!current) return
    await fetch('/api/skip', {
      method:'POST',
      headers:{'content-type':'application/json'},
      body: JSON.stringify({id: current.id})
    })
    setMessage('Skipped')
    setCurrent(null)
    fetchStats()
  }

  return (
    <div className="app">
      <header>
        <h1>Board Game Wheel Spinner</h1>
        <div className="links">
          <a href="/admin.html">Admin</a> | <a href="#leaderboard">Leaderboard</a>
        </div>
      </header>

      <main>
        <section className="wheel-section">
          <Wheel games={games} onPick={g=>setCurrent(g)} />
          <div className="controls">
            <button onClick={pick}>Spin (Rerolls left: {rerollsLeft})</button>
            <button onClick={confirm} disabled={!current}>Confirm</button>
            <button onClick={skip} disabled={!current}>Skip</button>
            <div className="message">{message}</div>
            {current && <div className="current">Current: {current.name}</div>}
          </div>
        </section>

        <section id="leaderboard" className="leaderboard">
          <h2>Leaderboard</h2>
          {stats ? (
            <div>
              <h3>Most Played</h3>
              <ol>
                {stats.mostPlayed.map(g=> <li key={g.id}>{g.name} — {g.played}</li>)}
              </ol>
              <h3>Never Played</h3>
              <ol>
                {stats.neverPlayed.map(g=> <li key={g.id}>{g.name}</li>)}
              </ol>
            </div>
          ) : <div>Loading stats...</div>}
        </section>
      </main>

      <footer>
        <small>Desktop-focused, board-game feel UI</small>
      </footer>
    </div>
  )
}