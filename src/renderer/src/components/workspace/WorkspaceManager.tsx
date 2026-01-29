import { useState, useCallback, useEffect, useMemo } from 'react'

interface WorkspaceManagerProps {
  isOpen: boolean
  onClose: () => void
  snapshots: Array<{
    id: string
    name: string
    description?: string
    activeIssue?: number
    terminals: Array<{ name: string }>
    updatedAt: string
    size: number
  }>
  storageInfo: { used: number; limit: number; snapshots: number }
  onRestore: (id: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  loading?: boolean
}

// Format relative time (e.g., "2 hours ago", "Yesterday", "3 days ago")
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString).getTime()
  const now = Date.now()
  const diffMs = now - date

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days >= 1 && days < 2) {
    return 'Yesterday'
  }
  if (days > 0) {
    return `${days} days ago`
  }
  if (hours > 0) {
    return `${hours} hours ago`
  }
  if (minutes > 0) {
    return `${minutes} minutes ago`
  }
  return 'Just now'
}

// Format bytes to human readable size
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function WorkspaceManager({
  isOpen,
  onClose,
  snapshots,
  storageInfo,
  onRestore,
  onRename,
  onDelete,
  loading = false
}: WorkspaceManagerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (renamingId) {
          setRenamingId(null)
          setRenameValue('')
        } else if (deletingId) {
          setDeletingId(null)
        } else {
          onClose()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, renamingId, deletingId])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setRenamingId(null)
      setRenameValue('')
      setDeletingId(null)
    }
  }, [isOpen])

  // Filter snapshots by search query
  const filteredSnapshots = useMemo(() => {
    if (!searchQuery.trim()) return snapshots

    const query = searchQuery.toLowerCase()
    return snapshots.filter(
      (snapshot) =>
        snapshot.name.toLowerCase().includes(query) ||
        snapshot.description?.toLowerCase().includes(query)
    )
  }, [snapshots, searchQuery])

  const handleStartRename = useCallback((id: string, currentName: string) => {
    setRenamingId(id)
    setRenameValue(currentName)
  }, [])

  const handleRenameSubmit = useCallback(
    (id: string) => {
      const trimmed = renameValue.trim()
      if (trimmed && trimmed !== snapshots.find((s) => s.id === id)?.name) {
        onRename(id, trimmed)
      }
      setRenamingId(null)
      setRenameValue('')
    },
    [renameValue, snapshots, onRename]
  )

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent, id: string) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleRenameSubmit(id)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setRenamingId(null)
        setRenameValue('')
      }
    },
    [handleRenameSubmit]
  )

  const handleConfirmDelete = useCallback(() => {
    if (deletingId) {
      onDelete(deletingId)
      setDeletingId(null)
    }
  }, [deletingId, onDelete])

  // Calculate storage percentage
  const storagePercentage = (storageInfo.used / storageInfo.limit) * 100
  const getStorageColor = () => {
    if (storagePercentage >= 95) return 'bg-red-500'
    if (storagePercentage >= 80) return 'bg-amber-500'
    return 'bg-green-500'
  }

  const snapshotToDelete = snapshots.find((s) => s.id === deletingId)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-manager-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        data-testid="workspace-manager-backdrop"
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div
          className="w-full max-w-3xl max-h-[80vh] bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden flex flex-col"
          data-testid="workspace-manager-modal"
        >
          {/* Loading overlay */}
          {loading && (
            <div
              className="absolute inset-0 bg-slate-800/50 flex items-center justify-center z-20"
              data-testid="workspace-manager-loading"
            >
              <svg
                className="w-8 h-8 animate-spin text-amber-500"
                viewBox="0 0 24 24"
                fill="none"
              >
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-600">
            <h2 id="workspace-manager-title" className="text-base font-semibold text-slate-100">
              Manage Workspaces
            </h2>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-700 transition-colors"
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
          <div className="px-4 py-3 border-b border-slate-700">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
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
                placeholder="Search workspaces..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-700 border border-slate-600 rounded text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {/* Workspace list */}
          <div className="flex-1 overflow-y-auto">
            {filteredSnapshots.length > 0 ? (
              <div className="divide-y divide-slate-700">
                {filteredSnapshots.map((snapshot) => {
                  const terminalCount = snapshot.terminals.length
                  const terminalText =
                    terminalCount === 1 ? '1 terminal' : `${terminalCount} terminals`
                  const isRenaming = renamingId === snapshot.id

                  return (
                    <div
                      key={snapshot.id}
                      className="px-4 py-3 hover:bg-slate-700/30 transition-colors"
                      data-testid="workspace-manager-item"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {isRenaming ? (
                            <input
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => handleRenameKeyDown(e, snapshot.id)}
                              onBlur={() => handleRenameSubmit(snapshot.id)}
                              autoFocus
                              className="w-full px-2 py-1 text-sm bg-slate-700 border border-amber-500 rounded text-slate-200 focus:outline-none"
                            />
                          ) : (
                            <div className="text-sm font-medium text-slate-200">
                              {snapshot.name}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                            {snapshot.activeIssue && <span>Issue #{snapshot.activeIssue}</span>}
                            <span>{terminalText}</span>
                            <span>{formatBytes(snapshot.size)}</span>
                            <span>{formatRelativeTime(snapshot.updatedAt)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onRestore(snapshot.id)}
                            disabled={loading}
                            className="px-2 py-1 text-xs text-slate-300 hover:text-slate-100 hover:bg-slate-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Restore"
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => handleStartRename(snapshot.id, snapshot.name)}
                            disabled={loading}
                            className="px-2 py-1 text-xs text-slate-300 hover:text-slate-100 hover:bg-slate-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Rename"
                          >
                            Rename
                          </button>
                          <button
                            onClick={() => setDeletingId(snapshot.id)}
                            disabled={loading}
                            className="px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Delete"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : snapshots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <svg
                  className="w-12 h-12 mb-4 text-slate-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <p className="text-sm">No saved workspaces</p>
                <p className="text-xs text-slate-500 mt-1">
                  Save your current workspace to get started
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <svg
                  className="w-12 h-12 mb-4 text-slate-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <p className="text-sm">No workspaces found</p>
                <p className="text-xs text-slate-500 mt-1">Try a different search term</p>
              </div>
            )}
          </div>

          {/* Storage usage */}
          <div className="px-4 py-3 border-t border-slate-600 bg-slate-800/50">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>{storageInfo.snapshots} snapshots</span>
              <span>
                {formatBytes(storageInfo.used)} of {formatBytes(storageInfo.limit)} used
              </span>
            </div>
            <div
              className="h-2 bg-slate-700 rounded-full overflow-hidden"
              data-testid="storage-usage-bar"
            >
              <div
                className={`h-full transition-all ${getStorageColor()}`}
                style={{ width: `${storagePercentage}%` }}
                data-testid="storage-usage-fill"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {deletingId && snapshotToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDeletingId(null)} />
          <div className="relative bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-4 max-w-sm mx-4">
            <h3 className="text-sm font-semibold text-slate-100 mb-2">Delete Workspace</h3>
            <p className="text-sm text-slate-300 mb-4">
              Are you sure you want to delete <strong>{snapshotToDelete.name}</strong>? This action
              cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-3 py-1.5 text-sm text-slate-300 hover:text-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
