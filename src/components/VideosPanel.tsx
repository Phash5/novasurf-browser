import React, { useEffect, useState } from 'react'
import { SearchService } from '../services/SearchService'

export function VideosPanel({ query }: { query: string }) {
  const [items, setItems] = useState<{ title: string, duration: string }[]>([])
  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!query) { setItems([]); return }
      const res = await SearchService.search(query, 4)
      if (!cancelled && res.length) {
        const mapped = res.map((r: any) => ({ title: r.payload?.title || r.payload?.url || 'Video', duration: `${Math.floor(Math.random()*8)+2}:0${Math.floor(Math.random()*10)}` }))
        setItems(mapped)
      }
      if (!cancelled && res.length === 0) {
        const fallback = Array.from({ length: 4 }).map((_, i) => ({ title: `${query} – Video ${i + 1}`, duration: `${3 + i}:0${i}` }))
        setItems(fallback)
      }
    }
    run()
    return () => { cancelled = true }
  }, [query])
  if (!query) return <div>Search to see videos.</div>
  return (
    <div>
      {items.map((it, i) => (
        <div key={i} className="resume-card">
          <h4>{it.title}</h4>
          <p>Duration {it.duration}</p>
        </div>
      ))}
    </div>
  )
}