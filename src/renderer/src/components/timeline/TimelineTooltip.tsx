import type { PhaseExecution } from '../../types/timeline'
import { formatDuration } from '../../lib/timeline-utils'

interface TimelineTooltipProps {
  execution: PhaseExecution
  position: { x: number; y: number }
}

const statusLabels: Record<PhaseExecution['status'], string> = {
  completed: 'Completed',
  failed: 'Failed',
  running: 'Running',
  skipped: 'Skipped'
}

const statusColors: Record<PhaseExecution['status'], string> = {
  completed: 'text-green-400',
  failed: 'text-red-400',
  running: 'text-amber-400',
  skipped: 'text-slate-400'
}

export function TimelineTooltip({ execution, position }: TimelineTooltipProps) {
  return (
    <div
      data-testid="timeline-tooltip"
      className="absolute z-50 bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl min-w-[200px]"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      <div className="font-medium text-white">
        Phase {execution.phaseNumber}: {execution.phaseName}
      </div>

      <div data-testid="tooltip-status" className={`text-sm mt-1 ${statusColors[execution.status]}`}>
        {statusLabels[execution.status]}
      </div>

      <div data-testid="tooltip-duration" className="text-sm text-slate-400 mt-1">
        Duration: {execution.status === 'running' ? 'In progress...' : formatDuration(execution.durationMs)}
      </div>

      {execution.files && execution.files.length > 0 && (
        <div className="text-sm text-slate-400 mt-1">
          {execution.files.length} files changed
        </div>
      )}

      {execution.error && (
        <div className="text-sm text-red-400 mt-2 border-t border-slate-600 pt-2">
          {execution.error}
        </div>
      )}
    </div>
  )
}
