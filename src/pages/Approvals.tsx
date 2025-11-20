import React, { useEffect, useState } from 'react'
import { Coordinator } from '../services/ipc/Coordinator'

export default function Approvals() {
  const [pending, setPending] = useState<{ requestId: string, action: string, params: any, risk: string }[]>([])
  const [coordinator] = useState(() => new Coordinator('ws://localhost:8787/atlas'))

  useEffect(() => {
    coordinator.on('approvalRequest', req => setPending(p => [...p, req!]))
  }, [coordinator])

  const decide = (id: string, approved: boolean) => {
    coordinator.approvalResponse(id, approved)
    setPending(p => p.filter(x => x.requestId !== id))
  }

  return (
    <div className="card" style={{ margin: '24px auto' }}>
      <div className="title">Approvals</div>
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
    </div>
  )
}