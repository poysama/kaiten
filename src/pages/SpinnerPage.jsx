
import React, {useEffect, useRef, useState} from 'react'

export default function SpinnerPage({adminToken}){
  const [games, setGames] = useState([])
  const [rerollsLeft, setRerollsLeft] = useState(1)
  const canvasRef = useRef()
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [showResultModal, setShowResultModal] = useState(false)

  useEffect(()=>{ fetchGames(); fetchStats() }, [])

  async function fetchGames(){
    const res = await fetch('/api/admin/games')
    const j = await res.json()
    setGames(j.games || [])
  }
  async function fetchStats(){
    const res = await fetch('/api/stats')
    const j = await res.json()
    // optional: compute rerolls based on user/session if needed
  }

  // draw wheel
  useEffect(()=> drawWheel(), [games])

  function drawWheel(){
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const size = 480
    canvas.width = size
    canvas.height = size
    const cx = size/2, cy = size/2, r = size*0.38
    ctx.clearRect(0,0,size,size)
    if (games.length===0){
      ctx.fillStyle="#f3f4f6"; ctx.beginPath(); ctx.arc(cx,cy,r,0,2*Math.PI); ctx.fill(); return
    }
    const slice = 2*Math.PI / games.length
    for (let i=0;i<games.length;i++){
      const start = -Math.PI/2 + i*slice
      const end = start + slice
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,start,end); ctx.closePath()
      ctx.fillStyle = i%2===0 ? '#2a7be6' : '#5aa3ff'
      ctx.fill()
      // text upright
      ctx.save()
      ctx.translate(cx,cy)
      const angle = start + slice/2
      ctx.rotate(angle)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 14px sans-serif'
      ctx.fillText(games[i].name.substring(0,22), r-12, 6)
      ctx.restore()
    }
    // center circle
    ctx.beginPath(); ctx.arc(cx,cy,44,0,2*Math.PI); ctx.fillStyle='#ff8c1a'; ctx.fill()
  }

  async function spin(){
    if (spinning) return
    if (rerollsLeft<=0){ alert('No rerolls left'); return }
    setSpinning(true)
    // ask backend for pick
    const res = await fetch('/api/pick')
    const j = await res.json()
    if (j.error){ alert(j.error); setSpinning(false); return }
    const index = j.index
    // animate: rotate element to target
    const canvas = canvasRef.current
    const total = Math.max(1, games.length)
    const degreesPer = 360/total
    const extra = 1080 + Math.floor(Math.random()*720)
    const targetDeg = extra + (index * degreesPer) + degreesPer/2
    canvas.style.transition = 'transform 4.2s cubic-bezier(.17,.67,.22,1)'
    canvas.style.transform = `rotate(${targetDeg}deg)`
    setTimeout(()=>{
      // finalize
      canvas.style.transition = 'none'
      canvas.style.transform = `rotate(${(index * degreesPer) + degreesPer/2}deg)`
      setSpinning(false)
      setRerollsLeft(r=>r-1)
      setResult(j.pick)
      setShowResultModal(true)
    }, 4300)
  }

  async function confirm(){
    await fetch('/api/confirm',{method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({id: result.id})})
    setShowResultModal(false)
    setResult(null)
  }
  async function skip(){
    await fetch('/api/skip',{method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({id: result.id})})
    setShowResultModal(false)
    setResult(null)
  }
  async function reroll(){
    setShowResultModal(false)
    setResult(null)
    // immediately spin if rerolls left
    setTimeout(()=> spin(), 300)
  }

  return (
    <div className="container">
      <div className="wheel-center">
        <div className="reroll-count">Rerolls Today: {Math.max(0, rerollsLeft)} / 1</div>
        <div className="wheel-wrap">
          <div className="pointer">▲</div>
          <canvas ref={canvasRef} className="wheel-canvas" />
        </div>
        <div className="controls">
          <button className="btn" onClick={spin} disabled={spinning || games.length===0}>{spinning ? 'Spinning...' : 'Spin the Wheel'}</button>
        </div>
      </div>

      {showResultModal && result && (
        <div className="modal-backdrop">
          <div className="modal">
            <div style={{textAlign:'center'}}>
              <div className="result-title">{result.name}</div>
              <div style={{textAlign:'center', color:'#475569'}}>Confirm this pick or skip / reroll</div>
              <div className="result-actions">
                <button className="btn" onClick={confirm}>Confirm</button>
                <button className="btn secondary" onClick={skip}>Skip</button>
                <button className="btn secondary" onClick={reroll}>Reroll</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
