import React, { useEffect, useState } from 'react'
import { SearchService } from '../services/SearchService'

export function NewsPanel({ query }: { query: string }) {
  const [items, setItems] = useState<{ headline: string, source: string }[]>([])
  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!query) { setItems([]); return }
      const res = await SearchService.search(query, 6)
      if (!cancelled && res.length) {
        const mapped = res.map((r: any) => ({ headline: r.payload?.title || r.payload?.url || 'News', source: r.payload?.domain || 'web' }))
        setItems(mapped)
      }
      if (!cancelled && res.length === 0) {
        const fallback = Array.from({ length: 5 }).map((_, i) => ({ headline: `${query}: headline ${i + 1}`, source: `Source ${i + 1}` }))
        setItems(fallback)
      }
    }
    run()
    return () => { cancelled = true }
  }, [query])
  if (!query) return <div>Search to see news.</div>
  return (
    <div>
      {items.map((it, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 600 }}>{it.headline}</div>
          <div style={{ color: '#9aa7b2' }}>{it.source}</div>
        </div>
      ))}
    </div>
  )
}
