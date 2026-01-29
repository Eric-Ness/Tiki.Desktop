import { useState, useEffect, useCallback } from 'react'

export interface WorkflowRun {
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

interface WorkflowRunItemProps {
  run: WorkflowRun
  onOpenInBrowser: (url: string) => void
}

// Format elapsed time in a human-readable way
function formatElapsedTime(createdAt: string): string {
  const start = new Date(createdAt).getTime()
  const now = Date.now()
  const elapsedMs = now - start

  const seconds = Math.floor(elapsedMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

// Format relative time (e.g., "2 hours ago")
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString).getTime()
  const now = Date.now()
  const diffMs = now - date

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}d ago`
  }
  if (hours > 0) {
    return `${hours}h ago`
  }
  if (minutes > 0) {
    return `${minutes}m ago`
  }
  return 'just now'
}

// Status icon components
function SuccessIcon() {
  return (
    <svg
      className="w-4 h-4 text-green-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function FailureIcon() {
  return (
    <svg
      className="w-4 h-4 text-red-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </svg>
  )
}

function InProgressIcon() {
  return (
    <svg
      className="w-4 h-4 text-amber-500 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}

function QueuedIcon() {
  return (
    <svg
      className="w-4 h-4 text-slate-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

function CancelledIcon() {
  return (
    <svg
      className="w-4 h-4 text-slate-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8" />
    </svg>
  )
}

function getStatusIcon(status: string, conclusion: string | null) {
  if (status === 'completed') {
    switch (conclusion) {
      case 'success':
        return <SuccessIcon />
      case 'failure':
        return <FailureIcon />
      case 'cancelled':
        return <CancelledIcon />
      default:
        return <FailureIcon />
    }
  }
  if (status === 'in_progress') {
    return <InProgressIcon />
  }
  if (status === 'queued' || status === 'waiting' || status === 'pending') {
    return <QueuedIcon />
  }
  return <QueuedIcon />
}

function getStatusLabel(status: string, conclusion: string | null): string {
  if (status === 'completed') {
    return conclusion || 'completed'
  }
  return status.replace(/_/g, ' ')
}

function getStatusColor(status: string, conclusion: string | null): string {
  if (status === 'completed') {
    switch (conclusion) {
      case 'success':
        return 'text-green-400'
      case 'failure':
        return 'text-red-400'
      case 'cancelled':
        return 'text-slate-500'
      default:
        return 'text-red-400'
    }
  }
  if (status === 'in_progress') {
    return 'text-amber-400'
  }
  return 'text-slate-400'
}

export function WorkflowRunItem({ run, onOpenInBrowser }: WorkflowRunItemProps) {
  const [elapsedTime, setElapsedTime] = useState(formatElapsedTime(run.createdAt))
  const [expanded, setExpanded] = useState(false)

  const isInProgress = run.status === 'in_progress'
  const isFailed = run.status === 'completed' && run.conclusion === 'failure'

  // Update elapsed time every second for in-progress runs
  useEffect(() => {
    if (!isInProgress) {
      return
    }

    const interval = setInterval(() => {
      setElapsedTime(formatElapsedTime(run.createdAt))
    }, 1000)

    return () => clearInterval(interval)
  }, [isInProgress, run.createdAt])

  const handleClick = useCallback(() => {
    onOpenInBrowser(run.url)
  }, [onOpenInBrowser, run.url])

  const handleExpandToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setExpanded(!expanded)
  }, [expanded])

  const truncatedSha = run.headSha.slice(0, 7)

  return (
    <div
      className="border-b border-slate-700/50 last:border-b-0"
      data-testid="workflow-run-item"
    >
      <div className="flex items-start gap-3 px-3 py-2 hover:bg-slate-800/50 transition-colors">
        {/* Clickable area for opening in browser */}
        <button
          onClick={handleClick}
          className="flex-1 min-w-0 text-left flex items-start gap-3"
        >
          {/* Status Icon */}
          <div className="flex-shrink-0 pt-0.5" data-testid="run-status-icon">
            {getStatusIcon(run.status, run.conclusion)}
          </div>

          {/* Run Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-200 truncate" title={run.name}>
                {run.name}
              </span>
              <span className={`text-xs capitalize ${getStatusColor(run.status, run.conclusion)}`}>
                {getStatusLabel(run.status, run.conclusion)}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              {/* Commit SHA */}
              <span className="font-mono" title={run.headSha}>
                {truncatedSha}
              </span>

              {/* Event trigger */}
              <span className="flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
                  <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
                </svg>
                {run.event}
              </span>

              {/* Time info */}
              {isInProgress ? (
                <span className="text-amber-400" data-testid="elapsed-time">
                  Running for {elapsedTime}
                </span>
              ) : (
                <span>{formatRelativeTime(run.updatedAt)}</span>
              )}
            </div>
          </div>
        </button>

        {/* Expand button for failed runs - separate from main clickable area */}
        {isFailed && (
          <button
            onClick={handleExpandToggle}
            className="flex-shrink-0 p-1 hover:bg-slate-700 rounded transition-colors"
            title={expanded ? 'Collapse details' : 'Expand details'}
            data-testid="expand-button"
          >
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        )}
      </div>

      {/* Expanded failure details */}
      {isFailed && expanded && (
        <div
          className="px-3 py-2 bg-red-500/10 border-t border-red-500/20"
          data-testid="failure-details"
        >
          <div className="text-xs text-red-400">
            <div className="font-medium mb-1">Workflow failed</div>
            <div className="text-red-300/70">
              Conclusion: <span className="font-mono">{run.conclusion}</span>
            </div>
            <button
              onClick={handleClick}
              className="mt-2 text-amber-400 hover:text-amber-300 underline"
            >
              View full logs on GitHub
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
