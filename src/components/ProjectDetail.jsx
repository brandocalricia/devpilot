import { useState, useEffect } from 'react'
import Markdown from './Markdown'

export default function ProjectDetail({ project, onBack, settings, onToggleArchive }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  useEffect(() => {
    if (project?.path) loadDetail()
  }, [project?.path])

  async function loadDetail() {
    setLoading(true)
    setSummary(null)
    const d = await window.devpilot.getProjectDetail(project.path)
    setDetail(d)
    setLoading(false)

    if (settings?._hasApiKey) {
      const cache = await window.devpilot.getCache()
      const cached = cache.whereLeftOff?.[project.name]
      const lastCommitHash = d.commits[0]?.hash
      if (cached && cached.lastCommit === lastCommitHash) {
        setSummary(cached.text)
      } else {
        generateSummary(d)
      }
    }
  }

  async function generateSummary(d) {
    if (!settings?._hasApiKey) return
    setSummaryLoading(true)
    try {
      const result = await window.devpilot.aiWhereLeftOff(project.name, d || detail)
      if (result.error) {
        setSummary(result.error)
      } else {
        setSummary(result.text)
        const cache = await window.devpilot.getCache()
        await window.devpilot.saveCache({
          ...cache,
          whereLeftOff: {
            ...cache.whereLeftOff,
            [project.name]: { text: result.text, lastCommit: (d || detail).commits[0]?.hash },
          },
        })
      }
    } catch (e) {
      setSummary('Failed: ' + (e.message || 'Unknown error'))
    }
    setSummaryLoading(false)
  }

  if (!project) return null

  return (
    <div className="max-w-[900px]">
      <button onClick={onBack} className="text-xs text-muted hover:text-[var(--text)] mb-4 flex items-center gap-1">
        ← Back to projects
      </button>

      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-semibold">{project.name}</h2>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          project.status === 'active' ? 'text-accent' :
          project.status === 'paused' ? 'text-paused' :
          project.status === 'archived' ? 'text-muted' :
          'text-stale'
        }`} style={{
          background: project.status === 'active' ? 'rgba(var(--accent-rgb), 0.2)' :
                      project.status === 'paused' ? 'rgba(239, 159, 39, 0.2)' :
                      project.status === 'archived' ? 'var(--border)' :
                      'rgba(226, 75, 74, 0.2)'
        }}>
          {project.status}
        </span>
        <div className="ml-auto flex gap-2">
          {onToggleArchive && (
            <button
              onClick={() => onToggleArchive(project.name)}
              className="text-xs px-3 py-1.5 rounded-md transition-colors text-muted hover:text-[var(--text)]"
              style={{ border: '1px solid var(--border)' }}
            >
              {project.status === 'archived' ? 'Unarchive' : 'Archive'}
            </button>
          )}
          <button
            onClick={() => window.devpilot.openInVSCode(project.path)}
            className="text-xs px-3 py-1.5 rounded-md text-accent hover:opacity-80 transition-colors"
            style={{ background: 'rgba(var(--accent-rgb), 0.2)' }}
          >
            Open in VS Code
          </button>
        </div>
      </div>

      {/* Where I Left Off */}
      <div className="bg-bg-briefing rounded-lg p-4 mb-6" style={{ border: '1px solid rgba(var(--accent-rgb), 0.2)' }}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-accent flex items-center gap-2">
            <span>●</span> Where I Left Off
          </h3>
          {detail && settings?._hasApiKey && (
            <button
              onClick={() => generateSummary()}
              disabled={summaryLoading}
              className="text-xs text-muted px-2 py-1 rounded transition-colors disabled:opacity-50 hover:text-[var(--text)]"
              style={{ border: '1px solid var(--border)' }}
            >
              {summaryLoading ? 'Generating...' : 'Refresh'}
            </button>
          )}
        </div>
        {summaryLoading && (
          <div className="space-y-2">
            <div className="h-3 rounded w-full animate-pulse" style={{ background: 'var(--border)' }} />
            <div className="h-3 rounded w-3/4 animate-pulse" style={{ background: 'var(--border)' }} />
          </div>
        )}
        {!summaryLoading && summary && (
          <div className="text-sm leading-relaxed" style={{ opacity: 0.85 }}><Markdown>{summary}</Markdown></div>
        )}
        {!summaryLoading && !summary && (
          <p className="text-sm text-muted">
            {settings?._hasApiKey ? 'Loading...' : 'Add your Claude API key in Settings to see AI summaries.'}
          </p>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 rounded animate-pulse" style={{ background: 'var(--border)' }} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <Section title="Recent Commits">
            <div className="space-y-1">
              {detail.commits.map((c, i) => (
                <div key={i} className="flex gap-2 text-sm py-1">
                  <span className="text-muted font-mono text-xs mt-0.5">{c.hash?.slice(0, 7)}</span>
                  <span style={{ opacity: 0.8 }}>{c.message}</span>
                </div>
              ))}
            </div>
          </Section>

          {detail.uncommittedFiles.length > 0 && (
            <Section title={`Uncommitted Changes (${detail.uncommittedFiles.length})`}>
              <div className="space-y-0.5">
                {detail.uncommittedFiles.map((f, i) => (
                  <p key={i} className="text-sm text-paused font-mono">{f}</p>
                ))}
              </div>
            </Section>
          )}

          {detail.todos.length > 0 && (
            <Section title={`TODOs (${detail.todos.length})`}>
              <div className="space-y-1">
                {detail.todos.slice(0, 20).map((t, i) => (
                  <button
                    key={i}
                    onClick={() => window.devpilot.openInVSCode(t.file, t.line)}
                    className="flex gap-2 text-sm py-1 w-full text-left hover:bg-bg-hover rounded px-1 -mx-1"
                  >
                    <span className="text-xs px-1.5 py-0.5 rounded text-muted shrink-0" style={{ background: 'var(--border)' }}>{t.type}</span>
                    <span className="truncate" style={{ opacity: 0.7 }}>{t.text}</span>
                    <span className="text-muted/50 text-xs ml-auto shrink-0">{t.relativePath}:{t.line}</span>
                  </button>
                ))}
              </div>
            </Section>
          )}

          {detail.readme && (
            <Section title="README">
              <pre className="text-sm text-muted whitespace-pre-wrap">{detail.readme}</pre>
            </Section>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-bg-card rounded-lg p-4" style={{ border: '1px solid var(--border)' }}>
      <h3 className="text-sm font-medium text-muted mb-3">{title}</h3>
      {children}
    </div>
  )
}
