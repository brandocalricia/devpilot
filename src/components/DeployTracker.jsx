import { useState, useEffect } from 'react'

export default function DeployTracker() {
  const [railwayUp, setRailwayUp] = useState(null)

  useEffect(() => { checkRailway() }, [])

  async function checkRailway() {
    try {
      const settings = await window.devpilot.getSettings()
      if (!settings?.railwayUrl) return
      if (window.devpilot.checkHealth) {
        setRailwayUp(await window.devpilot.checkHealth(settings.railwayUrl))
      } else {
        const res = await fetch(settings.railwayUrl, { signal: AbortSignal.timeout(5000) })
        setRailwayUp(res.ok)
      }
    } catch { setRailwayUp(false) }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <MetricCard label="Railway" value={railwayUp === null ? '...' : railwayUp ? 'Online' : 'Down'}
        color={railwayUp === null ? 'var(--text-muted)' : railwayUp ? 'var(--accent)' : '#E24B4A'} />
      <MetricCard label="Extensions" value="5" />
      <MetricCard label="MRR" value="—" color="var(--text-muted)" />
      <MetricCard label="API Calls" value="0" color="var(--text-muted)" sub="this session" />
    </div>
  )
}

function MetricCard({ label, value, color, sub }) {
  return (
    <div className="bg-bg-card rounded-lg p-3" style={{ border: '1px solid var(--border)' }}>
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="text-lg font-semibold" style={{ color: color || 'var(--text)' }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>{sub}</p>}
    </div>
  )
}
