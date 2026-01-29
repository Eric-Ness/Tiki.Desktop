export interface Execution {
  issueNumber: number
  issueTitle: string
  issueType: string
  status: 'completed' | 'failed' | 'in_progress'
  phases: Array<{ status: string }>
  totalTokens: number
  startedAt: string
  completedAt?: string
}

export interface PerformanceTableProps {
  executions: Execution[]
  loading?: boolean
  onIssueClick?: (issueNumber: number) => void
}

const formatTokens = (tokens: number): string => {
  const k = tokens / 1000
  if (k === Math.floor(k)) {
    return `${k}K`
  }
  return `${k.toFixed(1)}K`
}

const formatDuration = (startedAt: string, completedAt?: string): string => {
  if (!completedAt) {
    return '' // Will be handled by in-progress indicator
  }

  const start = new Date(startedAt).getTime()
  const end = new Date(completedAt).getTime()
  const durationMs = end - start

  const totalMinutes = Math.floor(durationMs / (1000 * 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

const getCompletedPhaseCount = (phases: Array<{ status: string }>): number => {
  return phases.filter((p) => p.status === 'completed').length
}

const getStatusBadgeClasses = (
  status: Execution['status']
): { bg: string; text: string } => {
  switch (status) {
    case 'completed':
      return { bg: 'bg-green-500/20', text: 'text-green-400' }
    case 'failed':
      return { bg: 'bg-red-500/20', text: 'text-red-400' }
    case 'in_progress':
      return { bg: 'bg-amber-500/20', text: 'text-amber-400' }
  }
}

const getStatusLabel = (status: Execution['status']): string => {
  switch (status) {
    case 'completed':
      return 'Completed'
    case 'failed':
      return 'Failed'
    case 'in_progress':
      return 'In Progress'
  }
}

export function PerformanceTable({
  executions,
  loading = false,
  onIssueClick
}: PerformanceTableProps) {
  const headers = ['Issue', 'Type', 'Phases', 'Tokens', 'Duration', 'Status']

  const renderTableHeader = () => (
    <thead>
      <tr data-testid="table-header" className="bg-slate-800">
        {headers.map((header) => (
          <th
            key={header}
            className="text-xs text-slate-400 uppercase px-4 py-3 text-left font-medium"
          >
            {header}
          </th>
        ))}
      </tr>
    </thead>
  )

  if (loading) {
    return (
      <div data-testid="performance-table-loading" className="overflow-x-auto">
        <table className="w-full">
          {renderTableHeader()}
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr
                key={i}
                data-testid="table-skeleton-row"
                className="border-b border-slate-700 animate-pulse"
              >
                {headers.map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 bg-slate-700 rounded w-3/4" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (executions.length === 0) {
    return (
      <div data-testid="performance-table" className="overflow-x-auto">
        <table className="w-full">
          {renderTableHeader()}
        </table>
        <div
          data-testid="performance-table-empty"
          className="text-center py-8 text-slate-400"
        >
          <svg
            className="w-12 h-12 mx-auto mb-3 text-slate-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p>No executions found</p>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="performance-table" className="overflow-x-auto">
      <table className="w-full">
        {renderTableHeader()}
        <tbody>
          {executions.map((execution) => {
            const statusClasses = getStatusBadgeClasses(execution.status)
            const completedPhases = getCompletedPhaseCount(execution.phases)
            const totalPhases = execution.phases.length

            return (
              <tr
                key={execution.issueNumber}
                data-testid={`table-row-${execution.issueNumber}`}
                className="border-b border-slate-700 hover:bg-slate-800/50"
              >
                {/* Issue */}
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span
                      onClick={
                        onIssueClick
                          ? () => onIssueClick(execution.issueNumber)
                          : undefined
                      }
                      className={
                        onIssueClick
                          ? 'text-amber-400 hover:underline cursor-pointer font-medium'
                          : 'text-amber-400 font-medium'
                      }
                    >
                      #{execution.issueNumber}
                    </span>
                    <span className="text-sm text-slate-400 truncate max-w-xs">
                      {execution.issueTitle}
                    </span>
                  </div>
                </td>

                {/* Type */}
                <td className="px-4 py-3 text-sm text-slate-300">
                  {execution.issueType}
                </td>

                {/* Phases */}
                <td className="px-4 py-3">
                  <span className="text-sm text-slate-300">
                    {completedPhases}/{totalPhases}
                  </span>
                </td>

                {/* Tokens */}
                <td className="px-4 py-3 text-sm text-slate-300">
                  {formatTokens(execution.totalTokens)}
                </td>

                {/* Duration */}
                <td className="px-4 py-3 text-sm text-slate-300">
                  {execution.status === 'in_progress' ? (
                    <span
                      data-testid={`duration-in-progress-${execution.issueNumber}`}
                      className="flex items-center gap-1"
                    >
                      <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                      <span className="text-amber-400">Running</span>
                    </span>
                  ) : (
                    formatDuration(execution.startedAt, execution.completedAt)
                  )}
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <span
                    data-testid={`status-badge-${execution.issueNumber}`}
                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusClasses.bg} ${statusClasses.text}`}
                  >
                    {getStatusLabel(execution.status)}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
