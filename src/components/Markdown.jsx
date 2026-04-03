import ReactMarkdown from 'react-markdown'

export default function Markdown({ children }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-medium">{children}</strong>,
        em: ({ children }) => <em style={{ opacity: 0.7 }}>{children}</em>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li style={{ opacity: 0.8 }}>{children}</li>,
        h1: ({ children }) => <h1 className="text-lg font-semibold mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-semibold mb-1.5">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
        code: ({ children, className }) => {
          const isBlock = className?.includes('language-')
          if (isBlock) {
            return <code className="block rounded-md p-3 text-xs font-mono overflow-x-auto mb-2" style={{ background: 'rgb(var(--bg-rgb) / 0.5)', opacity: 0.8 }}>{children}</code>
          }
          return <code className="rounded px-1 py-0.5 text-xs font-mono text-accent" style={{ background: 'rgb(var(--bg-rgb) / 0.5)' }}>{children}</code>
        },
        pre: ({ children }) => <pre className="mb-2">{children}</pre>,
        a: ({ children, href }) => <a href={href} className="text-accent underline" target="_blank" rel="noreferrer">{children}</a>,
      }}
    >
      {children}
    </ReactMarkdown>
  )
}
