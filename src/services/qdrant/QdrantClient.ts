type Vector = number[]
type Point = { id: string, vector: Vector, payload?: Record<string, unknown> }

type Config = { host: string, apiKey?: string, collection: string }

export class QdrantClient {
  private cfg: Config
  constructor(cfg: Config) { this.cfg = cfg }
  async upsert(points: Point[]) {
    const url = `${this.cfg.host}/collections/${this.cfg.collection}/points?wait=true`
    const body = { points }
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (this.cfg.apiKey) headers['api-key'] = this.cfg.apiKey
    const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) })
    return res.ok
  }
  async search(vector: Vector, limit = 10, filter?: Record<string, unknown>) {
    const url = `${this.cfg.host}/collections/${this.cfg.collection}/points/search`
    const body = { vector, limit, filter }
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (this.cfg.apiKey) headers['api-key'] = this.cfg.apiKey
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
    if (!res.ok) return []
    const json = await res.json()
    return json.result ?? []
  }
  async ensureCollection(size: number, distance: 'Cosine' | 'Euclid' | 'Dot' = 'Cosine') {
    const url = `${this.cfg.host}/collections/${this.cfg.collection}`
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (this.cfg.apiKey) headers['api-key'] = this.cfg.apiKey
    const body = { vectors: { size, distance } }
    const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) })
    return res.ok
  }
  async deleteByFilter(filter: Record<string, unknown>) {
    const url = `${this.cfg.host}/collections/${this.cfg.collection}/points/delete`
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (this.cfg.apiKey) headers['api-key'] = this.cfg.apiKey
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ filter }) })
    return res.ok
  }
}