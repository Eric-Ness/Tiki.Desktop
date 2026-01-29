/**
 * FailureAnalysis Component
 *
 * Displays error classification with confidence badge, matched error pattern,
 * and context information. Provides a collapsible raw error text section.
 */
import { useState } from 'react'
import type {
  FailureAnalysis as FailureAnalysisType,
  ErrorCategory,
  ErrorClassification,
  RetryStrategy
} from '../../../../preload/index'

interface FailureAnalysisProps {
  analysis: FailureAnalysisType
  onStrategySelect: (strategy: RetryStrategy) => void
}

// Category-specific colors for badges and accents
const categoryColors: Record<ErrorCategory, { bg: string; text: string; border: string }> = {
  syntax: { bg: 'bg-red-900/30', text: 'text-red-300', border: 'border-red-700' },
  test: { bg: 'bg-amber-900/30', text: 'text-amber-300', border: 'border-amber-700' },
  dependency: { bg: 'bg-blue-900/30', text: 'text-blue-300', border: 'border-blue-700' },
  timeout: { bg: 'bg-purple-900/30', text: 'text-purple-300', border: 'border-purple-700' },
  permission: { bg: 'bg-orange-900/30', text: 'text-orange-300', border: 'border-orange-700' },
  network: { bg: 'bg-cyan-900/30', text: 'text-cyan-300', border: 'border-cyan-700' },
  resource: { bg: 'bg-pink-900/30', text: 'text-pink-300', border: 'border-pink-700' },
  unknown: { bg: 'bg-slate-700/50', text: 'text-slate-300', border: 'border-slate-600' }
}

// Category badge colors (solid background)
const categoryBadgeColors: Record<ErrorCategory, string> = {
  syntax: 'bg-red-600 text-red-100',
  test: 'bg-amber-600 text-amber-100',
  dependency: 'bg-blue-600 text-blue-100',
  timeout: 'bg-purple-600 text-purple-100',
  permission: 'bg-orange-600 text-orange-100',
  network: 'bg-cyan-600 text-cyan-100',
  resource: 'bg-pink-600 text-pink-100',
  unknown: 'bg-slate-600 text-slate-200'
}

// Format confidence as percentage
function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}

// Chevron icon for collapsible sections
function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  )
}

// Error icon
function ErrorIcon() {
  return (
    <svg
      className="w-5 h-5 text-red-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  )
}

// Classification card component
function ClassificationCard({ classification }: { classification: ErrorClassification }) {
  const colors = categoryColors[classification.category]
  const badgeColor = categoryBadgeColors[classification.category]

  return (
    <div
      className={`rounded-lg p-3 ${colors.bg} border ${colors.border}`}
      data-testid="classification-card"
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${badgeColor}`}>
          {classification.category}
        </span>
        <span className="text-xs text-slate-400">
          {formatConfidence(classification.confidence)} confidence
        </span>
      </div>
      <p className={`text-sm ${colors.text} font-mono break-words`}>
        {classification.matchedText}
      </p>
      {(classification.context.file || classification.context.line) && (
        <div className="mt-2 text-xs text-slate-400">
          {classification.context.file && (
            <span className="mr-3">File: {classification.context.file}</span>
          )}
          {classification.context.line && <span>Line: {classification.context.line}</span>}
        </div>
      )}
    </div>
  )
}

export function FailureAnalysis({ analysis, onStrategySelect }: FailureAnalysisProps) {
  const [showRawError, setShowRawError] = useState(false)
  const { primaryClassification, classifications, errorText, context } = analysis

  // Get the primary category for styling
  const primaryCategory = primaryClassification?.category || 'unknown'
  const colors = categoryColors[primaryCategory]

  return (
    <div className="space-y-4" data-testid="failure-analysis">
      {/* Header with error icon and classification */}
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${colors.bg}`}>
          <ErrorIcon />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-100">Error Analysis</h3>
          {primaryClassification && (
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${categoryBadgeColors[primaryClassification.category]}`}
              >
                {primaryClassification.category}
              </span>
              <span className="text-xs text-slate-400">
                {formatConfidence(primaryClassification.confidence)} confidence
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Primary classification detail */}
      {primaryClassification && (
        <ClassificationCard classification={primaryClassification} />
      )}

      {/* Additional classifications (if more than one) */}
      {classifications.length > 1 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Additional Matches
          </h4>
          {classifications.slice(1).map((classification, index) => (
            <ClassificationCard key={index} classification={classification} />
          ))}
        </div>
      )}

      {/* Context information */}
      {(context.files.length > 0 || context.lastCommand) && (
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Context
          </h4>
          {context.lastCommand && (
            <div className="mb-2">
              <span className="text-xs text-slate-500">Last Command:</span>
              <code className="block mt-1 text-xs text-slate-300 bg-slate-900/50 px-2 py-1 rounded font-mono">
                {context.lastCommand}
              </code>
            </div>
          )}
          {context.files.length > 0 && (
            <div>
              <span className="text-xs text-slate-500">Related Files:</span>
              <ul className="mt-1 space-y-0.5">
                {context.files.map((file, index) => (
                  <li key={index} className="text-xs text-slate-400 font-mono">
                    {file}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Collapsible raw error text */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowRawError(!showRawError)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/50 transition-colors"
          data-testid="raw-error-toggle"
        >
          <ChevronIcon expanded={showRawError} />
          <span>Raw Error Output</span>
        </button>
        {showRawError && (
          <div
            className="px-3 pb-3 max-h-48 overflow-y-auto"
            data-testid="raw-error-content"
          >
            <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap break-words bg-slate-900/50 p-2 rounded">
              {errorText}
            </pre>
          </div>
        )}
      </div>

      {/* Quick action: View suggested strategies */}
      {analysis.suggestedStrategies.length > 0 && (
        <div className="pt-2">
          <p className="text-xs text-slate-400 mb-2">
            {analysis.suggestedStrategies.length} retry{' '}
            {analysis.suggestedStrategies.length === 1 ? 'strategy' : 'strategies'} available
          </p>
          <button
            onClick={() => {
              // Select the highest confidence strategy
              const recommended = analysis.suggestedStrategies[0]
              if (recommended) {
                onStrategySelect(recommended)
              }
            }}
            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            View retry options
          </button>
        </div>
      )}
    </div>
  )
}
