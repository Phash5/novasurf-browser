import { EMBEDDING_SIZE } from '../../config'

export const Embedder = {
  async embedText(text: string) {
    const v = new Array(EMBEDDING_SIZE).fill(0)
    let i = 0
    for (const c of text) { v[i % EMBEDDING_SIZE] += c.charCodeAt(0) * 0.001; i++ }
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1
    return v.map(x => x / norm)
  },
  async embedChunks(chunks: string[]) {
    const out: number[][] = []
    for (const c of chunks) out.push(await Embedder.embedText(c))
    return out
  }
}