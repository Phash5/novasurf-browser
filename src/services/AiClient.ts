export const AiClient = {
  async streamChat(query: string, onToken: (t: string) => void) {
    const response = mockResponse(query)
    for (const token of response) {
      await sleep(25)
      onToken(token)
    }
  }
}

function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)) }

function mockResponse(q: string): string[] {
  const text = `Here is a quick overview of ${q}. ` +
    `• Key facts summarized. • Suggested links and next actions. ` +
    `Streaming simulates GPT‑4o tokens for perceived speed.`
  return Array.from(text)
}