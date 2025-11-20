import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import Settings from './pages/Settings'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Approvals from './pages/Approvals'

function Root() {
  return (
    <BrowserRouter>
      <div style={{ position: 'fixed', top: 12, right: 12, display: 'flex', gap: 8 }}>
        <Link className="pill" to="/">Home</Link>
        <Link className="pill" to="/settings">Settings</Link>
      </div>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/approvals" element={<Approvals />} />
      </Routes>
    </BrowserRouter>
  )
}

const rootEl = document.getElementById('root')!
createRoot(rootEl).render(<Root />)