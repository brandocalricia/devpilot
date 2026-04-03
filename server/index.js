const express = require('express')
const helmet = require('helmet')
const crypto = require('crypto')
const Anthropic = require('@anthropic-ai/sdk')

const app = express()
app.use(helmet())
app.use(express.json({ limit: '100kb' }))

// --- Config ---
const PORT = process.env.PORT || 3001
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY
const APP_SECRET = process.env.APP_SECRET // shared secret baked into the Electron app
const MODEL = 'claude-haiku-4-5-20251001'
const FREE_LIMIT = 3
const PRO_LIMIT = 25

if (!CLAUDE_API_KEY) { console.error('CLAUDE_API_KEY is required'); process.exit(1) }
if (!APP_SECRET) { console.error('APP_SECRET is required'); process.exit(1) }

const anthropic = new Anthropic({ apiKey: CLAUDE_API_KEY })

// --- In-memory stores ---
// Rate limits: Map<deviceId, { count, date }>
const deviceRates = new Map()
// IP rate limits: Map<ip, { count, date }> — hard ceiling to prevent fingerprint spoofing
const ipRates = new Map()
const IP_CEILING = 50 // max AI calls per IP per day regardless of anything
// License cache: Map<key, { valid, plan, checkedAt }>
const licenseCache = new Map()

// Cleanup stale entries every hour
setInterval(() => {
  const today = new Date().toISOString().split('T')[0]
  for (const [k, v] of deviceRates) { if (v.date !== today) deviceRates.delete(k) }
  for (const [k, v] of ipRates) { if (v.date !== today) ipRates.delete(k) }
}, 3600000)

// --- Middleware: App secret ---
app.use('/api', (req, res, next) => {
  if (req.headers['x-app-secret'] !== APP_SECRET) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  next()
})

// --- Middleware: Extract & validate request identity ---
app.use('/api/ai', (req, res, next) => {
  const deviceId = req.headers['x-device-id']
  if (!deviceId || typeof deviceId !== 'string' || deviceId.length < 16 || deviceId.length > 128) {
    return res.status(400).json({ error: 'Invalid device identifier' })
  }
  // Validate it looks like a hex hash (prevent injection)
  if (!/^[a-f0-9]+$/.test(deviceId)) {
    return res.status(400).json({ error: 'Invalid device identifier format' })
  }
  req.deviceId = deviceId
  next()
})

// --- License validation (cached) ---
async function validateLicenseKey(key) {
  if (!key) return { valid: false }

  const cached = licenseCache.get(key)
  if (cached && Date.now() - cached.checkedAt < 3600000) return cached // 1hr cache

  try {
    const res = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ license_key: key }),
    })
    const data = await res.json()
    const result = {
      valid: !!data.valid,
      plan: data.meta?.variant_name || 'Pro',
      checkedAt: Date.now(),
    }
    licenseCache.set(key, result)
    return result
  } catch {
    if (cached) return cached // use stale cache on network error
    return { valid: false }
  }
}

// --- Rate limiting ---
function checkDeviceRate(deviceId, isPro) {
  const today = new Date().toISOString().split('T')[0]
  const limit = isPro ? PRO_LIMIT : FREE_LIMIT
  const entry = deviceRates.get(deviceId)

  if (!entry || entry.date !== today) {
    deviceRates.set(deviceId, { count: 1, date: today })
    return { allowed: true, remaining: limit - 1, limit }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, limit }
  }

  entry.count++
  return { allowed: true, remaining: limit - entry.count, limit }
}

function checkIpRate(ip) {
  const today = new Date().toISOString().split('T')[0]
  const entry = ipRates.get(ip)

  if (!entry || entry.date !== today) {
    ipRates.set(ip, { count: 1, date: today })
    return true
  }

  if (entry.count >= IP_CEILING) return false
  entry.count++
  return true
}

