import React from 'react'

type TabKey = 'chat' | 'links' | 'images' | 'videos' | 'news'

const labels: Record<TabKey, string> = {
  chat: 'Chat',
  links: 'Links',
  images: 'Images',
  videos: 'Videos',
  news: 'News',
}

export function Tabs({ active, onChange }: { active: TabKey, onChange: (k: TabKey) => void }) {
  return (
    <div className="tabs">
      {(Object.keys(labels) as TabKey[]).map(k => (
        <div
          key={k}
          className={`tab ${active === k ? 'active' : ''}`}
          onClick={() => onChange(k)}
        >{labels[k]}</div>
      ))}
    </div>
  )
}