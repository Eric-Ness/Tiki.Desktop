import { useState } from 'react'
import { useTikiStore, GitHubIssue, CachedPrediction } from '../../stores/tiki-store'
import { CreateIssueDialog } from './CreateIssueDialog'

type IssueFilter = 'open' | 'closed' | 'all'

interface IssueListProps {
  onRefresh?: () => void
}

export function IssueList({ onRefresh }: IssueListProps) {
  const [filter, setFilter] = useState<IssueFilter>('open')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const issues = useTikiStore((state) => state.issues)
  const githubLoading = useTikiStore((state) => state.githubLoading)
  const githubError = useTikiStore((state) => state.githubError)
  const selectedIssue = useTikiStore((state) => state.selectedIssue)
  const setSelectedIssue = useTikiStore((state) => state.setSelectedIssue)
  const setSelectedNode = useTikiStore((state) => state.setSelectedNode)
  const setSelectedRelease = useTikiStore((state) => state.setSelectedRelease)
  const setSelectedKnowledge = useTikiStore((state) => state.setSelectedKnowledge)
  const tikiState = useTikiStore((state) => state.tikiState)
  const branchAssociations = useTikiStore((state) => state.branchAssociations)
  const currentBranch = useTikiStore((state) => state.currentBranch)
  const predictions = useTikiStore((state) => state.predictions)

  const handleSelectIssue = (issueNumber: number) => {
    // Clear other selections when selecting an issue from sidebar
    setSelectedNode(null)
    setSelectedRelease(null)
    setSelectedKnowledge(null)
    setSelectedIssue(issueNumber)
  }

  const handleIssueCreated = (issueNumber: number) => {
    // Refresh issues and select the new one
    onRefresh?.()
    handleSelectIssue(issueNumber)
  }

  // Add Issue button component
  const AddIssueButton = () => (
    <button
      onClick={() => setShowCreateDialog(true)}
      className="p-1 hover:bg-background-tertiary rounded transition-colors"
      title="Create new issue"
    >
      <svg
        className="w-3.5 h-3.5 text-slate-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  )

  // Refresh button component
  const RefreshButton = () => (
    <button
      onClick={onRefresh}
      disabled={githubLoading}
      className="p-1 hover:bg-background-tertiary rounded transition-colors disabled:opacity-50"
      title="Refresh issues"
    >
      <svg
        className={`w-3.5 h-3.5 text-slate-400 ${githubLoading ? 'animate-spin' : ''}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M1 4v6h6M23 20v-6h-6" />
        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
      </svg>
    </button>
  )

  if (githubLoading && issues.length === 0) {
    return (
      <div className="px-2 py-3 text-sm text-slate-500 flex items-center gap-2">
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
        Loading issues...
      </div>
    )
  }

  if (githubError) {
    return (
      <div className="px-2 py-2">
        <div className="text-sm text-red-400 mb-2 flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span className="text-xs">{githubError}</span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-xs text-amber-500 hover:text-amber-400 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  // Filter issues based on selected filter
  const filteredIssues = issues.filter((issue) => {
    if (filter === 'all') return true
    if (filter === 'open') return issue.state === 'OPEN'
    if (filter === 'closed') return issue.state === 'CLOSED'
    return true
  })

  if (issues.length === 0) {
    return (
      <div className="px-2 py-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500 italic">No issues</span>
          {onRefresh && <RefreshButton />}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {/* Header with filter buttons and refresh */}
      <div className="px-2 pb-1 flex items-center justify-between">
        <div className="flex gap-1">
          <FilterButton active={filter === 'open'} onClick={() => setFilter('open')}>
            Open
          </FilterButton>
          <FilterButton active={filter === 'closed'} onClick={() => setFilter('closed')}>
            Closed
          </FilterButton>
          <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
            All
          </FilterButton>
        </div>
        <div className="flex items-center gap-0.5">
          <AddIssueButton />
          {onRefresh && <RefreshButton />}
        </div>
      </div>
      {filteredIssues.length === 0 ? (
        <div className="px-2 py-2 text-sm text-slate-500 italic">
          No {filter === 'all' ? '' : filter} issues
        </div>
      ) : (
        filteredIssues.map((issue) => {
          const branchInfo = branchAssociations[issue.number]
          const isCurrentBranch = branchInfo && currentBranch?.name === branchInfo.branchName
          const cachedPrediction = predictions[issue.number]
          return (
            <IssueItem
              key={issue.number}
              issue={issue}
              isSelected={selectedIssue === issue.number}
              isActive={tikiState?.activeIssue === issue.number}
              branchName={branchInfo?.branchName}
              isCurrentBranch={isCurrentBranch}
              prediction={cachedPrediction}
              onClick={() => handleSelectIssue(issue.number)}
            />
          )
        })
      )}

      {/* Create Issue Dialog */}
      <CreateIssueDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreated={handleIssueCreated}
      />
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
        active
          ? 'bg-amber-600 text-white'
          : 'bg-background-tertiary text-slate-400 hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  )
}

interface IssueItemProps {
  issue: GitHubIssue
  isSelected: boolean
  isActive: boolean
  branchName?: string
  isCurrentBranch?: boolean
  prediction?: CachedPrediction
  onClick: () => void
}

// Helper to truncate branch name with ellipsis
function truncateBranchName(name: string, maxLength: number = 10): string {
  if (name.length <= maxLength) return name
  return name.slice(0, maxLength - 1) + '\u2026'
}

function IssueItem({ issue, isSelected, isActive, branchName, isCurrentBranch, prediction, onClick }: IssueItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-2 py-1.5 text-left text-sm transition-colors rounded-sm mx-1 ${
        isSelected
          ? 'bg-amber-500/20 text-amber-200'
          : 'hover:bg-background-tertiary text-slate-300'
      } ${isActive ? 'border-l-2 border-amber-500 pl-1.5' : ''}`}
    >
      <div className="flex items-center gap-2">
        {/* Issue icon */}
        <svg
          className={`w-4 h-4 flex-shrink-0 ${
            issue.state === 'OPEN' ? 'text-green-500' : 'text-purple-500'
          }`}
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
        </svg>

        {/* Issue number and title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-xs">#{issue.number}</span>
            {issue.hasPlan && (
              <span
                className="text-[10px] px-1 py-0.5 bg-cyan-500/20 text-cyan-400 rounded"
                title="Has Tiki plan"
              >
                Plan
              </span>
            )}
            {branchName && (
              <span
                className={`text-[10px] px-1 py-0.5 rounded flex items-center gap-0.5 ${
                  isCurrentBranch
                    ? 'bg-green-500/30 text-green-300 ring-1 ring-green-500/50'
                    : 'bg-slate-500/20 text-slate-400'
                }`}
                title={branchName}
              >
                {/* Git branch icon */}
                <svg
                  className="w-2.5 h-2.5"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" />
                </svg>
                {truncateBranchName(branchName)}
              </span>
            )}
            {prediction && (
              <span
                className={`text-[10px] px-1 py-0.5 rounded ${
                  prediction.confidence === 'high'
                    ? 'bg-green-500/20 text-green-400'
                    : prediction.confidence === 'medium'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-slate-500/20 text-slate-400'
                }`}
                title={`${prediction.confidence} confidence`}
              >
                ~${prediction.estimatedCost.expected.toFixed(2)}
              </span>
            )}
          </div>
          <div className="truncate text-xs mt-0.5">{issue.title}</div>
        </div>
      </div>
    </button>
  )
}
