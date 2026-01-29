import { useState, useEffect, useCallback } from 'react'
import { useTikiStore } from '../../stores/tiki-store'
import { RollbackDialog } from './RollbackDialog'
import type { Checkpoint } from '../../../../preload'

interface CheckpointManagerProps {
  isOpen: boolean
  onClose: () => void
}

type ViewMode = 'list' | 'create'

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return formatDate(timestamp)
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
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
      <span className="ml-2 text-slate-400">Loading checkpoints...</span>
    </div>
  )
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <svg
        className="w-16 h-16 text-slate-600 mb-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <h3 className="text-lg font-medium text-slate-200 mb-2">No checkpoints yet</h3>
      <p className="text-sm text-slate-400 mb-6 max-w-sm">
        Checkpoints let you save the current state of your repository and restore it later.
      </p>
      <button
        onClick={onCreateClick}
        className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-500 text-white rounded transition-colors"
      >
        Create Your First Checkpoint
      </button>
    </div>
  )
}

interface CheckpointItemProps {
  checkpoint: Checkpoint
  onRestore: (checkpoint: Checkpoint) => void
  onDelete: (checkpoint: Checkpoint) => void
  deleting: boolean
}

function CheckpointItem({ checkpoint, onRestore, onDelete, deleting }: CheckpointItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="p-4 bg-background rounded-lg border border-border hover:border-border-hover transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-slate-200 truncate">{checkpoint.name}</h4>
            {checkpoint.issueNumber && (
              <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded flex-shrink-0">
                #{checkpoint.issueNumber}
              </span>
            )}
          </div>
          {checkpoint.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{checkpoint.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
            <span title={formatDate(checkpoint.createdAt)}>{formatRelativeTime(checkpoint.createdAt)}</span>
            <span className="text-slate-600">|</span>
            <code className="font-mono text-slate-400">{checkpoint.commitHash.slice(0, 7)}</code>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {confirmDelete ? (
            <>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="px-2 py-1 text-xs text-slate-400 hover:text-slate-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => onDelete(checkpoint)}
                disabled={deleting}
                className="px-2 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Confirm'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onRestore(checkpoint)}
                className="px-3 py-1.5 text-xs bg-teal-600/20 text-teal-400 hover:bg-teal-600/30 rounded transition-colors"
                title="Restore to this checkpoint"
              >
                Restore
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                title="Delete checkpoint"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

interface CreateCheckpointFormProps {
  onSubmit: (name: string, description?: string) => void
  onCancel: () => void
  creating: boolean
}

function CreateCheckpointForm({ onSubmit, onCancel, creating }: CreateCheckpointFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit(name.trim(), description.trim() || undefined)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          Checkpoint Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Before refactoring auth"
          disabled={creating}
          autoFocus
          className="w-full px-3 py-2 text-sm bg-background border border-border rounded text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500 disabled:opacity-50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          Description <span className="text-slate-500">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What state is the project in at this checkpoint?"
          disabled={creating}
          rows={3}
          className="w-full px-3 py-2 text-sm bg-background border border-border rounded text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500 disabled:opacity-50 resize-none"
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={creating}
          className="px-4 py-2 text-sm text-slate-300 hover:text-slate-100 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim() || creating}
          className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? 'Creating...' : 'Create Checkpoint'}
        </button>
      </div>
    </form>
  )
}

export function CheckpointManager({ isOpen, onClose }: CheckpointManagerProps) {
  const activeProject = useTikiStore((state) => state.activeProject)

  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // For restoring via RollbackDialog
  const [restoreCheckpoint, setRestoreCheckpoint] = useState<Checkpoint | null>(null)

  // Load checkpoints
  const loadCheckpoints = useCallback(async () => {
    if (!activeProject?.path) return

    setLoading(true)
    setError(null)
    try {
      const list = await window.tikiDesktop.rollback.listCheckpoints(activeProject.path)
      // Sort by most recent first
      setCheckpoints(list.sort((a, b) => b.createdAt - a.createdAt))
    } catch (err) {
      console.error('Failed to load checkpoints:', err)
      setError(err instanceof Error ? err.message : 'Failed to load checkpoints')
    } finally {
      setLoading(false)
    }
  }, [activeProject?.path])

  // Load on open
  useEffect(() => {
    if (isOpen) {
      loadCheckpoints()
      setViewMode('list')
    }
  }, [isOpen, loadCheckpoints])

  // Subscribe to checkpoint changes
  useEffect(() => {
    if (!isOpen) return

    const unsubscribe = window.tikiDesktop.rollback.onCheckpointsChange((updatedCheckpoints) => {
      setCheckpoints(updatedCheckpoints.sort((a, b) => b.createdAt - a.createdAt))
    })

    return () => {
      unsubscribe()
    }
  }, [isOpen])

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (viewMode === 'create') {
          setViewMode('list')
        } else {
          onClose()
        }
      }
    },
    [onClose, viewMode]
  )

  // Create checkpoint
  const handleCreateCheckpoint = async (name: string, description?: string) => {
    if (!activeProject?.path) return

    setCreating(true)
    setError(null)
    try {
      await window.tikiDesktop.rollback.createCheckpoint(
        activeProject.path,
        name,
        undefined, // issueNumber - could be passed if we want to associate with current issue
        description
      )
      setViewMode('list')
      // Checkpoints will be updated via the subscription
    } catch (err) {
      console.error('Failed to create checkpoint:', err)
      setError(err instanceof Error ? err.message : 'Failed to create checkpoint')
    } finally {
      setCreating(false)
    }
  }

  // Delete checkpoint
  const handleDeleteCheckpoint = async (checkpoint: Checkpoint) => {
    if (!activeProject?.path) return

    setDeleting(checkpoint.id)
    setError(null)
    try {
      await window.tikiDesktop.rollback.deleteCheckpoint(activeProject.path, checkpoint.id)
      // Checkpoints will be updated via the subscription
    } catch (err) {
      console.error('Failed to delete checkpoint:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete checkpoint')
    } finally {
      setDeleting(null)
    }
  }

  // Restore checkpoint
  const handleRestoreCheckpoint = (checkpoint: Checkpoint) => {
    setRestoreCheckpoint(checkpoint)
  }

  if (!isOpen) {
    return null
  }

  return (
    <>
      <div className="fixed inset-0 z-50" onKeyDown={handleKeyDown}>
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Container */}
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="w-full max-w-lg max-h-[80vh] bg-background-secondary border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-slate-100">
                  {viewMode === 'create' ? 'Create Checkpoint' : 'Manage Checkpoints'}
                </h2>
                {viewMode === 'list' && checkpoints.length > 0 && (
                  <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                    {checkpoints.length}
                  </span>
                )}
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
            <div className="flex-1 overflow-y-auto p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-400/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {loading ? (
                <LoadingSpinner />
              ) : viewMode === 'create' ? (
                <CreateCheckpointForm
                  onSubmit={handleCreateCheckpoint}
                  onCancel={() => setViewMode('list')}
                  creating={creating}
                />
              ) : checkpoints.length === 0 ? (
                <EmptyState onCreateClick={() => setViewMode('create')} />
              ) : (
                <div className="space-y-3">
                  {checkpoints.map((checkpoint) => (
                    <CheckpointItem
                      key={checkpoint.id}
                      checkpoint={checkpoint}
                      onRestore={handleRestoreCheckpoint}
                      onDelete={handleDeleteCheckpoint}
                      deleting={deleting === checkpoint.id}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {viewMode === 'list' && !loading && checkpoints.length > 0 && (
              <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border bg-background flex-shrink-0">
                <button
                  onClick={() => setViewMode('create')}
                  className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-500 text-white rounded transition-colors"
                >
                  Create Checkpoint
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-slate-300 hover:text-slate-100 transition-colors"
                >
                  Close
                </button>
              </div>
            )}

            {viewMode === 'list' && !loading && checkpoints.length === 0 && (
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-background flex-shrink-0">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-slate-300 hover:text-slate-100 transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rollback Dialog for restoring checkpoint */}
      {restoreCheckpoint && (
        <RollbackDialog
          isOpen={true}
          onClose={() => setRestoreCheckpoint(null)}
          scope="checkpoint"
          target={{ checkpointId: restoreCheckpoint.id }}
        />
      )}
    </>
  )
}
