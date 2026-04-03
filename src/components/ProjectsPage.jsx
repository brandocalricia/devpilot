import { useState } from 'react'
import ProjectCard from './ProjectCard'

export default function ProjectsPage({ projects, loading, onOpenProject, onToggleArchive }) {
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all'
    ? projects.filter(p => p.status !== 'archived')
    : filter === 'archived'
      ? projects.filter(p => p.status === 'archived')
      : projects.filter(p => p.status === filter)

  return (
    <div className="max-w-[1100px]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Projects</h2>
        <div className="flex gap-1">
          {['all', 'active', 'paused', 'stale', 'archived'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                filter === f ? 'bg-bg-hover' : 'text-muted hover:bg-bg-hover'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ${filter === 'archived' ? 'opacity-60' : ''}`}>
        {filtered.map(p => (
          <ProjectCard key={p.name} project={p} onClick={() => onOpenProject(p)} onToggleArchive={onToggleArchive} />
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted/50 col-span-3 text-center py-8">No projects in this category</p>
        )}
      </div>
    </div>
  )
}
