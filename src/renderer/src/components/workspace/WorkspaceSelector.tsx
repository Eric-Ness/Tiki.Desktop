import { useCallback, useEffect, useMemo } from 'react'

interface WorkspaceSelectorProps {
  isOpen: boolean
  onClose: () => void
  snapshots: Array<{
    id: string
    name: string
    activeIssue?: number
    terminals: Array<{ name: string }>
    updatedAt: string
  }>
  onRestore: (id: string) => void
  onSaveNew: () => void
  onManage: () => void
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

export function WorkspaceSelector({
  isOpen,
  onClose,
  snapshots,
  onRestore,
  onSaveNew,
  onManage,
  loading = false
}: WorkspaceSelectorProps) {
  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Sort snapshots by most recent first
  const sortedSnapshots = useMemo(() => {
    return [...snapshots].sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  }, [snapshots])

  const handleRestore = useCallback(
    (id: string) => {
      if (!loading) {
        onRestore(id)
      }
    },
    [loading, onRestore]
  )

  const handleSaveNew = useCallback(() => {
    if (!loading) {
      onSaveNew()
    }
  }, [loading, onSaveNew])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        data-testid="workspace-selector-backdrop"
      />

      {/* Popover */}
      <div
        className="absolute top-16 right-4 w-80 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden"
        data-testid="workspace-selector-popover"
      >
        {/* Loading indicator */}
        {loading && (
          <div
            className="absolute inset-0 bg-slate-800/50 flex items-center justify-center z-10"
            data-testid="workspace-selector-loading"
          >
            <svg className="w-6 h-6 animate-spin text-amber-500" viewBox="0 0 24 24" fill="none">
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

        {/* Save Current Workspace button */}
        <div className="p-2 border-b border-slate-700">
          <button
            onClick={handleSaveNew}
            disabled={loading}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="w-4 h-4 text-amber-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Save Current Workspace
          </button>
        </div>

        {/* Recent Workspaces */}
        {sortedSnapshots.length > 0 ? (
          <>
            <div className="px-3 py-2 text-xs font-medium text-slate-400 uppercase tracking-wide border-b border-slate-700">
              Recent Workspaces
            </div>

            <div className="max-h-64 overflow-y-auto">
              {sortedSnapshots.map((snapshot) => {
                const terminalCount = snapshot.terminals.length
                const terminalText = terminalCount === 1 ? '1 terminal' : `${terminalCount} terminals`

                return (
                  <button
                    key={snapshot.id}
                    onClick={() => handleRestore(snapshot.id)}
                    disabled={loading}
                    className="w-full text-left px-3 py-2 hover:bg-slate-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="workspace-item"
                  >
                    <div className="text-sm font-medium text-slate-200">{snapshot.name}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      {snapshot.activeIssue && (
                        <>
                          <span>Issue #{snapshot.activeIssue}</span>
                          <span className="text-slate-600">|</span>
                        </>
                      )}
                      <span>{terminalText}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {formatRelativeTime(snapshot.updatedAt)}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <div className="px-3 py-4 text-sm text-slate-400 text-center">
            No saved workspaces
          </div>
        )}

        {/* Manage Workspaces link */}
        <div className="p-2 border-t border-slate-700">
          <button
            onClick={onManage}
            className="w-full flex items-center justify-center gap-1 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
          >
            Manage Workspaces...
          </button>
        </div>
      </div>
    </div>
  )
}
