import React, { useEffect, useState } from 'react'
import { Db } from '../services/sqlite/Db'

type Row = { id: number, session_id: number, action: string, params: string, ts: number, approved: number, result?: string, domain?: string, tab_id?: string, outcome_type?: string, outcome_detail?: string }

function parseParams(p: string) {
  try { return JSON.parse(p || '{}') } catch { return {} }
}

function domainFromParams(p: any) {
  try { if (p.url) return new URL(p.url).hostname } catch {}
  return ''
}

export function AgentLogViewer() {
  const [rows, setRows] = useState<Row[]>([])
  const [domain, setDomain] = useState('')
  const [tab, setTab] = useState('')
  const [outcome, setOutcome] = useState('')

  const load = async () => {
    const res = await Db.recentAgentActions(50)
    const mapped: Row[] = res.map((r: any[]) => ({ id: r[0], session_id: r[1], action: String(r[2]), params: String(r[3] || ''), ts: Number(r[4]), approved: Number(r[5] || 0), result: String(r[6] || ''), domain: String(r[7] || ''), tab_id: String(r[8] || ''), outcome_type: String(r[9] || ''), outcome_detail: String(r[10] || '') }))
    setRows(mapped)
  }

  useEffect(() => { load() }, [])

  const filtered = rows.filter(r => {
    const matchDomain = domain ? (r.domain || '').includes(domain) : true
    const matchTab = tab ? (r.tab_id || '').includes(tab) : true
    const matchOutcome = outcome ? (r.outcome_type || '').includes(outcome) : true
    return matchDomain && matchTab && matchOutcome
  })

  return (
    <div style={{ marginTop: 12 }}>
      <div className="title" style={{ fontSize: 16 }}>History</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input className="pill" value={domain} onChange={e => setDomain(e.target.value)} placeholder="filter domain" />
        <input className="pill" value={tab} onChange={e => setTab(e.target.value)} placeholder="filter tabId" />
        <input className="pill" value={outcome} onChange={e => setOutcome(e.target.value)} placeholder="filter outcome" />
        <button className="pill" onClick={load}>Refresh</button>
      </div>
      <div style={{ maxHeight: 160, overflow: 'auto' }}>
        {filtered.map(r => {
          const p = parseParams(r.params)
          const d = r.domain || domainFromParams(p)
          return (
            <div key={r.id} style={{ color: '#9aa7b2', marginBottom: 6 }}>
              {new Date(r.ts).toLocaleTimeString()} – {r.action} {r.tab_id ? `tab:${r.tab_id}` : ''} {d ? `domain:${d}` : ''} {r.approved ? 'approved' : ''} {r.outcome_type ? `outcome:${r.outcome_type}` : ''}
              {r.result && <div style={{ color: '#cbd5e1' }}>{r.result}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}