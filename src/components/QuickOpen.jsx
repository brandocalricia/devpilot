import { useState, useRef, useEffect } from 'react'

export default function QuickOpen({ projects, onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const filtered = projects.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-[20vh] z-50" onClick={onClose}>
      <div className="w-[500px] bg-bg-card rounded-xl shadow-2xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
        <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search projects..."
          className="w-full px-4 py-3 bg-transparent text-sm focus:outline-none"
          style={{ color: 'rgb(var(--text-rgb))', borderBottom: '1px solid var(--border-val)' }} />
        <div className="max-h-[300px] overflow-y-auto">
          {filtered.map(p => (
            <button key={p.name} onClick={() => onSelect(p)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-bg-hover transition-colors">
              <span>{p.name}</span>
              <span className="text-xs text-muted">{p.lastCommitRelative}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted px-4 py-6 text-center" style={{ opacity: 0.5 }}>No projects found</p>
          )}
        </div>
      </div>
    </div>
  )
}
