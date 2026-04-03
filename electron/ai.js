const Anthropic = require('@anthropic-ai/sdk')

let client = null

function getClient(apiKey) {
  if (!client || client._apiKey !== apiKey) {
    client = new Anthropic({ apiKey })
    client._apiKey = apiKey
  }
  return client
}

async function callClaude(apiKey, prompt, maxTokens = 1024) {
  const anthropic = getClient(apiKey)
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })
  return response.content[0].text
}

async function generateBriefing(apiKey, projects) {
  const projectSummaries = projects.map(p => {
    const commits = p.commits.map(c => `  - ${c.message}`).join('\n')
    return `[Project: ${p.name}]
Status: ${p.status} (last commit ${p.lastCommitRelative})
Last 5 commits:
${commits || '  (none)'}
Uncommitted changes: ${p.uncommittedCount} files
TODOs found: ${p.todoCount}`
  }).join('\n\n')

  const prompt = `You are DevPilot, a personal dev assistant. Here is the current state of all my projects:

${projectSummaries}

Generate a brief daily briefing (3-5 sentences). Tell me:
- What I was last working on
- Which projects need attention (stale, uncommitted changes, many TODOs)
- What you'd suggest I focus on today
Keep it casual and direct. No corporate speak.`

  return callClaude(apiKey, prompt)
}

async function generateWhereILeftOff(apiKey, projectName, detail) {
  const commits = detail.commits.map(c => `  ${c.hash?.slice(0, 7)} ${c.message}`).join('\n')
  const uncommitted = detail.uncommittedFiles.join('\n  ') || '(none)'

  const prompt = `Here are the recent changes in my project "${projectName}":

Last 20 commits:
${commits || '(none)'}

Uncommitted changes:
  ${uncommitted}

In 2-3 sentences, tell me where I left off. What was I working on? What's the next logical step? Be specific — mention file names and features.`

  return callClaude(apiKey, prompt)
}

async function chatAboutProject(apiKey, question, context, history) {
  const messages = []

  for (const msg of history) {
    messages.push({ role: msg.role, content: msg.content })
  }

  const systemContext = context
    ? `You are DevPilot, a personal dev assistant. Here is context about the project:\n\n${context}\n\nAnswer questions about this project. Be specific and reference file names when possible. Keep answers concise.`
    : 'You are DevPilot, a personal dev assistant. Answer questions about the user\'s coding projects. Be specific and concise.'

  messages.push({ role: 'user', content: question })

  const anthropic = getClient(apiKey)
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    system: systemContext,
    messages,
  })
  return response.content[0].text
}

module.exports = { generateBriefing, generateWhereILeftOff, chatAboutProject }
