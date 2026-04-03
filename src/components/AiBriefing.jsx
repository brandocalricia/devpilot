import { useState, useEffect } from 'react'
import Markdown from './Markdown'

export default function AiBriefing({ projects, settings }) {
  const [briefing, setBriefing] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [remaining, setRemaining] = useState(null)

  useEffect(() => {
    if (projects.length > 0) loadCached()
  }, [projects.length])

  async function loadCached() {
    const cache = await window.devpilot.getCache()
    const today = new Date().toISOString().split('T')[0]
    if (cache.briefing?.date === today && cache.briefing?.text) {
      setBriefing(cache.briefing.text)
    } else {
      generate()
    }
  }

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const result = await window.devpilot.aiBriefing(projects)
      if (result.error) {
        setError(result.error)
      } else {
        setBriefing(result.text)
        if (result.remaining != null) setRemaining(result.remaining)
        const cache = await window.devpilot.getCache()
        await window.devpilot.saveCache({
          ...cache,
          briefing: { text: result.text, date: new Date().toISOString().split('T')[0] },
        })
      }
    } catch (e) {
      setError(e.message || 'Failed to generate briefing')
    }
    setLoading(false)
  }

  return (
    <div className="bg-bg-briefing rounded-lg p-5 mb-6" style={{ border: '1px solid rgb(var(--accent-rgb) / 0.2)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-accent text-sm">●</span>
          <h3 className="text-sm font-medium text-accent">AI Daily Briefing</h3>
          {remaining != null && <span className="text-xs text-muted/50">{remaining} left today</span>}
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="text-xs text-muted px-2 py-1 rounded transition-colors disabled:opacity-50 hover:text-[rgb(var(--text-rgb))]"
          style={{ border: '1px solid var(--border-val)' }}
        >
          {loading ? 'Generating...' : 'Refresh'}
        </button>
      </div>

      {loading && (
        <div className="space-y-2">
          <div className="h-3 rounded w-full animate-pulse" style={{ background: 'var(--border-val)' }} />
          <div className="h-3 rounded w-4/5 animate-pulse" style={{ background: 'var(--border-val)' }} />
          <div className="h-3 rounded w-3/5 animate-pulse" style={{ background: 'var(--border-val)' }} />
        </div>
      )}

      {!loading && briefing && (
        <div className="text-sm leading-relaxed" style={{ color: 'rgb(var(--text-rgb))', opacity: 0.85 }}><Markdown>{briefing}</Markdown></div>
      )}

      {!loading && error && <p className="text-sm text-muted">{error}</p>}

      {!loading && !briefing && !error && (
        <p className="text-sm text-muted">Click Refresh to generate your daily briefing.</p>
      )}
    </div>
  )
}
