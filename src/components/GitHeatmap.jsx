export default function GitHeatmap({ data }) {
  const today = new Date()
  const days = []

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    days.push({ date: key, count: data[key] || 0 })
  }

  const maxCount = Math.max(...days.map(d => d.count), 1)

  function getOpacity(count) {
    if (count === 0) return 0.04
    const intensity = count / maxCount
    if (intensity > 0.75) return 1
    if (intensity > 0.5) return 0.7
    if (intensity > 0.25) return 0.4
    return 0.2
  }

  return (
    <div className="bg-bg-card rounded-lg p-4" style={{ border: '1px solid var(--border-val)' }}>
      <div className="flex gap-1 flex-wrap">
        {days.map(d => (
          <div
            key={d.date}
            className="w-[18px] h-[18px] rounded-sm transition-colors"
            style={{
              backgroundColor: d.count === 0 ? 'var(--border-val)' : `rgb(var(--accent-rgb) / ${getOpacity(d.count)})`,
            }}
            title={`${d.date}: ${d.count} commit${d.count !== 1 ? 's' : ''}`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2 text-xs" style={{ color: 'rgb(var(--text-muted-rgb))', opacity: 0.5 }}>
        <span>30 days ago</span>
        <span>Today</span>
      </div>
    </div>
  )
}
