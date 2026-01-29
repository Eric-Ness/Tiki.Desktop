/**
 * RetryControls Component
 *
 * Provides execution controls for retry strategies, including:
 * - Execution progress display
 * - Cancel button during execution
 * - Success/failure result display
 * - "Try Again" button after failure
 */
import type { StrategyExecution, RetryStrategy, ExecutionOutcome } from '../../../../preload/index'

interface RetryControlsProps {
  issueNumber: number
  phaseNumber: number
  execution: StrategyExecution | null
  onExecute: (strategy: RetryStrategy) => void
  onCancel: () => void
}

// Outcome-specific styling
const outcomeStyles: Record<
  ExecutionOutcome,
  { bg: string; border: string; text: string; icon: JSX.Element }
> = {
  pending: {
    bg: 'bg-blue-900/30',
    border: 'border-blue-700',
    text: 'text-blue-300',
    icon: (
      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    )
  },
  success: {
    bg: 'bg-green-900/30',
    border: 'border-green-700',
    text: 'text-green-300',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    )
  },
  failure: {
    bg: 'bg-red-900/30',
    border: 'border-red-700',
    text: 'text-red-300',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    )
  },
  cancelled: {
    bg: 'bg-amber-900/30',
    border: 'border-amber-700',
    text: 'text-amber-300',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
        />
      </svg>
    )
  }
}

// Outcome labels
const outcomeLabels: Record<ExecutionOutcome, string> = {
  pending: 'Executing...',
  success: 'Success',
  failure: 'Failed',
  cancelled: 'Cancelled'
}

// Format timestamp
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// Format duration
function formatDuration(startedAt: number, completedAt: number | null): string {
  const endTime = completedAt || Date.now()
  const durationMs = endTime - startedAt
  const seconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }
  return `${seconds}s`
}

// Command list component
function CommandList({ commands }: { commands: { command: string; description: string }[] }) {
  return (
    <div className="space-y-1">
      {commands.map((cmd, index) => (
        <div key={index} className="flex items-start gap-2">
          <span className="text-xs text-slate-500 mt-0.5">{index + 1}.</span>
          <div className="flex-1 min-w-0">
            <code className="text-xs text-slate-300 font-mono break-words">{cmd.command}</code>
            <p className="text-xs text-slate-500">{cmd.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// No execution state component
function NoExecutionState({
  issueNumber,
  phaseNumber
}: {
  issueNumber: number
  phaseNumber: number
}) {
  return (
    <div
      className="p-4 bg-slate-800/50 rounded-lg border border-slate-700"
      data-testid="retry-controls-idle"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-100">Retry Phase {phaseNumber}</h3>
        <span className="text-xs text-slate-400">Issue #{issueNumber}</span>
      </div>
      <p className="text-xs text-slate-400">
        Select a retry strategy above to execute a recovery action for this failed phase.
      </p>
    </div>
  )
}

// Execution status component
function ExecutionStatus({
  execution,
  onCancel
}: {
  execution: StrategyExecution
  onCancel: () => void
}) {
  const style = outcomeStyles[execution.outcome]
  const isPending = execution.outcome === 'pending'
  const isCompleted = execution.outcome === 'success' || execution.outcome === 'failure'

  return (
    <div
      className={`p-4 rounded-lg border ${style.bg} ${style.border}`}
      data-testid="execution-status"
    >
      {/* Header with outcome */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={style.text}>{style.icon}</span>
          <span className={`text-sm font-medium ${style.text}`}>
            {outcomeLabels[execution.outcome]}
          </span>
        </div>
        <span className="text-xs text-slate-400">
          {formatDuration(execution.startedAt, execution.completedAt)}
        </span>
      </div>

      {/* Strategy info */}
      <div className="mb-3">
        <span className="text-xs text-slate-500">Strategy:</span>
        <span className="text-xs text-slate-300 ml-2">{execution.strategyId}</span>
      </div>

      {/* Timestamps */}
      <div className="flex items-center gap-4 mb-3 text-xs text-slate-400">
        <span>Started: {formatTime(execution.startedAt)}</span>
        {execution.completedAt && <span>Completed: {formatTime(execution.completedAt)}</span>}
      </div>

      {/* Commands to execute */}
      {execution.commands && execution.commands.length > 0 && (
        <div className="mb-3">
          <span className="text-xs text-slate-500 block mb-1">Commands:</span>
          <div className="bg-slate-900/50 rounded p-2">
            <CommandList commands={execution.commands} />
          </div>
        </div>
      )}

      {/* Notes */}
      {execution.notes && (
        <div className="mb-3">
          <span className="text-xs text-slate-500 block mb-1">Notes:</span>
          <p className="text-xs text-slate-300 whitespace-pre-wrap">{execution.notes}</p>
        </div>
      )}

      {/* Result phase status */}
      {isCompleted && execution.resultPhaseStatus && (
        <div className="mb-3">
          <span className="text-xs text-slate-500">Result:</span>
          <span className={`text-xs ml-2 ${style.text}`}>{execution.resultPhaseStatus}</span>
        </div>
      )}

      {/* Cancel button (only during pending) */}
      {isPending && (
        <button
          onClick={onCancel}
          className="w-full mt-2 px-3 py-2 text-sm bg-red-600 hover:bg-red-500 active:bg-red-600 text-white rounded transition-colors"
          data-testid="cancel-button"
        >
          Cancel Execution
        </button>
      )}
    </div>
  )
}

// Result actions component
function ResultActions({
  execution,
  onExecute
}: {
  execution: StrategyExecution
  onExecute: () => void
}) {
  const isFailed = execution.outcome === 'failure'
  const isCancelled = execution.outcome === 'cancelled'

  if (!isFailed && !isCancelled) {
    return null
  }

  return (
    <div className="flex gap-2 mt-3" data-testid="result-actions">
      <button
        onClick={onExecute}
        className="flex-1 px-3 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-600 text-white rounded transition-colors"
        data-testid="try-again-button"
      >
        Try Again
      </button>
    </div>
  )
}

export function RetryControls({
  issueNumber,
  phaseNumber,
  execution,
  onExecute,
  onCancel
}: RetryControlsProps) {
  // No execution state
  if (!execution) {
    return <NoExecutionState issueNumber={issueNumber} phaseNumber={phaseNumber} />
  }

  return (
    <div className="space-y-3" data-testid="retry-controls">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">Retry Execution</h3>
        <span className="text-xs text-slate-400">
          Phase {phaseNumber} / Issue #{issueNumber}
        </span>
      </div>

      {/* Execution status */}
      <ExecutionStatus execution={execution} onCancel={onCancel} />

      {/* Result actions (Try Again button) */}
      <ResultActions
        execution={execution}
        onExecute={() => {
          // The parent component should handle re-executing with the same or different strategy
          // This is a placeholder that will be called by the parent
          // We pass an empty strategy since the parent will determine what to execute
          onExecute({} as RetryStrategy)
        }}
      />
    </div>
  )
}
