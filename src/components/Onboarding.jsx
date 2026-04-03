import { useState } from 'react'

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [projectsPath, setProjectsPath] = useState('C:\\Users\\bzcni\\OneDrive\\Desktop\\vs code projects')
  const [apiKey, setApiKey] = useState('')
  const [licenseKey, setLicenseKey] = useState('')
  const [validating, setValidating] = useState(false)
  const [licenseError, setLicenseError] = useState(null)

  async function validateLicense() {
    if (!licenseKey.trim()) {
      setStep(3)
      return
    }
    setValidating(true)
    setLicenseError(null)
    try {
      const result = await window.devpilot.validateLicense(licenseKey.trim())
      if (result.valid) {
        setStep(3)
      } else {
        setLicenseError(result.error || 'Invalid license key')
      }
    } catch {
      setLicenseError('Failed to validate. Check your internet connection.')
    }
    setValidating(false)
  }

  async function finish() {
    // Save API key securely through dedicated handler
    if (apiKey.trim()) {
      await window.devpilot.saveApiKey(apiKey.trim())
    }
    const settings = {
      projectsPath,
      apiKey: '', // Never stored in settings — handled by saveApiKey
      licenseKey: '', // Handled by validateLicense
      theme: 'dark',
      accentColor: '#5DCAA5',
      scanFrequency: 'on-open',
      mrr: 0,
      railwayUrl: 'https://brando-ai-tools-production.up.railway.app/health',
      excludedFolders: ['node_modules', '.git', 'venv', '__pycache__', 'dist', 'build', '.next', '.vscode', 'env'],
      archivedProjects: [],
      onboardingComplete: true,
    }
    await window.devpilot.saveSettings(settings)
    // Re-read settings to get _hasApiKey flag
    const final = await window.devpilot.getSettings()
    onComplete(final || settings)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'var(--bg)' }}>
      <div className="w-[480px]">
        <div className="flex gap-1.5 mb-8 justify-center">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`h-1 rounded-full w-12 transition-colors ${i <= step ? 'bg-accent' : ''}`}
              style={i > step ? { background: 'var(--border)' } : undefined} />
          ))}
        </div>

        {step === 0 && (
          <div className="text-center">
            <div className="text-4xl mb-4">⌘</div>
            <h1 className="text-xl font-semibold mb-2">Welcome to DevPilot</h1>
            <p className="text-sm text-muted mb-8 max-w-[360px] mx-auto">
              Your personal command center for all your coding projects. Let's get you set up in 30 seconds.
            </p>
            <button onClick={() => setStep(1)}
              className="px-6 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-colors">
              Get Started
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold mb-1">Where are your projects?</h2>
            <p className="text-sm text-muted mb-6">Point DevPilot to the folder containing your git repos.</p>
            <input type="text" value={projectsPath} onChange={e => setProjectsPath(e.target.value)}
              className="w-full bg-bg-card rounded-lg px-3 py-2.5 text-sm focus:outline-none mb-6"
              style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
              placeholder="C:\Users\you\projects" />
            <div className="flex justify-between">
              <button onClick={() => setStep(0)} className="text-sm text-muted hover:text-[var(--text)] transition-colors">Back</button>
              <button onClick={() => setStep(2)} disabled={!projectsPath.trim()}
                className="px-5 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50">
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold mb-1">Activate DevPilot</h2>
            <p className="text-sm text-muted mb-6">Enter your license key to unlock Pro. You can skip and use the free tier (3 AI calls/day).</p>
            <label className="block text-xs text-muted mb-1.5">License Key</label>
            <input type="text" value={licenseKey} onChange={e => setLicenseKey(e.target.value)}
              className="w-full bg-bg-card rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none mb-1"
              style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
              placeholder="DPLT-XXXX-XXXX-XXXX" />
            {licenseError && <p className="text-xs text-stale mb-3">{licenseError}</p>}
            <p className="text-xs text-muted/50 mb-6">Free: 3 AI calls/day. Pro: 25/day + priority features.</p>
            <label className="block text-xs text-muted mb-1.5 mt-4">Claude API Key <span className="text-muted/50">(powers AI features)</span></label>
            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
              className="w-full bg-bg-card rounded-lg px-3 py-2.5 text-sm focus:outline-none mb-1"
              style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
              placeholder="sk-ant-..." />
            <p className="text-xs text-muted/50 mb-6">Encrypted locally. Never sent anywhere except Anthropic's API.</p>
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="text-sm text-muted hover:text-[var(--text)] transition-colors">Back</button>
              <div className="flex gap-3">
                <button onClick={() => setStep(3)} className="text-sm text-muted hover:text-[var(--text)] transition-colors">Skip</button>
                <button onClick={validateLicense} disabled={validating}
                  className="px-5 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50">
                  {validating ? 'Validating...' : 'Activate'}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center">
            <div className="text-4xl mb-4">✓</div>
            <h2 className="text-lg font-semibold mb-2">You're all set</h2>
            <p className="text-sm text-muted mb-8">DevPilot will now scan your projects and build your dashboard.</p>
            <button onClick={finish}
              className="px-6 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-colors">
              Launch DevPilot
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
