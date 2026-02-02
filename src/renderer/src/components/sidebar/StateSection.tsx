import { useTikiStore } from '../../stores/tiki-store'
import { ReleaseProgress } from './ReleaseProgress'
import { ExecutionCard } from './ExecutionCard'
import { IdleState } from './IdleState'

/**
 * StateSection - Main state panel component for the sidebar.
 *
 * Renders the current execution state from phases.json:
 * - Release progress header when in release-yolo mode
 * - Execution cards for active executions
 * - Idle state when no work is in progress
 */
export function StateSection() {
  const phasesDisplay = useTikiStore((state) => state.phasesDisplay)

  if (!phasesDisplay) {
    return <IdleState lastCompleted={null} />
  }

  const { executions, releaseContext, lastCompleted } = phasesDisplay
  const hasActiveWork = executions.length > 0

  return (
    <div className="px-2 py-1 text-sm space-y-3">
      {/* Release context header */}
      {releaseContext && (
        <ReleaseProgress release={releaseContext} />
      )}

      {/* Active executions */}
      {executions.map((execution) => (
        <ExecutionCard key={execution.id} execution={execution} />
      ))}

      {/* Idle state */}
      {!hasActiveWork && (
        <IdleState lastCompleted={lastCompleted} />
      )}
    </div>
  )
}
