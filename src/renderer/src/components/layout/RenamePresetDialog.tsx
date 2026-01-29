import { useState, useCallback, useEffect, useRef } from 'react'
import { LayoutPreset } from '../../stores/layout-presets'

const MAX_NAME_LENGTH = 50

interface RenamePresetDialogProps {
  isOpen: boolean
  preset: LayoutPreset | null
  onClose: () => void
  onRename: (newName: string) => void
}

export function RenamePresetDialog({ isOpen, preset, onClose, onRename }: RenamePresetDialogProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize name when dialog opens with preset
  useEffect(() => {
    if (isOpen && preset) {
      setName(preset.name)
      // Small delay to ensure dialog is rendered
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 50)
    }
  }, [isOpen, preset])

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setName('')
      setError(null)
    }
  }, [isOpen])

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Enter' && name.trim()) {
        e.preventDefault()
        handleRename()
      }
    },
    [onClose, name]
  )

  // Validate name
  const validateName = (value: string): string | null => {
    const trimmed = value.trim()
    if (!trimmed) {
      return 'Preset name is required'
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      return `Name must be ${MAX_NAME_LENGTH} characters or less`
    }
    return null
  }

  // Handle name change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setName(value)
    // Clear error when user starts typing
    if (error) {
      setError(null)
    }
  }

  // Handle rename
  const handleRename = () => {
    const validationError = validateName(name)
    if (validationError) {
      setError(validationError)
      return
    }

    onRename(name.trim())
  }

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
            <h2 className="text-base font-semibold text-slate-100">Rename Preset</h2>
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
            <p className="text-sm text-slate-400">Enter a new name for this preset.</p>

            {/* Name input */}
            <div>
              <label htmlFor="rename-preset-name" className="block text-sm font-medium text-slate-200 mb-1.5">
                Preset Name <span className="text-red-400">*</span>
              </label>
              <input
                ref={inputRef}
                id="rename-preset-name"
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder="e.g., My Custom Layout"
                maxLength={MAX_NAME_LENGTH}
                className={`w-full px-3 py-2 text-sm bg-background border rounded text-slate-200 placeholder:text-slate-500 focus:outline-none transition-colors ${
                  error ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-amber-500'
                }`}
              />
              <div className="flex items-center justify-between mt-1">
                <div className="flex-1">{error && <p className="text-xs text-red-400">{error}</p>}</div>
                <span className="text-xs text-slate-500">
                  {name.length}/{MAX_NAME_LENGTH}
                </span>
              </div>
            </div>
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
              onClick={handleRename}
              disabled={!name.trim() || name.trim() === preset.name}
              className="px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Rename
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
