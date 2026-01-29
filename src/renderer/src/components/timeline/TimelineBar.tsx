import type { PhaseExecution } from '../../types/timeline'

interface TimelineBarProps {
  execution: PhaseExecution
  totalDuration: number
  startOffset: number
  onHover?: (execution: PhaseExecution | null) => void
  onClick?: () => void
}

const statusColors: Record<PhaseExecution['status'], string> = {
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  running: 'bg-amber-500 animate-pulse',
  skipped: 'bg-slate-400'
}

export function TimelineBar({
  execution,
  totalDuration,
  startOffset,
  onHover,
  onClick
}: TimelineBarProps) {
  const duration = execution.durationMs || 0
  const widthPercent = totalDuration > 0 ? (duration / totalDuration) * 100 : 0
  const leftPercent = totalDuration > 0 ? (startOffset / totalDuration) * 100 : 0

  // Ensure minimum width for visibility
  const displayWidth = Math.max(widthPercent, 2)

  return (
    <div
      data-testid="timeline-bar"
      className={`absolute h-8 rounded ${statusColors[execution.status]} cursor-pointer
        flex items-center transition-all duration-150 hover:brightness-110`}
      style={{
        left: `${leftPercent}%`,
        width: `${displayWidth}%`
      }}
      onMouseEnter={() => onHover?.(execution)}
      onMouseLeave={() => onHover?.(null)}
      onClick={onClick}
    >
      <span className="text-xs text-white px-2 truncate font-medium">
        Phase {execution.phaseNumber}
      </span>
    </div>
  )
}
