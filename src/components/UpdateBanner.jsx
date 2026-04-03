import { useState, useEffect } from 'react'

export default function UpdateBanner() {
  const [update, setUpdate] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [ready, setReady] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!window.devpilot.onUpdateAvailable) return

    window.devpilot.onUpdateAvailable((info) => {
      setUpdate(info)
    })

    window.devpilot.onUpdateDownloaded(() => {
      setDownloading(false)
      setReady(true)
    })
  }, [])

  if (dismissed || (!update && !ready)) return null

  return (
    <div className="bg-accent/10 border-b border-accent/20 px-4 py-2 flex items-center justify-between shrink-0">
      <p className="text-xs text-accent">
        {ready
          ? 'Update downloaded. Restart to apply.'
          : downloading
            ? 'Downloading update...'
            : `DevPilot ${update?.version} is available.`
        }
      </p>
      <div className="flex gap-2">
        {ready ? (
          <button
            onClick={() => window.devpilot.installUpdate()}
            className="text-xs px-3 py-1 bg-accent text-bg rounded font-medium hover:bg-accent/90 transition-colors"
          >
            Restart
          </button>
        ) : !downloading ? (
          <button
            onClick={() => { setDownloading(true); window.devpilot.downloadUpdate() }}
            className="text-xs px-3 py-1 bg-accent text-bg rounded font-medium hover:bg-accent/90 transition-colors"
          >
            Update
          </button>
        ) : null}
        <button
          onClick={() => setDismissed(true)}
          className="text-xs text-muted hover:text-white transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  )
}
