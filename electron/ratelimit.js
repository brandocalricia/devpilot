const fs = require('fs')
const path = require('path')

// Free: 3 AI calls/day, Pro: 25 AI calls/day
const LIMITS = { free: 3, pro: 25 }

function getUsagePath(userDataPath) {
  return path.join(userDataPath, 'ai-usage.json')
}

function getUsage(userDataPath) {
  const usagePath = getUsagePath(userDataPath)
  try {
    const data = JSON.parse(fs.readFileSync(usagePath, 'utf-8'))
    const today = new Date().toISOString().split('T')[0]
    if (data.date !== today) {
      return { date: today, count: 0 }
    }
    return data
  } catch {
    return { date: new Date().toISOString().split('T')[0], count: 0 }
  }
}

function saveUsage(userDataPath, usage) {
  const usagePath = getUsagePath(userDataPath)
  fs.writeFileSync(usagePath, JSON.stringify(usage))
}

function checkAndIncrement(userDataPath, isPro) {
  const usage = getUsage(userDataPath)
  const limit = isPro ? LIMITS.pro : LIMITS.free
  if (usage.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      limit,
      used: usage.count,
    }
  }
  usage.count++
  saveUsage(userDataPath, usage)
  return {
    allowed: true,
    remaining: limit - usage.count,
    limit,
    used: usage.count,
  }
}

function getStatus(userDataPath, isPro) {
  const usage = getUsage(userDataPath)
  const limit = isPro ? LIMITS.pro : LIMITS.free
  return {
    remaining: Math.max(0, limit - usage.count),
    limit,
    used: usage.count,
  }
}

module.exports = { checkAndIncrement, getStatus }
