import { useState, useEffect, useCallback } from 'react'
import { Release, useTikiStore } from '../../stores/tiki-store'

interface EditReleaseDialogProps {
  isOpen: boolean
  release: Release
  onClose: () => void
  onSaved?: () => void
}

export function EditReleaseDialog({ isOpen, release, onClose, onSaved }: EditReleaseDialogProps) {
  const [version, setVersion] = useState(release.version)
  const [status, setStatus] = useState(release.status)
  const [requirementsEnabled, setRequirementsEnabled] = useState(release.requirementsEnabled ?? false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateRelease = useTikiStore((state) => state.updateRelease)

  // Version validation - must match semver-like pattern
  const isValidVersion = /^v?\d+\.\d+(\.\d+)?(-[a-zA-Z0-9.]+)?$/.test(version)

  // Check if there are any changes
  const hasChanges =
    version !== release.version ||
    status !== release.status ||
    requirementsEnabled !== (release.requirementsEnabled ?? false)

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setVersion(release.version)
      setStatus(release.status)
      setRequirementsEnabled(release.requirementsEnabled ?? false)
      setError(null)
    }
  }, [isOpen, release])

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

  // Handle save
  const handleSave = async () => {
    if (!isValidVersion || !hasChanges) {
      if (!isValidVersion) {
        setError('Please enter a valid version number')
      }
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await window.tikiDesktop.tiki.updateRelease({
        currentVersion: release.version,
        updates: {
          version,
          status: status as 'active' | 'shipped' | 'completed' | 'not_planned',
          requirementsEnabled
        }
      })

      if (!result.success) {
        setError(result.error || 'Failed to update release')
        return
      }

      // Update local store
      const updatedRelease: Release = {
        ...release,
        version,
        status,
        requirementsEnabled
      }
      updateRelease(release.version, updatedRelease)

      onSaved?.()
      onClose()
    } catch (err) {
      console.error('Failed to update release:', err)
      setError(err instanceof Error ? err.message : 'Failed to update release')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50" onKeyDown={handleKeyDown}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        data-testid="dialog-backdrop"
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-background-secondary border border-border rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-base font-semibold text-slate-100">Edit Release</h2>
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
            {/* Version Input */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1.5">
                Version
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                autoFocus
                className={`w-full px-3 py-2 text-sm bg-background border rounded text-slate-200 placeholder:text-slate-500 focus:outline-none transition-colors ${
                  version && !isValidVersion
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-border focus:border-amber-500'
                }`}
              />
              {version && !isValidVersion && (
                <p className="mt-1 text-xs text-red-400">
                  Please enter a valid version (e.g., v1.0, v1.0.0, v1.0.0-beta.1)
                </p>
              )}
            </div>

            {/* Status Select */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="shipped">Shipped</option>
                <option value="not_planned">Not Planned</option>
              </select>
            </div>

            {/* Requirements Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-200">
                Requirements Tracking
              </label>
              <button
                type="button"
                onClick={() => setRequirementsEnabled(!requirementsEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  requirementsEnabled ? 'bg-amber-600' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    requirementsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-red-400 flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M15 9l-6 6M9 9l6 6" />
                  </svg>
                  <span className="text-sm text-red-400">{error}</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-background">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 text-sm text-slate-300 hover:text-slate-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !isValidVersion || !hasChanges}
              className="px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
