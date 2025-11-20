import React, { useEffect, useState } from 'react'
import { SearchService } from '../services/SearchService'

export function LinksPanel({ query }: { query: string }) {
  const [items, setItems] = useState<{ title: string, url: string, snippet: string, anchorText?: string, anchorHref?: string }[]>([])
  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!query) { setItems([]); return }
      const res = await SearchService.search(query, 8)
      if (!cancelled && res.length) {
        const ranked = res.slice().sort((a: any, b: any) => {
          const sa = ((a.payload?.anchor_text || '').length > 0 ? 2 : 0) + ((a.payload?.anchor_href || '').length > 0 ? 1 : 0)
          const sb = ((b.payload?.anchor_text || '').length > 0 ? 2 : 0) + ((b.payload?.anchor_href || '').length > 0 ? 1 : 0)
          return sb - sa
        })
        const mapped = ranked.map((r: any) => ({
          title: r.payload?.title || r.payload?.url || 'Result',
          url: r.payload?.url || '#',
          snippet: r.payload?.anchor_text || r.payload?.snippet || `${r.payload?.url || ''}`,
          anchorText: r.payload?.anchor_text,
          anchorHref: r.payload?.anchor_href
        }))
        setItems(mapped as any)
      }
      if (!cancelled && res.length === 0) {
        const fallback = Array.from({ length: 5 }).map((_, i) => ({ title: `${query} – Result ${i + 1}`, url: `https://example.com/${encodeURIComponent(query)}/${i + 1}`, snippet: `A relevant link about ${query}.` }))
        setItems(fallback)
      }
    }
    run()
    return () => { cancelled = true }
  }, [query])
  if (!query) return <div>Search to see link results.</div>
  return (
    <div>
      {items.map((it, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <a href={it.url} target="_blank" rel="noreferrer" style={{ color: '#93c5fd' }}>{it.title}</a>
          <div style={{ color: '#9aa7b2' }}>{it.snippet}</div>
          {it.anchorHref && <div style={{ color: '#64748b' }}>{it.anchorHref}</div>}
        </div>
      ))}
    </div>
  )
}
