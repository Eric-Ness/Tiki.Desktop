interface ChangeSummaryProps {
  additions: number
  deletions: number
  filesChanged: number
  className?: string
}

export function ChangeSummary({ additions, deletions, filesChanged, className = '' }: ChangeSummaryProps) {
  const fileText = filesChanged === 1 ? 'file changed' : 'files changed'

  return (
    <div
      data-testid="change-summary"
      className={`flex items-center gap-3 text-sm ${className}`}
    >
      <span className="text-slate-400">
        {filesChanged} {fileText}
      </span>
      <span className="text-green-500 font-mono">+{additions}</span>
      <span className="text-red-500 font-mono">-{deletions}</span>
    </div>
  )
}
