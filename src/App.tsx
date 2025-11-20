import React, { useEffect, useMemo, useState } from 'react'
import { SearchBox } from './components/SearchBox'
import { Tabs } from './components/Tabs'
import { ChatPanel } from './components/ChatPanel'
import { LinksPanel } from './components/LinksPanel'
import { ImagesPanel } from './components/ImagesPanel'
import { VideosPanel } from './components/VideosPanel'
import { NewsPanel } from './components/NewsPanel'
import { MemoryStore, Suggestion, ResumeCard } from './services/MemoryStore'
import { SettingsStrip } from './components/SettingsStrip'
import { Db } from './services/sqlite/Db'
import { Coordinator } from './services/ipc/Coordinator'
import { SemanticIndexer } from './services/ai/SemanticIndexer'
import { ApprovalsPanel } from './components/ApprovalsPanel'
import { startCleanupJob } from './services/qdrant/CleanupJob'
import { EmbeddingsProvider } from './services/embeddings/EmbeddingsProvider'

type TabKey = 'chat' | 'links' | 'images' | 'videos' | 'news'

export default function App() {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<TabKey>('chat')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [resumeCards, setResumeCards] = useState<ResumeCard[]>([])
  const [tabId, setTabId] = useState<string | null>(null)
  const coordinator = useMemo(() => new Coordinator('ws://localhost:8787/atlas'), [])
  const [embedReady, setEmbedReady] = useState(false)
  useEffect(() => {
    EmbeddingsProvider.prewarm().then(() => setEmbedReady(true))
    coordinator.on('tabCreated', id => setTabId(id))
    coordinator.on('domSnapshot', async (id, snapshot) => {
      await SemanticIndexer.index(id, `ws://${id}`, snapshot)
    })
    startCleanupJob()
  }, [coordinator])

  useEffect(() => {
    setSuggestions(MemoryStore.getSuggestions())
    setResumeCards(MemoryStore.getResumeCards())
  }, [])

  const onSearch = (text: string) => {
    setQuery(text)
    MemoryStore.recordQuery(text)
    Db.insertPage({ url: `search:${text}`, title: text, ts: Date.now(), domain: 'ntp' })
    setSuggestions(MemoryStore.getSuggestions())
    setResumeCards(MemoryStore.getResumeCards())
    coordinator.createTab({})
    if (tabId) coordinator.navigate({ tabId, url: `https://example.com/?q=${encodeURIComponent(text)}` })
  }

  const panels = useMemo(() => ({
    chat: <ChatPanel query={query} />,
    links: <LinksPanel query={query} />,
    images: <ImagesPanel query={query} />,
    videos: <VideosPanel query={query} />,
    news: <NewsPanel query={query} />,
  }), [query])

  return (
    <div className="container">
      <div className="card">
        <div className="title">Atlas New Tab {embedReady ? <span style={{ marginLeft: 8, fontSize: 12, color: '#06b6d4' }}>Embeddings ready</span> : <span style={{ marginLeft: 8, fontSize: 12, color: '#9aa7b2' }}>Warming up…</span>}</div>

        <SearchBox
          value={query}
          onChange={setQuery}
          onSubmit={() => onSearch(query)}
          onSuggestion={onSearch}
          suggestions={suggestions}
        />

        <Tabs active={active} onChange={setActive} />

        <div className="panel">
          {panels[active]}
        </div>

        <SettingsStrip />

        <ApprovalsPanel coordinator={coordinator} />

        <div className="row" style={{ marginTop: 16 }}>
          <div className="col">
            <div className="title" style={{ fontSize: 16 }}>Suggestions</div>
            <div className="suggestions">
              {suggestions.map(s => (
                <button key={s.id} className="pill" onClick={() => onSearch(s.text)}>{s.text}</button>
              ))}
            </div>
          </div>
          <div className="col">
            <div className="title" style={{ fontSize: 16 }}>Resume</div>
            <div className="resume">
              {resumeCards.map(card => (
                <div className="resume-card" key={card.id}>
                  <h4>{card.title}</h4>
                  <p>{card.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}