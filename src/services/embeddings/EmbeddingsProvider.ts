import { OPENAI_API_KEY, EMBEDDING_SIZE } from '../../config'
import { OpenAIEmbeddingsProvider } from './OpenAIEmbeddingsProvider'
import { OnnxEmbeddingsProvider } from './OnnxEmbeddingsProvider'

export const EmbeddingsProvider = {
  async embedText(text: string) {
    const provider = OPENAI_API_KEY ? OpenAIEmbeddingsProvider : OnnxEmbeddingsProvider
    return provider.embedText(text)
  },
  async embedChunks(chunks: string[]) {
    const provider = OPENAI_API_KEY ? OpenAIEmbeddingsProvider : OnnxEmbeddingsProvider
    return provider.embedChunks(chunks)
  },
  size() {
    if (OPENAI_API_KEY) return EMBEDDING_SIZE
    return OnnxEmbeddingsProvider.currentSize()
  },
  async prewarm() {
    if (!OPENAI_API_KEY) await OnnxEmbeddingsProvider.prewarm()
  }
}