import React, { useEffect, useState } from 'react'
import { SiteAiVisibility } from '../services/settings/SiteAiVisibility'

export function SettingsStrip() {
  const [domain, setDomain] = useState('example.com')
  const [visible, setVisible] = useState(false)

  useEffect(() => { setVisible(SiteAiVisibility.get(domain)) }, [domain])

  const toggle = () => {
    SiteAiVisibility.set(domain, !visible)
    setVisible(v => !v)
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
      <input
        value={domain}
        onChange={e => setDomain(e.target.value)}
        placeholder="domain"
        style={{ flex: 1, background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.08)', padding: 8, borderRadius: 8 }}
      />
      <button className="pill" onClick={toggle}>{visible ? 'AI Visible' : 'AI Hidden'}</button>
    </div>
  )
}