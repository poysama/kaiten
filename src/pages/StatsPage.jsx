
import React, {useEffect, useState} from 'react'

export default function StatsPage(){
  const [data, setData] = useState(null)
  useEffect(()=> fetchStats(), [])
  async function fetchStats(){
    const res = await fetch('/api/stats')
    const j = await res.json()
    setData(j)
  }
  return (
    <div className="container">
      <div className="leaderboard-card">
        <h2>Statistics</h2>
        {!data && <div>Loading...</div>}
        {data && (
          <table className="table" style={{marginTop:12}}>
            <thead><tr><th>Game</th><th>Times Played</th><th>Times Skipped</th></tr></thead>
            <tbody>
              {data.mostPlayed.map(g=>(
                <tr key={g.id}><td>{g.name}</td><td>{g.played}</td><td>{g.skipped}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
