import { QdrantClient } from './QdrantClient'
import { QDRANT_HOST, QDRANT_COLLECTION, QDRANT_API_KEY } from '../../config'

export function startCleanupJob(ttlMs = 7 * 24 * 60 * 60 * 1000) {
  if (!QDRANT_HOST) return
  const client = new QdrantClient({ host: QDRANT_HOST, collection: QDRANT_COLLECTION, apiKey: QDRANT_API_KEY })
  setInterval(async () => {
    const cutoff = Date.now() - ttlMs
    const filter = { must: [{ key: 'ts', range: { lt: cutoff } }] }
    try { await client.deleteByFilter(filter) } catch {}
  }, 24 * 60 * 60 * 1000)
}