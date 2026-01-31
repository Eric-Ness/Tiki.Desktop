import { useState, useMemo, useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useTikiStore } from '../../stores/tiki-store'

/**
 * Truncates text to a maximum length, adding ellipsis if truncated
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.slice(0, maxLength) + '...'
}

/**
 * Interface for individual breadcrumb items
 */
export interface BreadcrumbItem {
  /** Display label (may be truncated) */
  label: string
  /** Full label shown in tooltip when different from label */
  fullLabel: string
  /** Click handler for navigation (optional for current item) */
  onClick?: () => void
  /** Whether this is the current/active item */
  isCurrent: boolean
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

interface TooltipState {
  show: boolean
  text: string
  x: number
  y: number
}

/**
 * Breadcrumb component that displays context-aware navigation path
 */
export function Breadcrumb({ items }: BreadcrumbProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    show: false,
    text: '',
    x: 0,
    y: 0
  })

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLElement>, item: BreadcrumbItem) => {
    // Only show tooltip if fullLabel differs from label (truncated)
    if (item.fullLabel !== item.label) {
      const rect = e.currentTarget.getBoundingClientRect()
      setTooltip({
        show: true,
        text: item.fullLabel,
        x: rect.left,
        y: rect.bottom + 4
      })
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    setTooltip(prev => ({ ...prev, show: false }))
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, onClick?: () => void) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onClick()
    }
  }, [])

  return (
    <nav
      data-testid="breadcrumb-container"
      className="h-8 bg-zinc-900/50 px-3 flex items-center"
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {/* Separator (not shown before first item) */}
            {index > 0 && (
              <span className="text-zinc-600 mx-2" aria-hidden="true">
                {'>'}
              </span>
            )}

            {/* Breadcrumb item */}
            {item.isCurrent ? (
              // Current item - not clickable
              <span
                className="text-sm text-zinc-200 font-medium"
                aria-current="page"
              >
                {item.label}
              </span>
            ) : item.onClick ? (
              // Clickable item with onClick handler
              <button
                type="button"
                onClick={item.onClick}
                onKeyDown={(e) => handleKeyDown(e, item.onClick)}
                onMouseEnter={(e) => handleMouseEnter(e, item)}
                onMouseLeave={handleMouseLeave}
                className="text-sm text-zinc-400 hover:text-zinc-100 hover:underline focus:outline-none focus:ring-1 focus:ring-zinc-500 rounded px-0.5"
                tabIndex={0}
              >
                {item.label}
              </button>
            ) : (
              // Non-clickable item (no onClick)
              <span
                className="text-sm text-zinc-400"
                onMouseEnter={(e) => handleMouseEnter(e, item)}
                onMouseLeave={handleMouseLeave}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>

      {/* Tooltip */}
      {tooltip.show && (
        <div
          data-testid="breadcrumb-tooltip"
          className="fixed z-50 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 shadow-xl text-sm text-zinc-100"
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
        >
          {tooltip.text}
        </div>
      )}
    </nav>
  )
}

/**
 * Hook that builds breadcrumb items based on current context
 */
export function useBreadcrumbItems() {
  const { activeProject, selectedNode, currentPlan, selectedIssue, setSelectedIssue, setSelectedNode } = useTikiStore(
    useShallow((state) => ({
      activeProject: state.activeProject,
      selectedNode: state.selectedNode,
      currentPlan: state.currentPlan,
      selectedIssue: state.selectedIssue,
      setSelectedIssue: state.setSelectedIssue,
      setSelectedNode: state.setSelectedNode
    }))
  )

  // Navigation callbacks
  const navigateToProject = useCallback(() => {
    setSelectedIssue(null)
    setSelectedNode(null)
  }, [setSelectedIssue, setSelectedNode])

  const navigateToIssue = useCallback(() => {
    setSelectedNode(null)
  }, [setSelectedNode])

  // Build breadcrumb items based on current context
  const items = useMemo<BreadcrumbItem[]>(() => {
    if (!activeProject) {
      return []
    }

    const breadcrumbItems: BreadcrumbItem[] = []

    // Level 1: Project
    const hasIssue = selectedIssue !== null && currentPlan !== null
    breadcrumbItems.push({
      label: activeProject.name,
      fullLabel: activeProject.name,
      onClick: hasIssue ? navigateToProject : undefined,
      isCurrent: !hasIssue
    })

    // Level 2: Issue (if selected)
    if (selectedIssue !== null && currentPlan !== null) {
      const issueTitle = currentPlan.issue.title
      const maxTitleLength = 30
      const truncatedTitle = truncateText(issueTitle, maxTitleLength)
      const issueLabel = `#${currentPlan.issue.number}: ${truncatedTitle}`
      const issueFullLabel = `#${currentPlan.issue.number}: ${issueTitle}`

      // Check if a phase is selected
      const hasPhase = selectedNode !== null && selectedNode.startsWith('phase-')

      breadcrumbItems.push({
        label: issueLabel,
        fullLabel: issueFullLabel,
        onClick: hasPhase ? navigateToIssue : undefined,
        isCurrent: !hasPhase
      })

      // Level 3: Phase (if selected)
      if (hasPhase) {
        const phaseNumberStr = selectedNode.replace('phase-', '')
        const phaseNumber = parseInt(phaseNumberStr, 10)
        const phase = currentPlan.phases.find(p => p.number === phaseNumber)

        if (phase) {
          const phaseLabel = `Phase ${phase.number}: ${truncateText(phase.title, 20)}`
          const phaseFullLabel = `Phase ${phase.number}: ${phase.title}`

          breadcrumbItems.push({
            label: phaseLabel,
            fullLabel: phaseFullLabel,
            isCurrent: true
          })
        }
      }
    }

    return breadcrumbItems
  }, [activeProject, selectedNode, currentPlan, selectedIssue, navigateToProject, navigateToIssue])

  return {
    items,
    navigateToProject,
    navigateToIssue
  }
}
