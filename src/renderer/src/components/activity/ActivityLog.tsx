import { useActivityStore, ActivityEventType } from '../../stores/activity-store'
import { ActivityEventItem } from './ActivityEventItem'

const eventTypeOptions: Array<{ value: ActivityEventType | 'all'; label: string }> = [
  { value: 'all', label: 'All Events' },
  { value: 'execution_start', label: 'Execution Start' },
  { value: 'execution_complete', label: 'Execution Complete' },
  { value: 'execution_fail', label: 'Execution Failed' },
  { value: 'phase_start', label: 'Phase Start' },
  { value: 'phase_complete', label: 'Phase Complete' },
  { value: 'phase_fail', label: 'Phase Failed' },
  { value: 'phase_skip', label: 'Phase Skipped' },
  { value: 'terminal_create', label: 'Terminal Create' },
  { value: 'terminal_close', label: 'Terminal Close' },
  { value: 'project_switch', label: 'Project Switch' },
  { value: 'app_start', label: 'App Start' },
  { value: 'command_execute', label: 'Command Execute' }
]

interface ActivityLogProps {
  onEventClick?: (event: { type: string; metadata?: Record<string, unknown> }) => void
}

export function ActivityLog({ onEventClick }: ActivityLogProps) {
  const events = useActivityStore((state) => state.events)
  const filter = useActivityStore((state) => state.filter)
  const searchQuery = useActivityStore((state) => state.searchQuery)
  const setFilter = useActivityStore((state) => state.setFilter)
  const setSearchQuery = useActivityStore((state) => state.setSearchQuery)
  const clearEvents = useActivityStore((state) => state.clearEvents)
  const getFilteredEvents = useActivityStore((state) => state.getFilteredEvents)
  const exportEvents = useActivityStore((state) => state.exportEvents)

  const filteredEvents = getFilteredEvents()

  const handleExport = async () => {
    const data = exportEvents()
    try {
      await navigator.clipboard.writeText(data)
    } catch {
      // Fallback: create and trigger download
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `activity-log-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleEventClick = (event: (typeof filteredEvents)[0]) => {
    if (onEventClick) {
      onEventClick({
        type: event.type,
        metadata: event.metadata
      })
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 h-9 px-3 flex items-center justify-between border-b border-border bg-background-secondary">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-200">Activity</span>
          {events.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
              {events.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Search Input */}
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="
              h-6 w-32 px-2 text-xs
              bg-background border border-border rounded
              text-slate-200 placeholder:text-slate-500
              focus:outline-none focus:border-amber-500
            "
          />

          {/* Filter Dropdown */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as ActivityEventType | 'all')}
            className="
              h-6 px-2 text-xs
              bg-background border border-border rounded
              text-slate-200
              focus:outline-none focus:border-amber-500
            "
          >
            {eventTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Export Button */}
          {events.length > 0 && (
            <button
              onClick={handleExport}
              title="Export to clipboard"
              className="p-1 hover:bg-background-tertiary rounded transition-colors"
            >
              <svg
                className="w-4 h-4 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <path d="M7 10l5 5 5-5" />
                <path d="M12 15V3" />
              </svg>
            </button>
          )}

          {/* Clear Button */}
          {events.length > 0 && (
            <button
              onClick={clearEvents}
              title="Clear all events"
              className="p-1 hover:bg-background-tertiary rounded transition-colors"
            >
              <svg
                className="w-4 h-4 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <svg
              className="w-8 h-8 mb-2 text-slate-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M7 7h10M7 12h10M7 17h6" />
            </svg>
            <span className="text-sm">No activity yet</span>
            {searchQuery && (
              <span className="text-xs text-slate-600 mt-1">Try adjusting your search</span>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredEvents.map((event) => (
              <ActivityEventItem
                key={event.id}
                event={event}
                onClick={onEventClick ? () => handleEventClick(event) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
