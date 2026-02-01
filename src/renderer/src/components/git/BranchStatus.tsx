import { useState, useEffect, useRef, useCallback } from 'react'
import { logger } from '../../lib/logger'
import { useTikiStore } from '../../stores/tiki-store'
import { BranchSelector } from './BranchSelector'
import { CreateBranchDialog } from './CreateBranchDialog'
import { CheckpointManager } from '../rollback/CheckpointManager'

interface WorkingTreeStatus {
  isDirty: boolean
  hasUntracked: boolean
  hasStaged: boolean
  hasUnstaged: boolean
  files: Array<{ path: string; status: string }>
}

type DialogType = 'none' | 'selector' | 'create' | 'checkpoints'

interface BranchStatusProps {
  cwd: string
}

export function BranchStatus({ cwd }: BranchStatusProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [workingTree, setWorkingTree] = useState<WorkingTreeStatus | null>(null)
  const [activeDialog, setActiveDialog] = useState<DialogType>('none')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentBranch = useTikiStore((state) => state.currentBranch)
  const branchAssociations = useTikiStore((state) => state.branchAssociations)
  const branchOperationInProgress = useTikiStore((state) => state.branchOperationInProgress)
  const setCurrentBranch = useTikiStore((state) => state.setCurrentBranch)
  const setBranchOperationInProgress = useTikiStore((state) => state.setBranchOperationInProgress)

  // Fetch current branch on mount and when cwd changes
  const refreshBranchInfo = useCallback(async () => {
    if (!cwd) return

    try {
      const branchInfo = await window.tikiDesktop.branch.current(cwd)
      setCurrentBranch(branchInfo)

      const status = await window.tikiDesktop.branch.workingTreeStatus(cwd)
      setWorkingTree(status)
    } catch (error) {
      logger.error('Failed to fetch branch info:', error)
    }
  }, [cwd, setCurrentBranch])

  useEffect(() => {
    refreshBranchInfo()

    // Set up interval to refresh branch info
    const interval = setInterval(refreshBranchInfo, 10000)
    return () => clearInterval(interval)
  }, [refreshBranchInfo])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const handlePush = async () => {
    if (!currentBranch || branchOperationInProgress) return

    setBranchOperationInProgress(true)
    try {
      const result = await window.tikiDesktop.branch.push(cwd, currentBranch.name)
      if (result.success) {
        await refreshBranchInfo()
      } else {
        logger.error('Push failed:', result.error)
      }
    } catch (error) {
      logger.error('Push error:', error)
    } finally {
      setBranchOperationInProgress(false)
      setIsOpen(false)
    }
  }

  const handleSwitchBranch = () => {
    setIsOpen(false)
    setActiveDialog('selector')
  }

  const handleCreateBranch = () => {
    setIsOpen(false)
    setActiveDialog('create')
  }

  const handleBranchSelected = async (branchName: string) => {
    // Refresh branch info after switch
    await refreshBranchInfo()
  }

  const handleBranchCreated = async (branchName: string, switchedTo: boolean) => {
    // Refresh branch info after creation
    await refreshBranchInfo()
  }

  const handleOpenCreateFromSelector = () => {
    setActiveDialog('create')
  }

  const handleDeleteBranch = async () => {
    // For now, just close the dropdown - branch deletion confirmation will be added later
    setIsOpen(false)
    // TODO: Open delete branch confirmation
    logger.debug('Delete branch - TODO: implement delete branch confirmation')
  }

  const [creatingCheckpoint, setCreatingCheckpoint] = useState(false)

  const handleCreateCheckpoint = async () => {
    if (!cwd || creatingCheckpoint) return

    setCreatingCheckpoint(true)
    try {
      // Create a quick checkpoint with auto-generated name
      const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
      const name = `Checkpoint ${timestamp}`
      await window.tikiDesktop.rollback.createCheckpoint(cwd, name)
      setIsOpen(false)
    } catch (error) {
      logger.error('Failed to create checkpoint:', error)
    } finally {
      setCreatingCheckpoint(false)
    }
  }

  const handleManageCheckpoints = () => {
    setIsOpen(false)
    setActiveDialog('checkpoints')
  }

  // Find associated issue for current branch
  const associatedIssue = currentBranch?.associatedIssue
    ? currentBranch.associatedIssue
    : Object.entries(branchAssociations).find(
        ([, assoc]) => assoc.branchName === currentBranch?.name
      )?.[0]

  if (!currentBranch) {
    return null
  }

  const isDirty = workingTree?.isDirty || false
  const ahead = currentBranch.ahead || 0
  const behind = currentBranch.behind || 0
  const changesCount = workingTree?.files?.length || 0

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Branch button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={branchOperationInProgress}
        className="flex items-center gap-1.5 text-slate-400 hover:text-slate-300 transition-colors disabled:opacity-50"
      >
        {branchOperationInProgress ? (
          <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
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
        ) : (
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="6" y1="3" x2="6" y2="15" />
            <circle cx="18" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <path d="M18 9a9 9 0 0 1-9 9" />
          </svg>
        )}
        <span>{currentBranch.name}</span>
        {isDirty && <span className="text-amber-400">*</span>}
        {(ahead > 0 || behind > 0) && (
          <span className="text-slate-500 text-[10px]">
            {ahead > 0 && <span className="text-green-400">↑{ahead}</span>}
            {ahead > 0 && behind > 0 && ' '}
            {behind > 0 && <span className="text-red-400">↓{behind}</span>}
          </span>
        )}
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute bottom-full mb-2 right-0 w-64 bg-background-secondary border border-border rounded-lg shadow-xl z-50">
          {/* Branch Status Info */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-200">{currentBranch.name}</span>
              {associatedIssue && (
                <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                  #{associatedIssue}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              {currentBranch.remote ? (
                <>
                  {ahead > 0 && (
                    <span className="text-green-400">{ahead} ahead</span>
                  )}
                  {behind > 0 && (
                    <span className="text-red-400">{behind} behind</span>
                  )}
                  {ahead === 0 && behind === 0 && (
                    <span className="text-slate-400">Up to date</span>
                  )}
                </>
              ) : (
                <span className="text-amber-400">No remote tracking</span>
              )}
              {changesCount > 0 && (
                <>
                  <span className="text-slate-600">|</span>
                  <span className="text-amber-400">
                    {changesCount} change{changesCount !== 1 ? 's' : ''}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-1">
            <button
              onClick={handleSwitchBranch}
              disabled={branchOperationInProgress}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-background-tertiary rounded transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 17l9.2-9.2M17 17V7H7" />
              </svg>
              Switch Branch
            </button>

            <button
              onClick={handleCreateBranch}
              disabled={branchOperationInProgress}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-background-tertiary rounded transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create New Branch
            </button>

            <button
              onClick={handlePush}
              disabled={branchOperationInProgress || ahead === 0}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-background-tertiary rounded transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
              Push{ahead > 0 && ` (${ahead})`}
            </button>

            {/* Checkpoint Actions */}
            <button
              onClick={handleCreateCheckpoint}
              disabled={branchOperationInProgress || creatingCheckpoint}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-teal-400 hover:bg-teal-500/10 rounded transition-colors disabled:opacity-50"
            >
              {creatingCheckpoint ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {creatingCheckpoint ? 'Creating...' : 'Create Checkpoint'}
            </button>

            <button
              onClick={handleManageCheckpoints}
              disabled={branchOperationInProgress}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-background-tertiary rounded transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Manage Checkpoints
            </button>

            <button
              onClick={handleDeleteBranch}
              disabled={branchOperationInProgress || currentBranch.name === 'main' || currentBranch.name === 'master'}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Delete Branch
            </button>
          </div>

          {/* Associated Issue Link */}
          {associatedIssue && (
            <div className="p-3 border-t border-border">
              <button
                onClick={() => {
                  window.tikiDesktop.github.openInBrowser(Number(associatedIssue), cwd)
                  setIsOpen(false)
                }}
                className="w-full flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                View Issue #{associatedIssue} on GitHub
              </button>
            </div>
          )}
        </div>
      )}

      {/* Branch Selector Dialog */}
      <BranchSelector
        isOpen={activeDialog === 'selector'}
        onClose={() => setActiveDialog('none')}
        onSelect={handleBranchSelected}
        onCreateNew={handleOpenCreateFromSelector}
        currentBranch={currentBranch?.name || null}
        cwd={cwd}
      />

      {/* Create Branch Dialog */}
      <CreateBranchDialog
        isOpen={activeDialog === 'create'}
        onClose={() => setActiveDialog('none')}
        onCreated={handleBranchCreated}
        defaultBaseBranch={currentBranch?.name}
        cwd={cwd}
      />

      {/* Checkpoint Manager Dialog */}
      <CheckpointManager
        isOpen={activeDialog === 'checkpoints'}
        onClose={() => setActiveDialog('none')}
      />
    </div>
  )
}
