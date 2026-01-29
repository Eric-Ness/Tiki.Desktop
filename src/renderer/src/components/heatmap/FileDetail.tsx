import { getHeatColor, getHeatLabel } from './TreeView'
import type { FileHeatDataPreload } from '../../../../preload'

export interface FileDetailProps {
  file: FileHeatDataPreload
  onViewIssue?: (issueNumber: number) => void
}

/**
 * Format a date as relative time (e.g., "2 days ago", "1 month ago")
 */
function formatRelativeDate(dateString: string | null): string {
  if (!dateString) return 'Never'

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  if (diffYears > 0) {
    return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`
  }
  if (diffMonths > 0) {
    return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`
  }
  if (diffWeeks > 0) {
    return diffWeeks === 1 ? '1 week ago' : `${diffWeeks} weeks ago`
  }
  if (diffDays > 0) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`
  }
  if (diffHours > 0) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
  }
  if (diffMins > 0) {
    return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`
  }
  return 'Just now'
}

/**
 * Get text color for heat badge
 */
function getHeatTextColor(heat: number): string {
  if (heat >= 0.8) return 'text-red-400'
  if (heat >= 0.6) return 'text-orange-400'
  if (heat >= 0.3) return 'text-yellow-400'
  return 'text-green-400'
}

/**
 * Get background color for heat badge
 */
function getHeatBgColor(heat: number): string {
  if (heat >= 0.8) return 'bg-red-500/20'
  if (heat >= 0.6) return 'bg-orange-500/20'
  if (heat >= 0.3) return 'bg-yellow-500/20'
  return 'bg-green-500/20'
}

export function FileDetail({ file, onViewIssue }: FileDetailProps) {
  const heatPercentage = Math.round(file.heat * 100)
  const heatLevelLabel = getHeatLabel(file.heat)

  return (
    <div className="space-y-4" data-testid="file-detail">
      {/* File path/name */}
      <div>
        <h3 className="text-sm font-medium text-slate-200 truncate" title={file.path}>
          {file.name}
        </h3>
        <p className="text-xs text-slate-500 truncate" title={file.path}>
          {file.directory}
        </p>
      </div>

      {/* Heat level badge */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getHeatBgColor(file.heat)} ${getHeatTextColor(file.heat)}`}
          data-testid="heat-badge"
        >
          <span
            className={`w-2 h-2 rounded-full ${getHeatColor(file.heat)}`}
            aria-label={`Heat level: ${heatLevelLabel}`}
          />
          {heatPercentage}% - {heatLevelLabel.charAt(0).toUpperCase() + heatLevelLabel.slice(1)}
        </span>
      </div>

      {/* Heat bar visualization */}
      <div className="space-y-1" data-testid="heat-bar">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Heat Level</span>
          <span className="text-slate-400">{heatPercentage}%</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getHeatColor(file.heat)}`}
            style={{ width: `${heatPercentage}%` }}
            role="progressbar"
            aria-valuenow={heatPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Heat: ${heatPercentage}%`}
          />
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-2" data-testid="file-metrics">
        <MetricRow
          label="Modifications"
          value={file.metrics.modifications}
          testId="metric-modifications"
        />
        <MetricRow
          label="Bug Issues"
          value={file.metrics.bugIssues.length}
          testId="metric-bug-issues"
        />
        <MetricRow
          label="Lines of Code"
          value={file.metrics.linesOfCode}
          testId="metric-loc"
        />
        <MetricRow
          label="Last Modified"
          value={formatRelativeDate(file.metrics.lastModified)}
          testId="metric-last-modified"
        />
      </div>

      {/* Bug issues list */}
      {file.metrics.bugIssues.length > 0 && (
        <div data-testid="bug-issues-section">
          <h4 className="text-xs font-medium text-slate-400 mb-2">Related Bug Issues</h4>
          <div className="flex flex-wrap gap-1">
            {file.metrics.bugIssues.map((issue) => (
              <button
                key={issue}
                onClick={() => onViewIssue?.(issue)}
                className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors cursor-pointer"
                data-testid={`issue-badge-${issue}`}
                aria-label={`View issue #${issue}`}
              >
                #{issue}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface MetricRowProps {
  label: string
  value: number | string
  testId?: string
}

function MetricRow({ label, value, testId }: MetricRowProps) {
  return (
    <div className="flex justify-between text-sm" data-testid={testId}>
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-300">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </div>
  )
}

// Export for testing
export { formatRelativeDate }
