import type { ExecutionDisplay } from '../../stores/tiki-store'

interface ExecutionCardProps {
  execution: ExecutionDisplay
}

/**
 * ExecutionCard - Displays a single execution with phase progress.
 *
 * Shows:
 * - Status indicator with issue number
 * - Issue title
 * - Phase progress bar with individual segments
 * - Phase count (completed/total)
 * - Error message display for failed status
 * - Auto-fix status display
 */
export function ExecutionCard({ execution }: ExecutionCardProps) {
  const { issueNumber, issueTitle, status, phases, completedCount, totalCount, errorMessage, autoFix } = execution

  const getStatusColor = () => {
    switch (status) {
      case 'executing': return 'bg-status-running'
      case 'paused': return 'bg-amber-400'
      case 'failed': return 'bg-status-failed'
      case 'completed': return 'bg-status-completed'
      default: return 'bg-slate-500'
    }
  }

  const getStatusLabel = () => {
    if (status === 'failed' && autoFix) {
      return `Auto-fixing (${autoFix.attempt}/${autoFix.maxAttempts})`
    }
    switch (status) {
      case 'executing': return 'Executing'
      case 'paused': return 'Paused'
      case 'failed': return 'Failed'
      case 'completed': return 'Completed'
      default: return 'Unknown'
    }
  }

  return (
    <div className="p-2 bg-background rounded border border-border/50">
      {/* Status header */}
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${getStatusColor()} ${status === 'executing' ? 'animate-pulse' : ''}`} />
        <span className="text-xs text-slate-400">#{issueNumber}</span>
        <span className="text-xs text-slate-500 truncate flex-1">{getStatusLabel()}</span>
      </div>

      {/* Issue title */}
      <div className="text-xs text-slate-400 truncate mt-1 pl-4">{issueTitle}</div>

      {/* Phase progress */}
      {phases.length > 0 && (
        <div className="mt-1.5 pl-4">
          <div className="flex gap-0.5">
            {phases.map((phase) => (
              <div
                key={phase.number}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  phase.status === 'completed' ? 'bg-status-completed' :
                  phase.status === 'in_progress' ? 'bg-status-running animate-pulse' :
                  phase.status === 'failed' ? 'bg-status-failed' :
                  phase.status === 'skipped' ? 'bg-slate-500' :
                  'bg-slate-600'
                }`}
                title={`Phase ${phase.number}: ${phase.title} (${phase.status})`}
              />
            ))}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 text-right">
            {completedCount} / {totalCount}
          </div>
        </div>
      )}

      {/* Error message */}
      {status === 'failed' && errorMessage && (
        <div
          className="mt-1 px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-[10px] text-red-400 truncate"
          title={errorMessage}
        >
          {errorMessage}
        </div>
      )}
    </div>
  )
}
