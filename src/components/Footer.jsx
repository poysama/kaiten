
import React from 'react'
export default function Footer({version, build}){
  return (
    <div className="footer">
      <small>Board Game Wheel Spinner • {version} • {build}</small>
    </div>
  )
}
