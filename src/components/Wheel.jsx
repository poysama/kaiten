import React, {useState, useEffect, useRef} from 'react'

export default function Wheel({games=[], onPick}){
  const canvasRef = useRef()
  const [spinning, setSpinning] = useState(false)

  useEffect(()=> {
    draw()
  }, [games])

  function draw(){
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width = 400
    const h = canvas.height = 400
    ctx.clearRect(0,0,w,h)
    const cx = w/2, cy=h/2, r = 160
    const slice = 2*Math.PI / Math.max(1,games.length)
    for (let i=0;i<games.length;i++){
      const start = i*slice
      ctx.beginPath()
      ctx.moveTo(cx,cy)
      ctx.arc(cx,cy,r, start, start+slice)
      ctx.closePath()
      ctx.fillStyle = i%2===0 ? '#ffd8a8' : '#fff1f0'
      ctx.fill()
      // text
      ctx.save()
      ctx.translate(cx,cy)
      ctx.rotate(start + slice/2)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#1f2937'
      ctx.font = '14px sans-serif'
      ctx.fillText(games[i].name.substring(0,20), r-10, 0)
      ctx.restore()
    }
    // center
    ctx.beginPath()
    ctx.arc(cx,cy,40,0,2*Math.PI); ctx.fillStyle='#fff7ed'; ctx.fill()
  }

  async function spinOnce(){
    if (spinning) return
    setSpinning(true)
    const res = await fetch('/api/pick')
    const data = await res.json()
    if (data.error){ alert(data.error); setSpinning(false); return }
    const index = data.index
    const total = Math.max(1,games.length)
    const degreesPerSlice = 360/total
    const extra = 720 + Math.floor(Math.random()*360)
    const target = extra + (index * degreesPerSlice) + degreesPerSlice/2
    const wheel = canvasRef.current
    wheel.style.transition = 'transform 4s cubic-bezier(.17,.67,.22,1)'
    wheel.style.transform = `rotate(${target}deg)`
    setTimeout(()=> {
      wheel.style.transition = 'none'
      wheel.style.transform = `rotate(${(index * degreesPerSlice) + degreesPerSlice/2}deg)`
      setSpinning(false)
      if (onPick) onPick(data.pick)
    }, 4200)
  }

  return (
    <div className="wheel-wrap">
      <div className="pointer">▼</div>
      <canvas ref={canvasRef} className="wheel-canvas" width="400" height="400" />
      <div className="spin-btn">
        <button onClick={spinOnce} disabled={spinning || games.length===0}>{spinning ? 'Spinning...' : 'Spin'}</button>
      </div>
    </div>
  )
}