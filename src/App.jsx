import { useState, useEffect } from 'react'
import { ThemeProvider } from './components/ThemeContext'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import ProjectsPage from './components/ProjectsPage'
import ProjectDetail from './components/ProjectDetail'
import TodoList from './components/TodoList'
import ProjectChat from './components/ProjectChat'
import Settings from './components/Settings'
import QuickOpen from './components/QuickOpen'
import Onboarding from './components/Onboarding'
import UpdateBanner from './components/UpdateBanner'

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [projects, setProjects] = useState([])
  const [heatmapData, setHeatmapData] = useState({})
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState(null)
  const [quickOpenVisible, setQuickOpenVisible] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  useEffect(() => {
    loadSettings()
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setQuickOpenVisible(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (settings?.projectsPath && !showOnboarding) scan()
  }, [settings?.projectsPath, showOnboarding])

  async function loadSettings() {
    const s = await window.devpilot.getSettings()
    if (!s || !s.onboardingComplete) {
      setShowOnboarding(true)
      setLoading(false)
    } else {
      setSettings(s)
    }
    setSettingsLoaded(true)
  }

  function onOnboardingComplete(s) {
    setSettings(s)
    setShowOnboarding(false)
  }

  async function updateSettings(newSettings) {
    setSettings(newSettings)
    await window.devpilot.saveSettings(newSettings)
  }

  async function scan() {
    setLoading(true)
    try {
      const result = await window.devpilot.scanProjects(settings.projectsPath)
      const archived = settings?.archivedProjects || []
      const withStatus = result.projects.map(p => ({
        ...p,
        status: archived.includes(p.name) ? 'archived' : p.status,
      }))
      setProjects(withStatus)
      setHeatmapData(result.heatmapData)
    } catch (e) {
      console.error('Scan failed:', e)
    }
    setLoading(false)
  }

  function toggleArchive(projectName) {
    const archived = settings?.archivedProjects || []
    const next = archived.includes(projectName)
      ? archived.filter(n => n !== projectName)
      : [...archived, projectName]
    const newSettings = { ...settings, archivedProjects: next }
    updateSettings(newSettings)
    setProjects(prev => prev.map(p => ({
      ...p,
      status: next.includes(p.name) ? 'archived' : (p.status === 'archived' ? 'stale' : p.status),
    })))
  }

  function openProject(project) {
    setSelectedProject(project)
    setPage('project-detail')
  }

  const activeProjects = projects.filter(p => p.status !== 'archived')

  if (!settingsLoaded) return null
  if (showOnboarding) return <Onboarding onComplete={onOnboardingComplete} />

  function renderPage() {
    switch (page) {
      case 'dashboard':
        return <Dashboard projects={projects} activeProjects={activeProjects} heatmapData={heatmapData} loading={loading} onOpenProject={openProject} onRefresh={scan} settings={settings} onToggleArchive={toggleArchive} />
      case 'projects':
        return <ProjectsPage projects={projects} loading={loading} onOpenProject={openProject} onToggleArchive={toggleArchive} />
      case 'project-detail':
        return <ProjectDetail project={selectedProject} onBack={() => setPage('projects')} settings={settings} onToggleArchive={toggleArchive} />
      case 'todos':
        return <TodoList settings={settings} />
      case 'chat':
        return <ProjectChat projects={activeProjects} settings={settings} />
      case 'settings':
        return <Settings settings={settings} onSave={updateSettings} />
      default:
        return <Dashboard projects={projects} activeProjects={activeProjects} heatmapData={heatmapData} loading={loading} onOpenProject={openProject} onRefresh={scan} settings={settings} onToggleArchive={toggleArchive} />
    }
  }

  return (
    <ThemeProvider settings={settings} onSaveSettings={updateSettings}>
      <div className="flex h-screen" style={{ background: 'rgb(var(--bg-rgb))', color: 'rgb(var(--text-rgb))' }}>
        <Sidebar active={page} onNavigate={(p) => { setPage(p); setSelectedProject(null) }} />
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'rgb(var(--bg-rgb))' }}>
          <UpdateBanner />
          <main className="flex-1 overflow-y-auto p-6 pt-10">
            {renderPage()}
          </main>
        </div>
        {quickOpenVisible && (
          <QuickOpen
            projects={activeProjects}
            onSelect={(p) => { openProject(p); setQuickOpenVisible(false) }}
            onClose={() => setQuickOpenVisible(false)}
          />
        )}
      </div>
    </ThemeProvider>
  )
}
