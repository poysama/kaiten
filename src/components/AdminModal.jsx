
import React, {useState} from 'react'

export default function AdminModal({onAuth}) {
  const [show, setShow] = useState(false)
  const [user, setUser] = useState('admin')
  const [pass, setPass] = useState('admin')
  const [err, setErr] = useState(null)
  const [gamesText, setGamesText] = useState('')
  const [games, setGames] = useState([])

  // expose simple dialog API
  window.showAdmin = ()=> setShow(true)
  window.hideAdmin = ()=> setShow(false)

  async function login(){
    setErr(null)
    try {
      const res = await fetch('/api/admin/login',{method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({username:user, password:pass})})
      const j = await res.json()
      if (j.token){
        onAuth(j.token)
        setShow(false)
        fetchGames(j.token)
      } else {
        setErr(JSON.stringify(j))
      }
    } catch(e){ setErr(e.message) }
  }

  async function fetchGames(token){
    const res = await fetch('/api/admin/games', { headers: token ? { Authorization: 'Bearer '+token } : {} })
    const j = await res.json()
    setGames(j.games || [])
  }

  async function batchAdd(token){
    const names = gamesText.split('\n').map(s=>s.trim()).filter(Boolean)
    for (const n of names){
      await fetch('/api/admin/games', { method:'POST', headers:{'content-type':'application/json','authorization':'Bearer '+token}, body: JSON.stringify({ name: n }) })
    }
    setGamesText('')
    fetchGames(token)
  }

  async function resetStats(token){
    if (!confirm('Reset ALL stats to 0? This cannot be undone.')) return
    await fetch('/api/reset-stats', { method:'POST', headers:{ 'authorization':'Bearer '+token } })
    fetchGames(token)
    alert('Stats reset')
  }

  return show ? (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Admin</h3>
        <div style={{display:'flex', gap:12}}>
          <div style={{flex:1}}>
            <label>Username<input value={user} onChange={e=>setUser(e.target.value)} /></label><br/>
            <label>Password<input type="password" value={pass} onChange={e=>setPass(e.target.value)} /></label><br/>
            <button className="btn" onClick={login}>Login</button>
            {err && <div style={{color:'crimson', marginTop:8}}>{err}</div>}
          </div>
          <div style={{flex:1}}>
            <h4>Batch Add Games</h4>
            <textarea value={gamesText} onChange={e=>setGamesText(e.target.value)} placeholder="One game per line" style={{width:'100%',height:120}} />
            <button className="btn secondary" onClick={()=>batchAdd(window.localStorage.getItem('adminToken'))}>Add All</button>
            <h4 style={{marginTop:12}}>Games</h4>
            <div style={{maxHeight:200, overflowY:'auto'}}>
              {games.map(g=> <div key={g.id} style={{padding:6, borderBottom:'1px solid #eef2ff'}}>{g.name}</div>)}
            </div>
            <div style={{marginTop:8}}>
              <button className="btn secondary" onClick={()=>resetStats(window.localStorage.getItem('adminToken'))}>Reset Stats</button>
            </div>
          </div>
        </div>
        <div style={{textAlign:'right', marginTop:8}}>
          <button onClick={()=>setShow(false)} className="btn secondary">Close</button>
        </div>
      </div>
    </div>
  ) : null
}
