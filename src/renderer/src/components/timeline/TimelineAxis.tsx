import { generateTicks, formatTime } from '../../lib/timeline-utils'

interface TimelineAxisProps {
  startTime: Date
  endTime: Date
  tickCount?: number
}

export function TimelineAxis({ startTime, endTime, tickCount = 5 }: TimelineAxisProps) {
  const ticks = generateTicks(startTime, endTime, tickCount)

  return (
    <div
      data-testid="timeline-axis"
      className="flex justify-between text-xs text-slate-500 px-2 mt-2 border-t border-slate-700 pt-2"
    >
      {ticks.map((tick, i) => (
        <span key={i} data-testid="timeline-tick" className="font-mono">
          {formatTime(tick)}
        </span>
      ))}
    </div>
  )
}
