import type {
  RollbackPreview as RollbackPreviewType,
  CommitInfo,
  FileChange,
  RollbackWarning
} from '../../../../preload'

interface RollbackPreviewProps {
  preview: RollbackPreviewType
}

// Severity colors for warnings
const severityColors: Record<RollbackWarning['severity'], { bg: string; border: string; text: string; icon: string }> = {
  high: {
    bg: 'bg-red-400/10',
    border: 'border-red-500/20',
    text: 'text-red-400',
    icon: 'text-red-400'
  },
  medium: {
    bg: 'bg-amber-400/10',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    icon: 'text-amber-400'
  },
  low: {
    bg: 'bg-blue-400/10',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
    icon: 'text-blue-400'
  }
}

// File action labels and colors
const fileActionConfig: Record<FileChange['willBe'], { label: string; color: string }> = {
  deleted: { label: 'DELETE', color: 'text-red-400 bg-red-400/10' },
  restored: { label: 'RESTORE', color: 'text-green-400 bg-green-400/10' },
  modified: { label: 'MODIFY', color: 'text-amber-400 bg-amber-400/10' }
}

function CommitIcon() {
  return (
    <svg
      className="w-4 h-4 text-slate-400 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="3" strokeWidth="2" />
      <path strokeWidth="2" d="M12 3v6m0 6v6" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg
      className="w-4 h-4 text-slate-400 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
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

function WarningIcon({ severity }: { severity: RollbackWarning['severity'] }) {
  const colors = severityColors[severity]

  if (severity === 'high') {
    return (
      <svg className={`w-5 h-5 ${colors.icon} flex-shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4m0 4h.01" />
      </svg>
    )
  }

  return (
    <svg className={`w-5 h-5 ${colors.icon} flex-shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
}

function BlockIcon() {
  return (
    <svg className="w-5 h-5 text-red-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M4.93 4.93l14.14 14.14" />
    </svg>
  )
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function CommitList({ commits }: { commits: CommitInfo[] }) {
  if (commits.length === 0) {
    return (
      <div className="p-4 text-center text-slate-500 text-sm">
        No commits to revert
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-slate-200">
        Commits to Revert ({commits.length})
      </h4>
      <div className="bg-background rounded-lg border border-border overflow-hidden">
        {commits.map((commit, index) => (
          <div
            key={commit.hash}
            className={`flex items-start gap-3 p-3 ${
              index !== commits.length - 1 ? 'border-b border-border' : ''
            }`}
          >
            <CommitIcon />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <code className="text-xs text-blue-400 font-mono">
                  {commit.hash.slice(0, 7)}
                </code>
                <span className="text-xs text-slate-500">
                  {formatTimestamp(commit.timestamp)}
                </span>
              </div>
              <p className="text-sm text-slate-300 truncate mt-0.5">
                {commit.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FilesAffectedTable({ files }: { files: FileChange[] }) {
  if (files.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-slate-200">
        Files Affected ({files.length})
      </h4>
      <div className="bg-background rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-background-tertiary">
              <th className="text-left text-slate-400 font-medium px-3 py-2">File</th>
              <th className="text-right text-slate-400 font-medium px-3 py-2 w-24">Action</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file, index) => {
              const action = fileActionConfig[file.willBe]
              return (
                <tr
                  key={file.path}
                  className={index !== files.length - 1 ? 'border-b border-border' : ''}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <FileIcon />
                      <span className="text-slate-300 font-mono truncate">
                        {file.path}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${action.color}`}>
                      {action.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LinesChangedSummary({ linesChanged }: { linesChanged: { added: number; removed: number } }) {
  return (
    <div className="flex items-center gap-4 p-3 bg-background rounded-lg border border-border">
      <span className="text-sm text-slate-400">Lines changed:</span>
      <div className="flex items-center gap-3 font-mono text-sm">
        <span className="text-green-400">+{linesChanged.added}</span>
        <span className="text-red-400">-{linesChanged.removed}</span>
      </div>
    </div>
  )
}

function WarningsList({ warnings }: { warnings: RollbackWarning[] }) {
  if (warnings.length === 0) {
    return null
  }

  // Sort by severity (high first)
  const sortedWarnings = [...warnings].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.severity] - order[b.severity]
  })

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-slate-200">Warnings</h4>
      <div className="space-y-2">
        {sortedWarnings.map((warning, index) => {
          const colors = severityColors[warning.severity]
          return (
            <div
              key={`${warning.type}-${index}`}
              className={`flex items-start gap-3 p-3 rounded-lg border ${colors.bg} ${colors.border}`}
            >
              <WarningIcon severity={warning.severity} />
              <p className={`text-sm ${colors.text}`}>{warning.message}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BlockingReasons({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-red-400">Cannot Rollback</h4>
      <div className="p-3 bg-red-400/10 border border-red-500/20 rounded-lg">
        <ul className="space-y-2">
          {reasons.map((reason, index) => (
            <li key={index} className="flex items-start gap-2">
              <BlockIcon />
              <span className="text-sm text-red-300">{reason}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function RollbackPreview({ preview }: RollbackPreviewProps) {
  return (
    <div className="space-y-4">
      {/* Blocking reasons - shown first if rollback is not possible */}
      {!preview.canRollback && (
        <BlockingReasons reasons={preview.blockingReasons} />
      )}

      {/* Warnings */}
      <WarningsList warnings={preview.warnings} />

      {/* Commits to revert */}
      <CommitList commits={preview.commits} />

      {/* Files affected table */}
      <FilesAffectedTable files={preview.filesAffected} />

      {/* Lines changed summary */}
      {(preview.linesChanged.added > 0 || preview.linesChanged.removed > 0) && (
        <LinesChangedSummary linesChanged={preview.linesChanged} />
      )}
    </div>
  )
}
