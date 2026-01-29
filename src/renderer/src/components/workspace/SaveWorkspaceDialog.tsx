import { useState, useCallback, useEffect, useRef } from 'react'

interface SaveWorkspaceDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, description?: string) => void
  currentState: {
    terminalCount: number
    activeIssue?: number
    activeTab: string
  }
  saving?: boolean
}

export function SaveWorkspaceDialog({
  isOpen,
  onClose,
  onSave,
  currentState,
  saving = false
}: SaveWorkspaceDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure dialog is rendered
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
  }, [isOpen])

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setName('')
      setDescription('')
    }
  }, [isOpen])

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [onClose]
  )

  // Handle form submission
  const handleSubmit = useCallback(() => {
    const trimmedName = name.trim()
    if (!trimmedName || saving) return

    const trimmedDescription = description.trim()
    onSave(trimmedName, trimmedDescription || undefined)
  }, [name, description, saving, onSave])

  // Handle Enter key in name input
  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  if (!isOpen) return null

  const terminalText = currentState.terminalCount === 1 ? '1 terminal' : `${currentState.terminalCount} terminals`

  return (
    <div
      className="fixed inset-0 z-50"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-workspace-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        data-testid="dialog-backdrop"
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-600">
            <h2 id="save-workspace-title" className="text-base font-semibold text-slate-100">
              Save Workspace
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

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Summary of what will be saved */}
            <div className="p-3 bg-slate-700/50 border border-slate-600 rounded-lg">
              <p className="text-sm text-slate-300 mb-2">This snapshot will include:</p>
              <ul className="text-sm text-slate-400 space-y-1">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18" />
                  </svg>
                  {terminalText}
                </li>
                {currentState.activeIssue && (
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4m0-4h.01" />
                    </svg>
                    Issue #{currentState.activeIssue}
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  Active tab: {currentState.activeTab}
                </li>
              </ul>
            </div>

            {/* Name input */}
            <div>
              <label htmlFor="workspace-name" className="block text-sm font-medium text-slate-200 mb-1.5">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                ref={inputRef}
                id="workspace-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleNameKeyDown}
                placeholder="e.g., Feature Development"
                disabled={saving}
                className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Description textarea */}
            <div>
              <label htmlFor="workspace-description" className="block text-sm font-medium text-slate-200 mb-1.5">
                Description
              </label>
              <textarea
                id="workspace-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional notes about this workspace state..."
                disabled={saving}
                rows={3}
                className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-600 bg-slate-800/50">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-3 py-1.5 text-sm text-slate-300 hover:text-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || saving}
              className="px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
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
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
