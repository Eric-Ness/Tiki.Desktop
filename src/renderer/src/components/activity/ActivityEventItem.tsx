import type { ActivityEvent, ActivityEventType, ActivityLevel } from '../../stores/activity-store'

interface ActivityEventItemProps {
  event: ActivityEvent
  onClick?: () => void
}

// Format timestamp to HH:MM:SS
function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// Get icon color based on level
function getLevelColor(level: ActivityLevel): string {
  switch (level) {
    case 'success':
      return 'text-green-400'
    case 'error':
      return 'text-red-400'
    case 'warning':
      return 'text-amber-400'
    case 'info':
    default:
      return 'text-slate-400'
  }
}

// Icon components for each event type
function getEventIcon(type: ActivityEventType, level: ActivityLevel): JSX.Element {
  const color = getLevelColor(level)

  switch (type) {
    case 'execution_start':
      return (
        <svg className={`w-4 h-4 ${color}`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      )
    case 'execution_complete':
      return (
        <svg className={`w-4 h-4 ${color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )
    case 'execution_fail':
      return (
        <svg className={`w-4 h-4 ${color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M15 9l-6 6M9 9l6 6" />
        </svg>
      )
    case 'phase_start':
      return (
        <svg className={`w-4 h-4 ${color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      )
    case 'phase_complete':
      return (
        <svg className={`w-4 h-4 ${color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )
    case 'phase_fail':
      return (
        <svg className={`w-4 h-4 ${color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      )
    case 'phase_skip':
      return (
        <svg className={`w-4 h-4 ${color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 4h4v16H5zM15 4h4v16h-4z" />
        </svg>
      )
    case 'terminal_create':
      return (
        <svg className={`w-4 h-4 ${color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M7 15l4-4-4-4M13 15h4" />
        </svg>
      )
    case 'terminal_close':
      return (
        <svg className={`w-4 h-4 ${color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 9l6 6M15 9l-6 6" />
        </svg>
      )
    case 'project_switch':
      return (
        <svg className={`w-4 h-4 ${color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      )
    case 'app_start':
      return (
        <svg className={`w-4 h-4 ${color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4l3 3" />
        </svg>
      )
    case 'command_execute':
      return (
        <svg className={`w-4 h-4 ${color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 17l6-6-6-6M12 19h8" />
        </svg>
      )
    default:
      return (
        <svg className={`w-4 h-4 ${color}`} viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="4" />
        </svg>
      )
  }
}

// Format metadata for tooltip
function formatMetadata(metadata: ActivityEvent['metadata']): string | undefined {
  if (!metadata) return undefined

  const parts: string[] = []
  if (metadata.issueNumber) parts.push(`Issue #${metadata.issueNumber}`)
  if (metadata.phaseNumber) parts.push(`Phase ${metadata.phaseNumber}`)
  if (metadata.duration) parts.push(`Duration: ${(metadata.duration / 1000).toFixed(1)}s`)
  if (metadata.command) parts.push(`Command: ${metadata.command}`)
  if (metadata.error) parts.push(`Error: ${metadata.error}`)

  return parts.length > 0 ? parts.join(' | ') : undefined
}

export function ActivityEventItem({ event, onClick }: ActivityEventItemProps) {
  const tooltip = formatMetadata(event.metadata)

  return (
    <div
      data-testid="activity-event"
      onClick={onClick}
      title={tooltip}
      className={`
        flex items-start gap-3 px-3 py-2
        hover:bg-slate-800/50
        ${onClick ? 'cursor-pointer' : ''}
        transition-colors
      `}
    >
      <span
        data-testid="event-timestamp"
        className="text-xs text-slate-500 font-mono w-16 flex-shrink-0 pt-0.5"
      >
        {formatTime(event.timestamp)}
      </span>
      <span data-testid="event-icon" className={`w-4 flex-shrink-0 pt-0.5 ${getLevelColor(event.level)}`}>
        {getEventIcon(event.type, event.level)}
      </span>
      <span className="flex-1 text-sm text-slate-200 break-words">{event.message}</span>
    </div>
  )
}
