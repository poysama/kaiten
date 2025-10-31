import React, { useEffect, useState } from 'react'
import SpinnerPage from './pages/SpinnerPage'
import StatsPage from './pages/StatsPage'
import AdminPanel from './pages/AdminPanel'
import Footer from './components/Footer'

export default function App() {
  const [route, setRoute] = useState('spinner')

  useEffect(() => {
    const h = window.location.hash.replace('#', '')
    if (h === 'stats') setRoute('stats')
    else if (h === 'admin') setRoute('admin')
    else setRoute('spinner')
  }, [])

  return (
    <div className="app-root min-h-screen flex flex-col">
      <nav className="topbar flex justify-between items-center p-4 bg-gray-800 text-white shadow-md">
        <div className="brand text-xl font-bold">🎲 Board Game Spinner</div>
        <div className="navlinks flex gap-4">
          <button
            className={`px-3 py-1 rounded ${route === 'spinner' ? 'bg-gray-700' : 'bg-gray-600 hover:bg-gray-700'}`}
            onClick={() => setRoute('spinner')}
          >
            Spinner
          </button>
          <button
            className={`px-3 py-1 rounded ${route === 'stats' ? 'bg-gray-700' : 'bg-gray-600 hover:bg-gray-700'}`}
            onClick={() => setRoute('stats')}
          >
            Statistics
          </button>
          <button
            className={`px-3 py-1 rounded ${route === 'admin' ? 'bg-gray-700' : 'bg-gray-600 hover:bg-gray-700'}`}
            onClick={() => setRoute('admin')}
          >
            Admin
          </button>
        </div>
      </nav>

      <main className="flex-1 p-4">
        {route === 'spinner' && <SpinnerPage />}
        {route === 'stats' && <StatsPage />}
        {route === 'admin' && <AdminPanel />}
      </main>

      <Footer version="v10/31/2025" build="a0cdab6" />
    </div>
  )
}
