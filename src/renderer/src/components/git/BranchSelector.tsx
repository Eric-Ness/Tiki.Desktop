import { useState, useEffect, useCallback, useMemo } from 'react'
import { logger } from '../../lib/logger'

interface BranchInfo {
  name: string
  current: boolean
  remote: string | undefined
  ahead: number
  behind: number
  lastCommit: string | undefined
  associatedIssue: number | undefined
}

interface WorkingTreeStatus {
  isDirty: boolean
  hasUntracked: boolean
  hasStaged: boolean
  hasUnstaged: boolean
  files: Array<{ path: string; status: string }>
}

interface BranchSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (branchName: string) => void
  onCreateNew: () => void
  currentBranch: string | null
  cwd: string
}

interface BranchGroup {
  title: string
  branches: BranchInfo[]
}

export function BranchSelector({
  isOpen,
  onClose,
  onSelect,
  onCreateNew,
  currentBranch,
  cwd
}: BranchSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [branches, setBranches] = useState<BranchInfo[]>([])
  const [workingTree, setWorkingTree] = useState<WorkingTreeStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [switching, setSwitching] = useState(false)
  const [pendingBranch, setPendingBranch] = useState<string | null>(null)
  const [showUncommittedWarning, setShowUncommittedWarning] = useState(false)
  const [stashOption, setStashOption] = useState<'stash' | 'discard' | null>(null)

  // Fetch branches when dialog opens
  useEffect(() => {
    if (!isOpen || !cwd) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [branchList, status] = await Promise.all([
          window.tikiDesktop.branch.list(cwd),
          window.tikiDesktop.branch.workingTreeStatus(cwd)
        ])
        setBranches(branchList)
        setWorkingTree(status)
      } catch (err) {
        setError('Failed to load branches')
        logger.error('Failed to fetch branches:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isOpen, cwd])

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setShowUncommittedWarning(false)
      setPendingBranch(null)
      setStashOption(null)
    }
  }, [isOpen])

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (showUncommittedWarning) {
          setShowUncommittedWarning(false)
          setPendingBranch(null)
        } else {
          onClose()
        }
      }
    },
    [onClose, showUncommittedWarning]
  )

  // Group and filter branches
  const groupedBranches = useMemo((): BranchGroup[] => {
    const filtered = branches.filter((b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Separate issue branches and other branches
    const issueBranches = filtered.filter((b) => b.associatedIssue !== undefined)
    const otherBranches = filtered.filter((b) => b.associatedIssue === undefined && !b.current)

    // Get recent branches (sort by lastCommit, take top 3)
    const recentBranches = [...filtered]
      .filter((b) => !b.current)
      .sort((a, b) => {
        // Sort by last commit date if available
        if (a.lastCommit && b.lastCommit) {
          return new Date(b.lastCommit).getTime() - new Date(a.lastCommit).getTime()
        }
        return 0
      })
      .slice(0, 3)

    // Build groups
    const groups: BranchGroup[] = []

    // Current branch first (if matches search)
    const current = filtered.find((b) => b.current)
    if (current) {
      groups.push({
        title: 'Current Branch',
        branches: [current]
      })
    }

    // Recent branches (excluding current)
    if (recentBranches.length > 0 && !searchQuery) {
      groups.push({
        title: 'Recent',
        branches: recentBranches
      })
    }

    // Issue branches
    if (issueBranches.length > 0) {
      groups.push({
        title: 'Issue Branches',
        branches: issueBranches.filter((b) => !b.current)
      })
    }

    // Other branches
    const otherNonRecent = otherBranches.filter(
      (b) => !recentBranches.some((r) => r.name === b.name)
    )
    if (otherNonRecent.length > 0) {
      groups.push({
        title: searchQuery ? 'Results' : 'Other Branches',
        branches: otherNonRecent
      })
    }

    return groups.filter((g) => g.branches.length > 0)
  }, [branches, searchQuery])

  // Handle branch selection
  const handleSelectBranch = async (branchName: string) => {
    if (branchName === currentBranch) return

    // Check for uncommitted changes
    if (workingTree?.isDirty) {
      setPendingBranch(branchName)
      setShowUncommittedWarning(true)
      return
    }

    await performSwitch(branchName)
  }

  // Perform the actual branch switch
  const performSwitch = async (branchName: string, options?: { stash?: boolean; discard?: boolean }) => {
    setSwitching(true)
    try {
      const result = await window.tikiDesktop.branch.switch(cwd, branchName, options)
      if (result.success) {
        onSelect(branchName)
        onClose()
      } else {
        setError(result.error || 'Failed to switch branch')
      }
    } catch (err) {
      setError('Failed to switch branch')
      logger.error('Branch switch error:', err)
    } finally {
      setSwitching(false)
      setShowUncommittedWarning(false)
      setPendingBranch(null)
      setStashOption(null)
    }
  }

  // Handle confirmation of switch with uncommitted changes
  const handleConfirmSwitch = () => {
    if (!pendingBranch || !stashOption) return
    performSwitch(pendingBranch, {
      stash: stashOption === 'stash',
      discard: stashOption === 'discard'
    })
  }

  if (!isOpen) return null

  const changesCount = workingTree?.files?.length || 0

  return (
    <div className="fixed inset-0 z-50" onKeyDown={handleKeyDown}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-background-secondary border border-border rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-base font-semibold text-slate-100">Switch Branch</h2>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-background-tertiary transition-colors"
              aria-label="Close"
            >
              <svg
                className="w-4 h-4 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-border">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search branches..."
                autoFocus
                className="w-full pl-10 pr-4 py-2 text-sm bg-background border border-border rounded text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Warning for uncommitted changes */}
          {showUncommittedWarning && pendingBranch && (
            <div className="p-4 bg-amber-500/10 border-b border-amber-500/20">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-amber-300 font-medium">
                    You have {changesCount} uncommitted change{changesCount !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Choose how to handle your changes before switching to <span className="text-slate-300">{pendingBranch}</span>
                  </p>

                  <div className="mt-3 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="stashOption"
                        checked={stashOption === 'stash'}
                        onChange={() => setStashOption('stash')}
                        className="w-4 h-4 text-blue-500 bg-background-tertiary border-border"
                      />
                      <span className="text-sm text-slate-300">Stash changes (recommended)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="stashOption"
                        checked={stashOption === 'discard'}
                        onChange={() => setStashOption('discard')}
                        className="w-4 h-4 text-blue-500 bg-background-tertiary border-border"
                      />
                      <span className="text-sm text-red-400">Discard changes</span>
                    </label>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShowUncommittedWarning(false)
                        setPendingBranch(null)
                        setStashOption(null)
                      }}
                      className="px-3 py-1.5 text-xs text-slate-300 hover:text-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmSwitch}
                      disabled={!stashOption || switching}
                      className="px-3 py-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {switching ? 'Switching...' : 'Continue'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Branch list */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <svg className="w-5 h-5 animate-spin text-blue-400" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span className="ml-2 text-sm text-slate-400">Loading branches...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8">
                <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M15 9l-6 6M9 9l6 6" />
                </svg>
                <span className="ml-2 text-sm text-red-400">{error}</span>
              </div>
            ) : groupedBranches.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                {searchQuery ? 'No branches match your search' : 'No branches found'}
              </div>
            ) : (
              groupedBranches.map((group) => (
                <div key={group.title}>
                  <div className="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider bg-background/50">
                    {group.title}
                  </div>
                  {group.branches.map((branch) => (
                    <button
                      key={branch.name}
                      onClick={() => handleSelectBranch(branch.name)}
                      disabled={branch.current || switching}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${
                        branch.current
                          ? 'bg-blue-500/10 cursor-default'
                          : 'hover:bg-background-tertiary cursor-pointer'
                      } ${switching ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <svg
                          className={`w-4 h-4 flex-shrink-0 ${branch.current ? 'text-blue-400' : 'text-slate-500'}`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <line x1="6" y1="3" x2="6" y2="15" />
                          <circle cx="18" cy="6" r="3" />
                          <circle cx="6" cy="18" r="3" />
                          <path d="M18 9a9 9 0 0 1-9 9" />
                        </svg>
                        <span className={`text-sm truncate ${branch.current ? 'text-blue-300' : 'text-slate-200'}`}>
                          {branch.name}
                        </span>
                        {branch.associatedIssue && (
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded flex-shrink-0">
                            #{branch.associatedIssue}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {branch.current && (
                          <span className="text-xs text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">
                            current
                          </span>
                        )}
                        {!branch.current && (branch.ahead > 0 || branch.behind > 0) && (
                          <span className="text-xs text-slate-500">
                            {branch.ahead > 0 && <span className="text-green-400">+{branch.ahead}</span>}
                            {branch.ahead > 0 && branch.behind > 0 && '/'}
                            {branch.behind > 0 && <span className="text-red-400">-{branch.behind}</span>}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border">
            <button
              onClick={onCreateNew}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create New Branch
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
