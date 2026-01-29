/**
 * PreventionSuggestions Component
 *
 * Displays a list of actionable preventive measures with type badges,
 * effectiveness percentages, and apply/dismiss buttons.
 */
import type { PreventiveMeasurePreload } from '../../../../preload/index'

export interface PreventionSuggestionsProps {
  measures: PreventiveMeasurePreload[]
  onApply?: (measure: PreventiveMeasurePreload) => void
  onDismiss?: (measure: PreventiveMeasurePreload) => void
}

// Type badge colors
const measureTypeColors: Record<PreventiveMeasurePreload['type'], string> = {
  context: 'bg-cyan-500/20 text-cyan-400',
  verification: 'bg-amber-500/20 text-amber-400',
  phase_structure: 'bg-purple-500/20 text-purple-400',
  manual: 'bg-slate-500/20 text-slate-400'
}

// Type display names
const measureTypeLabels: Record<PreventiveMeasurePreload['type'], string> = {
  context: 'Context',
  verification: 'Verification',
  phase_structure: 'Phase Structure',
  manual: 'Manual'
}

// Format effectiveness percentage
function formatEffectiveness(value: number): string {
  return `${Math.round(value * 100)}%`
}

// Get effectiveness color based on value
function getEffectivenessColor(value: number): string {
  if (value >= 0.8) return 'text-green-400'
  if (value >= 0.6) return 'text-amber-400'
  return 'text-slate-400'
}

// Check icon
function CheckIcon({ className }: { className?: string }) {
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
      <polyline points="20 6 9 17 4 12" />
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

// Zap icon for automatic measures
function ZapIcon({ className }: { className?: string }) {
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
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

// Individual measure item
function MeasureItem({
  measure,
  onApply,
  onDismiss
}: {
  measure: PreventiveMeasurePreload
  onApply?: (measure: PreventiveMeasurePreload) => void
  onDismiss?: (measure: PreventiveMeasurePreload) => void
}) {
  const typeColor = measureTypeColors[measure.type]
  const typeLabel = measureTypeLabels[measure.type]
  const effectivenessColor = getEffectivenessColor(measure.effectiveness)

  return (
    <div
      className="bg-slate-800/50 rounded-lg p-3 border border-slate-700"
      data-testid="measure-item"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Header with badges */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className={`px-1.5 py-0.5 text-xs rounded ${typeColor}`}
              data-testid="type-badge"
            >
              {typeLabel}
            </span>
            {measure.automatic && (
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 text-xs rounded bg-green-500/20 text-green-400"
                data-testid="auto-badge"
              >
                <ZapIcon className="w-3 h-3" />
                Auto
              </span>
            )}
            <span
              className={`px-1.5 py-0.5 text-xs rounded bg-slate-700 ${effectivenessColor}`}
              data-testid="effectiveness-badge"
            >
              {formatEffectiveness(measure.effectiveness)} effective
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-200 mb-1">{measure.description}</p>

          {/* Application hint */}
          {measure.application && (
            <p className="text-xs text-slate-500" data-testid="application-hint">
              {measure.application}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {onApply && measure.automatic && (
            <button
              onClick={() => onApply(measure)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded transition-colors"
              title="Apply this measure"
              data-testid="apply-button"
            >
              <CheckIcon className="w-3.5 h-3.5" />
              Apply
            </button>
          )}
          {onDismiss && (
            <button
              onClick={() => onDismiss(measure)}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded transition-colors"
              title="Dismiss this suggestion"
              data-testid="dismiss-measure-button"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function PreventionSuggestions({
  measures,
  onApply,
  onDismiss
}: PreventionSuggestionsProps) {
  if (measures.length === 0) {
    return (
      <div
        className="text-center py-6 text-slate-400 text-sm"
        data-testid="empty-suggestions"
      >
        No preventive measures available
      </div>
    )
  }

  // Sort measures: automatic first, then by effectiveness
  const sortedMeasures = [...measures].sort((a, b) => {
    if (a.automatic !== b.automatic) {
      return a.automatic ? -1 : 1
    }
    return b.effectiveness - a.effectiveness
  })

  // Count automatic measures
  const automaticCount = measures.filter((m) => m.automatic).length

  return (
    <div className="space-y-3" data-testid="prevention-suggestions">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          Preventive Measures ({measures.length})
        </h4>
        {automaticCount > 0 && (
          <span className="text-xs text-green-400" data-testid="automatic-count">
            {automaticCount} can be auto-applied
          </span>
        )}
      </div>

      {/* Measures list */}
      <div className="space-y-2" data-testid="measures-list">
        {sortedMeasures.map((measure) => (
          <MeasureItem
            key={measure.id}
            measure={measure}
            onApply={onApply}
            onDismiss={onDismiss}
          />
        ))}
      </div>
    </div>
  )
}
