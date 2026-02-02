import type { LastCompletedDisplay } from '../../stores/tiki-store'

interface IdleStateProps {
  lastCompleted: LastCompletedDisplay | null
}

/**
 * IdleState - Displays the idle state when no execution is active.
 *
 * Shows:
 * - "Idle" status with indicator
 * - "No active execution" message
 * - Last completed issue info with timestamp (if available)
 */
export function IdleState({ lastCompleted }: IdleStateProps) {
  return (
    <>
      <div className="flex items-center gap-2 text-slate-400">
        <span className="w-2 h-2 rounded-full bg-slate-500" />
        <span>Idle</span>
      </div>

      <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
        </svg>
        No active execution
      </div>

      {lastCompleted && (
        <div className="mt-1 text-xs text-slate-600">
          Last: Issue #{lastCompleted.issueNumber}
          <span className="text-slate-700 ml-1">
            ({new Date(lastCompleted.completedAt).toLocaleTimeString()})
          </span>
        </div>
      )}
    </>
  )
}
