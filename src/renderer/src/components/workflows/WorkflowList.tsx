import { useState, useEffect, useCallback, useRef } from 'react'
import { WorkflowRunItem, type WorkflowRun } from './WorkflowRunItem'

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

interface WorkflowListProps {
  cwd: string
}

interface WorkflowWithRuns extends Workflow {
  runs: WorkflowRun[]
  loading: boolean
  error: string | null
}

export function WorkflowList({ cwd }: WorkflowListProps) {
  const [workflows, setWorkflows] = useState<WorkflowWithRuns[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedWorkflows, setExpandedWorkflows] = useState<Set<number>>(new Set())
  const subscribedWorkflowsRef = useRef<Set<number>>(new Set())

  // Fetch workflows on mount
  useEffect(() => {
    let mounted = true

    async function fetchWorkflows() {
      try {
        setLoading(true)
        setError(null)
        const workflowList = await window.tikiDesktop.workflow.list(cwd)

        if (!mounted) return

        // Initialize workflows with empty runs
        const workflowsWithRuns: WorkflowWithRuns[] = workflowList.map((w) => ({
          ...w,
          runs: [],
          loading: true,
          error: null
        }))

        setWorkflows(workflowsWithRuns)

        // Expand first workflow by default
        if (workflowList.length > 0) {
          setExpandedWorkflows(new Set([workflowList[0].id]))
        }

        // Fetch runs for each workflow
        for (const workflow of workflowList) {
          if (!mounted) return
          try {
            const runs = await window.tikiDesktop.workflow.runs(workflow.id, cwd)
            if (!mounted) return

            setWorkflows((prev) =>
              prev.map((w) =>
                w.id === workflow.id
                  ? { ...w, runs, loading: false }
                  : w
              )
            )

            // Subscribe to workflows with in-progress runs
            const hasInProgress = runs.some((r) => r.status === 'in_progress')
            if (hasInProgress && !subscribedWorkflowsRef.current.has(workflow.id)) {
              await window.tikiDesktop.workflow.subscribe(workflow.id, cwd)
              subscribedWorkflowsRef.current.add(workflow.id)
            }
          } catch (err) {
            if (!mounted) return
            setWorkflows((prev) =>
              prev.map((w) =>
                w.id === workflow.id
                  ? { ...w, loading: false, error: err instanceof Error ? err.message : 'Failed to fetch runs' }
                  : w
              )
            )
          }
        }

        setLoading(false)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Failed to fetch workflows')
        setLoading(false)
      }
    }

    fetchWorkflows()

    return () => {
      mounted = false
    }
  }, [cwd])

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = window.tikiDesktop.workflow.onRunsUpdate((update: WorkflowRunsUpdate) => {
      if (update.cwd !== cwd) return

      setWorkflows((prev) =>
        prev.map((w) =>
          w.id === update.workflowId
            ? { ...w, runs: update.runs }
            : w
        )
      )

      // Check if we should unsubscribe (no more in-progress runs)
      const hasInProgress = update.runs.some((r) => r.status === 'in_progress')
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
  }, [cwd])

  const handleOpenInBrowser = useCallback(async (url: string) => {
    await window.tikiDesktop.workflow.openInBrowser(url)
  }, [])

  const toggleWorkflow = useCallback((workflowId: number) => {
    setExpandedWorkflows((prev) => {
      const next = new Set(prev)
      if (next.has(workflowId)) {
        next.delete(workflowId)
      } else {
        next.add(workflowId)
      }
      return next
    })
  }, [])

  const handleRefresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const workflowList = await window.tikiDesktop.workflow.list(cwd)
      const workflowsWithRuns: WorkflowWithRuns[] = workflowList.map((w) => ({
        ...w,
        runs: [],
        loading: true,
        error: null
      }))

      setWorkflows(workflowsWithRuns)

      for (const workflow of workflowList) {
        try {
          const runs = await window.tikiDesktop.workflow.runs(workflow.id, cwd)
          setWorkflows((prev) =>
            prev.map((w) =>
              w.id === workflow.id
                ? { ...w, runs, loading: false }
                : w
            )
          )

          const hasInProgress = runs.some((r) => r.status === 'in_progress')
          if (hasInProgress && !subscribedWorkflowsRef.current.has(workflow.id)) {
            await window.tikiDesktop.workflow.subscribe(workflow.id, cwd)
            subscribedWorkflowsRef.current.add(workflow.id)
          }
        } catch {
          setWorkflows((prev) =>
            prev.map((w) =>
              w.id === workflow.id
                ? { ...w, loading: false, error: 'Failed to fetch runs' }
                : w
            )
          )
        }
      }

      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workflows')
      setLoading(false)
    }
  }, [cwd])

  if (loading && workflows.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-4 text-sm text-slate-500">
        <svg
          className="w-4 h-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
        Loading workflows...
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-3 py-4">
        <div className="flex items-start gap-2 text-sm text-red-400">
          <svg
            className="w-4 h-4 mt-0.5 flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <div>
            <div className="font-medium">Failed to load workflows</div>
            <div className="text-xs text-red-300/70 mt-1">{error}</div>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="mt-3 text-xs text-amber-500 hover:text-amber-400 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (workflows.length === 0) {
    return (
      <div className="px-3 py-4 text-sm text-slate-500 italic" data-testid="no-workflows">
        No workflows found
      </div>
    )
  }

  return (
    <div className="space-y-1" data-testid="workflow-list">
      {/* Refresh button */}
      <div className="flex justify-end px-3 py-1">
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-1 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
          title="Refresh workflows"
        >
          <svg
            className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M1 4v6h6M23 20v-6h-6" />
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
          </svg>
        </button>
      </div>

      {/* Workflow accordions */}
      {workflows.map((workflow) => {
        const isExpanded = expandedWorkflows.has(workflow.id)
        const hasInProgress = workflow.runs.some((r) => r.status === 'in_progress')
        const latestRun = workflow.runs[0]
        const latestStatus = latestRun
          ? latestRun.status === 'completed'
            ? latestRun.conclusion
            : latestRun.status
          : null

        return (
          <div
            key={workflow.id}
            className="bg-slate-800/30 rounded-lg overflow-hidden"
            data-testid="workflow-section"
          >
            {/* Workflow header */}
            <button
              onClick={() => toggleWorkflow(workflow.id)}
              className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-800/50 transition-colors"
            >
              {/* Expand/collapse icon */}
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>

              {/* Status indicator */}
              {latestStatus && (
                <span
                  className={`w-2 h-2 rounded-full ${
                    latestStatus === 'success'
                      ? 'bg-green-500'
                      : latestStatus === 'failure'
                        ? 'bg-red-500'
                        : hasInProgress
                          ? 'bg-amber-500 animate-pulse'
                          : 'bg-slate-500'
                  }`}
                />
              )}

              {/* Workflow name */}
              <span className="flex-1 text-left text-sm text-slate-200 truncate">
                {workflow.name}
              </span>

              {/* Run count */}
              <span className="text-xs text-slate-500">
                {workflow.runs.length} runs
              </span>
            </button>

            {/* Workflow runs */}
            {isExpanded && (
              <div className="border-t border-slate-700/50">
                {workflow.loading ? (
                  <div className="flex items-center gap-2 px-3 py-3 text-xs text-slate-500">
                    <svg
                      className="w-3 h-3 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                    Loading runs...
                  </div>
                ) : workflow.error ? (
                  <div className="px-3 py-3 text-xs text-red-400">
                    {workflow.error}
                  </div>
                ) : workflow.runs.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-slate-500 italic">
                    No recent runs
                  </div>
                ) : (
                  workflow.runs.map((run) => (
                    <WorkflowRunItem
                      key={run.id}
                      run={run}
                      onOpenInBrowser={handleOpenInBrowser}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
