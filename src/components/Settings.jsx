import { useState, useEffect } from 'react'
import { useTheme, ACCENT_PRESETS } from './ThemeContext'

export default function Settings({ settings, onSave }) {
  const [form, setForm] = useState(settings || {})
  const [version, setVersion] = useState('')
  const [licenseInput, setLicenseInput] = useState('')
  const [licenseStatus, setLicenseStatus] = useState(null)
  const [validating, setValidating] = useState(false)
  const [aiUsage, setAiUsage] = useState(null)
  const { theme, accent, toggleTheme, setAccentColor } = useTheme()

  useEffect(() => {
    if (settings) setForm(settings)
    if (window.devpilot.getAppVersion) window.devpilot.getAppVersion().then(setVersion)
    if (window.devpilot.aiUsageStatus) window.devpilot.aiUsageStatus().then(setAiUsage)
  }, [settings])

  function update(key, value) {
    const next = { ...form, [key]: value }
    setForm(next)
    onSave(next)
  }

  async function activateLicense() {
    if (!licenseInput.trim()) return
    setValidating(true)
    setLicenseStatus(null)
    try {
      const result = await window.devpilot.validateLicense(licenseInput.trim())
      if (result.valid) {
        setLicenseStatus({ ok: true, msg: `License activated — ${result.variant || 'Pro'} plan` })
        setLicenseInput('')
        const s = await window.devpilot.getSettings()
        if (s) { setForm(s); onSave(s) }
        // Refresh usage to show pro limits
        if (window.devpilot.aiUsageStatus) window.devpilot.aiUsageStatus().then(setAiUsage)
      } else {
        setLicenseStatus({ ok: false, msg: result.error || 'Invalid license key' })
      }
    } catch {
      setLicenseStatus({ ok: false, msg: 'Failed to validate. Check your connection.' })
    }
    setValidating(false)
  }

  async function removeLicense() {
    await window.devpilot.deactivateLicense(form.licenseKey || '')
    const s = await window.devpilot.getSettings()
    if (s) { setForm(s); onSave(s) }
    setLicenseStatus(null)
    if (window.devpilot.aiUsageStatus) window.devpilot.aiUsageStatus().then(setAiUsage)
  }

  const isPro = !!form._hasLicenseKey

  return (
    <div className="max-w-[600px]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Settings</h2>
        {version && <span className="text-xs text-muted/50">v{version}</span>}
      </div>

      <div className="space-y-5">
        {/* License */}
        <div className="bg-bg-card rounded-lg p-4" style={{ border: '1px solid var(--border-val)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">License</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${isPro ? 'text-accent' : 'text-muted'}`}
              style={isPro ? { background: 'rgb(var(--accent-rgb) / 0.2)' } : { background: 'var(--border-val)' }}>
              {isPro ? (form.licensePlan || 'Pro') : 'Free'}
            </span>
          </div>
          {isPro ? (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted">License active</p>
              <button onClick={removeLicense} className="text-xs text-stale hover:text-stale/80 transition-colors">Deactivate</button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={licenseInput}
                  onChange={e => setLicenseInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') activateLicense() }}
                  placeholder="DPLT-XXXX-XXXX-XXXX"
                  className="flex-1 bg-bg rounded-md px-3 py-2 text-sm font-mono focus:outline-none"
                  style={{ border: '1px solid var(--border-val)', color: 'rgb(var(--text-rgb))' }}
                />
                <button
                  onClick={activateLicense}
                  disabled={validating || !licenseInput.trim()}
                  className="px-4 py-2 bg-accent text-white rounded-md text-xs font-medium hover:opacity-90 transition-colors disabled:opacity-50"
                >
                  {validating ? '...' : 'Activate'}
                </button>
              </div>
              {licenseStatus && (
                <p className={`text-xs mt-2 ${licenseStatus.ok ? 'text-accent' : 'text-stale'}`}>{licenseStatus.msg}</p>
              )}
              <p className="text-xs text-muted/40 mt-2">Free: 3 AI calls/day. Pro: 25 AI calls/day + priority features.</p>
            </>
          )}
        </div>

        {/* AI Usage */}
        {aiUsage && (
          <div className="bg-bg-card rounded-lg p-4" style={{ border: '1px solid var(--border-val)' }}>
            <h3 className="text-sm font-medium mb-2">AI Usage Today</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-val)' }}>
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(aiUsage.used / aiUsage.limit) * 100}%` }} />
              </div>
              <span className="text-xs text-muted">{aiUsage.used}/{aiUsage.limit}</span>
            </div>
          </div>
        )}

        {/* Appearance */}
        <div className="bg-bg-card rounded-lg p-4" style={{ border: '1px solid var(--border-val)' }}>
          <h3 className="text-sm font-medium mb-3">Appearance</h3>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted">Theme</span>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md transition-colors"
              style={{ border: '1px solid var(--border-val)', color: 'rgb(var(--text-rgb))' }}
            >
              {theme === 'dark' ? '☀ Light' : '☾ Dark'}
            </button>
          </div>
          <div>
            <span className="text-xs text-muted block mb-2">Accent Color</span>
            <div className="flex gap-2 flex-wrap">
              {ACCENT_PRESETS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setAccentColor(p.value)}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{
                    backgroundColor: p.value,
                    outline: accent === p.value ? `2px solid ${p.value}` : 'none',
                    outlineOffset: '2px',
                  }}
                  title={p.name}
                />
              ))}
              <label className="w-7 h-7 rounded-full cursor-pointer overflow-hidden relative" style={{ border: '2px dashed var(--border-val)' }}>
                <input
                  type="color"
                  value={accent}
                  onChange={e => setAccentColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs text-muted">+</span>
              </label>
            </div>
          </div>
        </div>

        <Field label="Projects Folder Path">
          <input
            type="text"
            value={form.projectsPath || ''}
            onChange={e => update('projectsPath', e.target.value)}
            className="w-full bg-bg-card rounded-md px-3 py-2 text-sm focus:outline-none"
            style={{ border: '1px solid var(--border-val)', color: 'rgb(var(--text-rgb))' }}
          />
        </Field>

        <Field label="Scan Frequency">
          <select
            value={form.scanFrequency || 'on-open'}
            onChange={e => update('scanFrequency', e.target.value)}
            className="bg-bg-card rounded-md px-3 py-2 text-sm"
            style={{ border: '1px solid var(--border-val)', color: 'rgb(var(--text-rgb))' }}
          >
            <option value="on-open">On app open</option>
            <option value="hourly">Every hour</option>
            <option value="manual">Manual only</option>
          </select>
        </Field>

        <Field label="Railway Health URL">
          <input
            type="text"
            value={form.railwayUrl || ''}
            onChange={e => update('railwayUrl', e.target.value)}
            className="w-full bg-bg-card rounded-md px-3 py-2 text-sm focus:outline-none"
            style={{ border: '1px solid var(--border-val)', color: 'rgb(var(--text-rgb))' }}
          />
        </Field>

        <Field label="Monthly Recurring Revenue ($)">
          <input
            type="number"
            value={form.mrr || 0}
            onChange={e => update('mrr', Number(e.target.value))}
            className="w-40 bg-bg-card rounded-md px-3 py-2 text-sm focus:outline-none"
            style={{ border: '1px solid var(--border-val)', color: 'rgb(var(--text-rgb))' }}
          />
        </Field>

        <Field label="Excluded Folders">
          <input
            type="text"
            value={(form.excludedFolders || []).join(', ')}
            onChange={e => update('excludedFolders', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            className="w-full bg-bg-card rounded-md px-3 py-2 text-sm text-muted focus:outline-none"
            style={{ border: '1px solid var(--border-val)' }}
          />
          <p className="text-xs text-muted/50 mt-1">Comma-separated list</p>
        </Field>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-muted mb-1.5">{label}</label>
      {children}
    </div>
  )
}
