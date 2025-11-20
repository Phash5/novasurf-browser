import { EMBEDDING_SIZE } from '../../config'

const cache = new Map<string, number[]>()

function hash(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = (h ^ text.charCodeAt(i)) * 16777619
  return (h >>> 0).toString(36)
}

function embed(text: string) {
  const key = hash(text)
  const cached = cache.get(key)
  if (cached) return cached
  const v = new Array(EMBEDDING_SIZE).fill(0)
  let i = 0
  for (const c of text) { v[i % EMBEDDING_SIZE] += c.charCodeAt(0) * 0.001; i++ }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1
  const out = v.map(x => x / norm)
  cache.set(key, out)
  return out
}

export const LocalEmbeddingsProvider = {
  async embedText(text: string) { return embed(text) },
  async embedChunks(chunks: string[]) { return chunks.map(embed) }
}