import React, { useEffect, useState } from 'react'
import SpinnerPage from './pages/SpinnerPage'
import StatsPage from './pages/StatsPage'
import Footer from './components/Footer'

export default function App() {
  const [route, setRoute] = useState('spinner')

  useEffect(() => {
    const h = window.location.hash.replace('#', '')
    if (h === 'stats') setRoute('stats')
    else setRoute('spinner')
  }, [])

  return (
    <div className="app-root">
      <nav className="topbar">
        <div className="brand">🎲 Board Game Spinner</div>
        <div className="navlinks">
          <button
            className={route === 'spinner' ? 'active' : ''}
            onClick={() => setRoute('spinner')}
          >
            Spinner
          </button>
          <button
            className={route === 'stats' ? 'active' : ''}
            onClick={() => setRoute('stats')}
          >
            Statistics
          </button>
        </div>
      </nav>

      <main>
        {route === 'spinner' && <SpinnerPage />}
        {route === 'stats' && <StatsPage />}
      </main>

      <Footer version="v10/31/2025" build="a0cdab6" />
    </div>
  )
}
