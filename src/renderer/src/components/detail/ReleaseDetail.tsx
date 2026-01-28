import { Release, ReleaseIssue } from '../../stores/tiki-store'

interface ReleaseDetailProps {
  release: Release
}

const statusColors: Record<string, string> = {
  active: 'bg-green-600 text-green-100',
  shipped: 'bg-purple-600 text-purple-100',
  completed: 'bg-green-600 text-green-100',
  not_planned: 'bg-slate-600 text-slate-100'
}

const issueStatusColors: Record<string, string> = {
  completed: 'bg-green-500',
  shipped: 'bg-purple-500',
  in_progress: 'bg-amber-500',
  not_planned: 'bg-slate-500',
  planned: 'bg-blue-500'
}

export function ReleaseDetail({ release }: ReleaseDetailProps) {
  const { version, status, issues, requirements, requirementsEnabled, githubMilestone } = release

  // Calculate progress
  const completedIssues = issues.filter(
    (i) => i.status === 'completed' || i.status === 'shipped'
  ).length
  const totalIssues = issues.length
  const progress = totalIssues > 0 ? (completedIssues / totalIssues) * 100 : 0

  const handleOpenMilestone = () => {
    if (githubMilestone?.url) {
      window.open(githubMilestone.url, '_blank')
    }
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header section with green accent */}
      <div className="border-l-4 border-green-500 pl-3">
        {/* Version */}
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-green-400 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
          <h2 data-testid="release-version" className="text-lg font-semibold text-white flex-1">
            {version}
          </h2>
        </div>

        {/* Status badge */}
        <span
          data-testid="status-badge"
          className={`
            inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium uppercase
            ${statusColors[status] || statusColors.not_planned}
          `}
        >
          {status}
        </span>
      </div>

      {/* Actions */}
      {githubMilestone?.url && (
        <div className="flex gap-2">
          <button
            onClick={handleOpenMilestone}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 active:bg-slate-700 rounded transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            View Milestone
          </button>
        </div>
      )}

      {/* Progress section */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Progress</h3>
        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
            <span>{completedIssues} of {totalIssues} issues completed</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                progress === 100 ? 'bg-green-500' : 'bg-amber-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Issues list */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Issues</h3>
        <div className="space-y-2">
          {issues.map((issue) => (
            <ReleaseIssueItem key={issue.number} issue={issue} />
          ))}
        </div>
      </div>

      {/* Requirements section */}
      {requirementsEnabled && requirements && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Requirements</h3>
          <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total</span>
              <span className="text-white">{requirements.total}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Implemented</span>
              <span className="text-green-400">{requirements.implemented}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Verified</span>
              <span className="text-cyan-400">{requirements.verified}</span>
            </div>
            {requirements.total > 0 && (
              <div className="pt-2 border-t border-slate-600">
                <div className="h-2 bg-slate-600 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${(requirements.implemented / requirements.total) * 100}%` }}
                  />
                  <div
                    className="h-full bg-cyan-500"
                    style={{ width: `${(requirements.verified / requirements.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface ReleaseIssueItemProps {
  issue: ReleaseIssue
}

function ReleaseIssueItem({ issue }: ReleaseIssueItemProps) {
  const phaseProgress =
    issue.totalPhases && issue.totalPhases > 0 && issue.currentPhase
      ? (issue.currentPhase / issue.totalPhases) * 100
      : issue.status === 'completed' || issue.status === 'shipped'
        ? 100
        : 0

  return (
    <div className="bg-slate-700/30 rounded p-2">
      <div className="flex items-start gap-2">
        {/* Status indicator */}
        <span
          className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
            issueStatusColors[issue.status] || issueStatusColors.not_planned
          }`}
        />

        {/* Issue info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 text-xs">#{issue.number}</span>
            <span className="text-sm text-slate-200 truncate">{issue.title}</span>
          </div>

          {/* Phase progress */}
          {issue.totalPhases && issue.totalPhases > 0 && (
            <div className="mt-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                <span>Phase {issue.currentPhase || 0}/{issue.totalPhases}</span>
              </div>
              <div className="h-1 bg-slate-600 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    phaseProgress === 100 ? 'bg-green-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${phaseProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
