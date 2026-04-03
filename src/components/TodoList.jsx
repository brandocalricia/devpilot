import { useState, useEffect, useRef } from 'react'

export default function TodoList({ settings }) {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterProject, setFilterProject] = useState('all')
  const [completed, setCompleted] = useState({})
  const [showCompleted, setShowCompleted] = useState(false)
  const [animating, setAnimating] = useState(null)

  useEffect(() => {
    if (settings?.projectsPath) loadTodos()
    loadCompleted()
  }, [settings?.projectsPath])

  async function loadTodos() {
    setLoading(true)
    const t = await window.devpilot.scanTodos(settings.projectsPath)
    setTodos(t)
    setLoading(false)
  }

  async function loadCompleted() {
    const cache = await window.devpilot.getCache()
    if (cache?.completedTodos) setCompleted(cache.completedTodos)
  }

  function todoKey(t) {
    return `${t.project}:${t.relativePath}:${t.line}`
  }

  async function toggleComplete(todo) {
    const key = todoKey(todo)
    if (completed[key]) {
      const next = { ...completed }
      delete next[key]
      setCompleted(next)
      await saveCompleted(next)
    } else {
      setAnimating(key)
      setTimeout(async () => {
        const next = { ...completed, [key]: Date.now() }
        setCompleted(next)
        setAnimating(null)
        await saveCompleted(next)
      }, 600)
    }
  }

  async function saveCompleted(data) {
    const cache = await window.devpilot.getCache()
    await window.devpilot.saveCache({ ...cache, completedTodos: data })
  }

  const projects = [...new Set(todos.map(t => t.project))]
  const filtered = todos.filter(t => {
    if (filterProject !== 'all' && t.project !== filterProject) return false
    const key = todoKey(t)
    if (!showCompleted && completed[key]) return false
    return true
  })

  const priorityOrder = { FIXME: 0, HACK: 1, XXX: 2, TODO: 3, TASK: 4 }
  const sorted = [...filtered].sort((a, b) => {
    const ac = completed[todoKey(a)] ? 1 : 0
    const bc = completed[todoKey(b)] ? 1 : 0
    if (ac !== bc) return ac - bc
    return (priorityOrder[a.type] ?? 5) - (priorityOrder[b.type] ?? 5)
  })

  const activeCount = todos.filter(t => !completed[todoKey(t)]).length
  const completedCount = todos.filter(t => completed[todoKey(t)]).length

  function priorityDot(type) {
    if (type === 'FIXME') return { color: '#E24B4A', label: 'Fix needed' }
    if (type === 'HACK') return { color: '#EF9F27', label: 'Needs cleanup' }
    return { color: 'rgb(var(--text-muted-rgb))', label: type }
  }

  return (
    <div className="max-w-[900px]">
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold">Action Items</h2>
        <span className="text-xs text-muted">{activeCount} open</span>
        {completedCount > 0 && (
          <button
            onClick={() => setShowCompleted(v => !v)}
            className="text-xs text-muted hover:text-accent transition-colors ml-auto"
          >
            {showCompleted ? 'Hide' : 'Show'} {completedCount} completed
          </button>
        )}
      </div>

      <div className="flex gap-4 mb-4">
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
          className="text-xs bg-bg-card rounded-md px-2 py-1.5" style={{ border: '1px solid var(--border-val)', color: 'rgb(var(--text-rgb))' }}>
          <option value="all">All projects</option>
          {projects.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 rounded animate-pulse" style={{ background: 'var(--border-val)' }} />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 text-muted text-sm">
          {todos.length === 0 ? 'No action items found in your projects.' : 'All caught up!'}
        </div>
      ) : (
        <div className="space-y-1">
          {sorted.map((t, i) => {
            const key = todoKey(t)
            const done = !!completed[key]
            const isAnimating = animating === key
            const dot = priorityDot(t.type)

            return (
              <div
                key={key}
                className={`flex items-center gap-3 w-full p-2 rounded-md transition-all duration-300 ${
                  isAnimating ? 'scale-[0.98] opacity-50' : ''
                } ${done ? 'opacity-40' : 'hover:bg-bg-hover'}`}
                style={isAnimating ? { transform: 'scale(0.98)', transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)' } : undefined}
              >
                {/* Checkbox */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleComplete(t) }}
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300"
                  style={{
                    border: done ? 'none' : `2px solid ${dot.color}`,
                    background: done || isAnimating ? 'rgb(var(--accent-rgb))' : 'transparent',
                  }}
                >
                  {(done || isAnimating) && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={isAnimating ? 'animate-check' : ''}>
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={isAnimating ? {
                          strokeDasharray: 12,
                          strokeDashoffset: 0,
                          animation: 'checkDraw 0.4s ease-out forwards',
                        } : undefined}
                      />
                    </svg>
                  )}
                </button>

                {/* Priority indicator */}
                <span className="shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: dot.color, opacity: done ? 0.3 : 0.8 }} />

                {/* Content - clickable to open in VS Code */}
                <button
                  onClick={() => window.devpilot.openInVSCode(t.file, t.line)}
                  className={`flex-1 text-left text-sm truncate transition-all ${done ? 'line-through' : ''}`}
                  style={{ opacity: done ? 0.5 : 0.85 }}
                >
                  {t.text}
                </button>

                <span className="text-xs text-accent shrink-0" style={{ opacity: 0.5 }}>{t.project}</span>
                <span className="text-xs text-muted shrink-0 font-mono" style={{ opacity: 0.3 }}>{t.relativePath}:{t.line}</span>
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes checkDraw {
          from { stroke-dashoffset: 12; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  )
}
