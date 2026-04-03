const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const https = require('https')
const http = require('http')
const crypto = require('crypto')
const os = require('os')
const { scanProjects, scanTodos, getProjectDetail } = require('./scanner')
const { validateLicense, deactivateLicense } = require('./license')
const { setupAutoUpdater } = require('./updater')
const { encrypt, decrypt } = require('./crypto')

let mainWindow
const APP_VERSION = require('../package.json').version
const SENSITIVE_KEYS = ['licenseKey']

// --- Server config ---
const API_BASE = 'https://devpilot-brando.up.railway.app'
const APP_SECRET = '07c362b9f48e04e1063dd482a4c9c52ded10836f6f86256d74a95b7ea790e083'

// --- Device fingerprint ---
function getDeviceId() {
  const raw = `devpilot-${os.hostname()}-${os.userInfo().username}-${os.cpus()[0]?.model || 'cpu'}-${os.platform()}-${os.arch()}`
  return crypto.createHash('sha256').update(raw).digest('hex')
}

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
      toStore[key] = encrypt(toStore[key])
    } else if (toStore[key]) {
      const plain = decrypt(toStore[key])
      toStore[key] = encrypt(plain)
    }
  }
  fs.writeFileSync(getSettingsPath(), JSON.stringify(toStore, null, 2))
}

function migrateSettings() {
  try {
    const raw = fs.readFileSync(getSettingsPath(), 'utf-8')
    const settings = JSON.parse(raw)
    // Remove old apiKey field if present
    if (settings.apiKey) {
      delete settings.apiKey
      fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2))
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

function getSavedTheme() {
  try {
    const raw = JSON.parse(fs.readFileSync(getSettingsPath(), 'utf-8'))
    return raw.theme || 'dark'
  } catch { return 'dark' }
}

// --- Window creation ---

function createWindow() {
  const bounds = getWindowBounds()
  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: getSavedTheme() === 'light' ? '#f8f8fa' : '#0f0f10',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: getSavedTheme() === 'light' ? '#f0f0f3' : '#0f0f10',
      symbolColor: getSavedTheme() === 'light' ? '#6b6b6b' : '#888780',
      height: 36,
    },
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
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

// --- Proxy helper ---

function proxyRequest(method, urlPath, body, licenseKey) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, API_BASE)
    const isHttps = url.protocol === 'https:'
    const mod = isHttps ? https : http
    const payload = body ? JSON.stringify(body) : null

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-app-secret': APP_SECRET,
        'x-device-id': getDeviceId(),
      },
      timeout: 30000,
    }

    if (licenseKey) options.headers['x-license-key'] = licenseKey
    if (payload) options.headers['Content-Length'] = Buffer.byteLength(payload)

    const req = mod.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch {
          reject(new Error('Invalid response from server'))
        }
      })
    })

    req.on('error', (e) => reject(new Error(`Server unreachable: ${e.message}`)))
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')) })
    if (payload) req.write(payload)
    req.end()
  })
}

function getLicenseKey() {
  const settings = readSettings() || {}
  return settings.licenseKey || ''
}

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

// --- IPC: Theme color sync ---
ipcMain.handle('set-theme-colors', async (_, bgColor) => {
  if (mainWindow) {
    mainWindow.setBackgroundColor(bgColor)
    const isLight = bgColor !== 'rgb(15, 15, 16)'
    mainWindow.setTitleBarOverlay({
      color: isLight ? '#f0f0f3' : '#0f0f10',
      symbolColor: isLight ? '#6b6b6b' : '#888780',
    })
  }
})

// --- IPC: Settings (encrypted) ---
ipcMain.handle('get-settings', async () => {
  const settings = readSettings()
  if (!settings) return null
  return {
    ...settings,
    licenseKey: settings.licenseKey ? '••••••••' : '',
    _hasLicenseKey: !!settings.licenseKey,
  }
})

ipcMain.handle('save-settings', async (_, settings) => {
  const existing = readSettings() || {}
  const toSave = { ...settings }
  if (toSave.licenseKey === '••••••••') {
    toSave.licenseKey = existing.licenseKey || ''
  }
  // Never store apiKey anymore
  delete toSave.apiKey
  delete toSave._hasApiKey
  writeSettings(toSave)
  return true
})

ipcMain.handle('save-license-key', async (_, key) => {
  const settings = readSettings() || {}
  settings.licenseKey = key
  writeSettings(settings)
  return true
})

// --- IPC: Health check ---
ipcMain.handle('check-health', async (_, url) => {
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

// --- IPC: AI (proxied through server) ---

ipcMain.handle('ai-usage-status', async () => {
  try {
    return await proxyRequest('GET', '/api/ai/usage', null, getLicenseKey())
  } catch {
    return { used: 0, limit: 3, remaining: 3 }
  }
})

ipcMain.handle('ai-briefing', async (_, projects) => {
  try {
    return await proxyRequest('POST', '/api/ai/briefing', { projects }, getLicenseKey())
  } catch (e) {
    return { error: e.message || 'Failed to reach AI server.' }
  }
})

ipcMain.handle('ai-where-left-off', async (_, projectName, detail) => {
  try {
    return await proxyRequest('POST', '/api/ai/where-left-off', { projectName, detail }, getLicenseKey())
  } catch (e) {
    return { error: e.message || 'Failed to reach AI server.' }
  }
})

ipcMain.handle('ai-chat', async (_, question, context, history) => {
  try {
    return await proxyRequest('POST', '/api/ai/chat', { question, context, history }, getLicenseKey())
  } catch (e) {
    return { error: e.message || 'Failed to reach AI server.' }
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
