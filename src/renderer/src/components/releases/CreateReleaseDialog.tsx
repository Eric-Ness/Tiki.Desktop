import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTikiStore } from '../../stores/tiki-store'

interface IssueRecommendation {
  number: number
  title: string
  reasoning: string
  includeInRelease: boolean
}

interface CreateReleaseDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreated?: () => void
}

/**
 * Parse semver version string into components
 */
function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.replace(/^v/, '').match(/^(\d+)\.(\d+)(?:\.(\d+))?/)
  if (!match) return null
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: match[3] !== undefined ? parseInt(match[3], 10) : 0
  }
}

/**
 * Increment version by bumping the patch number
 */
function incrementVersion(version: string): string {
  const parsed = parseVersion(version)
  if (!parsed) return 'v1.0.0'

  // Check if original had 'v' prefix
  const hasV = version.startsWith('v')
  // Check if original had patch version
  const hasPatch = /^v?\d+\.\d+\.\d+/.test(version)

  const newPatch = parsed.patch + 1
  const base = `${parsed.major}.${parsed.minor}${hasPatch || newPatch > 0 ? `.${newPatch}` : ''}`
  return hasV ? `v${base}` : base
}

export function CreateReleaseDialog({ isOpen, onClose, onCreated }: CreateReleaseDialogProps) {
  const releases = useTikiStore((state) => state.releases)

  // Calculate the next version based on existing releases
  const suggestedVersion = useMemo(() => {
    if (!releases || releases.length === 0) return 'v1.0.0'

    // Sort releases by version (descending) to find the latest
    const sorted = [...releases].sort((a, b) => {
      const aVer = parseVersion(a.version)
      const bVer = parseVersion(b.version)
      if (!aVer || !bVer) return 0

      if (aVer.major !== bVer.major) return bVer.major - aVer.major
      if (aVer.minor !== bVer.minor) return bVer.minor - aVer.minor
      return bVer.patch - aVer.patch
    })

    const latestVersion = sorted[0]?.version || 'v0.0.0'
    return incrementVersion(latestVersion)
  }, [releases])

  const [version, setVersion] = useState('')
  const [selectedIssues, setSelectedIssues] = useState<Set<number>>(new Set())
  const [selectionMode, setSelectionMode] = useState<'manual' | 'llm'>('manual')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // LLM recommendation state
  const [llmLoading, setLlmLoading] = useState(false)
  const [llmRecommendations, setLlmRecommendations] = useState<IssueRecommendation[] | null>(null)
  const [llmSummary, setLlmSummary] = useState<string | null>(null)

  const allIssues = useTikiStore((state) => state.issues)

  // Filter to only show open issues - closed issues should not be added to new releases
  const issues = useMemo(() => {
    return allIssues.filter((i) => i.state === 'OPEN')
  }, [allIssues])

  // Version validation - must match semver-like pattern
  const isValidVersion = /^v?\d+\.\d+(\.\d+)?(-[a-zA-Z0-9.]+)?$/.test(version)

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      // Pre-fill with suggested version when dialog opens
      setVersion(suggestedVersion)
    } else {
      // Reset state when dialog closes
      setVersion('')
      setSelectedIssues(new Set())
      setSelectionMode('manual')
      setLoading(false)
      setError(null)
      setLlmLoading(false)
      setLlmRecommendations(null)
      setLlmSummary(null)
    }
  }, [isOpen, suggestedVersion])

  // Handle LLM recommendation request
  const handleLlmRecommend = useCallback(async () => {
    if (!version || !isValidVersion) {
      setError('Please enter a valid version first')
      return
    }
    if (issues.length === 0) {
      setError('No open issues to analyze')
      return
    }

    setLlmLoading(true)
    setError(null)

    try {
      const result = await window.tikiDesktop.tiki.recommendReleaseIssues({
        issues: issues.map((i) => ({
          number: i.number,
          title: i.title,
          body: i.body,
          labels: i.labels?.map((l: { name: string }) => l.name) || []
        })),
        version
      })

      if ('error' in result) {
        setError(result.error)
        return
      }

      setLlmSummary(result.summary)
      setLlmRecommendations(result.recommendations)

      // Pre-select recommended issues
      const recommended = new Set(
        result.recommendations.filter((r) => r.includeInRelease).map((r) => r.number)
      )
      setSelectedIssues(recommended)
    } catch (err) {
      console.error('LLM recommendation error:', err)
      setError('Failed to get LLM recommendations')
    } finally {
      setLlmLoading(false)
    }
  }, [version, isValidVersion, issues])

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

  // Handle issue selection toggle
  const handleIssueToggle = (issueNumber: number, checked: boolean) => {
    const newSet = new Set(selectedIssues)
    if (checked) {
      newSet.add(issueNumber)
    } else {
      newSet.delete(issueNumber)
    }
    setSelectedIssues(newSet)
  }

  // Handle create release
  const handleCreate = async () => {
    if (!isValidVersion || selectedIssues.size === 0) {
      if (!isValidVersion) {
        setError('Please enter a valid version number')
      } else {
        setError('Please select at least one issue')
      }
      return
    }

    setLoading(true)
    setError(null)

    try {
      const selectedIssuesList = issues
        .filter((i) => selectedIssues.has(i.number))
        .map((i) => ({ number: i.number, title: i.title }))

      const result = await window.tikiDesktop.tiki.createRelease({
        version,
        issues: selectedIssuesList
      })

      if (!result.success) {
        setError(result.error || 'Failed to create release')
        return
      }

      onCreated?.()
      onClose()
    } catch (err) {
      console.error('Failed to create release:', err)
      setError(err instanceof Error ? err.message : 'Failed to create release')
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
        <div className="w-full max-w-lg bg-background-secondary border border-border rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <h2 className="text-base font-semibold text-slate-100">Create Release</h2>
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
            {/* Version Input */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1.5">
                Version <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v1.0.0"
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

            {/* Selection Mode Toggle */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1.5">
                Issue Selection
              </label>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setSelectionMode('manual')}
                  className={`flex-1 px-3 py-2 text-sm transition-colors ${
                    selectionMode === 'manual'
                      ? 'bg-amber-600 text-white'
                      : 'bg-background text-slate-300 hover:bg-background-tertiary'
                  }`}
                >
                  Select Manually
                </button>
                <button
                  onClick={() => setSelectionMode('llm')}
                  className={`flex-1 px-3 py-2 text-sm transition-colors ${
                    selectionMode === 'llm'
                      ? 'bg-amber-600 text-white'
                      : 'bg-background text-slate-300 hover:bg-background-tertiary'
                  }`}
                >
                  LLM Recommend
                </button>
              </div>
            </div>

            {/* Issue List / LLM Mode */}
            {selectionMode === 'manual' ? (
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1.5">
                  Select Issues ({selectedIssues.size} selected)
                </label>
                <div className="max-h-60 overflow-y-auto space-y-1 border border-border rounded p-2 bg-background">
                  {issues.length === 0 ? (
                    <div className="text-sm text-slate-500 text-center py-4">
                      No open issues found
                    </div>
                  ) : (
                    issues.map((issue) => (
                      <label
                        key={issue.number}
                        className="flex items-center gap-2 p-2 hover:bg-background-tertiary rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIssues.has(issue.number)}
                          onChange={(e) => handleIssueToggle(issue.number, e.target.checked)}
                          className="rounded border-border"
                        />
                        <span className="text-xs text-slate-500">#{issue.number}</span>
                        <span className="text-sm text-slate-200 truncate">{issue.title}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Get Recommendations Button */}
                {!llmRecommendations && !llmLoading && (
                  <div className="border border-border rounded p-4 bg-background">
                    <p className="text-sm text-slate-400 mb-3 text-center">
                      {version && isValidVersion
                        ? 'Let Claude analyze your issues and suggest which ones to include'
                        : 'Enter a valid version number first'}
                    </p>
                    <button
                      onClick={handleLlmRecommend}
                      disabled={!version || !isValidVersion || issues.length === 0}
                      className="w-full px-3 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Get AI Recommendations
                    </button>
                  </div>
                )}

                {/* Loading State */}
                {llmLoading && (
                  <div className="border border-border rounded p-4 bg-background">
                    <div className="flex items-center justify-center text-slate-400">
                      <svg className="w-5 h-5 animate-spin mr-2" viewBox="0 0 24 24" fill="none">
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
                      <span className="text-sm">Analyzing issues...</span>
                    </div>
                  </div>
                )}

                {/* Recommendations Display */}
                {llmRecommendations && !llmLoading && (
                  <>
                    {/* Summary */}
                    {llmSummary && (
                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded">
                        <div className="flex items-start gap-2">
                          <svg
                            className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                          </svg>
                          <p className="text-sm text-blue-300">{llmSummary}</p>
                        </div>
                      </div>
                    )}

                    {/* Refresh Button */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">
                        {selectedIssues.size} issue{selectedIssues.size !== 1 ? 's' : ''} selected
                      </span>
                      <button
                        onClick={handleLlmRecommend}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Refresh recommendations
                      </button>
                    </div>

                    {/* Issue List with Reasoning */}
                    <div className="max-h-60 overflow-y-auto space-y-2 border border-border rounded p-2 bg-background">
                      {llmRecommendations.map((rec) => (
                        <div
                          key={rec.number}
                          className={`p-2 rounded border transition-colors ${
                            selectedIssues.has(rec.number)
                              ? 'bg-amber-500/10 border-amber-500/30'
                              : 'bg-background-tertiary border-transparent'
                          }`}
                        >
                          <label className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedIssues.has(rec.number)}
                              onChange={(e) => handleIssueToggle(rec.number, e.target.checked)}
                              className="mt-1 rounded border-border"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-slate-500">#{rec.number}</span>
                                <span className="text-sm text-slate-200 truncate">{rec.title}</span>
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">{rec.reasoning}</p>
                            </div>
                            {rec.includeInRelease && (
                              <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded flex-shrink-0">
                                Recommended
                              </span>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  </>
                )}
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
              onClick={handleCreate}
              disabled={loading || !isValidVersion || selectedIssues.size === 0}
              className="px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
