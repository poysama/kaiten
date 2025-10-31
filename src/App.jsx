
import React, {useEffect, useState} from 'react'
import SpinnerPage from './pages/SpinnerPage'
import StatsPage from './pages/StatsPage'
import Footer from './components/Footer'
import AdminModal from './components/AdminModal'

export default function App(){
  const [route, setRoute] = useState('spinner')
  const [adminToken, setAdminToken] = useState(null)

  useEffect(()=>{
    const h = window.location.hash.replace('#','')
    if (h==='stats') setRoute('stats')
    if (h==='admin') setRoute('spinner') // admin modal opens on spinner
  },[])

  return (
    <div className="app-root">
      <nav className="topbar">
        <div className="brand">Board Game Spinner</div>
        <div className="navlinks">
          <button className={route==='spinner'?'active':''} onClick={()=>setRoute('spinner')}>Spinner</button>
          <button className={route==='stats'?'active':''} onClick={()=>setRoute('stats')}>Statistics</button>
          <button onClick={()=>document.getElementById('adminBtn').click()}>Admin</button>
        </div>
      </nav>

      <main>
        {route==='spinner' && <SpinnerPage adminToken={adminToken} />}
        {route==='stats' && <StatsPage />}
      </main>

      <Footer version="v10/31/2025" build="a0cdab6" />

      <AdminModal id="adminModal" onAuth={(t)=>setAdminToken(t)} />
      <button id="adminBtn" style={{display:'none'}} onClick={()=>{
        const modal = document.getElementById('adminModal'); if(modal) modal.showModal();
      }}>open</button>
    </div>
  )
}
