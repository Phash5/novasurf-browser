import React, { useEffect, useMemo, useState } from 'react'
import { SiteAiVisibility } from '../services/settings/SiteAiVisibility'
import { CloudSync } from '../services/sync/CloudSync'

export default function Settings() {
  const [domain, setDomain] = useState('')
  const [visible, setVisible] = useState(true)
  const [list, setList] = useState(SiteAiVisibility.list())
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [pass, setPass] = useState('')
  const [status, setStatus] = useState('')

  const add = () => { if (!domain.trim()) return; SiteAiVisibility.set(domain.trim(), visible); setList(SiteAiVisibility.list()); setDomain('') }
  const remove = (d: string) => { SiteAiVisibility.remove(d); setList(SiteAiVisibility.list()) }

  const saveCreds = async () => {
    await CloudSync.saveLocalEncrypted('creds', { url, token }, pass)
    setStatus('Saved')
  }
  const testSync = async () => {
    const ok = await CloudSync.push(url, { ping: Date.now() }, pass, token)
    setStatus(ok ? 'Sync OK' : 'Sync Failed')
  }

  return (
    <div className="card" style={{ margin: '24px auto' }}>
      <div className="title">Settings</div>

      <div className="title" style={{ fontSize: 16 }}>Site AI Visibility</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="domain" className="pill" />
        <select value={visible ? 'visible' : 'hidden'} onChange={e => setVisible(e.target.value === 'visible')} className="pill">
          <option value="visible">visible</option>
          <option value="hidden">hidden</option>
        </select>
        <button className="pill" onClick={add}>Add</button>
      </div>
      <div style={{ marginTop: 12 }}>
        {list.map(e => (
          <div key={e.domain} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div>{e.domain}</div>
            <div style={{ color: '#9aa7b2' }}>{e.visible ? 'visible' : 'hidden'}</div>
            <button className="pill" onClick={() => remove(e.domain)}>Remove</button>
          </div>
        ))}
      </div>

      <div className="title" style={{ fontSize: 16, marginTop: 16 }}>Cloud Sync</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="endpoint URL" className="pill" />
        <input value={token} onChange={e => setToken(e.target.value)} placeholder="bearer token (optional)" className="pill" />
        <input value={pass} onChange={e => setPass(e.target.value)} placeholder="passphrase" className="pill" />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="pill" onClick={saveCreds}>Save</button>
          <button className="pill" onClick={testSync}>Test Sync</button>
          <div style={{ alignSelf: 'center' }}>{status}</div>
        </div>
      </div>
    </div>
  )
}