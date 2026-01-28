import { useState, type ReactNode } from 'react'

interface ConfigSectionProps {
  title: string
  description?: string
  children: ReactNode
  defaultExpanded?: boolean
}

export function ConfigSection({
  title,
  description,
  children,
  defaultExpanded = true
}: ConfigSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="bg-background-secondary border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-background-tertiary/50 transition-colors"
      >
        <div className="text-left">
          <h3 className="text-sm font-medium text-slate-200">{title}</h3>
          {description && (
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/50">
          {children}
        </div>
      )}
    </div>
  )
}
