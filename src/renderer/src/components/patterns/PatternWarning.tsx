/**
 * PatternWarning Component
 *
 * Pre-execution warning banner that displays when pattern matches are detected.
 * Shows matched patterns with confidence levels, indicators, and action buttons.
 */
import type {
  PatternMatchPreload,
  FailurePatternPreload
} from '../../../../preload/index'

export interface PatternWarningProps {
  matches: PatternMatchPreload[]
  onApplyAll?: () => void
  onDismiss?: () => void
  onViewDetails?: (pattern: FailurePatternPreload) => void
}

// Confidence level helpers
function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence > 0.7) return 'high'
  if (confidence >= 0.5) return 'medium'
  return 'low'
}

function getConfidenceColor(level: 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'high':
      return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'medium':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    case 'low':
      return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  }
}

function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}

// Warning icon
function WarningIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

// Close icon
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// Individual pattern match item
function PatternMatchItem({
  match,
  onViewDetails
}: {
  match: PatternMatchPreload
  onViewDetails?: (pattern: FailurePatternPreload) => void
}) {
  const level = getConfidenceLevel(match.confidence)
  const colorClass = getConfidenceColor(level)

  return (
    <div
      className="bg-slate-800/50 rounded-lg p-3 border border-slate-700"
      data-testid="pattern-match-item"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <button
          onClick={() => onViewDetails?.(match.pattern)}
          className="text-sm font-medium text-slate-200 hover:text-amber-400 transition-colors text-left"
          data-testid="pattern-name-button"
        >
          {match.pattern.name}
        </button>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`px-1.5 py-0.5 text-xs rounded border ${colorClass}`}
            data-testid="confidence-badge"
          >
            {formatConfidence(match.confidence)}
          </span>
          <span
            className={`px-1.5 py-0.5 text-xs rounded ${
              level === 'high'
                ? 'bg-red-500/20 text-red-400'
                : level === 'medium'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-slate-500/20 text-slate-400'
            }`}
            data-testid="confidence-level"
          >
            {level}
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-2">{match.pattern.description}</p>

      {match.matchedIndicators.length > 0 && (
        <div className="flex flex-wrap gap-1" data-testid="matched-indicators">
          {match.matchedIndicators.map((indicator, index) => (
            <span
              key={index}
              className="px-1.5 py-0.5 text-xs rounded bg-slate-700 text-slate-300"
            >
              {indicator}
            </span>
          ))}
        </div>
      )}

      {match.suggestedMeasures.length > 0 && (
        <div className="mt-2 text-xs text-slate-500" data-testid="measures-count">
          {match.suggestedMeasures.length} preventive measure
          {match.suggestedMeasures.length !== 1 ? 's' : ''} available
        </div>
      )}
    </div>
  )
}

export function PatternWarning({
  matches,
  onApplyAll,
  onDismiss,
  onViewDetails
}: PatternWarningProps) {
  if (matches.length === 0) {
    return null
  }

  // Determine overall severity based on highest confidence match
  const maxConfidence = Math.max(...matches.map((m) => m.confidence))
  const overallLevel = getConfidenceLevel(maxConfidence)
  const isHighSeverity = overallLevel === 'high'

  const borderColor = isHighSeverity ? 'border-red-500/50' : 'border-amber-500/50'
  const headerBg = isHighSeverity ? 'bg-red-500/10' : 'bg-amber-500/10'
  const iconColor = isHighSeverity ? 'text-red-400' : 'text-amber-400'

  return (
    <div
      className={`rounded-lg border ${borderColor} overflow-hidden`}
      data-testid="pattern-warning"
    >
      {/* Header */}
      <div className={`px-4 py-3 ${headerBg} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <WarningIcon className={`w-5 h-5 ${iconColor}`} />
          <span className="font-medium text-slate-200" data-testid="warning-header">
            Pattern Alert: Similar issues have failed
          </span>
          <span className="text-xs text-slate-400">
            ({matches.length} pattern{matches.length !== 1 ? 's' : ''} matched)
          </span>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded transition-colors"
            title="Dismiss warning"
            data-testid="dismiss-button"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Pattern matches list */}
      <div className="p-4 space-y-3" data-testid="matches-list">
        {matches.map((match) => (
          <PatternMatchItem
            key={match.pattern.id}
            match={match}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-end gap-2">
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded transition-colors"
            data-testid="dismiss-text-button"
          >
            Dismiss
          </button>
        )}
        {onApplyAll && (
          <button
            onClick={onApplyAll}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              isHighSeverity
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
            }`}
            data-testid="apply-all-button"
          >
            Apply All Suggestions
          </button>
        )}
      </div>
    </div>
  )
}
