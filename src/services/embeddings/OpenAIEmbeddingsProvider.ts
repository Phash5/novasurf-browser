import { OPENAI_API_KEY } from '../../config'

const MODEL = 'text-embedding-3-small'

async function callEmbeddings(inputs: string[]): Promise<number[][]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({ model: MODEL, input: inputs })
  })
  if (!res.ok) throw new Error('Embeddings API error')
  const json = await res.json()
  return (json.data || []).map((d: any) => d.embedding)
}

export const OpenAIEmbeddingsProvider = {
  async embedText(text: string) {
    const [v] = await callEmbeddings([text])
    return v
  },
  async embedChunks(chunks: string[]) {
    return await callEmbeddings(chunks)
  }
}