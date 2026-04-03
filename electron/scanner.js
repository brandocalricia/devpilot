const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const EXCLUDED = new Set(['node_modules', '.git', 'venv', '__pycache__', 'dist', 'build', '.next', '.vscode', 'env'])
const SCANNABLE_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.py', '.html', '.css', '.json', '.md', '.yaml', '.yml', '.toml'])
const TODO_REGEX = /(?:\/\/|#)\s*(TODO|FIXME|HACK|XXX)\b[:\s]*(.*)/i
const MD_TASK_REGEX = /^-\s*\[ \]\s*(.*)/

function git(repoPath, command) {
  try {
    return execSync(`git ${command}`, { cwd: repoPath, encoding: 'utf-8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] }).trim()
  } catch {
    return ''
  }
}

function isGitRepo(dirPath) {
  return fs.existsSync(path.join(dirPath, '.git'))
}

function getRepoInfo(repoPath) {
  const name = path.basename(repoPath)
  const log = git(repoPath, 'log --oneline -5')
  const commits = log ? log.split('\n').map(line => {
    const [hash, ...msg] = line.split(' ')
    return { hash, message: msg.join(' ') }
  }) : []

  const statusOutput = git(repoPath, 'status --porcelain')
  const uncommittedCount = statusOutput ? statusOutput.split('\n').filter(Boolean).length : 0

  const lastCommitDate = git(repoPath, 'log -1 --format=%ci')
  const lastCommitTime = lastCommitDate ? new Date(lastCommitDate).getTime() : 0
  const lastCommitRelative = git(repoPath, 'log -1 --format=%cr')

  const now = Date.now()
  const daysSince = lastCommitTime ? Math.floor((now - lastCommitTime) / (1000 * 60 * 60 * 24)) : 999
  let status = 'stale'
  if (daysSince <= 7) status = 'active'
  else if (daysSince <= 30) status = 'paused'

  const languages = detectLanguages(repoPath)
  const todoCount = countTodos(repoPath)

  return {
    name,
    path: repoPath,
    status,
    daysSince,
    commits,
    lastCommitMessage: commits[0]?.message || 'No commits',
    lastCommitRelative: lastCommitRelative || 'Never',
    uncommittedCount,
    languages,
    todoCount,
  }
}

function detectLanguages(repoPath) {
  const counts = {}
  let scanned = 0

  function walk(dir, depth = 0) {
    if (depth > 5 || scanned > 500) return
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }

    for (const entry of entries) {
      if (scanned > 500) break
      if (EXCLUDED.has(entry.name)) continue

      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath, depth + 1)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (SCANNABLE_EXT.has(ext)) {
          const lang = extToLang(ext)
          counts[lang] = (counts[lang] || 0) + 1
          scanned++
        }
      }
    }
  }

  walk(repoPath)
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lang, count]) => ({ lang, pct: Math.round((count / total) * 100) }))
}

function extToLang(ext) {
  const map = {
    '.js': 'JavaScript', '.jsx': 'React', '.ts': 'TypeScript', '.tsx': 'React TS',
    '.py': 'Python', '.html': 'HTML', '.css': 'CSS', '.json': 'JSON',
    '.md': 'Markdown', '.yaml': 'YAML', '.yml': 'YAML', '.toml': 'TOML',
  }
  return map[ext] || ext
}

function countTodos(repoPath) {
  let count = 0
  let scanned = 0

  function walk(dir, depth = 0) {
    if (depth > 5 || scanned > 500) return
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }

    for (const entry of entries) {
      if (scanned > 500) break
      if (EXCLUDED.has(entry.name)) continue

      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath, depth + 1)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (SCANNABLE_EXT.has(ext)) {
          scanned++
          try {
            const content = fs.readFileSync(fullPath, 'utf-8')
            const lines = content.split('\n')
            for (const line of lines) {
              if (TODO_REGEX.test(line) || MD_TASK_REGEX.test(line)) count++
            }
          } catch {}
        }
      }
    }
  }

  walk(repoPath)
  return count
}

function scanTodosDetailed(repoPath) {
  const todos = []
  let scanned = 0

  function walk(dir, depth = 0) {
    if (depth > 5 || scanned > 500) return
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }

    for (const entry of entries) {
      if (scanned > 500) break
      if (EXCLUDED.has(entry.name)) continue

      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath, depth + 1)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (SCANNABLE_EXT.has(ext)) {
          scanned++
          try {
            const content = fs.readFileSync(fullPath, 'utf-8')
            const lines = content.split('\n')
            lines.forEach((line, i) => {
              const todoMatch = line.match(TODO_REGEX)
              const taskMatch = line.match(MD_TASK_REGEX)
              if (todoMatch) {
                todos.push({
                  type: todoMatch[1].toUpperCase(),
                  text: todoMatch[2].trim() || todoMatch[1],
                  file: fullPath,
                  relativePath: path.relative(repoPath, fullPath),
                  line: i + 1,
                  project: path.basename(repoPath),
                })
              } else if (taskMatch) {
                todos.push({
                  type: 'TASK',
                  text: taskMatch[1].trim(),
                  file: fullPath,
                  relativePath: path.relative(repoPath, fullPath),
                  line: i + 1,
                  project: path.basename(repoPath),
                })
              }
            })
          } catch {}
        }
      }
    }
  }

  walk(repoPath)
  return todos
}

function getCommitHeatmap(repoPath) {
  const raw = git(repoPath, 'log --format="%ai" --since="30 days ago"')
  if (!raw) return {}
  const counts = {}
  for (const line of raw.split('\n')) {
    const date = line.split(' ')[0]
    if (date) counts[date] = (counts[date] || 0) + 1
  }
  return counts
}

function scanProjects(projectsPath) {
  const entries = fs.readdirSync(projectsPath, { withFileTypes: true })
  const projects = []
  const heatmapData = {}

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const fullPath = path.join(projectsPath, entry.name)
    if (!isGitRepo(fullPath)) continue

    projects.push(getRepoInfo(fullPath))
    const hm = getCommitHeatmap(fullPath)
    for (const [date, count] of Object.entries(hm)) {
      heatmapData[date] = (heatmapData[date] || 0) + count
    }
  }

  projects.sort((a, b) => a.daysSince - b.daysSince)
  return { projects, heatmapData }
}

function scanTodos(projectsPath) {
  const entries = fs.readdirSync(projectsPath, { withFileTypes: true })
  const allTodos = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const fullPath = path.join(projectsPath, entry.name)
    if (!isGitRepo(fullPath)) continue
    allTodos.push(...scanTodosDetailed(fullPath))
  }

  return allTodos
}

function getProjectDetail(repoPath) {
  const log = git(repoPath, 'log --oneline -20')
  const commits = log ? log.split('\n').map(line => {
    const [hash, ...msg] = line.split(' ')
    return { hash, message: msg.join(' ') }
  }) : []

  const statusOutput = git(repoPath, 'status --porcelain')
  const uncommittedFiles = statusOutput ? statusOutput.split('\n').filter(Boolean).map(l => l.trim()) : []

  const todos = scanTodosDetailed(repoPath)

  let readme = ''
  const readmePath = path.join(repoPath, 'README.md')
  try { readme = fs.readFileSync(readmePath, 'utf-8').slice(0, 2000) } catch {}

  return { commits, uncommittedFiles, todos, readme }
}

module.exports = { scanProjects, scanTodos, getProjectDetail }
