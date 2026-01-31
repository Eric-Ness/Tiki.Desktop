import { useMemo } from 'react'
import { Check } from 'lucide-react'
import type {
  Requirement,
  ReleaseRequirementMapping,
  ReleaseIssue,
  Release
} from '../../stores/tiki-store'
import { buildCoverageMatrix, calculateRequirementCoverage } from '../../stores/tiki-store'

interface RequirementCoverageMatrixProps {
  release: Release
  requirements: Requirement[]
  onIssueClick: (issueNumber: number) => void
}

/**
 * Get the background color class for a coverage percentage.
 */
function getCoverageColorClass(percentage: number): string {
  if (percentage === 100) return 'text-green-400'
  if (percentage === 0) return 'text-red-400'
  if (percentage >= 75) return 'text-green-300'
  if (percentage >= 50) return 'text-yellow-400'
  if (percentage >= 25) return 'text-orange-400'
  return 'text-red-400'
}

/**
 * Get the priority badge color classes.
 */
function getPriorityColorClass(priority: 'high' | 'medium' | 'low' | undefined): string {
  switch (priority) {
    case 'high':
      return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'medium':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    case 'low':
      return 'bg-green-500/20 text-green-400 border-green-500/30'
    default:
      return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
  }
}

/**
 * Truncate text to a maximum length with ellipsis.
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

export function RequirementCoverageMatrix({
  release,
  requirements,
  onIssueClick
}: RequirementCoverageMatrixProps) {
  // Build the coverage matrix
  const matrix = useMemo(() => {
    const mappings: ReleaseRequirementMapping[] = release.requirementMappings || []
    return buildCoverageMatrix(requirements, release.issues, mappings)
  }, [requirements, release.issues, release.requirementMappings])

  // Calculate coverage for each requirement
  const coverageStats = useMemo(() => {
    const stats: Record<string, { percentage: number; issueCount: number }> = {}
    for (const req of requirements) {
      stats[req.id] = calculateRequirementCoverage(req.id, matrix)
    }
    return stats
  }, [requirements, matrix])

  // Empty state: no requirements
  if (requirements.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-8 text-sm text-slate-500"
        data-testid="empty-requirements"
      >
        No requirements defined for this release
      </div>
    )
  }

  // Empty state: no issues
  if (release.issues.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-8 text-sm text-slate-500"
        data-testid="empty-issues"
      >
        No issues in this release
      </div>
    )
  }

  return (
    <div className="overflow-x-auto" data-testid="coverage-matrix">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {/* Fixed requirement column header */}
            <th className="sticky left-0 z-10 bg-background-secondary px-3 py-2 text-left text-xs font-medium text-slate-400 border-b border-border min-w-[200px]">
              Requirement
            </th>
            {/* Issue column headers */}
            {release.issues.map((issue) => (
              <th
                key={issue.number}
                className="px-2 py-2 text-center text-xs font-medium border-b border-border min-w-[80px]"
              >
                <button
                  onClick={() => onIssueClick(issue.number)}
                  className="text-cyan-400 hover:underline hover:text-cyan-300 transition-colors"
                  title={issue.title}
                  data-testid={`issue-header-${issue.number}`}
                >
                  #{issue.number}
                  <span className="block text-[10px] text-slate-500 font-normal truncate max-w-[70px]">
                    {truncateText(issue.title, 12)}
                  </span>
                </button>
              </th>
            ))}
            {/* Coverage summary column header */}
            <th className="px-3 py-2 text-center text-xs font-medium text-slate-400 border-b border-border min-w-[80px]">
              Coverage
            </th>
          </tr>
        </thead>
        <tbody>
          {requirements.map((req) => {
            const stats = coverageStats[req.id]
            const isGap = stats.percentage === 0

            return (
              <tr
                key={req.id}
                className={isGap ? 'bg-red-500/10' : ''}
                data-testid={`requirement-row-${req.id}`}
              >
                {/* Requirement name cell (fixed) */}
                <td
                  className={`sticky left-0 z-10 px-3 py-2 border-b ${
                    isGap
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-background-secondary border-border'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {/* Priority badge */}
                    {req.priority && (
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${getPriorityColorClass(
                          req.priority
                        )}`}
                        data-testid={`priority-badge-${req.id}`}
                      >
                        {req.priority.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-500">{req.id}</span>
                      <span className="text-sm text-slate-200" title={req.title}>
                        {truncateText(req.title, 30)}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Coverage cells for each issue */}
                {release.issues.map((issue) => {
                  const isCovered = matrix[req.id]?.[issue.number] ?? false

                  return (
                    <td
                      key={issue.number}
                      className={`px-2 py-2 text-center border-b ${
                        isGap ? 'border-red-500/30' : 'border-border'
                      } ${isCovered ? 'bg-green-500/20' : 'bg-zinc-800'}`}
                      data-testid={`cell-${req.id}-${issue.number}`}
                    >
                      {isCovered && (
                        <Check
                          className="w-4 h-4 text-green-400 mx-auto"
                          data-testid={`check-${req.id}-${issue.number}`}
                        />
                      )}
                    </td>
                  )
                })}

                {/* Coverage summary cell */}
                <td
                  className={`px-3 py-2 text-center border-b font-medium ${
                    isGap ? 'border-red-500/30' : 'border-border'
                  }`}
                  data-testid={`coverage-${req.id}`}
                >
                  <span className={getCoverageColorClass(stats.percentage)}>
                    {Math.round(stats.percentage)}%
                  </span>
                  <span className="block text-[10px] text-slate-500">
                    {stats.issueCount} issue{stats.issueCount !== 1 ? 's' : ''}
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
