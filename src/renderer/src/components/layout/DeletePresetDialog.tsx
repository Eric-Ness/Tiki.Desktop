import { useCallback, useEffect, useRef } from 'react'
import { LayoutPreset } from '../../stores/layout-presets'

interface DeletePresetDialogProps {
  isOpen: boolean
  preset: LayoutPreset | null
  onClose: () => void
  onDelete: () => void
}

export function DeletePresetDialog({ isOpen, preset, onClose, onDelete }: DeletePresetDialogProps) {
  const deleteButtonRef = useRef<HTMLButtonElement>(null)

  // Focus delete button when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure dialog is rendered
      setTimeout(() => {
        deleteButtonRef.current?.focus()
      }, 50)
    }
  }, [isOpen])

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        onDelete()
      }
    },
    [onClose, onDelete]
  )

  if (!isOpen || !preset) return null

  return (
    <div className="fixed inset-0 z-50" onKeyDown={handleKeyDown}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="w-full max-w-sm bg-background-secondary border border-border rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-base font-semibold text-slate-100">Delete Preset</h2>
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

          {/* Content */}
          <div className="p-4 space-y-4">
            <p className="text-sm text-slate-300">
              Are you sure you want to delete the preset{' '}
              <span className="font-semibold text-slate-100">"{preset.name}"</span>?
            </p>
            <p className="text-sm text-slate-400">This action cannot be undone.</p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-background">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-slate-300 hover:text-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              ref={deleteButtonRef}
              onClick={onDelete}
              className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
