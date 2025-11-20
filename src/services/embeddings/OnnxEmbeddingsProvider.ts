import { pipeline } from '@xenova/transformers'
import { ONNX_MODEL } from '../../config'

let embedder: any = null
let size = 384

async function getEmbedder() {
  if (!embedder) {
    const device = typeof (navigator as any).gpu !== 'undefined' ? 'webgpu' : undefined
    embedder = await pipeline('feature-extraction', ONNX_MODEL, { device })
  }
  return embedder
}

function normalize(v: number[]) {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1
  return v.map(x => x / norm)
}

export const OnnxEmbeddingsProvider = {
  async prewarm() {
    await getEmbedder()
  },
  async embedText(text: string) {
    const e = await getEmbedder()
    const out = await e(text, { pooling: 'mean', normalize: true })
    const arr = Array.from(out.data as Float32Array)
    size = arr.length
    return normalize(arr)
  },
  async embedChunks(chunks: string[]) {
    const e = await getEmbedder()
    const res = await Promise.all(chunks.map(c => e(c, { pooling: 'mean', normalize: true })))
    const out = res.map(r => normalize(Array.from(r.data as Float32Array)))
    size = out[0]?.length || size
    return out
  },
  currentSize() { return size }
}