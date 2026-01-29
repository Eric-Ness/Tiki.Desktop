/**
 * PatternDetail Component
 *
 * Displays detailed information about a failure pattern including
 * error signatures, file patterns, preventive measures, and successful fixes.
 */
import type {
  FailurePatternPreload,
  PatternCategory,
  FixRecordPreload,
  PreventiveMeasurePreload
} from '../../../../preload/index'

interface PatternDetailProps {
  pattern: FailurePatternPreload
  onResolve?: () => void
  onDelete?: () => void
}

// Category-specific colors for badges
const categoryColors: Record<PatternCategory, string> = {
  code: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  project: 'bg-green-500/20 text-green-400 border-green-500/30',
  workflow: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
}

// Format date
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Format effectiveness percentage
function formatEffectiveness(value: number): string {
  return `${Math.round(value * 100)}%`
}

// Measure type colors
const measureTypeColors: Record<PreventiveMeasurePreload['type'], string> = {
  context: 'bg-cyan-500/20 text-cyan-400',
  verification: 'bg-amber-500/20 text-amber-400',
  phase_structure: 'bg-purple-500/20 text-purple-400',
  manual: 'bg-slate-500/20 text-slate-400'
}

// Check icon for successful items
function CheckIcon({ className }: { className?: string }) {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// Trash icon for delete
function TrashIcon({ className }: { className?: string }) {
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
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

// Error signature component
function ErrorSignatureList({ signatures }: { signatures: string[] }) {
  if (signatures.length === 0) return null

  return (
    <div className="space-y-1" data-testid="error-signatures">
      <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
        Error Signatures
      </h4>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {signatures.map((sig, index) => (
          <code
            key={index}
            className="block text-xs text-red-300 bg-slate-900/50 px-2 py-1 rounded font-mono break-all"
          >
            {sig}
          </code>
        ))}
      </div>
    </div>
  )
}

// File patterns component
function FilePatternList({ patterns }: { patterns: string[] }) {
  if (patterns.length === 0) return null

  return (
    <div className="space-y-1" data-testid="file-patterns">
      <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
        File Patterns
      </h4>
      <ul className="space-y-0.5">
        {patterns.map((pattern, index) => (
          <li
            key={index}
            className="text-xs text-slate-300 font-mono pl-2 border-l-2 border-slate-600"
          >
            {pattern}
          </li>
        ))}
      </ul>
    </div>
  )
}

// Preventive measures component
function PreventiveMeasuresList({ measures }: { measures: PreventiveMeasurePreload[] }) {
  if (measures.length === 0) return null

  return (
    <div className="space-y-2" data-testid="preventive-measures">
      <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
        Preventive Measures
      </h4>
      <div className="space-y-2">
        {measures.map((measure) => (
          <div
            key={measure.id}
            className="bg-slate-800/50 rounded-lg p-2 border border-slate-700"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-1.5 py-0.5 text-xs rounded ${measureTypeColors[measure.type]}`}
                  >
                    {measure.type.replace('_', ' ')}
                  </span>
                  {measure.automatic && (
                    <span className="px-1.5 py-0.5 text-xs rounded bg-green-500/20 text-green-400">
                      Auto
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300">{measure.description}</p>
                {measure.application && (
                  <p className="text-xs text-slate-500 mt-1">{measure.application}</p>
                )}
              </div>
              <div className="flex-shrink-0 text-right">
                <span className="text-xs text-amber-400 font-medium" data-testid="measure-effectiveness">
                  {formatEffectiveness(measure.effectiveness)}
                </span>
                <span className="block text-xs text-slate-500">effective</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Successful fixes component
function SuccessfulFixesList({ fixes }: { fixes: FixRecordPreload[] }) {
  // Only show successful fixes
  const successfulFixes = fixes.filter((f) => f.success)

  if (successfulFixes.length === 0) return null

  return (
    <div className="space-y-2" data-testid="successful-fixes">
      <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
        Successful Fixes ({successfulFixes.length})
      </h4>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {successfulFixes.map((fix, index) => (
          <div
            key={`${fix.failureId}-${index}`}
            className="flex items-start gap-2 bg-slate-800/50 rounded-lg p-2 border border-slate-700"
          >
            <CheckIcon className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-300">{fix.description}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                <span>
                  Effectiveness: <span className="text-amber-400">{formatEffectiveness(fix.effectiveness)}</span>
                </span>
                <span>{formatDate(fix.appliedAt)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Affected issues component
function AffectedIssuesList({ issues }: { issues: number[] }) {
  if (issues.length === 0) return null

  return (
    <div className="space-y-1" data-testid="affected-issues">
      <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
        Affected Issues
      </h4>
      <div className="flex flex-wrap gap-1">
        {issues.map((issueNum) => (
          <span
            key={issueNum}
            className="px-1.5 py-0.5 text-xs rounded bg-slate-700 text-slate-300"
          >
            #{issueNum}
          </span>
        ))}
      </div>
    </div>
  )
}

export function PatternDetail({ pattern, onResolve, onDelete }: PatternDetailProps) {
  const isResolved = pattern.resolvedAt !== null

  return (
    <div
      className="bg-slate-800/30 rounded-lg border border-slate-700 overflow-hidden"
      data-testid="pattern-detail"
    >
      {/* Header */}
      <div className="p-3 border-b border-slate-700">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-slate-200">{pattern.name}</h3>
          <span
            className={`px-1.5 py-0.5 text-xs rounded border flex-shrink-0 ${categoryColors[pattern.category]}`}
          >
            {pattern.category}
          </span>
        </div>
        <p className="text-xs text-slate-400">{pattern.description}</p>
      </div>

      {/* Stats */}
      <div className="px-3 py-2 bg-slate-800/50 border-b border-slate-700">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-sm font-semibold text-amber-400" data-testid="occurrence-count">
              {pattern.occurrenceCount}
            </div>
            <div className="text-xs text-slate-500">Occurrences</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-200">
              {pattern.affectedIssues.length}
            </div>
            <div className="text-xs text-slate-500">Issues</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-green-400">
              {pattern.successfulFixes.filter((f) => f.success).length}
            </div>
            <div className="text-xs text-slate-500">Fixes</div>
          </div>
        </div>
      </div>

      {/* Last Occurrence */}
      <div className="px-3 py-2 border-b border-slate-700 text-xs text-slate-400">
        <span className="text-slate-500">Last occurrence:</span>{' '}
        {formatDate(pattern.lastOccurrence)}
      </div>

      {/* Content */}
      <div className="p-3 space-y-4 max-h-[300px] overflow-y-auto">
        <ErrorSignatureList signatures={pattern.errorSignatures} />
        <FilePatternList patterns={pattern.filePatterns} />
        <PreventiveMeasuresList measures={pattern.preventiveMeasures} />
        <SuccessfulFixesList fixes={pattern.successfulFixes} />
        <AffectedIssuesList issues={pattern.affectedIssues} />
      </div>

      {/* Actions */}
      <div className="px-3 py-2 border-t border-slate-700 flex items-center justify-end gap-2">
        {onDelete && (
          <button
            onClick={onDelete}
            className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
            data-testid="delete-button"
          >
            <TrashIcon className="w-3.5 h-3.5" />
            Delete
          </button>
        )}
        {onResolve && !isResolved && (
          <button
            onClick={onResolve}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded transition-colors"
            data-testid="resolve-button"
          >
            <CheckIcon className="w-3.5 h-3.5" />
            Mark Resolved
          </button>
        )}
        {isResolved && (
          <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded" data-testid="resolved-badge">
            Resolved on {formatDate(pattern.resolvedAt!)}
          </span>
        )}
      </div>
    </div>
  )
}
