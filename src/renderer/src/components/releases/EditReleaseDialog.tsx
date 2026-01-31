import { useState, useEffect, useCallback, useMemo } from 'react'
import { Release, ReleaseIssue, useTikiStore } from '../../stores/tiki-store'
import { Trash2, Plus, X } from 'lucide-react'

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
  const [issueNumbers, setIssueNumbers] = useState<Set<number>>(
    new Set(release.issues.map((i) => i.number))
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'settings' | 'issues'>('settings')

  const updateRelease = useTikiStore((state) => state.updateRelease)
  const issues = useTikiStore((state) => state.issues)
  const activeProject = useTikiStore((state) => state.activeProject)

  // Version validation - must match semver-like pattern
  const isValidVersion = /^v?\d+\.\d+(\.\d+)?(-[a-zA-Z0-9.]+)?$/.test(version)

  // Calculate if issues have changed
  const originalIssueNumbers = useMemo(
    () => new Set(release.issues.map((i) => i.number)),
    [release.issues]
  )
  const issuesChanged = useMemo(() => {
    if (issueNumbers.size !== originalIssueNumbers.size) return true
    for (const num of issueNumbers) {
      if (!originalIssueNumbers.has(num)) return true
    }
    return false
  }, [issueNumbers, originalIssueNumbers])

  // Check if there are any changes
  const hasChanges =
    version !== release.version ||
    status !== release.status ||
    requirementsEnabled !== (release.requirementsEnabled ?? false) ||
    issuesChanged

  // Get issues not in release (available to add)
  const availableIssues = useMemo(() => {
    return issues.filter((i) => !issueNumbers.has(i.number))
  }, [issues, issueNumbers])

  // Get issues in release
  const releaseIssuesList = useMemo(() => {
    // Use original release issues for those that exist, fetch from issues list for newly added
    const result: Array<ReleaseIssue | { number: number; title: string }> = []
    for (const num of issueNumbers) {
      const existing = release.issues.find((i) => i.number === num)
      if (existing) {
        result.push(existing)
      } else {
        const fromList = issues.find((i) => i.number === num)
        if (fromList) {
          result.push({ number: fromList.number, title: fromList.title })
        }
      }
    }
    return result
  }, [issueNumbers, release.issues, issues])

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setVersion(release.version)
      setStatus(release.status)
      setRequirementsEnabled(release.requirementsEnabled ?? false)
      setIssueNumbers(new Set(release.issues.map((i) => i.number)))
      setError(null)
      setActiveTab('settings')
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

  // Handle adding an issue
  const handleAddIssue = (issueNumber: number) => {
    setIssueNumbers((prev) => new Set([...prev, issueNumber]))
  }

  // Handle removing an issue
  const handleRemoveIssue = (issueNumber: number) => {
    setIssueNumbers((prev) => {
      const next = new Set(prev)
      next.delete(issueNumber)
      return next
    })
  }

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
      // Build updated issues list
      const updatedIssues: ReleaseIssue[] = []
      for (const num of issueNumbers) {
        const existing = release.issues.find((i) => i.number === num)
        if (existing) {
          updatedIssues.push(existing)
        } else {
          // New issue - create entry
          const fromList = issues.find((i) => i.number === num)
          if (fromList) {
            updatedIssues.push({
              number: fromList.number,
              title: fromList.title,
              status: 'not_planned',
              requirements: [],
              currentPhase: null,
              totalPhases: null,
              completedAt: null
            })
          }
        }
      }

      // Update release with all changes including issues
      const result = await window.tikiDesktop.tiki.updateRelease({
        currentVersion: release.version,
        updates: {
          version,
          status: status as 'active' | 'shipped' | 'completed' | 'not_planned',
          requirementsEnabled,
          issues: updatedIssues
        }
      })

      if (!result.success) {
        setError(result.error || 'Failed to update release')
        return
      }

      // Update local store with new issues
      const updatedRelease: Release = {
        ...release,
        version,
        status,
        requirementsEnabled,
        issues: updatedIssues
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
        <div className="w-full max-w-lg bg-background-secondary border border-border rounded-lg shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <h2 className="text-base font-semibold text-slate-100">Edit Release {release.version}</h2>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-background-tertiary transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border flex-shrink-0">
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Settings
            </button>
            <button
              onClick={() => setActiveTab('issues')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'issues'
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Issues ({issueNumbers.size})
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === 'settings' ? (
              <>
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
              </>
            ) : (
              <>
                {/* Issues in release */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Issues in Release
                  </label>
                  {releaseIssuesList.length === 0 ? (
                    <div className="text-sm text-slate-500 text-center py-4 bg-background rounded border border-border">
                      No issues in this release
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-40 overflow-y-auto bg-background rounded border border-border p-2">
                      {releaseIssuesList.map((issue) => (
                        <div
                          key={issue.number}
                          className="flex items-center gap-2 p-2 hover:bg-background-tertiary rounded group"
                        >
                          <span className="text-xs text-slate-500">#{issue.number}</span>
                          <span className="text-sm text-slate-200 flex-1 truncate">{issue.title}</span>
                          <button
                            onClick={() => handleRemoveIssue(issue.number)}
                            className="p-1 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove from release"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Available issues to add */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Add Issues
                  </label>
                  {availableIssues.length === 0 ? (
                    <div className="text-sm text-slate-500 text-center py-4 bg-background rounded border border-border">
                      No more open issues to add
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-40 overflow-y-auto bg-background rounded border border-border p-2">
                      {availableIssues.map((issue) => (
                        <div
                          key={issue.number}
                          className="flex items-center gap-2 p-2 hover:bg-background-tertiary rounded group"
                        >
                          <span className="text-xs text-slate-500">#{issue.number}</span>
                          <span className="text-sm text-slate-200 flex-1 truncate">{issue.title}</span>
                          <button
                            onClick={() => handleAddIssue(issue.number)}
                            className="p-1 text-slate-400 hover:text-green-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Add to release"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
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
