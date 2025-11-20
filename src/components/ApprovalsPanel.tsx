import React, { useEffect, useState } from 'react'
import { Coordinator } from '../services/ipc/Coordinator'
import { Db } from '../services/sqlite/Db'
import { AgentLogViewer } from './AgentLogViewer'

export function ApprovalsPanel({ coordinator }: { coordinator: Coordinator }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<{ requestId: string, action: string, params: any, risk: string }[]>([])
  const [logs, setLogs] = useState<{ id: string, event: string, ts: number, params?: any, result?: string }[]>([])
  const [sessionId, setSessionId] = useState<number | null>(null)

  useEffect(() => {
    (async () => { const sid = await Db.createSession(); setSessionId(sid) })()
    coordinator.on('approvalRequest', async req => {
      setPending(p => [...p, req!])
      const d = (() => { try { return req!.params?.url ? new URL(req!.params.url).hostname : '' } catch { return '' } })()
      const t = String(req!.params?.tabId || '')
      if (sessionId) await Db.insertAgentAction({ session_id: sessionId, action: req!.action, params: JSON.stringify(req!.params), ts: Date.now(), approved: 0, domain: d, tab_id: t })
    })
    coordinator.on('agentResult', async res => {
      setLogs(l => [...l, { id: res!.id, event: res!.status, ts: Date.now(), result: res!.observation }])
      if (sessionId) await Db.insertAgentAction({ session_id: sessionId, action: 'result', params: '', ts: Date.now(), approved: res!.status === 'ok' ? 1 : 0, result: res!.observation, outcome_type: res!.status, outcome_detail: res!.observation })
    })
  }, [coordinator, sessionId])

  const decide = (id: string, approved: boolean) => {
    coordinator.approvalResponse(id, approved)
    setPending(p => p.filter(x => x.requestId !== id))
  }

  return (
    <div style={{ position: 'fixed', bottom: 12, right: 12 }}>
      <button className="pill" onClick={() => setOpen(o => !o)}>{open ? 'Hide Approvals' : 'Show Approvals'}</button>
      {open && (
        <div className="card" style={{ marginTop: 8, width: 380 }}>
          <div className="title" style={{ fontSize: 16 }}>Approvals</div>
          {pending.length === 0 && <div>No pending requests.</div>}
          {pending.map(req => (
            <div key={req.requestId} className="resume-card">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>{req.action}</div>
                <div style={{ color: '#9aa7b2' }}>risk: {req.risk}</div>
              </div>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(req.params, null, 2)}</pre>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="pill" onClick={() => decide(req.requestId, true)}>Approve</button>
                <button className="pill" onClick={() => decide(req.requestId, false)}>Deny</button>
              </div>
            </div>
          ))}
          <div className="title" style={{ fontSize: 16, marginTop: 12 }}>Agent Logs</div>
          <div style={{ maxHeight: 160, overflow: 'auto' }}>
            {logs.slice().reverse().map((log, i) => (
              <div key={i} style={{ color: '#9aa7b2' }}>
                {new Date(log.ts).toLocaleTimeString()} – {log.id}: {log.event}
                {log.result && <div style={{ color: '#cbd5e1' }}>{log.result}</div>}
              </div>
            ))}
          </div>
          <AgentLogViewer />
        </div>
      )}
    </div>
  )
}