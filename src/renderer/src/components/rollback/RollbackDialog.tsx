import { useState, useEffect, useCallback } from 'react'
import { useTikiStore } from '../../stores/tiki-store'
import { RollbackPreview } from './RollbackPreview'
import { RollbackProgress } from './RollbackProgress'
import type {
  RollbackScope,
  RollbackTarget,
  RollbackPreview as RollbackPreviewType,
  RollbackProgress as RollbackProgressType,
  RollbackOptions,
  RollbackResult
} from '../../../../preload'

type RollbackMethod = 'revert' | 'reset'
type DialogState = 'loading' | 'preview' | 'progress' | 'success' | 'error'

interface RollbackDialogProps {
  isOpen: boolean
  onClose: () => void
  scope: RollbackScope
  target: RollbackTarget
  issueNumber?: number
  phaseNumber?: number
}

function getScopeLabel(scope: RollbackScope): string {
  switch (scope) {
    case 'phase':
      return 'Phase'
    case 'issue':
      return 'Issue'
    case 'checkpoint':
      return 'Checkpoint'
    default:
      return 'Unknown'
  }
}

function getTargetDescription(
  scope: RollbackScope,
  target: RollbackTarget,
  issueNumber?: number,
  phaseNumber?: number
): string {
  switch (scope) {
    case 'phase':
      return `Phase ${phaseNumber ?? target.phaseNumber} of Issue #${issueNumber ?? target.issueNumber}`
    case 'issue':
      return `Issue #${issueNumber ?? target.issueNumber}`
    case 'checkpoint':
      return `Checkpoint: ${target.checkpointId}`
    default:
      return 'Unknown target'
  }
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <svg className="w-8 h-8 animate-spin text-blue-400" viewBox="0 0 24 24" fill="none">
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
      <span className="ml-3 text-slate-400">Loading rollback preview...</span>
    </div>
  )
}

