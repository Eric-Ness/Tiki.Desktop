import { useState, useEffect, useCallback } from 'react'
import { useTikiStore, type GitHubIssue } from '../../stores/tiki-store'
import type { IssueActionType } from '../../hooks/useIssueActions'

type BranchOption = 'create' | 'existing' | 'current'

interface WorkingTreeStatus {
  isDirty: boolean
  hasUntracked: boolean
  hasStaged: boolean
  hasUnstaged: boolean
  files: Array<{ path: string; status: string }>
}

interface BranchInfo {
  name: string
  current: boolean
  remote: string | undefined
  ahead: number
  behind: number
  lastCommit: string | undefined
  associatedIssue: number | undefined
}

export interface StartIssueDialogProps {
  isOpen: boolean
  onClose: () => void
  issue: GitHubIssue
  action: IssueActionType
  onConfirm: (options: {
    branchOption: BranchOption
    branchName: string
    stashChanges: boolean
  }) => void
}

export function StartIssueDialog({
  isOpen,
  onClose,
  issue,
  action,
  onConfirm
}: StartIssueDialogProps) {
  const activeProject = useTikiStore((state) => state.activeProject)
  const currentBranch = useTikiStore((state) => state.currentBranch)
  const branchAssociations = useTikiStore((state) => state.branchAssociations)

  const [branchOption, setBranchOption] = useState<BranchOption>('create')
  const [branchName, setBranchName] = useState('')
  const [existingBranch, setExistingBranch] = useState('')
  const [stashChanges, setStashChanges] = useState(false)
  const [workingTree, setWorkingTree] = useState<WorkingTreeStatus | null>(null)
  const [branches, setBranches] = useState<BranchInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  // Check if issue already has an associated branch
  const associatedBranch = branchAssociations[issue.number]

  // Generate branch name and fetch status when dialog opens
  useEffect(() => {
    if (!isOpen || !activeProject?.path) return

    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch working tree status
        const status = await window.tikiDesktop.branch.workingTreeStatus(activeProject.path)
        setWorkingTree(status)

        // Fetch available branches
        const branchList = await window.tikiDesktop.branch.list(activeProject.path)
        setBranches(branchList)

        // Check if there's already an associated branch
        if (associatedBranch) {
          setBranchOption('existing')
          setExistingBranch(associatedBranch.branchName)
        } else {
          // Generate branch name
          setGenerating(true)
          const generatedName = await window.tikiDesktop.branch.generateName({
            number: issue.number,
            title: issue.title,
            type: issue.labels.find((l) =>
              ['bug', 'feature', 'enhancement', 'docs', 'chore'].includes(l.name.toLowerCase())
            )?.name
          })
          setBranchName(generatedName)
          setGenerating(false)
        }
      } catch (error) {
        console.error('Failed to fetch branch data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isOpen, activeProject?.path, issue, associatedBranch])

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [onClose]
  )

  const handleConfirm = () => {
    const selectedBranchName = branchOption === 'create'
      ? branchName
      : branchOption === 'existing'
        ? existingBranch
        : currentBranch?.name || ''

    onConfirm({
      branchOption,
      branchName: selectedBranchName,
      stashChanges
    })
  }

  if (!isOpen) {
    return null
  }

  const isDirty = workingTree?.isDirty || false
  const changesCount = workingTree?.files?.length || 0

  // Filter out current branch from existing branches list
  const otherBranches = branches.filter((b) => !b.current)

  // Get action label
  const actionLabel = action === 'yolo' ? 'Start Working' : 'Execute Plan'

  return (
    <div className="fixed inset-0 z-50" onKeyDown={handleKeyDown}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="w-full max-w-lg bg-background-secondary border border-border rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-slate-100">{actionLabel}</h2>
              <p className="text-sm text-slate-400 mt-1">
                #{issue.number}: {issue.title}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-background-tertiary transition-colors"
              aria-label="Close dialog"
            >
              <svg
                className="w-5 h-5 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <svg className="w-6 h-6 animate-spin text-blue-400" viewBox="0 0 24 24" fill="none">
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
                <span className="ml-2 text-slate-400">Loading branch info...</span>
              </div>
            ) : (
              <>
                {/* Current Branch Status */}
                <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="6" y1="3" x2="6" y2="15" />
                      <circle cx="18" cy="6" r="3" />
                      <circle cx="6" cy="18" r="3" />
                      <path d="M18 9a9 9 0 0 1-9 9" />
                    </svg>
                    <span className="text-sm text-slate-300">Current: {currentBranch?.name || 'unknown'}</span>
                  </div>
                  {isDirty ? (
                    <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                      {changesCount} uncommitted change{changesCount !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded">
                      Clean
                    </span>
                  )}
                </div>

                {/* Branch Options */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-200">Branch Option</label>

                  {/* Create new branch */}
                  <label className="flex items-start gap-3 p-3 bg-background rounded-lg border border-border cursor-pointer hover:border-blue-500/50 transition-colors">
                    <input
                      type="radio"
                      name="branchOption"
                      checked={branchOption === 'create'}
                      onChange={() => setBranchOption('create')}
                      className="mt-0.5 w-4 h-4 text-blue-500 bg-background-tertiary border-border focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-slate-200">Create and switch to new branch</span>
                      {branchOption === 'create' && (
                        <div className="mt-2">
                          <input
                            type="text"
                            value={branchName}
                            onChange={(e) => setBranchName(e.target.value)}
                            placeholder={generating ? 'Generating...' : 'Branch name'}
                            disabled={generating}
                            className="w-full px-3 py-1.5 text-sm bg-background-tertiary border border-border rounded text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  </label>

                  {/* Use existing branch */}
                  <label className="flex items-start gap-3 p-3 bg-background rounded-lg border border-border cursor-pointer hover:border-blue-500/50 transition-colors">
                    <input
                      type="radio"
                      name="branchOption"
                      checked={branchOption === 'existing'}
                      onChange={() => setBranchOption('existing')}
                      className="mt-0.5 w-4 h-4 text-blue-500 bg-background-tertiary border-border focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-slate-200">Use existing branch</span>
                      {branchOption === 'existing' && (
                        <div className="mt-2">
                          <select
                            value={existingBranch}
                            onChange={(e) => setExistingBranch(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm bg-background-tertiary border border-border rounded text-slate-200 focus:outline-none focus:border-blue-500"
                          >
                            <option value="">Select a branch...</option>
                            {otherBranches.map((branch) => (
                              <option key={branch.name} value={branch.name}>
                                {branch.name}
                                {branch.associatedIssue ? ` (#${branch.associatedIssue})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </label>

                  {/* Stay on current branch */}
                  <label className="flex items-start gap-3 p-3 bg-background rounded-lg border border-border cursor-pointer hover:border-blue-500/50 transition-colors">
                    <input
                      type="radio"
                      name="branchOption"
                      checked={branchOption === 'current'}
                      onChange={() => setBranchOption('current')}
                      className="mt-0.5 w-4 h-4 text-blue-500 bg-background-tertiary border-border focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="text-sm text-slate-200">Stay on current branch ({currentBranch?.name})</span>
                  </label>
                </div>

                {/* Dirty state warning with stash option */}
                {isDirty && branchOption !== 'current' && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm text-amber-300">
                          You have uncommitted changes that may conflict with branch switching.
                        </p>
                        <label className="flex items-center gap-2 mt-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={stashChanges}
                            onChange={(e) => setStashChanges(e.target.checked)}
                            className="w-4 h-4 text-blue-500 bg-background-tertiary border-border rounded focus:ring-blue-500 focus:ring-offset-0"
                          />
                          <span className="text-sm text-slate-300">Stash changes before switching</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-background">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-300 hover:text-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={
                loading ||
                (branchOption === 'create' && !branchName.trim()) ||
                (branchOption === 'existing' && !existingBranch)
              }
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
