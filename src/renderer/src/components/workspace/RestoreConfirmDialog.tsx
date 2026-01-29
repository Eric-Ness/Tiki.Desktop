import { useCallback } from 'react'

interface RestoreConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onRestore: () => void
  onSaveFirst: () => void
  snapshot: {
    name: string
    terminals: Array<{ name: string }>
    activeIssue?: number
    activeTab: string
  }
  currentState: {
    terminalCount: number
  }
  restoring?: boolean
}

export function RestoreConfirmDialog({
  isOpen,
  onClose,
  onRestore,
  onSaveFirst,
  snapshot,
  currentState,
  restoring = false
}: RestoreConfirmDialogProps) {
  // Handle escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && !restoring) {
        e.preventDefault()
        onClose()
      }
    },
    [onClose, restoring]
  )

  if (!isOpen) return null

  const currentTerminalText =
    currentState.terminalCount === 1 ? '1 terminal' : `${currentState.terminalCount} terminals`
  const snapshotTerminalText =
    snapshot.terminals.length === 1 ? '1 terminal' : `${snapshot.terminals.length} terminals`

  return (
    <div
      className="fixed inset-0 z-50"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-workspace-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={restoring ? undefined : onClose}
        data-testid="dialog-backdrop"
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-600">
            <h2 id="restore-workspace-title" className="text-base font-semibold text-slate-100">
              Restore Workspace
            </h2>
            <button
              onClick={onClose}
              disabled={restoring}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-700 transition-colors disabled:opacity-50"
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

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Snapshot info */}
            <div className="p-3 bg-slate-700/50 border border-slate-600 rounded-lg">
              <h3 className="text-sm font-medium text-slate-100 mb-2">{snapshot.name}</h3>
              <ul className="text-sm text-slate-400 space-y-1">
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-slate-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18" />
                  </svg>
                  {snapshotTerminalText}
                </li>
                {snapshot.activeIssue && (
                  <li className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-slate-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4m0-4h.01" />
                    </svg>
                    Issue #{snapshot.activeIssue}
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-slate-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  Active tab: {snapshot.activeTab}
                </li>
              </ul>
            </div>

            {/* Terminal list */}
            {snapshot.terminals.length > 0 && (
              <div className="p-3 bg-slate-700/30 border border-slate-600/50 rounded-lg">
                <p className="text-xs text-slate-400 mb-2">Terminals to restore:</p>
                <ul className="text-sm text-slate-300 space-y-1">
                  {snapshot.terminals.map((terminal, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                      {terminal.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warning section */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <path d="M12 9v4m0 4h.01" />
                </svg>
                <div>
                  <p className="text-sm text-amber-300 font-medium">This will:</p>
                  <ul className="text-sm text-amber-200/80 mt-1 space-y-0.5">
                    {currentState.terminalCount > 0 && (
                      <li>Close {currentTerminalText}</li>
                    )}
                    <li>Open {snapshotTerminalText}</li>
                    {snapshot.activeIssue && <li>Switch to Issue #{snapshot.activeIssue}</li>}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-600 bg-slate-800/50">
            <button
              onClick={onClose}
              disabled={restoring}
              className="px-3 py-1.5 text-sm text-slate-300 hover:text-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={onSaveFirst}
              disabled={restoring}
              className="px-3 py-1.5 text-sm bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Current First
            </button>
            <button
              onClick={onRestore}
              disabled={restoring}
              className="px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {restoring ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
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
                  Restoring...
                </>
              ) : (
                'Restore'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
