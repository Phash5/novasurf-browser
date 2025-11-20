import React, { useEffect, useState } from 'react'
import { SearchService } from '../services/SearchService'

export function ImagesPanel({ query }: { query: string }) {
  const [items, setItems] = useState<{ src: string, alt: string }[]>([])
  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!query) { setItems([]); return }
      const res = await SearchService.search(query, 6)
      if (!cancelled && res.length) {
        const mapped = res.map((r: any, i: number) => ({ src: `https://picsum.photos/seed/${encodeURIComponent(r.payload?.url || query)}-${i}/160/120`, alt: r.payload?.title || r.payload?.url || 'Image' }))
        setItems(mapped)
      }
      if (!cancelled && res.length === 0) {
        const fallback = Array.from({ length: 6 }).map((_, i) => ({ src: `https://picsum.photos/seed/${encodeURIComponent(query)}-${i}/160/120`, alt: `${query} image ${i + 1}` }))
        setItems(fallback)
      }
    }
    run()
    return () => { cancelled = true }
  }, [query])
  if (!query) return <div>Search to see images.</div>
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {items.map((it, i) => (
        <img key={i} src={it.src} alt={it.alt} style={{ borderRadius: 8 }} />
      ))}
    </div>
  )
}