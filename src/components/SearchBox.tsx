import React from 'react'

type Props = {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  onSuggestion: (v: string) => void
  suggestions: { id: string, text: string }[]
}

export function SearchBox({ value, onChange, onSubmit }: Props) {
  return (
    <div className="search">
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Ask or search…"
        onKeyDown={e => { if (e.key === 'Enter') onSubmit() }}
      />
      <button onClick={onSubmit}>Search</button>
    </div>
  )
}