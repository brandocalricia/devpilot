import ReactMarkdown from 'react-markdown'

export default function Markdown({ children }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="text-white font-medium">{children}</strong>,
        em: ({ children }) => <em className="text-white/70">{children}</em>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="text-white/80">{children}</li>,
        h1: ({ children }) => <h1 className="text-lg font-semibold mb-2 text-white">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-semibold mb-1.5 text-white">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 text-white">{children}</h3>,
        code: ({ children, className }) => {
          const isBlock = className?.includes('language-')
          if (isBlock) {
            return <code className="block bg-white/[0.04] rounded-md p-3 text-xs font-mono text-white/80 overflow-x-auto mb-2">{children}</code>
          }
          return <code className="bg-white/[0.08] rounded px-1 py-0.5 text-xs font-mono text-accent">{children}</code>
        },
        pre: ({ children }) => <pre className="mb-2">{children}</pre>,
        a: ({ children, href }) => <a href={href} className="text-accent underline" target="_blank" rel="noreferrer">{children}</a>,
      }}
    >
      {children}
    </ReactMarkdown>
  )
}
