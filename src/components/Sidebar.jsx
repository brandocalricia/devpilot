import { useTheme } from './ThemeContext'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '⌘' },
  { id: 'projects', label: 'Projects', icon: '◫' },
  { id: 'todos', label: 'TODOs', icon: '☑' },
  { id: 'chat', label: 'Chat', icon: '◉' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
]

export default function Sidebar({ active, onNavigate }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <aside className="w-[200px] bg-bg-sidebar shrink-0 flex flex-col pt-10" style={{ borderRight: '1px solid var(--border)' }}>
      <div className="px-5 mb-8">
        <h1 className="text-lg font-semibold tracking-tight">DevPilot</h1>
        <p className="text-xs text-muted mt-0.5">Command Center</p>
      </div>
      <nav className="flex-1 px-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors mb-0.5 ${
              active === item.id
                ? 'text-accent'
                : 'text-muted hover:text-[var(--text)]'
            }`}
            style={active === item.id ? { background: 'rgba(var(--accent-rgb), 0.1)' } : undefined}
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="px-3 pb-4 space-y-2">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs text-muted hover:text-[var(--text)] transition-colors"
        >
          <span className="text-base w-5 text-center">{theme === 'dark' ? '☀' : '☾'}</span>
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <p className="px-3 text-xs text-muted/50">Ctrl+K to search</p>
      </div>
    </aside>
  )
}
