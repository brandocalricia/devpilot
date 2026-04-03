import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

if (!window.devpilot) {
  window.devpilot = {
    scanProjects: async () => ({ projects: [], heatmapData: {} }),
    scanTodos: async () => [],
    getProjectDetail: async () => ({ commits: [], uncommittedFiles: [], todos: [], readme: '' }),
    openInVSCode: async () => true,
    getSettings: async () => null,
    saveSettings: async () => true,
    saveLicenseKey: async () => true,
    getCache: async () => ({}),
    saveCache: async () => true,
    checkHealth: async () => false,
    validateLicense: async () => ({ valid: false, error: 'Browser mode' }),
    deactivateLicense: async () => true,
    aiBriefing: async () => ({ error: 'Browser mode — run in Electron' }),
    aiWhereLeftOff: async () => ({ error: 'Browser mode' }),
    aiChat: async () => ({ error: 'Browser mode' }),
    aiUsageStatus: async () => ({ used: 0, limit: 3, remaining: 3 }),
    getAppVersion: async () => '1.0.0',
    checkForUpdates: async () => null,
    downloadUpdate: async () => false,
    installUpdate: () => {},
    onUpdateAvailable: () => {},
    onUpdateDownloaded: () => {},
    onUpdateProgress: () => {},
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
