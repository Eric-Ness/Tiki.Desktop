import { useState, useEffect, useCallback } from 'react'
import { useTikiStore } from '../../stores/tiki-store'

type TemplateCategory = 'issue_type' | 'component' | 'workflow' | 'custom'
type VariableType = 'string' | 'file' | 'component' | 'number'

interface PlanTemplate {
  id: string
  name: string
  description: string
  category: TemplateCategory
  tags: string[]
  phases: Array<{
    title: string
    content: string
    filePatterns: string[]
    verification: string[]
  }>
  variables: Array<{
    name: string
    description: string
    type: VariableType
    defaultValue?: string
    required: boolean
  }>
  matchCriteria: {
    keywords: string[]
    labels: string[]
    filePatterns: string[]
  }
  sourceIssue?: number
  successCount: number
  failureCount: number
  lastUsed?: string
  createdAt: string
  updatedAt: string
}

interface TemplateSuggestion {
  template: PlanTemplate
  matchScore: number
  matchReasons: string[]
}

const categoryColors: Record<TemplateCategory, string> = {
  issue_type: 'bg-blue-600 text-blue-100',
  component: 'bg-green-600 text-green-100',
  workflow: 'bg-purple-600 text-purple-100',
  custom: 'bg-amber-600 text-amber-100'
}

const categoryLabels: Record<TemplateCategory, string> = {
  issue_type: 'Issue Type',
  component: 'Component',
  workflow: 'Workflow',
  custom: 'Custom'
}

interface TemplateSuggestionsProps {
  issueNumber: number
  issueTitle: string
  issueBody?: string
  issueLabels: string[]
  onApply: (template: PlanTemplate) => void
  onSkip?: () => void
}

export function TemplateSuggestions({
  issueNumber,
  issueTitle,
  issueBody,
  issueLabels,
  onApply,
  onSkip
}: TemplateSuggestionsProps) {
  const activeProject = useTikiStore((state) => state.activeProject)

  const [suggestions, setSuggestions] = useState<TemplateSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Fetch suggestions when component mounts or issue changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!activeProject?.path) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const result = await window.tikiDesktop.templates.suggest(
          activeProject.path,
          issueTitle,
          issueBody,
          issueLabels
        )
        // Only show top 3 suggestions
        setSuggestions(result.slice(0, 3))
      } catch (err) {
        console.error('Failed to fetch template suggestions:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch suggestions')
      } finally {
        setLoading(false)
      }
    }

    fetchSuggestions()
  }, [activeProject?.path, issueNumber, issueTitle, issueBody, issueLabels])

  // Handle template apply
  const handleApply = useCallback(
    (template: PlanTemplate) => {
      onApply(template)
    },
    [onApply]
  )

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    setDismissed(true)
  }, [])

  // Handle plan without template
  const handleSkip = useCallback(() => {
    onSkip?.()
  }, [onSkip])

  // Don't render if dismissed
  if (dismissed) {
    return null
  }

  // Don't render if loading or no suggestions
  if (loading) {
    return (
      <div className="p-3 bg-background-tertiary rounded-lg border border-border/50 animate-pulse">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-400 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-sm text-slate-400">Finding template suggestions...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return null // Silently fail - suggestions are optional
  }

  if (suggestions.length === 0) {
    return null // No suggestions to show
  }

  // Calculate success rate for display
  const getSuccessRate = (template: PlanTemplate) => {
    const total = template.successCount + template.failureCount
    if (total === 0) return null
    return Math.round((template.successCount / total) * 100)
  }

  return (
    <div className="bg-amber-900/10 border border-amber-600/30 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-amber-900/20 border-b border-amber-600/20">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-sm font-medium text-amber-300 hover:text-amber-200 transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${collapsed ? '-rotate-90' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
          </svg>
          Template Suggestions
          <span className="px-1.5 py-0.5 text-[10px] bg-amber-600 text-white rounded">
            {suggestions.length}
          </span>
        </button>
        <button
          onClick={handleDismiss}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-amber-900/30 transition-colors"
          aria-label="Dismiss suggestions"
          title="Dismiss"
        >
          <svg
            className="w-4 h-4 text-amber-400/70"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="p-3 space-y-2">
          {/* Suggestions list */}
          {suggestions.map((suggestion, index) => {
            const successRate = getSuccessRate(suggestion.template)

            return (
              <div
                key={suggestion.template.id}
                className="flex items-start gap-3 p-2 bg-background-secondary rounded-lg border border-border/50 hover:border-amber-600/30 transition-colors"
              >
                {/* Rank indicator */}
                <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded bg-amber-900/30 text-amber-400 text-xs font-medium">
                  {index + 1}
                </div>

                {/* Template info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-200 truncate">
                      {suggestion.template.name}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 text-[9px] rounded ${categoryColors[suggestion.template.category]}`}
                    >
                      {categoryLabels[suggestion.template.category]}
                    </span>
                    {successRate !== null && (
                      <span
                        className={`px-1.5 py-0.5 text-[9px] rounded ${
                          successRate >= 80
                            ? 'bg-green-600/30 text-green-300'
                            : successRate >= 50
                              ? 'bg-amber-600/30 text-amber-300'
                              : 'bg-red-600/30 text-red-300'
                        }`}
                      >
                        {successRate}%
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 truncate mb-1.5">
                    {suggestion.template.description}
                  </p>

                  {/* Match reasons */}
                  <div className="flex flex-wrap gap-1">
                    {suggestion.matchReasons.slice(0, 3).map((reason, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 text-[9px] bg-slate-800 text-slate-400 rounded"
                      >
                        {reason}
                      </span>
                    ))}
                    {suggestion.matchReasons.length > 3 && (
                      <span className="px-1.5 py-0.5 text-[9px] text-slate-500">
                        +{suggestion.matchReasons.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Confidence score */}
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{ width: `${Math.min(suggestion.matchScore, 100)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-500 w-6">
                      {suggestion.matchScore}
                    </span>
                  </div>
                </div>

                {/* Apply button */}
                <button
                  onClick={() => handleApply(suggestion.template)}
                  className="flex-shrink-0 px-2.5 py-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors"
                >
                  Apply
                </button>
              </div>
            )
          })}

          {/* Plan without template option */}
          <div className="pt-2 border-t border-border/50">
            <button
              onClick={handleSkip}
              className="w-full px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-background-tertiary rounded transition-colors flex items-center justify-center gap-2"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
                <polyline points="13 2 13 9 20 9" />
              </svg>
              Plan Without Template
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
