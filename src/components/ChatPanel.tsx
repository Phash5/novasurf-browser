import React, { useEffect, useState } from 'react'
import { AiClient } from '../services/AiClient'

export function ChatPanel({ query }: { query: string }) {
  const [tokens, setTokens] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!query) { setTokens([]); return }
    setTokens([])
    setLoading(true)
    AiClient.streamChat(query, t => {
      if (!cancelled) setTokens(prev => [...prev, t])
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [query])

  if (!query) return <div>Type a query to begin.</div>

  return (
    <div>
      {loading && tokens.length === 0 && <div>Thinking…</div>}
      <div>
        {tokens.map((t, i) => <span key={i} className="token">{t}</span>)}
      </div>
    </div>
  )
}