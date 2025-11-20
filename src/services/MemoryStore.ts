export type Suggestion = { id: string, text: string }
export type ResumeCard = { id: string, title: string, subtitle: string }

const HOT_LIMIT = 50
const WARM_TTL_MS = 7 * 24 * 60 * 60 * 1000

type QueryRecord = { id: string, text: string, ts: number }

const hotCache: QueryRecord[] = []

export const MemoryStore = {
  recordQuery(text: string) {
    const rec: QueryRecord = { id: cryptoRandom(), text, ts: Date.now() }
    hotCache.unshift(rec)
    if (hotCache.length > HOT_LIMIT) hotCache.pop()
    persistWarm(rec)
  },
  getSuggestions(): Suggestion[] {
    const warm = listWarm().slice(0, 8)
    const hot = hotCache.slice(0, 8)
    const combined = dedupe([...warm, ...hot])
    return combined.map(r => ({ id: r.id, text: r.text }))
  },
  getResumeCards(): ResumeCard[] {
    const warm = listWarm().slice(0, 4)
    return warm.map(r => ({ id: r.id, title: r.text, subtitle: new Date(r.ts).toLocaleString() }))
  }
}

function cryptoRandom() { return Math.random().toString(36).slice(2) }

function persistWarm(rec: QueryRecord) {
  const key = 'atlas_warm_cache_v1'
  const raw = localStorage.getItem(key)
  const arr: QueryRecord[] = raw ? JSON.parse(raw) : []
  const withNew = [rec, ...arr].filter(r => Date.now() - r.ts < WARM_TTL_MS)
  localStorage.setItem(key, JSON.stringify(withNew.slice(0, 200)))
}

function listWarm(): QueryRecord[] {
  const raw = localStorage.getItem('atlas_warm_cache_v1')
  const arr: QueryRecord[] = raw ? JSON.parse(raw) : []
  return arr.filter(r => Date.now() - r.ts < WARM_TTL_MS)
}

function dedupe(arr: QueryRecord[]) {
  const seen = new Set<string>()
  const out: QueryRecord[] = []
  for (const r of arr) {
    const k = r.text.toLowerCase().trim()
    if (!seen.has(k)) { seen.add(k); out.push(r) }
  }
  return out
}