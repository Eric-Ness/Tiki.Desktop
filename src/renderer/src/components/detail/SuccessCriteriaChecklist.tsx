import { useState, useEffect, useMemo } from 'react'
import type { SuccessCriterion } from '../../stores/tiki-store'

interface Phase {
  number: number
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'
}

export interface SuccessCriteriaChecklistProps {
  criteria: SuccessCriterion[]
  coverageMatrix: Record<string, { phases: number[] }>
  phases: Phase[]
  onPhaseClick: (phaseNumber: number) => void
}

export type CriterionStatus = 'completed' | 'in_progress' | 'blocked' | 'pending'

const STORAGE_KEY = 'success-criteria-collapsed'

// Category display order
const categoryOrder: SuccessCriterion['category'][] = [
  'functional',
  'non-functional',
  'testing',
  'documentation'
]

// Category display labels
const categoryLabels: Record<SuccessCriterion['category'], string> = {
  functional: 'Functional',
  'non-functional': 'Non-Functional',
  testing: 'Testing',
  documentation: 'Documentation'
}

// Status styling
const statusStyles: Record<
  CriterionStatus,
  { text: string; iconType: 'check' | 'circle' | 'animated' | 'x' }
> = {
  completed: { text: 'text-green-400', iconType: 'check' },
  in_progress: { text: 'text-yellow-400', iconType: 'animated' },
  pending: { text: 'text-zinc-400', iconType: 'circle' },
  blocked: { text: 'text-red-400', iconType: 'x' }
}

/**
 * Determines the status of a success criterion based on its addressing phases.
 *
 * Rules:
 * - completed: all phases completed
 * - in_progress: at least one phase in_progress, none failed
 * - blocked: any phase failed
 * - pending: all phases pending or no addressing phases
 */
export function getCriterionStatus(
  criterionId: string,
  coverageMatrix: Record<string, { phases: number[] }>,
  phases: Phase[]
): CriterionStatus {
  const coverage = coverageMatrix[criterionId]
  if (!coverage || coverage.phases.length === 0) {
    return 'pending'
  }

  const addressingPhases = coverage.phases
  const phaseStatuses = addressingPhases.map((phaseNum) => {
    const phase = phases.find((p) => p.number === phaseNum)
    return phase?.status || 'pending'
  })

  // Check for any failed phase -> blocked
  if (phaseStatuses.some((status) => status === 'failed')) {
    return 'blocked'
  }

  // Check if all phases are completed or skipped
  const allDone = phaseStatuses.every((status) => status === 'completed' || status === 'skipped')
  if (allDone) {
    return 'completed'
  }

  // Check for any in_progress -> in_progress
  if (phaseStatuses.some((status) => status === 'in_progress')) {
    return 'in_progress'
  }

  // Otherwise pending
  return 'pending'
}

