const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const { scanProjects, scanTodos, getProjectDetail } = require('./scanner')
const { generateBriefing, generateWhereILeftOff, chatAboutProject } = require('./ai')
const { validateLicense, deactivateLicense } = require('./license')
const { setupAutoUpdater } = require('./updater')
const { encrypt, decrypt } = require('./crypto')
const { checkAndIncrement, getStatus } = require('./ratelimit')

let mainWindow
const APP_VERSION = require('../package.json').version
const SENSITIVE_KEYS = ['apiKey', 'licenseKey']

// --- Settings with encryption ---

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json')
}

function readSettings() {
  try {
    const raw = JSON.parse(fs.readFileSync(getSettingsPath(), 'utf-8'))
    const decrypted = { ...raw }
    for (const key of SENSITIVE_KEYS) {
      if (decrypted[key]) decrypted[key] = decrypt(decrypted[key])
    }
    return decrypted
  } catch {
    return null
  }
}

function writeSettings(settings) {
  const toStore = { ...settings }
  for (const key of SENSITIVE_KEYS) {
    if (toStore[key] && !toStore[key].includes(':')) {
      // Only encrypt if not already encrypted (no colons = plaintext)
      // Actually check more carefully: encrypted format is hex:hex:hex
      toStore[key] = encrypt(toStore[key])
    } else if (toStore[key]) {
      // Re-encrypt to be safe
      const plain = decrypt(toStore[key])
      toStore[key] = encrypt(plain)
    }
  }
  fs.writeFileSync(getSettingsPath(), JSON.stringify(toStore, null, 2))
}

// Migrate existing plaintext keys on first run
function migrateSettings() {
  try {
    const raw = fs.readFileSync(getSettingsPath(), 'utf-8')
    const settings = JSON.parse(raw)
    let needsMigration = false
    for (const key of SENSITIVE_KEYS) {
      if (settings[key] && settings[key].startsWith('sk-')) {
        needsMigration = true
      }
    }
    if (needsMigration) {
      writeSettings(readSettings())
    }
  } catch {}
}

// --- Window position ---

function getWindowBounds() {
  const boundsPath = path.join(app.getPath('userData'), 'window-bounds.json')
  try {
    return JSON.parse(fs.readFileSync(boundsPath, 'utf-8'))
  } catch {
    return { width: 1200, height: 800 }
  }
}

function saveWindowBounds() {
  if (!mainWindow) return
  const boundsPath = path.join(app.getPath('userData'), 'window-bounds.json')
  fs.writeFileSync(boundsPath, JSON.stringify(mainWindow.getBounds()))
}

// --- Window creation ---

function createWindow() {
  const bounds = getWindowBounds()
  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f0f10',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f0f10',
      symbolColor: '#888780',
      height: 36,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on('close', saveWindowBounds)

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
    setupAutoUpdater(mainWindow)
  }
}

app.whenReady().then(() => {
  migrateSettings()
  createWindow()
})
app.on('window-all-closed', () => app.quit())

// --- IPC: App info ---
ipcMain.handle('get-app-version', () => APP_VERSION)

// --- IPC: Scanning ---
ipcMain.handle('scan-projects', async (_, projectsPath) => scanProjects(projectsPath))
ipcMain.handle('scan-todos', async (_, projectsPath) => scanTodos(projectsPath))
ipcMain.handle('get-project-detail', async (_, repoPath) => getProjectDetail(repoPath))

ipcMain.handle('open-in-vscode', async (_, filePath, line) => {
  const { execSync } = require('child_process')
  try {
    execSync(line ? `code --goto "${filePath}:${line}"` : `code "${filePath}"`)
    return true
  } catch { return false }
})

// --- IPC: Settings (encrypted) ---
// Returns settings with sensitive fields REDACTED for the renderer
ipcMain.handle('get-settings', async () => {
  const settings = readSettings()
  if (!settings) return null
  return {
    ...settings,
    apiKey: settings.apiKey ? '••••••••' : '',
    _hasApiKey: !!settings.apiKey,
    _hasLicenseKey: !!settings.licenseKey,
  }
})

// Save settings — renderer sends plaintext, we encrypt before storing
ipcMain.handle('save-settings', async (_, settings) => {
  // If apiKey is the redacted placeholder, preserve the existing one
  const existing = readSettings() || {}
  const toSave = { ...settings }
  if (toSave.apiKey === '••••••••') {
    toSave.apiKey = existing.apiKey || ''
  }
  if (toSave.licenseKey === '••••••••') {
    toSave.licenseKey = existing.licenseKey || ''
  }
  writeSettings(toSave)
  return true
})

