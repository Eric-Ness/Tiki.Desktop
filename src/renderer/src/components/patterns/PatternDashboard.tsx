/**
 * PatternDashboard Component
 *
 * Main overview of detected failure patterns showing summary stats,
 * top patterns by occurrence, and the ability to analyze patterns.
 */
import { useState, useEffect, useCallback } from 'react'
import { PatternDetail } from './PatternDetail'
import type {
  FailurePatternPreload,
  PatternCategory
} from '../../../../preload/index'

interface PatternDashboardProps {
  cwd: string
}

// Category-specific colors for badges
const categoryColors: Record<PatternCategory, string> = {
  code: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  project: 'bg-green-500/20 text-green-400 border-green-500/30',
  workflow: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8" data-testid="loading-spinner">
      <div className="flex items-center gap-2 text-slate-400">
        <svg
          className="animate-spin h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
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
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-sm">Loading patterns...</span>
      </div>
    </div>
  )
}

// Refresh icon
function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  )
}

// Analyze icon
function AnalyzeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  )
}

// Pattern card component
function PatternCard({
  pattern,
  isSelected,
  onClick
}: {
  pattern: FailurePatternPreload
  isSelected: boolean
  onClick: () => void
}) {
  const isResolved = pattern.resolvedAt !== null

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        isSelected
          ? 'bg-slate-700/50 border-amber-500/50'
          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-700/30'
      }`}
      data-testid="pattern-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-slate-200 truncate">
              {pattern.name}
            </span>
            {isResolved && (
              <span className="px-1.5 py-0.5 text-xs rounded bg-green-500/20 text-green-400 border border-green-500/30">
                Resolved
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 line-clamp-2">
            {pattern.description}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span
            className={`px-1.5 py-0.5 text-xs rounded border ${categoryColors[pattern.category]}`}
            data-testid="category-badge"
          >
            {pattern.category}
          </span>
          <span className="px-1.5 py-0.5 text-xs rounded bg-amber-500/20 text-amber-400" data-testid="occurrence-count">
            {pattern.occurrenceCount}x
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
        <span>
          {pattern.affectedIssues.length} issue{pattern.affectedIssues.length !== 1 ? 's' : ''} affected
        </span>
        <span>Last: {formatRelativeTime(pattern.lastOccurrence)}</span>
      </div>
    </button>
  )
}

// Stats card component
function StatsCard({ label, value, sublabel }: { label: string; value: string | number; sublabel?: string }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700" data-testid="stats-card">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-slate-200">{value}</div>
      {sublabel && <div className="text-xs text-slate-500">{sublabel}</div>}
    </div>
  )
}

export function PatternDashboard({ cwd }: PatternDashboardProps) {
  const [patterns, setPatterns] = useState<FailurePatternPreload[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPattern, setSelectedPattern] = useState<FailurePatternPreload | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  const loadPatterns = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.tikiDesktop.patterns.list(cwd)
      setPatterns(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load patterns')
    } finally {
      setLoading(false)
    }
  }, [cwd])

  useEffect(() => {
    loadPatterns()
  }, [loadPatterns])

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      const newPatterns = await window.tikiDesktop.patterns.analyze(cwd)
      // Merge new patterns with existing ones
      setPatterns((prev) => {
        const existingIds = new Set(prev.map((p) => p.id))
        const newOnes = newPatterns.filter((p) => !existingIds.has(p.id))
        return [...prev, ...newOnes]
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze patterns')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleResolve = async () => {
    if (!selectedPattern) return
    try {
      await window.tikiDesktop.patterns.resolve(cwd, selectedPattern.id)
      // Update local state
      setPatterns((prev) =>
        prev.map((p) =>
          p.id === selectedPattern.id
            ? { ...p, resolvedAt: new Date().toISOString() }
            : p
        )
      )
      setSelectedPattern((prev) =>
        prev ? { ...prev, resolvedAt: new Date().toISOString() } : null
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve pattern')
    }
  }

  const handleDelete = async () => {
    if (!selectedPattern) return
    try {
      await window.tikiDesktop.patterns.delete(cwd, selectedPattern.id)
      setPatterns((prev) => prev.filter((p) => p.id !== selectedPattern.id))
      setSelectedPattern(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete pattern')
    }
  }

  // Calculate summary stats
  const activePatterns = patterns.filter((p) => p.resolvedAt === null)
  const resolvedPatterns = patterns.filter((p) => p.resolvedAt !== null)
  const totalIssuesAffected = new Set(patterns.flatMap((p) => p.affectedIssues)).size

  if (loading) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">Failure Patterns</h2>
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4" data-testid="error-state">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">Failure Patterns</h2>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="text-red-400 mb-2">
            <svg className="w-8 h-8 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <p className="text-sm">Failed to load patterns</p>
          </div>
          <p className="text-xs text-slate-500 mb-3">{error}</p>
          <button
            onClick={loadPatterns}
            className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-200">Failure Patterns</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={loadPatterns}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
            title="Refresh patterns"
            data-testid="refresh-button"
          >
            <RefreshIcon className="w-4 h-4" />
          </button>
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded transition-colors disabled:opacity-50"
            data-testid="analyze-button"
          >
            <AnalyzeIcon className={`w-4 h-4 ${analyzing ? 'animate-pulse' : ''}`} />
            {analyzing ? 'Analyzing...' : 'Analyze Now'}
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatsCard label="Active Patterns" value={activePatterns.length} />
        <StatsCard label="Resolved" value={resolvedPatterns.length} />
        <StatsCard label="Issues Affected" value={totalIssuesAffected} />
      </div>

      {/* Empty State */}
      {patterns.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="empty-state">
          <svg
            className="w-12 h-12 text-slate-600 mb-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-slate-400">No patterns detected yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Click &quot;Analyze Now&quot; to scan for failure patterns
          </p>
        </div>
      )}

      {/* Pattern List and Detail */}
      {patterns.length > 0 && (
        <div className="flex gap-4">
          {/* Pattern List */}
          <div className="flex-1 space-y-2 min-w-0">
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              All Patterns ({patterns.length})
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {patterns
                .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
                .map((pattern) => (
                  <PatternCard
                    key={pattern.id}
                    pattern={pattern}
                    isSelected={selectedPattern?.id === pattern.id}
                    onClick={() => setSelectedPattern(pattern)}
                  />
                ))}
            </div>
          </div>

          {/* Pattern Detail */}
          {selectedPattern && (
            <div className="w-80 flex-shrink-0">
              <PatternDetail
                pattern={selectedPattern}
                onResolve={handleResolve}
                onDelete={handleDelete}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
