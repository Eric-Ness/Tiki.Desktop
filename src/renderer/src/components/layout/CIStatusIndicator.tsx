import { useState, useEffect, useRef, useCallback } from 'react'

interface WorkflowRun {
  id: number
  name: string
  status: string
  conclusion: string | null
  event: string
  headSha: string
  createdAt: string
  updatedAt: string
  url: string
}

interface Workflow {
  id: number
  name: string
  state: string
}

interface WorkflowRunsUpdate {
  workflowId: number
  cwd: string
  runs: WorkflowRun[]
}

interface CIHealthCounts {
  passing: number
  failing: number
  inProgress: number
}

type CIHealthStatus = 'green' | 'yellow' | 'red' | 'none'

interface CIStatusIndicatorProps {
  cwd: string
  onOpenDashboard?: () => void
}

export function CIStatusIndicator({ cwd, onOpenDashboard }: CIStatusIndicatorProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [healthCounts, setHealthCounts] = useState<CIHealthCounts>({
    passing: 0,
    failing: 0,
    inProgress: 0
  })
  const [showTooltip, setShowTooltip] = useState(false)
  const subscribedWorkflowsRef = useRef<Set<number>>(new Set())
  const workflowRunsRef = useRef<Map<number, WorkflowRun[]>>(new Map())

  // Calculate health status from counts
  const getHealthStatus = useCallback((): CIHealthStatus => {
    const { passing, failing, inProgress } = healthCounts

    if (passing === 0 && failing === 0 && inProgress === 0) {
      return 'none'
    }

    if (failing > 0) {
      return 'red'
    }

    if (inProgress > 0) {
      return 'yellow'
    }

    return 'green'
  }, [healthCounts])

  // Calculate counts from workflow runs
  const calculateCounts = useCallback((runsMap: Map<number, WorkflowRun[]>): CIHealthCounts => {
    let passing = 0
    let failing = 0
    let inProgress = 0

    for (const runs of runsMap.values()) {
      if (runs.length > 0) {
        const latestRun = runs[0]
        if (latestRun.status === 'in_progress' || latestRun.status === 'queued') {
          inProgress++
        } else if (latestRun.status === 'completed') {
          if (latestRun.conclusion === 'success') {
            passing++
          } else if (latestRun.conclusion === 'failure') {
            failing++
          }
        }
      }
    }

    return { passing, failing, inProgress }
  }, [])

  // Fetch workflows and their latest runs
  useEffect(() => {
    let mounted = true

    async function fetchCIStatus() {
      try {
        setLoading(true)
        setError(null)

        const workflows: Workflow[] = await window.tikiDesktop.workflow.list(cwd)

        if (!mounted) return

        const newRunsMap = new Map<number, WorkflowRun[]>()

        // Fetch runs for each workflow
        for (const workflow of workflows) {
          if (!mounted) return
          try {
            const runs = await window.tikiDesktop.workflow.runs(workflow.id, cwd)
            newRunsMap.set(workflow.id, runs)

            // Subscribe to workflows with in-progress runs
            const hasInProgress = runs.some(
              (r) => r.status === 'in_progress' || r.status === 'queued'
            )
            if (hasInProgress && !subscribedWorkflowsRef.current.has(workflow.id)) {
              await window.tikiDesktop.workflow.subscribe(workflow.id, cwd)
              subscribedWorkflowsRef.current.add(workflow.id)
            }
          } catch {
            // Silently ignore individual workflow fetch errors
          }
        }

        if (!mounted) return

        workflowRunsRef.current = newRunsMap
        setHealthCounts(calculateCounts(newRunsMap))
        setLoading(false)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Failed to fetch CI status')
        setLoading(false)
      }
    }

    fetchCIStatus()

    // Refresh every 5 minutes (real-time updates handle in-progress)
    const interval = setInterval(fetchCIStatus, 5 * 60 * 1000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [cwd, calculateCounts])

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = window.tikiDesktop.workflow.onRunsUpdate((update: WorkflowRunsUpdate) => {
      if (update.cwd !== cwd) return

      workflowRunsRef.current.set(update.workflowId, update.runs)
      setHealthCounts(calculateCounts(workflowRunsRef.current))

      // Check if we should unsubscribe (no more in-progress runs)
      const hasInProgress = update.runs.some(
        (r) => r.status === 'in_progress' || r.status === 'queued'
      )
      if (!hasInProgress && subscribedWorkflowsRef.current.has(update.workflowId)) {
        window.tikiDesktop.workflow.unsubscribe(update.workflowId, cwd)
        subscribedWorkflowsRef.current.delete(update.workflowId)
      }
    })

    return () => {
      unsubscribe()
      // Unsubscribe from all workflows on unmount
      for (const workflowId of subscribedWorkflowsRef.current) {
        window.tikiDesktop.workflow.unsubscribe(workflowId, cwd)
      }
      subscribedWorkflowsRef.current.clear()
    }
  }, [cwd, calculateCounts])

  const healthStatus = getHealthStatus()

  const handleClick = () => {
    onOpenDashboard?.()
  }

  // Render status icon
  const renderIcon = () => {
    if (loading) {
      return (
        <svg
          className="w-3.5 h-3.5 animate-spin text-slate-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          data-testid="loading-spinner"
        >
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      )
    }

    if (error) {
      return (
        <svg
          className="w-3.5 h-3.5 text-slate-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          data-testid="error-icon"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )
    }

    switch (healthStatus) {
      case 'green':
        return (
          <svg
            className="w-3.5 h-3.5 text-green-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            data-testid="success-icon"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        )
      case 'yellow':
        return (
          <svg
            className="w-3.5 h-3.5 text-amber-500 animate-pulse"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            data-testid="in-progress-icon"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        )
      case 'red':
        return (
          <svg
            className="w-3.5 h-3.5 text-red-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            data-testid="failure-icon"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        )
      default:
        return (
          <svg
            className="w-3.5 h-3.5 text-slate-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            data-testid="no-runs-icon"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        )
    }
  }

  // Build tooltip text
  const getTooltipText = (): string => {
    if (loading) return 'Loading CI status...'
    if (error) return `CI status error: ${error}`

    const { passing, failing, inProgress } = healthCounts
    const total = passing + failing + inProgress

    if (total === 0) return 'No workflow runs'

    const parts: string[] = []
    if (passing > 0) parts.push(`${passing} passing`)
    if (failing > 0) parts.push(`${failing} failing`)
    if (inProgress > 0) parts.push(`${inProgress} in-progress`)

    return parts.join(', ')
  }

  return (
    <div className="relative" data-testid="ci-status-indicator">
      <button
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 transition-colors"
        title={getTooltipText()}
        data-testid="ci-status-button"
      >
        {renderIcon()}
        <span className="hidden sm:inline">CI</span>
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 whitespace-nowrap z-50"
          data-testid="ci-tooltip"
        >
          {getTooltipText()}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </div>
  )
}