// Dedicated handler for updating just the API key
ipcMain.handle('save-api-key', async (_, key) => {
  const settings = readSettings() || {}
  settings.apiKey = key
  writeSettings(settings)
  return true
})

// Dedicated handler for updating just the license key
ipcMain.handle('save-license-key', async (_, key) => {
  const settings = readSettings() || {}
  settings.licenseKey = key
  writeSettings(settings)
  return true
})

// --- IPC: Health check ---
ipcMain.handle('check-health', async (_, url) => {
  const https = require('https')
  const http = require('http')
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http
    const req = mod.get(url, { timeout: 5000 }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400)
    })
    req.on('error', () => resolve(false))
    req.on('timeout', () => { req.destroy(); resolve(false) })
  })
})

// --- IPC: License ---
ipcMain.handle('validate-license', async (_, key) => {
  const result = await validateLicense(key)
  if (result.valid) {
    const settings = readSettings() || {}
    settings.licenseKey = key
    settings.licensePlan = result.variant || 'pro'
    writeSettings(settings)
  }
  return result
})

ipcMain.handle('deactivate-license', async (_, key) => {
  await deactivateLicense(key)
  const settings = readSettings() || {}
  settings.licenseKey = ''
  settings.licensePlan = ''
  writeSettings(settings)
  return true
})

// --- IPC: Rate-limited AI ---
// All AI calls go through main process using the STORED api key
// The renderer NEVER sees the actual API key

function isPro() {
  const settings = readSettings() || {}
  return !!settings.licenseKey
}

ipcMain.handle('ai-usage-status', async () => {
  return getStatus(app.getPath('userData'), isPro())
})

ipcMain.handle('ai-briefing', async (_, projects) => {
  const rl = checkAndIncrement(app.getPath('userData'), isPro())
  if (!rl.allowed) {
    const plan = isPro() ? 'Pro' : 'Free'
    return { error: `Daily AI limit reached (${rl.limit}/${plan}). ${isPro() ? 'Try again tomorrow.' : 'Upgrade to Pro for 25/day.'}`, remaining: 0 }
  }
  const settings = readSettings()
  if (!settings?.apiKey) return { error: 'No API key configured. Add one in Settings.', remaining: rl.remaining }
  try {
    const text = await generateBriefing(settings.apiKey, projects)
    return { text, remaining: rl.remaining }
  } catch (e) {
    return { error: e.message || 'AI call failed', remaining: rl.remaining }
  }
})

ipcMain.handle('ai-where-left-off', async (_, projectName, detail) => {
  const rl = checkAndIncrement(app.getPath('userData'), isPro())
  if (!rl.allowed) {
    const plan = isPro() ? 'Pro' : 'Free'
    return { error: `Daily AI limit reached (${rl.limit}/${plan}). ${isPro() ? 'Try again tomorrow.' : 'Upgrade to Pro for 25/day.'}`, remaining: 0 }
  }
  const settings = readSettings()
  if (!settings?.apiKey) return { error: 'No API key configured.', remaining: rl.remaining }
  try {
    const text = await generateWhereILeftOff(settings.apiKey, projectName, detail)
    return { text, remaining: rl.remaining }
  } catch (e) {
    return { error: e.message || 'AI call failed', remaining: rl.remaining }
  }
})

ipcMain.handle('ai-chat', async (_, question, context, history) => {
  const rl = checkAndIncrement(app.getPath('userData'), isPro())
  if (!rl.allowed) {
    const plan = isPro() ? 'Pro' : 'Free'
    return { error: `Daily AI limit reached (${rl.limit}/${plan}). ${isPro() ? 'Try again tomorrow.' : 'Upgrade to Pro for 25/day.'}`, remaining: 0 }
  }
  const settings = readSettings()
  if (!settings?.apiKey) return { error: 'No API key configured.', remaining: rl.remaining }
  try {
    const text = await chatAboutProject(settings.apiKey, question, context, history)
    return { text, remaining: rl.remaining }
  } catch (e) {
    return { error: e.message || 'AI call failed', remaining: rl.remaining }
  }
})

// --- IPC: Cache ---
ipcMain.handle('get-cache', async () => {
  const cachePath = path.join(app.getPath('userData'), 'cache.json')
  try { return JSON.parse(fs.readFileSync(cachePath, 'utf-8')) } catch { return {} }
})

ipcMain.handle('save-cache', async (_, data) => {
  const cachePath = path.join(app.getPath('userData'), 'cache.json')
  fs.writeFileSync(cachePath, JSON.stringify(data, null, 2))
  return true
})
