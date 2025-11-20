import { EmbeddingsProvider } from '../embeddings/EmbeddingsProvider'
import { QdrantClient } from '../qdrant/QdrantClient'
import { QDRANT_COLLECTION, QDRANT_HOST } from '../../config'

type Snapshot = { html: string, title: string }

function stripTags(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function chunkText(text: string, maxTokens = 800) {
  const words = text.split(' ')
  const chunks: string[] = []
  let cur: string[] = []
  for (const w of words) {
    cur.push(w)
    if (cur.length >= maxTokens) { chunks.push(cur.join(' ')); cur = [] }
  }
  if (cur.length) chunks.push(cur.join(' '))
  return chunks
}
function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = (h ^ s.charCodeAt(i)) * 16777619
  return (h >>> 0).toString(36)
}

function extractAnchors(html: string) {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const anchors = Array.from(doc.querySelectorAll('a')).map(a => ({ text: (a.textContent || '').trim(), href: a.getAttribute('href') || '' })).filter(a => a.text.length > 0)
    const headings = Array.from(doc.querySelectorAll('h1,h2,h3')).map(h => (h.textContent || '').trim()).filter(t => t.length > 0)
    const topAnchor = anchors[0]
    const topHeading = headings[0] || ''
    return { anchor_text: topAnchor?.text || '', anchor_href: topAnchor?.href || '', heading: topHeading }
  } catch {
    return { anchor_text: '', anchor_href: '', heading: '' }
  }
}

export const SemanticIndexer = {
  async index(pageId: string, url: string, snapshot: Snapshot) {
    const text = stripTags(snapshot.html)
    if (!text) return
    const chunks = chunkText(text)
    const uniq: { text: string, hash: string, idx: number }[] = []
    const seen = new Set<string>()
    chunks.forEach((c, i) => { const k = hash(c); if (!seen.has(k)) { seen.add(k); uniq.push({ text: c, hash: k, idx: i }) } })
    const vectors = await EmbeddingsProvider.embedChunks(uniq.map(u => u.text))
    if (!QDRANT_HOST) return
    const client = new QdrantClient({ host: QDRANT_HOST, collection: QDRANT_COLLECTION })
    await client.ensureCollection(vectors[0]?.length || EmbeddingsProvider.size(), 'Cosine')
    const domain = (() => { try { return new URL(url).hostname } catch { return 'unknown' } })()
    const extra = extractAnchors(snapshot.html)
    const points = vectors.map((vector, i) => ({ id: `${pageId}-${uniq[i].idx}`, vector, payload: { page_id: pageId, url, title: snapshot.title, section: uniq[i].idx, token_count: uniq[i].text.split(' ').length, content_hash: uniq[i].hash, domain, ts: Date.now(), snippet: (extra.heading ? `${extra.heading} — ` : '') + uniq[i].text.slice(0, 160), anchor_text: extra.anchor_text, anchor_href: extra.anchor_href } }))
    await client.upsert(points)
  }
}