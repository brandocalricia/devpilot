const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('devpilot', {
  // Scanning
  scanProjects: (path) => ipcRenderer.invoke('scan-projects', path),
  scanTodos: (path) => ipcRenderer.invoke('scan-todos', path),
  getProjectDetail: (repoPath) => ipcRenderer.invoke('get-project-detail', repoPath),
  openInVSCode: (filePath, line) => ipcRenderer.invoke('open-in-vscode', filePath, line),

  // Settings (license key encrypted at rest)
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  saveLicenseKey: (key) => ipcRenderer.invoke('save-license-key', key),
  getCache: () => ipcRenderer.invoke('get-cache'),
  saveCache: (data) => ipcRenderer.invoke('save-cache', data),

  // Health
  checkHealth: (url) => ipcRenderer.invoke('check-health', url),

  // License
  validateLicense: (key) => ipcRenderer.invoke('validate-license', key),
  deactivateLicense: (key) => ipcRenderer.invoke('deactivate-license', key),

  // AI (proxied through server, rate-limited server-side)
  aiBriefing: (projects) => ipcRenderer.invoke('ai-briefing', projects),
  aiWhereLeftOff: (projectName, detail) => ipcRenderer.invoke('ai-where-left-off', projectName, detail),
  aiChat: (question, context, history) => ipcRenderer.invoke('ai-chat', question, context, history),
  aiUsageStatus: () => ipcRenderer.invoke('ai-usage-status'),

  // Updates
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (_, info) => cb(info)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', () => cb()),
  onUpdateProgress: (cb) => ipcRenderer.on('update-progress', (_, pct) => cb(pct)),
})
