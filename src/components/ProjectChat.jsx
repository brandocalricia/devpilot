import { useState, useRef, useEffect } from 'react'
import Markdown from './Markdown'

export default function ProjectChat({ projects, settings }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [selectedProject, setSelectedProject] = useState('all')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { loadHistory() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function loadHistory() {
    const cache = await window.devpilot.getCache()
    if (cache.chatHistory?.length) setMessages(cache.chatHistory)
  }

  async function saveHistory(msgs) {
    const cache = await window.devpilot.getCache()
    await window.devpilot.saveCache({ ...cache, chatHistory: msgs.slice(-50) })
  }

  async function send() {
    if (!input.trim() || loading) return
    if (!settings?._hasApiKey) {
      setMessages(prev => [...prev,
        { role: 'user', content: input },
        { role: 'assistant', content: 'Add your Claude API key in Settings to enable AI chat.' },
      ])
      setInput('')
      return
    }

    const question = input
    setInput('')
    const newMessages = [...messages, { role: 'user', content: question }]
    setMessages(newMessages)
    setLoading(true)

    try {
      let context = ''
      const target = selectedProject === 'all' ? null : projects.find(p => p.name === selectedProject)

      if (target) {
        const detail = await window.devpilot.getProjectDetail(target.path)
        const commits = detail.commits.map(c => `${c.hash?.slice(0, 7)} ${c.message}`).join('\n')
        const uncommitted = detail.uncommittedFiles.join('\n') || '(none)'
        const todos = detail.todos.slice(0, 15).map(t => `[${t.type}] ${t.text} (${t.relativePath}:${t.line})`).join('\n')
        context = `Project: ${target.name}\nStatus: ${target.status} (last commit ${target.lastCommitRelative})\nLanguages: ${target.languages.map(l => `${l.lang} ${l.pct}%`).join(', ')}\n\nRecent commits:\n${commits}\n\nUncommitted:\n${uncommitted}\n\nTODOs:\n${todos || '(none)'}\n\n${detail.readme ? `README:\n${detail.readme.slice(0, 1000)}` : ''}`
      } else {
        context = projects.map(p =>
          `[${p.name}] ${p.status} | Last commit: ${p.lastCommitRelative} | ${p.uncommittedCount} uncommitted | ${p.todoCount} TODOs`
        ).join('\n')
      }

      const history = newMessages.slice(-10).filter(m => m.role === 'user' || m.role === 'assistant')
      const result = await window.devpilot.aiChat(question, context, history.slice(0, -1))

      const content = result.error || result.text
      const withResponse = [...newMessages, { role: 'assistant', content }]
      setMessages(withResponse)
      saveHistory(withResponse)
    } catch (e) {
      const withError = [...newMessages, { role: 'assistant', content: `Error: ${e.message || 'Failed'}` }]
      setMessages(withError)
    }
    setLoading(false)
  }

  function clearChat() { setMessages([]); saveHistory([]) }

  return (
    <div className="max-w-[800px] flex flex-col h-[calc(100vh-80px)]">
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-xl font-semibold">Chat</h2>
        <select
          value={selectedProject}
          onChange={e => setSelectedProject(e.target.value)}
          className="text-xs bg-bg-card rounded-md px-2 py-1.5"
          style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          <option value="all">All projects</option>
          {projects.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
        </select>
        {messages.length > 0 && (
          <button onClick={clearChat} className="ml-auto text-xs text-muted hover:text-[var(--text)] px-2 py-1 rounded transition-colors" style={{ border: '1px solid var(--border)' }}>
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.length === 0 && (
          <div className="text-center mt-20" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
            <p className="text-lg mb-2">Ask anything about your projects</p>
            <div className="space-y-1 text-xs">
              <p>"What should I prioritize today?"</p>
              <p>"Summarize what I did on brando-ai-tools this week"</p>
              <p>"What's broken in FinanceKit?"</p>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${m.role === 'user' ? 'text-white' : ''}`}
              style={m.role === 'user'
                ? { background: 'rgba(var(--accent-rgb), 0.2)' }
                : { background: 'var(--bg-card)', border: '1px solid var(--border)' }
              }>
              {m.role === 'assistant' ? <Markdown>{m.content}</Markdown> : <span>{m.content}</span>}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-bg-card rounded-lg px-4 py-3" style={{ border: '1px solid var(--border)' }}>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent)', opacity: 0.5, animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent)', opacity: 0.5, animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent)', opacity: 0.5, animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send() }}
          placeholder="Ask about your projects..."
          className="flex-1 bg-bg-card rounded-lg px-3 py-2 text-sm focus:outline-none"
          style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
          disabled={loading}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-4 py-2 text-accent rounded-lg text-sm hover:opacity-80 transition-colors disabled:opacity-50"
          style={{ background: 'rgba(var(--accent-rgb), 0.2)' }}
        >
          Send
        </button>
      </div>
    </div>
  )
}
