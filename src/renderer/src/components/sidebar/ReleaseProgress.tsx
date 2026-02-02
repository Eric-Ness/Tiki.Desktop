import type { ReleaseContextDisplay } from '../../stores/tiki-store'

interface ReleaseProgressProps {
  release: ReleaseContextDisplay
}

/**
 * ReleaseProgress - Displays release context with multi-segment progress bar.
 *
 * Shows:
 * - Release version and status indicator
 * - Multi-segment progress bar (completed/active/failed/skipped/pending)
 * - Status counts below the bar
 */
export function ReleaseProgress({ release }: ReleaseProgressProps) {
  const { version, status, progress, issues } = release
  const total = issues.total.length

  // Prevent division by zero
  if (total === 0) {
    return null
  }

  return (
    <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-amber-400">{version}</span>
          <span className={`w-2 h-2 rounded-full ${
            status === 'in_progress' ? 'bg-amber-400 animate-pulse' :
            status === 'completed' ? 'bg-green-400' :
            status === 'failed' ? 'bg-red-400' :
            'bg-slate-400'
          }`} />
        </div>
        <span className="text-xs text-slate-400">
          {progress.completedCount} / {progress.totalCount} issues
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden flex">
        {issues.completed.length > 0 && (
          <div
            className="h-full bg-green-500"
            style={{ width: `${(issues.completed.length / total) * 100}%` }}
          />
        )}
        {issues.current !== null && (
          <div
            className="h-full bg-amber-500 animate-pulse"
            style={{ width: `${(1 / total) * 100}%` }}
          />
        )}
        {issues.failed.length > 0 && (
          <div
            className="h-full bg-red-500"
            style={{ width: `${(issues.failed.length / total) * 100}%` }}
          />
        )}
        {issues.skipped.length > 0 && (
          <div
            className="h-full bg-slate-500"
            style={{ width: `${(issues.skipped.length / total) * 100}%` }}
          />
        )}
      </div>

      {/* Status counts */}
      <div className="flex gap-3 mt-2 text-[10px]">
        {issues.completed.length > 0 && (
          <span className="text-green-400">{issues.completed.length} done</span>
        )}
        {issues.current !== null && (
          <span className="text-amber-400">1 active</span>
        )}
        {issues.pending.length > 0 && (
          <span className="text-slate-400">{issues.pending.length} pending</span>
        )}
        {issues.failed.length > 0 && (
          <span className="text-red-400">{issues.failed.length} failed</span>
        )}
        {issues.skipped.length > 0 && (
          <span className="text-slate-500">{issues.skipped.length} skipped</span>
        )}
      </div>
    </div>
  )
}