function StatusIcon({ status, testId }: { status: CriterionStatus; testId: string }) {
  const styles = statusStyles[status]

  if (styles.iconType === 'check') {
    return (
      <svg
        data-testid={testId}
        className={`w-4 h-4 ${styles.text}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )
  }

  if (styles.iconType === 'x') {
    return (
      <svg
        data-testid={testId}
        className={`w-4 h-4 ${styles.text}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    )
  }

  if (styles.iconType === 'animated') {
    return (
      <div
        data-testid={testId}
        className={`w-4 h-4 rounded-full border-2 border-current ${styles.text} animate-pulse`}
      />
    )
  }

  // Default: empty circle for pending
  return (
    <svg
      data-testid={testId}
      className={`w-4 h-4 ${styles.text}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
    </svg>
  )
}

export function SuccessCriteriaChecklist({
  criteria,
  coverageMatrix,
  phases,
  onPhaseClick
}: SuccessCriteriaChecklistProps) {
  // Load initial collapsed state for categories from localStorage
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return {}
      }
    }
    return {}
  })

  // Persist collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsedCategories))
  }, [collapsedCategories])

  // Group criteria by category
  const groupedCriteria = useMemo(() => {
    const groups: Record<SuccessCriterion['category'], SuccessCriterion[]> = {
      functional: [],
      'non-functional': [],
      testing: [],
      documentation: []
    }

    for (const criterion of criteria) {
      groups[criterion.category].push(criterion)
    }

    return groups
  }, [criteria])

  // Calculate completion stats
  const stats = useMemo(() => {
    let completed = 0
    const total = criteria.length

    for (const criterion of criteria) {
      const status = getCriterionStatus(criterion.id, coverageMatrix, phases)
      if (status === 'completed') {
        completed++
      }
    }

    return { completed, total }
  }, [criteria, coverageMatrix, phases])

  // Calculate per-category stats
  const categoryStats = useMemo(() => {
    const stats: Record<SuccessCriterion['category'], { completed: number; total: number }> = {
      functional: { completed: 0, total: 0 },
      'non-functional': { completed: 0, total: 0 },
      testing: { completed: 0, total: 0 },
      documentation: { completed: 0, total: 0 }
    }

    for (const criterion of criteria) {
      stats[criterion.category].total++
      const status = getCriterionStatus(criterion.id, coverageMatrix, phases)
      if (status === 'completed') {
        stats[criterion.category].completed++
      }
    }

    return stats
  }, [criteria, coverageMatrix, phases])

  const toggleCategory = (category: SuccessCriterion['category']) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  const progressPercent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  return (
    <div data-testid="success-criteria-checklist" className="border-t border-slate-700/50 pt-4">
      {/* Header with Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-300">Success Criteria</h3>
          <span data-testid="progress-text" className="text-xs text-slate-400">
            {stats.completed}/{stats.total} completed
          </span>
        </div>
        <div
          data-testid="progress-bar-container"
          className="h-2 bg-zinc-700 rounded-full overflow-hidden"
        >
          <div
            data-testid="progress-bar-fill"
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Empty State */}
      {criteria.length === 0 ? (
        <div
          data-testid="empty-criteria"
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
            No success criteria defined for this plan.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {categoryOrder.map((category) => {
            const categoryCriteria = groupedCriteria[category]
            if (categoryCriteria.length === 0) return null

            const isCollapsed = collapsedCategories[category]
            const catStats = categoryStats[category]

            return (
              <div
                key={category}
                data-testid={`category-section-${category}`}
                className="border border-slate-700/50 rounded-lg overflow-hidden"
              >
                {/* Category Header */}
                <button
                  data-testid={`category-header-${category}`}
                  onClick={() => toggleCategory(category)}
                  className="flex items-center justify-between w-full px-3 py-2 bg-slate-800/50 text-left hover:bg-slate-800/70 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <svg
                      data-testid={`category-chevron-${category}`}
                      className={`w-3 h-3 text-slate-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    <span className="text-sm font-medium text-slate-300">
                      {categoryLabels[category]}
                    </span>
                  </div>
                  <span
                    data-testid={`category-count-${category}`}
                    className="text-xs text-slate-400"
                  >
                    {catStats.completed}/{catStats.total}
                  </span>
                </button>

                {/* Category Content */}
                {!isCollapsed && (
                  <div data-testid={`category-content-${category}`} className="px-3 py-2 space-y-2">
                    {categoryCriteria.map((criterion) => (
                      <CriterionItem
                        key={criterion.id}
                        criterion={criterion}
                        coverageMatrix={coverageMatrix}
                        phases={phases}
                        onPhaseClick={onPhaseClick}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface CriterionItemProps {
  criterion: SuccessCriterion
  coverageMatrix: Record<string, { phases: number[] }>
  phases: Phase[]
  onPhaseClick: (phaseNumber: number) => void
}

function CriterionItem({ criterion, coverageMatrix, phases, onPhaseClick }: CriterionItemProps) {
  const status = getCriterionStatus(criterion.id, coverageMatrix, phases)
  const coverage = coverageMatrix[criterion.id]
  const addressingPhases = coverage?.phases || []

  return (
    <div data-testid={`criterion-item-${criterion.id}`} className="flex items-start gap-2">
      <StatusIcon status={status} testId={`criterion-status-icon-${criterion.id}`} />
      <div className="flex-1 min-w-0">
        <p
          data-testid={`criterion-description-${criterion.id}`}
          className={`text-sm ${status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-300'}`}
        >
          {criterion.description}
        </p>
        {addressingPhases.length > 0 && (
          <div
            data-testid={`criterion-phases-${criterion.id}`}
            className="flex items-center gap-1 flex-wrap mt-1"
          >
            <span className="text-xs text-slate-500">Phases:</span>
            {addressingPhases.map((phaseNum, idx) => (
              <span key={phaseNum}>
                <button
                  data-testid={`phase-link-${criterion.id}-${phaseNum}`}
                  onClick={() => onPhaseClick(phaseNum)}
                  className="text-xs text-cyan-400 hover:underline"
                >
                  {phaseNum}
                </button>
                {idx < addressingPhases.length - 1 && (
                  <span className="text-xs text-slate-500">,</span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
