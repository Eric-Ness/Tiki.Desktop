import { useState, useEffect, useMemo } from 'react'
import type { Assumption } from '../../stores/tiki-store'

export interface AssumptionTrackerProps {
  assumptions: Assumption[]
  onPhaseClick: (phaseNumber: number) => void
}

const STORAGE_KEY = 'assumption-tracker-collapsed'

// Confidence level priority for sorting (lower value = higher priority = shown first)
const confidencePriority: Record<Assumption['confidence'], number> = {
  low: 0,
  medium: 1,
  high: 2
}

// Styling based on confidence level
const confidenceStyles: Record<
  Assumption['confidence'],
  { bg: string; border: string; text: string }
> = {
  low: {
    bg: 'bg-red-500/20',
    border: 'border-red-500/50',
    text: 'text-red-400'
  },
  medium: {
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/50',
    text: 'text-yellow-400'
  },
  high: {
    bg: 'bg-green-500/20',
    border: 'border-green-500/50',
    text: 'text-green-400'
  }
}

export function AssumptionTracker({ assumptions, onPhaseClick }: AssumptionTrackerProps) {
  // Initialize collapsed state from localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'true'
  })

  // Persist collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isCollapsed))
  }, [isCollapsed])

  // Sort assumptions: low confidence first, then medium, then high
  const sortedAssumptions = useMemo(() => {
    return [...assumptions].sort(
      (a, b) => confidencePriority[a.confidence] - confidencePriority[b.confidence]
    )
  }, [assumptions])

  // Calculate summary counts
  const summaryCounts = useMemo(() => {
    const counts = { low: 0, medium: 0, high: 0 }
    for (const assumption of assumptions) {
      counts[assumption.confidence]++
    }
    return counts
  }, [assumptions])

  const handleHeaderClick = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <div
      data-testid="assumption-tracker"
      className="border-t border-slate-700/50 pt-4"
    >
      {/* Collapsible Header */}
      <button
        data-testid="collapse-header"
        onClick={handleHeaderClick}
        className="flex items-center gap-2 w-full text-left mb-2"
      >
        <svg
          data-testid="chevron-icon"
          className={`w-3 h-3 text-slate-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          Assumptions
          <span
            data-testid="summary-total"
            className="px-1.5 py-0.5 text-xs rounded bg-slate-700 text-slate-300"
          >
            {assumptions.length}
          </span>
        </h3>
      </button>

      {/* Content - only shown when not collapsed */}
      {!isCollapsed && (
        <>
          {assumptions.length === 0 ? (
            <div
              data-testid="empty-assumptions"
              className="text-sm text-slate-500 bg-slate-800/30 rounded-lg p-3 border border-slate-700/30"
            >
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-slate-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                No assumptions recorded for this plan.
              </div>
            </div>
          ) : (
            <>
              {/* Summary Bar */}
              <div className="flex items-center gap-3 mb-3 text-xs">
                <div className="flex items-center gap-1">
                  <span
                    className={`w-2 h-2 rounded-full ${confidenceStyles.low.bg} ${confidenceStyles.low.border} border`}
                  />
                  <span className="text-slate-400">Low:</span>
                  <span data-testid="summary-low-count" className="text-red-400 font-medium">
                    {summaryCounts.low}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`w-2 h-2 rounded-full ${confidenceStyles.medium.bg} ${confidenceStyles.medium.border} border`}
                  />
                  <span className="text-slate-400">Medium:</span>
                  <span data-testid="summary-medium-count" className="text-yellow-400 font-medium">
                    {summaryCounts.medium}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`w-2 h-2 rounded-full ${confidenceStyles.high.bg} ${confidenceStyles.high.border} border`}
                  />
                  <span className="text-slate-400">High:</span>
                  <span data-testid="summary-high-count" className="text-green-400 font-medium">
                    {summaryCounts.high}
                  </span>
                </div>
              </div>

              {/* Assumption List */}
              <div data-testid="assumption-list" className="space-y-2">
                {sortedAssumptions.map((assumption) => (
                  <AssumptionCard
                    key={assumption.id}
                    assumption={assumption}
                    onPhaseClick={onPhaseClick}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

interface AssumptionCardProps {
  assumption: Assumption
  onPhaseClick: (phaseNumber: number) => void
}

function AssumptionCard({ assumption, onPhaseClick }: AssumptionCardProps) {
  const styles = confidenceStyles[assumption.confidence]
  const hasPhases = assumption.affectsPhases && assumption.affectsPhases.length > 0

  return (
    <div
      data-testid={`assumption-card-${assumption.id}`}
      className={`rounded-lg p-3 border ${styles.bg} ${styles.border}`}
    >
      <div className="flex items-start gap-2">
        {/* ID Badge */}
        <span
          data-testid={`assumption-id-${assumption.id}`}
          className="shrink-0 px-1.5 py-0.5 text-xs font-mono font-medium bg-slate-800 text-slate-300 rounded"
        >
          {assumption.id}
        </span>

        <div className="flex-1 min-w-0">
          {/* Header with confidence badge and optional warning icon */}
          <div className="flex items-center gap-2 mb-1">
            {assumption.confidence === 'low' && (
              <svg
                data-testid={`warning-icon-${assumption.id}`}
                className="w-4 h-4 text-red-400 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}
            <span
              data-testid={`confidence-badge-${assumption.id}`}
              className={`px-1.5 py-0.5 text-xs rounded border ${styles.bg} ${styles.border} ${styles.text}`}
            >
              {assumption.confidence}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-300 mb-1">{assumption.description}</p>

          {/* Source */}
          {assumption.source && (
            <p
              data-testid={`assumption-source-${assumption.id}`}
              className="text-xs text-slate-500 mb-1"
            >
              Source: {assumption.source}
            </p>
          )}

          {/* Affected Phases */}
          {hasPhases && (
            <div
              data-testid={`phases-section-${assumption.id}`}
              className="flex items-center gap-1 flex-wrap mt-2"
            >
              <span className="text-xs text-slate-500">Affects:</span>
              {assumption.affectsPhases!.map((phase) => (
                <button
                  key={phase}
                  data-testid={`phase-link-${assumption.id}-${phase}`}
                  onClick={() => onPhaseClick(phase)}
                  className="text-xs text-cyan-400 hover:underline"
                >
                  Phase {phase}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
