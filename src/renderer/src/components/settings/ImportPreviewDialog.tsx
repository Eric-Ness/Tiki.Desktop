import { useState, useCallback } from 'react'
import type { ImportPreviewResult, ImportModeType } from '../../../../preload'

interface ImportPreviewDialogProps {
  isOpen: boolean
  onClose: () => void
  preview: ImportPreviewResult | null
  onImport: (mode: ImportModeType) => Promise<void>
}

export function ImportPreviewDialog({
  isOpen,
  onClose,
  preview,
  onImport
}: ImportPreviewDialogProps) {
  const [importMode, setImportMode] = useState<ImportModeType>('replace')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const handleImport = async () => {
    setLoading(true)
    setError(null)
    try {
      await onImport(importMode)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !preview) return null

  const { valid, errors, warnings, version, changes, data } = preview
  const hasSettingsChanges = changes.settings.length > 0
  const hasProjectChanges =
    changes.projects.added > 0 || changes.projects.removed > 0
  const hasLayoutChanges = changes.layout
  const hasRecentCommandsChanges = changes.recentCommands

  return (
    <div className="fixed inset-0 z-50" onKeyDown={handleKeyDown}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="w-full max-w-lg bg-background-secondary border border-border rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <h2 className="text-base font-semibold text-slate-100">
              Import Data Preview
            </h2>
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
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Validation Errors */}
            {!valid && errors.length > 0 && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded">
                <div className="flex items-start gap-2">
                  <svg
                    className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M15 9l-6 6M9 9l6 6" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-red-400 mb-1">
                      Validation Failed
                    </p>
                    <ul className="text-sm text-red-300 space-y-1">
                      {errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded">
                <div className="flex items-start gap-2">
                  <svg
                    className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-amber-400 mb-1">
                      Warnings
                    </p>
                    <ul className="text-sm text-amber-300 space-y-1">
                      {warnings.map((warn, i) => (
                        <li key={i}>{warn}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* File Info */}
            {valid && data && (
              <div className="p-3 bg-background border border-border rounded">
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span>Export File Info</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-slate-500">Version:</div>
                  <div className="text-slate-200">{version}</div>
                  <div className="text-slate-500">App Version:</div>
                  <div className="text-slate-200">{data.appVersion}</div>
                  <div className="text-slate-500">Exported:</div>
                  <div className="text-slate-200">
                    {new Date(data.exportedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {/* Changes Summary */}
            {valid && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-200">
                  Changes Summary
                </h3>

                {/* Settings Changes */}
                {hasSettingsChanges && (
                  <div className="p-3 bg-background border border-border rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <svg
                        className="w-4 h-4 text-blue-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                      <span className="text-sm font-medium text-slate-200">
                        Settings
                      </span>
                    </div>
                    <ul className="text-sm text-slate-400 space-y-1 ml-6">
                      {changes.settings.map((cat) => (
                        <li key={cat.category}>
                          <span className="capitalize">{cat.category}</span>:{' '}
                          {cat.fieldsChanged} field
                          {cat.fieldsChanged !== 1 ? 's' : ''} changed
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Project Changes */}
                {hasProjectChanges && (
                  <div className="p-3 bg-background border border-border rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <svg
                        className="w-4 h-4 text-green-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                      <span className="text-sm font-medium text-slate-200">
                        Projects
                      </span>
                    </div>
                    <div className="text-sm text-slate-400 ml-6 space-y-1">
                      {changes.projects.added > 0 && (
                        <p className="text-green-400">
                          +{changes.projects.added} project
                          {changes.projects.added !== 1 ? 's' : ''} to add
                        </p>
                      )}
                      {changes.projects.removed > 0 && (
                        <p className="text-red-400">
                          -{changes.projects.removed} project
                          {changes.projects.removed !== 1 ? 's' : ''} to remove
                        </p>
                      )}
                      {changes.projects.unchanged > 0 && (
                        <p>
                          {changes.projects.unchanged} project
                          {changes.projects.unchanged !== 1 ? 's' : ''} unchanged
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Layout Changes */}
                {hasLayoutChanges && (
                  <div className="p-3 bg-background border border-border rounded">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-purple-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="3" y1="9" x2="21" y2="9" />
                        <line x1="9" y1="21" x2="9" y2="9" />
                      </svg>
                      <span className="text-sm font-medium text-slate-200">
                        Layout
                      </span>
                      <span className="text-sm text-slate-400">
                        - Will be updated
                      </span>
                    </div>
                  </div>
                )}

                {/* Recent Commands Changes */}
                {hasRecentCommandsChanges && (
                  <div className="p-3 bg-background border border-border rounded">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-cyan-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="4 17 10 11 4 5" />
                        <line x1="12" y1="19" x2="20" y2="19" />
                      </svg>
                      <span className="text-sm font-medium text-slate-200">
                        Recent Commands
                      </span>
                      <span className="text-sm text-slate-400">
                        - Will be updated
                      </span>
                    </div>
                  </div>
                )}

                {/* No Changes */}
                {!hasSettingsChanges &&
                  !hasProjectChanges &&
                  !hasLayoutChanges &&
                  !hasRecentCommandsChanges && (
                    <div className="p-3 bg-background border border-border rounded text-sm text-slate-400">
                      No changes detected. Your current data matches the import
                      file.
                    </div>
                  )}
              </div>
            )}

            {/* Import Mode */}
            {valid && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-200">
                  Import Mode
                </h3>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 bg-background border border-border rounded cursor-pointer hover:bg-background-tertiary transition-colors">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-200">
                        Replace all data
                      </div>
                      <div className="text-xs text-slate-400">
                        Completely replace your current data with the imported
                        data. Existing projects and settings will be overwritten.
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 bg-background border border-border rounded cursor-pointer hover:bg-background-tertiary transition-colors">
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-200">
                        Merge with existing
                      </div>
                      <div className="text-xs text-slate-400">
                        Merge imported data with your current data. Existing
                        projects will be kept, and new ones will be added.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}

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
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-background flex-shrink-0">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 text-sm text-slate-300 hover:text-slate-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={loading || !valid}
              className="px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
