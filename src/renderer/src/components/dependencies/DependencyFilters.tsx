import type { Release } from '../../stores/tiki-store'

interface DependencyFiltersProps {
  releases: Release[]
  selectedRelease: string | null
  onReleaseChange: (release: string | null) => void
  showOrphans: boolean
  onShowOrphansChange: (show: boolean) => void
  totalIssueCount?: number
}

/**
 * Filter controls for the dependency graph.
 * Allows filtering by release and toggling orphan issues visibility.
 */
export function DependencyFilters({
  releases,
  selectedRelease,
  onReleaseChange,
  showOrphans,
  onShowOrphansChange,
  totalIssueCount
}: DependencyFiltersProps) {
  // Get issue count for selected release
  const selectedReleaseData = selectedRelease
    ? releases.find((r) => r.version === selectedRelease)
    : null
  const issueCount = selectedReleaseData
    ? selectedReleaseData.issues.length
    : totalIssueCount ?? 0

  const handleReleaseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    onReleaseChange(value === '' ? null : value)
  }

  const handleOrphansChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onShowOrphansChange(e.target.checked)
  }

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-background-secondary border-b border-border">
      {/* Release filter */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="release-filter"
          className="text-xs text-slate-400 whitespace-nowrap"
        >
          Filter by release:
        </label>
        <select
          id="release-filter"
          aria-label="Filter by release"
          value={selectedRelease ?? ''}
          onChange={handleReleaseChange}
          className="
            px-2 py-1 text-xs
            bg-background-tertiary border border-border rounded
            text-white
            focus:outline-none focus:ring-1 focus:ring-amber-500
          "
        >
          <option value="">All Issues</option>
          {releases.map((release) => (
            <option key={release.version} value={release.version}>
              {release.version} ({release.issues.length} issues)
            </option>
          ))}
        </select>
      </div>

      {/* Show orphans toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="show-orphans"
          aria-label="Show orphan issues"
          checked={showOrphans}
          onChange={handleOrphansChange}
          className="
            w-3.5 h-3.5 rounded
            bg-background-tertiary border-border
            text-amber-500
            focus:ring-1 focus:ring-amber-500 focus:ring-offset-0
          "
        />
        <label
          htmlFor="show-orphans"
          className="text-xs text-slate-400 cursor-pointer"
          title="Show issues without dependencies or dependents"
        >
          Show orphan issues
        </label>
      </div>

      {/* Issue count indicator */}
      <div className="flex-1 text-right">
        <span className="text-xs text-slate-500">
          {issueCount} {issueCount === 1 ? 'issue' : 'issues'}
        </span>
      </div>
    </div>
  )
}
