import React, { useState, useEffect } from 'react'
import SpinnerPage from './pages/SpinnerPage'
import StatsPage from './pages/StatsPage'
import AdminPage from './pages/AdminPage'
import Footer from './components/Footer'

export default function App() {
  const [route, setRoute] = useState('spinner')

  useEffect(() => {
    const h = window.location.hash.replace('#', '')
    if (h === 'stats') setRoute('stats')
    if (h === 'admin') setRoute('admin')
  }, [])

  return (
    <div className="app-root min-h-screen flex flex-col">
      <nav className="topbar flex justify-between items-center p-4 bg-gray-800 text-white">
        <div className="brand font-bold text-lg">Board Game Spinner</div>
        <div className="navlinks space-x-4">
          <button className={route === 'spinner' ? 'font-bold' : ''} onClick={() => setRoute('spinner')}>Spinner</button>
          <button className={route === 'stats' ? 'font-bold' : ''} onClick={() => setRoute('stats')}>Statistics</button>
          <button className={route === 'admin' ? 'font-bold' : ''} onClick={() => setRoute('admin')}>Admin</button>
        </div>
      </nav>

      <main className="flex-1 p-4">
        {route === 'spinner' && <SpinnerPage />}
        {route === 'stats' && <StatsPage />}
        {route === 'admin' && <AdminPage />}
      </main>

      <Footer version="v10/31/2025" build="a0cdab6" />
    </div>
  )
}
