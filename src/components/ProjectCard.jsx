const statusColors = {
  active: 'text-accent',
  paused: 'text-paused',
  stale: 'text-stale',
  archived: 'text-muted',
}

const statusDots = {
  active: 'bg-accent',
  paused: 'bg-paused',
  stale: 'bg-stale',
  archived: 'bg-muted',
}

const statusLabels = {
  active: 'Active',
  paused: 'Paused',
  stale: 'Stale',
  archived: 'Archived',
}

export default function ProjectCard({ project, onClick, onToggleArchive }) {
  const isArchived = project.status === 'archived'
  const healthScore = Math.max(0, 100 - project.daysSince * 2 - project.uncommittedCount * 5 - project.todoCount)

  return (
    <div className="bg-bg-card rounded-lg p-4 text-left hover:bg-bg-hover transition-all group relative"
      style={{ border: '1px solid var(--border)' }}>
      <button onClick={onClick} className="w-full text-left">
        <div className="flex items-start justify-between mb-2">
          <h3 className={`text-sm font-medium truncate mr-2 transition-colors ${isArchived ? 'text-muted' : 'group-hover:text-accent'}`}>
            {project.name}
          </h3>
          <span className="shrink-0 flex items-center gap-1.5 text-xs">
            <span className={`w-1.5 h-1.5 rounded-full ${statusDots[project.status]}`} />
            <span className="text-muted">{statusLabels[project.status]}</span>
          </span>
        </div>
        <p className="text-xs text-muted truncate mb-3">{project.lastCommitMessage}</p>
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {project.languages.slice(0, 3).map(l => (
            <span key={l.lang} className="text-xs px-1.5 py-0.5 rounded text-muted" style={{ background: 'var(--border)' }}>
              {l.lang} {l.pct}%
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-muted">
          <span>{project.lastCommitRelative}</span>
          <div className="flex gap-3">
            {project.uncommittedCount > 0 && <span className="text-paused">{project.uncommittedCount} changed</span>}
            {project.todoCount > 0 && <span>{project.todoCount} TODOs</span>}
          </div>
        </div>
        {!isArchived && (
          <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${Math.max(5, healthScore)}%`,
                backgroundColor: healthScore > 60 ? 'var(--accent)' : healthScore > 30 ? '#EF9F27' : '#E24B4A',
              }} />
          </div>
        )}
      </button>
      {onToggleArchive && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleArchive(project.name) }}
          className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded transition-all opacity-0 group-hover:opacity-60 hover:!opacity-100 text-muted"
          title={isArchived ? 'Unarchive' : 'Archive'}
        >
          {isArchived ? '↩' : '✕'}
        </button>
      )}
    </div>
  )
}