// --- AI rate limit middleware ---
async function rateLimitMiddleware(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip

  // IP ceiling check
  if (!checkIpRate(ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Try again tomorrow.' })
  }

  // License check
  const licenseKey = req.headers['x-license-key'] || ''
  let isPro = false
  if (licenseKey) {
    const result = await validateLicenseKey(licenseKey)
    isPro = result.valid
  }

  // Device rate check
  const rl = checkDeviceRate(req.deviceId, isPro)
  if (!rl.allowed) {
    const plan = isPro ? 'Pro' : 'Free'
    return res.status(429).json({
      error: `Daily AI limit reached (${rl.limit}/${plan}). ${isPro ? 'Try again tomorrow.' : 'Upgrade to Pro for 25/day.'}`,
      remaining: 0,
    })
  }

  req.isPro = isPro
  req.rateRemaining = rl.remaining
  next()
}

app.use('/api/ai', rateLimitMiddleware)

// --- AI endpoints ---

app.post('/api/ai/briefing', async (req, res) => {
  try {
    const { projects } = req.body
    if (!Array.isArray(projects)) return res.status(400).json({ error: 'Invalid request' })

    const projectSummaries = projects.map(p => {
      const commits = (p.commits || []).map(c => `  - ${c.message}`).join('\n')
      return `[Project: ${p.name}]
Status: ${p.status} (last commit ${p.lastCommitRelative})
Last 5 commits:
${commits || '  (none)'}
Uncommitted changes: ${p.uncommittedCount} files
TODOs found: ${p.todoCount}`
    }).join('\n\n')

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: `You are DevPilot, a personal dev assistant. Here is the current state of all my projects:\n\n${projectSummaries}\n\nGenerate a brief daily briefing (3-5 sentences). Tell me:\n- What I was last working on\n- Which projects need attention (stale, uncommitted changes, many TODOs)\n- What you'd suggest I focus on today\nKeep it casual and direct. No corporate speak.` }],
    })

    res.json({ text: response.content[0].text, remaining: req.rateRemaining })
  } catch (e) {
    console.error('Briefing error:', e.message)
    res.status(500).json({ error: 'AI call failed. Try again later.' })
  }
})

app.post('/api/ai/where-left-off', async (req, res) => {
  try {
    const { projectName, detail } = req.body
    if (!projectName || !detail) return res.status(400).json({ error: 'Invalid request' })

    const commits = (detail.commits || []).map(c => `  ${c.hash?.slice(0, 7)} ${c.message}`).join('\n')
    const uncommitted = (detail.uncommittedFiles || []).join('\n  ') || '(none)'

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: `Here are the recent changes in my project "${projectName}":\n\nLast 20 commits:\n${commits || '(none)'}\n\nUncommitted changes:\n  ${uncommitted}\n\nIn 2-3 sentences, tell me where I left off. What was I working on? What's the next logical step? Be specific — mention file names and features.` }],
    })

    res.json({ text: response.content[0].text, remaining: req.rateRemaining })
  } catch (e) {
    console.error('Where-left-off error:', e.message)
    res.status(500).json({ error: 'AI call failed. Try again later.' })
  }
})

app.post('/api/ai/chat', async (req, res) => {
  try {
    const { question, context, history } = req.body
    if (!question) return res.status(400).json({ error: 'Invalid request' })

    const messages = []
    for (const msg of (history || [])) {
      messages.push({ role: msg.role, content: msg.content })
    }
    messages.push({ role: 'user', content: question })

    const systemContext = context
      ? `You are DevPilot, a personal dev assistant. Here is context about the project:\n\n${context}\n\nAnswer questions about this project. Be specific and reference file names when possible. Keep answers concise.`
      : "You are DevPilot, a personal dev assistant. Answer questions about the user's coding projects. Be specific and concise."

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: systemContext,
      messages,
    })

    res.json({ text: response.content[0].text, remaining: req.rateRemaining })
  } catch (e) {
    console.error('Chat error:', e.message)
    res.status(500).json({ error: 'AI call failed. Try again later.' })
  }
})

// --- Usage status (no rate limit charge) ---
app.get('/api/ai/usage', async (req, res) => {
  const deviceId = req.headers['x-device-id']
  if (!deviceId || !/^[a-f0-9]{16,128}$/.test(deviceId)) {
    return res.status(400).json({ error: 'Invalid device identifier' })
  }

  const licenseKey = req.headers['x-license-key'] || ''
  let isPro = false
  if (licenseKey) {
    const result = await validateLicenseKey(licenseKey)
    isPro = result.valid
  }

  const today = new Date().toISOString().split('T')[0]
  const limit = isPro ? PRO_LIMIT : FREE_LIMIT
  const entry = deviceRates.get(deviceId)
  const used = (entry && entry.date === today) ? entry.count : 0

  res.json({ used, limit, remaining: Math.max(0, limit - used) })
})

// --- Health check ---
app.get('/health', (_, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => console.log(`DevPilot proxy running on port ${PORT}`))
