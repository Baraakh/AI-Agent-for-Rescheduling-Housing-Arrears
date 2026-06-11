import { useState } from 'react'
import Icon from './Icon'

// Renders a record as a pretty-printed, syntax-tinted JSON block — this is
// meant to demonstrate that the AI agent's decision is fully machine-readable
// and could be consumed by downstream systems (case management, audit, etc).
export default function JsonOutput({ data, title = 'AI Agent — Structured Decision Output', className = '' }) {
  const [copied, setCopied] = useState(false)
  const json = JSON.stringify(data, null, 2)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-card ${className}`}>
      <div className="flex items-center justify-between border-b border-navy-50 px-5 py-3">
        <div className="flex items-center gap-2">
          <Icon name="data_object" className="text-[18px] text-navy-400" />
          <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-navy-100 px-2.5 py-1.5 text-xs font-medium text-navy-500 transition hover:bg-navy-50 hover:text-navy-700"
        >
          <Icon name={copied ? 'check' : 'content_copy'} className="text-[15px]" />
          {copied ? 'Copied' : 'Copy JSON'}
        </button>
      </div>
      <pre className="max-h-[420px] overflow-auto bg-navy-950 px-5 py-4 text-[12.5px] leading-relaxed text-navy-100 scrollbar-thin">
        <code className="font-mono">{json}</code>
      </pre>
    </div>
  )
}
