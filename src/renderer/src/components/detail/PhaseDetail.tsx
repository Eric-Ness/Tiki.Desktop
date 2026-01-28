export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'

export interface PhaseData {
  number: number
  title: string
  status: PhaseStatus
  files: string[]
  verification: string[]
  summary?: string
  error?: string
}

interface PhaseDetailProps {
  phase: PhaseData
}

// Status-specific styling for the number circle (matches PhaseNode colors)
const numberCircleStyles: Record<PhaseStatus, string> = {
  pending: 'bg-slate-500',
  in_progress: 'bg-amber-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  skipped: 'bg-slate-400'
}

// Status-specific styling for the badge
const badgeStyles: Record<PhaseStatus, string> = {
  pending: 'bg-slate-600 text-slate-200',
  in_progress: 'bg-amber-600 text-amber-100',
  completed: 'bg-green-600 text-green-100',
  failed: 'bg-red-600 text-red-100',
  skipped: 'bg-slate-500 text-slate-200'
}

// Simple file icon SVG component
function FileIcon() {
  return (
    <svg
      className="w-4 h-4 text-slate-400 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  )
}

export function PhaseDetail({ phase }: PhaseDetailProps) {
  const { number, title, status, files, verification, summary, error } = phase
  const isCompleted = status === 'completed'
  const isFailed = status === 'failed'
  const showSummary = isCompleted && summary && summary.trim() !== ''
  const showError = isFailed && error && error.trim() !== ''

  return (
    <div className="p-4 space-y-6">
      {/* Header section */}
      <div className="flex items-center gap-3">
        {/* Phase number circle */}
        <div
          data-testid="phase-detail-number"
          className={`
            flex-shrink-0
            w-10 h-10 rounded-full
            flex items-center justify-center
            text-white font-semibold text-lg
            ${numberCircleStyles[status]}
          `}
        >
          {number}
        </div>

        {/* Title and status */}
        <div className="flex-1 min-w-0">
          <h2 data-testid="phase-detail-title" className="text-lg font-semibold text-white">
            {title}
          </h2>
          <span
            data-testid="status-badge"
            className={`
              inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium
              ${badgeStyles[status]}
            `}
          >
            {status}
          </span>
        </div>
      </div>

      {/* Files section */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Files</h3>
        {files.length > 0 ? (
          <ul className="space-y-1">
            {files.map((file, index) => (
              <li key={index} className="flex items-center gap-2">
                <FileIcon />
                <span className="text-sm text-slate-400 font-mono">{file}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No files</p>
        )}
      </div>

      {/* Verification section */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Verification</h3>
        {verification.length > 0 ? (
          <ul className="space-y-2">
            {verification.map((item, index) => (
              <li key={index} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isCompleted}
                  disabled
                  className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-green-500 focus:ring-0 cursor-not-allowed"
                />
                <span className="text-sm text-slate-300">{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No verification items</p>
        )}
      </div>

      {/* Summary section (only shown when completed and summary exists) */}
      {showSummary && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Summary</h3>
          <div className="bg-slate-700/50 rounded-lg p-3">
            <p className="text-sm text-slate-300">{summary}</p>
          </div>
        </div>
      )}

      {/* Error section (only shown when failed and error exists) */}
      {showError && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Error</h3>
          <div
            data-testid="error-section"
            className="bg-red-900/30 border border-red-700 rounded-lg p-3"
          >
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}
