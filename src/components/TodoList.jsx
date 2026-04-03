import { useState, useEffect } from 'react'

export default function TodoList({ settings }) {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterProject, setFilterProject] = useState('all')
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    if (settings?.projectsPath) loadTodos()
  }, [settings?.projectsPath])

  async function loadTodos() {
    setLoading(true)
    const t = await window.devpilot.scanTodos(settings.projectsPath)
    setTodos(t)
    setLoading(false)
  }

  const projects = [...new Set(todos.map(t => t.project))]
  const types = [...new Set(todos.map(t => t.type))]
  const filtered = todos.filter(t => {
    if (filterProject !== 'all' && t.project !== filterProject) return false
    if (filterType !== 'all' && t.type !== filterType) return false
    return true
  })

  return (
    <div className="max-w-[900px]">
      <h2 className="text-xl font-semibold mb-6">TODOs</h2>
      <div className="flex gap-4 mb-4">
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
          className="text-xs bg-bg-card rounded-md px-2 py-1.5" style={{ border: '1px solid var(--border-val)', color: 'rgb(var(--text-rgb))' }}>
          <option value="all">All projects</option>
          {projects.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="text-xs bg-bg-card rounded-md px-2 py-1.5" style={{ border: '1px solid var(--border-val)', color: 'rgb(var(--text-rgb))' }}>
          <option value="all">All types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="text-xs text-muted self-center ml-auto">{filtered.length} items</span>
      </div>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 rounded animate-pulse" style={{ background: 'var(--border-val)' }} />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((t, i) => (
            <button key={i} onClick={() => window.devpilot.openInVSCode(t.file, t.line)}
              className="flex items-center gap-3 w-full text-left p-2 rounded-md hover:bg-bg-hover transition-colors">
              <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                t.type === 'FIXME' ? 'text-stale' : t.type === 'HACK' ? 'text-paused' : 'text-muted'
              }`} style={{
                background: t.type === 'FIXME' ? 'rgba(226,75,74,0.2)' :
                             t.type === 'HACK' ? 'rgba(239,159,39,0.2)' : 'var(--border-val)'
              }}>{t.type}</span>
              <span className="text-sm truncate flex-1" style={{ opacity: 0.8 }}>{t.text}</span>
              <span className="text-xs text-accent shrink-0" style={{ opacity: 0.6 }}>{t.project}</span>
              <span className="text-xs text-muted shrink-0 font-mono" style={{ opacity: 0.4 }}>{t.relativePath}:{t.line}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
