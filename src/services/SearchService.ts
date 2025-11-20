import { EmbeddingsProvider } from './embeddings/EmbeddingsProvider'
import { QdrantClient } from './qdrant/QdrantClient'
import { QDRANT_COLLECTION, QDRANT_HOST, QDRANT_API_KEY } from '../config'

function extractDomainFromQuery(query: string) {
  const m = query.match(/site:([\w.-]+)/i) || query.match(/\b([a-z0-9.-]+\.[a-z]{2,})\b/i)
  return m ? m[1].toLowerCase() : null
}

export const SearchService = {
  extractDomainFromQuery,
  async search(query: string, limit = 10) {
    if (!QDRANT_HOST) return []
    const vector = await EmbeddingsProvider.embedText(query)
    const domain = extractDomainFromQuery(query)
    const filter = domain ? { must: [{ key: 'domain', match: { value: domain } }] } : undefined
    const client = new QdrantClient({ host: QDRANT_HOST, collection: QDRANT_COLLECTION, apiKey: QDRANT_API_KEY })
    const results = await client.search(vector, limit, filter)
    return results
  }
}