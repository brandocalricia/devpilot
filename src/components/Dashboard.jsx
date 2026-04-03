import ProjectCard from './ProjectCard'
import GitHeatmap from './GitHeatmap'
import DeployTracker from './DeployTracker'
import AiBriefing from './AiBriefing'

function SkeletonCard() {
  return (
    <div className="bg-bg-card rounded-lg p-4 animate-pulse" style={{ border: '1px solid var(--border)' }}>
      <div className="h-4 rounded w-2/3 mb-3" style={{ background: 'var(--border)' }} />
      <div className="h-3 rounded w-1/2 mb-2" style={{ background: 'var(--border)' }} />
      <div className="h-3 rounded w-3/4" style={{ background: 'var(--border)' }} />
    </div>
  )
}

export default function Dashboard({ projects, activeProjects, heatmapData, loading, onOpenProject, onRefresh, settings, onToggleArchive }) {
  const archivedProjects = projects.filter(p => p.status === 'archived')

  return (
    <div className="max-w-[1100px]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <button onClick={onRefresh}
          className="text-xs text-muted hover:text-[var(--text)] px-3 py-1.5 rounded-md transition-colors"
          style={{ border: '1px solid var(--border)' }}>
          Refresh
        </button>
      </div>

      {!loading && <AiBriefing projects={activeProjects} settings={settings} />}

      <DeployTracker />

      <div className="mb-8">
        <h3 className="text-sm font-medium text-muted mb-3">Activity — Last 30 Days</h3>
        <GitHeatmap data={heatmapData} />
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-medium text-muted mb-3">
          Projects <span style={{ opacity: 0.5 }}>({activeProjects.length})</span>
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : activeProjects.map(p => (
              <ProjectCard key={p.name} project={p} onClick={() => onOpenProject(p)} onToggleArchive={onToggleArchive} />
            ))
        }
      </div>

      {archivedProjects.length > 0 && (
        <>
          <div className="mt-8 mb-4">
            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
              Archived ({archivedProjects.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 opacity-50">
            {archivedProjects.map(p => (
              <ProjectCard key={p.name} project={p} onClick={() => onOpenProject(p)} onToggleArchive={onToggleArchive} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