function SuccessView({
  result,
  onClose
}: {
  result: RollbackResult
  onClose: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-green-400/10 border border-green-500/20 rounded-lg">
        <svg className="w-6 h-6 text-green-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <div>
          <h4 className="text-sm font-medium text-green-400">Rollback Successful</h4>
          <p className="text-sm text-slate-300 mt-1">
            The rollback completed successfully.
          </p>
        </div>
      </div>

      {result.revertCommits && result.revertCommits.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-200">Revert Commits Created</h4>
          <div className="bg-background rounded-lg border border-border p-3">
            <ul className="space-y-1">
              {result.revertCommits.map((hash) => (
                <li key={hash} className="text-sm font-mono text-blue-400">
                  {hash.slice(0, 7)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {result.backupBranch && (
        <div className="p-3 bg-background rounded-lg border border-border">
          <p className="text-sm text-slate-300">
            <span className="text-slate-400">Backup branch:</span>{' '}
            <code className="text-blue-400 font-mono">{result.backupBranch}</code>
          </p>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  )
}

function ErrorView({
  error,
  onClose,
  onRetry
}: {
  error: string
  onClose: () => void
  onRetry: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-red-400/10 border border-red-500/20 rounded-lg">
        <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4m0 4h.01" />
        </svg>
        <div>
          <h4 className="text-sm font-medium text-red-400">Rollback Failed</h4>
          <p className="text-sm text-red-300 mt-1">{error}</p>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-slate-300 hover:text-slate-100 transition-colors"
        >
          Close
        </button>
        <button
          onClick={onRetry}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  )
}

function MethodSelector({
  method,
  onMethodChange,
  hasPushedCommits,
  disabled
}: {
  method: RollbackMethod
  onMethodChange: (method: RollbackMethod) => void
  hasPushedCommits: boolean
  disabled: boolean
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-slate-200">Rollback Method</h4>

      {/* Revert option (safe) */}
      <label className={`flex items-start gap-3 p-3 bg-background rounded-lg border border-border cursor-pointer transition-colors ${
        !disabled && method === 'revert' ? 'border-blue-500/50' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500/50'}`}>
        <input
          type="radio"
          name="rollbackMethod"
          checked={method === 'revert'}
          onChange={() => onMethodChange('revert')}
          disabled={disabled}
          className="mt-0.5 w-4 h-4 text-blue-500 bg-background-tertiary border-border focus:ring-blue-500 focus:ring-offset-0"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-200">Revert</span>
            <span className="text-xs px-1.5 py-0.5 bg-green-400/10 text-green-400 rounded">Safe</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Creates new commits that undo the changes. Preserves history and is safe for shared branches.
          </p>
        </div>
      </label>

      {/* Reset option (destructive) */}
      <label className={`flex items-start gap-3 p-3 bg-background rounded-lg border border-border cursor-pointer transition-colors ${
        hasPushedCommits ? 'opacity-50 cursor-not-allowed' : method === 'reset' ? 'border-blue-500/50' : 'hover:border-blue-500/50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <input
          type="radio"
          name="rollbackMethod"
          checked={method === 'reset'}
          onChange={() => onMethodChange('reset')}
          disabled={disabled || hasPushedCommits}
          className="mt-0.5 w-4 h-4 text-blue-500 bg-background-tertiary border-border focus:ring-blue-500 focus:ring-offset-0"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-200">Reset</span>
            <span className="text-xs px-1.5 py-0.5 bg-red-400/10 text-red-400 rounded">Destructive</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Removes commits from history. Cleaner but rewrites history. Not recommended for pushed commits.
          </p>
          {hasPushedCommits && (
            <p className="text-xs text-amber-400 mt-1">
              Disabled because some commits have been pushed.
            </p>
          )}
        </div>
      </label>
    </div>
  )
}

export function RollbackDialog({
  isOpen,
  onClose,
  scope,
  target,
  issueNumber,
  phaseNumber
}: RollbackDialogProps) {
  const activeProject = useTikiStore((state) => state.activeProject)

  const [dialogState, setDialogState] = useState<DialogState>('loading')
  const [preview, setPreview] = useState<RollbackPreviewType | null>(null)
  const [progress, setProgress] = useState<RollbackProgressType | null>(null)
  const [result, setResult] = useState<RollbackResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [method, setMethod] = useState<RollbackMethod>('revert')

  // Check if any commits are pushed (to disable reset option)
  const hasPushedCommits = false // Note: The current types don't expose isPushed on CommitInfo

  // Load preview when dialog opens
  useEffect(() => {
    if (!isOpen || !activeProject?.path) return

    const loadPreview = async () => {
      setDialogState('loading')
      setError(null)
      try {
        const previewData = await window.tikiDesktop.rollback.preview(
          activeProject.path,
          scope,
          target
        )
        setPreview(previewData)
        setDialogState('preview')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load rollback preview')
        setDialogState('error')
      }
    }

    loadPreview()
  }, [isOpen, activeProject?.path, scope, target])

  // Subscribe to progress updates
  useEffect(() => {
    if (!isOpen) return

    const unsubscribe = window.tikiDesktop.rollback.onProgress((progressData) => {
      setProgress(progressData)
    })

    return () => {
      unsubscribe()
    }
  }, [isOpen])

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && dialogState !== 'progress') {
        e.preventDefault()
        onClose()
      }
    },
    [onClose, dialogState]
  )

  // Execute rollback
  const handleRollback = async () => {
    if (!activeProject?.path || !preview) return

    setDialogState('progress')
    setProgress({
      stage: 'preparing',
      current: 0,
      total: preview.commits.length,
      message: 'Preparing rollback...'
    })

    try {
      const options: RollbackOptions = {
        method,
        updateIssueStatus: false,
        pushAfter: false
      }

      const rollbackResult = await window.tikiDesktop.rollback.execute(
        activeProject.path,
        scope,
        target,
        options
      )

      if (rollbackResult.success) {
        setResult(rollbackResult)
        setDialogState('success')
      } else {
        setError(rollbackResult.error || 'Unknown error occurred')
        setDialogState('error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute rollback')
      setDialogState('error')
    }
  }

  const handleRetry = () => {
    setDialogState('loading')
    setError(null)
    // Re-trigger preview load via useEffect
  }

  const handleCancel = () => {
    // Note: Cancel functionality would need to be implemented in the backend
    // For now, we just close the dialog
    onClose()
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50" onKeyDown={handleKeyDown}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={dialogState !== 'progress' ? onClose : undefined}
      />

      {/* Modal Container */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl max-h-[80vh] bg-background-secondary border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-slate-100">
                Rollback {getScopeLabel(scope)}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {getTargetDescription(scope, target, issueNumber, phaseNumber)}
              </p>
            </div>
            {dialogState !== 'progress' && (
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
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {dialogState === 'loading' && <LoadingSpinner />}

            {dialogState === 'preview' && preview && (
              <div className="space-y-6">
                {/* Method selector */}
                <MethodSelector
                  method={method}
                  onMethodChange={setMethod}
                  hasPushedCommits={hasPushedCommits}
                  disabled={!preview.canRollback}
                />

                {/* Preview component */}
                <RollbackPreview preview={preview} />
              </div>
            )}

            {dialogState === 'progress' && progress && preview && (
              <RollbackProgress
                progress={progress}
                commits={preview.commits}
                onCancel={handleCancel}
              />
            )}

            {dialogState === 'success' && result && (
              <SuccessView result={result} onClose={onClose} />
            )}

            {dialogState === 'error' && error && (
              <ErrorView error={error} onClose={onClose} onRetry={handleRetry} />
            )}
          </div>

          {/* Footer - only shown in preview state */}
          {dialogState === 'preview' && preview && (
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-background flex-shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-300 hover:text-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRollback}
                disabled={!preview.canRollback}
                className={`px-4 py-2 text-sm rounded transition-colors ${
                  method === 'reset'
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {method === 'reset' ? 'Reset (Destructive)' : 'Rollback'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
