export const QDRANT_HOST = import.meta.env.VITE_QDRANT_HOST || ''
export const QDRANT_API_KEY = import.meta.env.VITE_QDRANT_API_KEY || ''
export const QDRANT_COLLECTION = import.meta.env.VITE_QDRANT_COLLECTION || 'atlas'
export const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''
export const EMBEDDING_SIZE = Number(import.meta.env.VITE_EMBEDDING_SIZE || 1536)
export const ONNX_MODEL = import.meta.env.VITE_ONNX_MODEL || 'Xenova/all-MiniLM-L6-v2'