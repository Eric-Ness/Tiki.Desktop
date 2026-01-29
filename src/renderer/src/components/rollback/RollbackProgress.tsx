import type { RollbackProgress as RollbackProgressType, CommitInfo } from '../../../../preload'

interface RollbackProgressProps {
  progress: RollbackProgressType
  commits: CommitInfo[]
  onCancel?: () => void
  error?: string
}

type CommitStatus = 'done' | 'in_progress' | 'pending'

function getCommitStatus(
  index: number,
  processedCount: number,
  stage: RollbackProgressType['stage']
): CommitStatus {
  if (stage === 'completing') {
    return 'done'
  }
  if (index < processedCount) {
    return 'done'
  }
  if (index === processedCount && (stage === 'reverting' || stage === 'resetting')) {
    return 'in_progress'
  }
  return 'pending'
}

function Spinner() {
  return (
    <svg
      className="w-4 h-4 animate-spin text-blue-400"
      viewBox="0 0 24 24"
      fill="none"
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
  )
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function CircleIcon() {
  return (
    <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="8" />
    </svg>
  )
}

function ProgressBar({ percentage }: { percentage: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">Progress</span>
        <span className="text-slate-300 font-mono">{percentage}%</span>
      </div>
      <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function StageIndicator({ stage }: { stage: RollbackProgressType['stage'] }) {
  const stageLabels: Record<RollbackProgressType['stage'], string> = {
    preparing: 'Preparing rollback...',
    reverting: 'Reverting commits...',
    resetting: 'Resetting branch...',
    completing: 'Completing rollback...'
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border">
      <Spinner />
      <span className="text-sm text-slate-300">{stageLabels[stage]}</span>
    </div>
  )
}

function CommitStatusList({
  commits,
  processedCount,
  stage
}: {
  commits: CommitInfo[]
  processedCount: number
  stage: RollbackProgressType['stage']
}) {
  if (commits.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-slate-200">Commits</h4>
      <div className="bg-background rounded-lg border border-border overflow-hidden max-h-48 overflow-y-auto">
        {commits.map((commit, index) => {
          const status = getCommitStatus(index, processedCount, stage)
          return (
            <div
              key={commit.hash}
              className={`flex items-center gap-3 px-3 py-2 ${
                index !== commits.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              {/* Status icon */}
              <div className="flex-shrink-0">
                {status === 'done' && <CheckIcon />}
                {status === 'in_progress' && <Spinner />}
                {status === 'pending' && <CircleIcon />}
              </div>

              {/* Commit info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className={`text-xs font-mono ${
                    status === 'done' ? 'text-green-400' :
                    status === 'in_progress' ? 'text-blue-400' :
                    'text-slate-500'
                  }`}>
                    {commit.hash.slice(0, 7)}
                  </code>
                </div>
                <p className={`text-sm truncate ${
                  status === 'done' ? 'text-slate-300' :
                  status === 'in_progress' ? 'text-slate-200' :
                  'text-slate-500'
                }`}>
                  {commit.message}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function RollbackProgress({
  progress,
  commits,
  onCancel,
  error
}: RollbackProgressProps) {
  const percentage = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0

  return (
    <div className="space-y-4">
      {/* Stage indicator */}
      <StageIndicator stage={progress.stage} />

      {/* Progress message */}
      {progress.message && (
        <p className="text-sm text-slate-400">{progress.message}</p>
      )}

      {/* Progress bar */}
      <ProgressBar percentage={percentage} />

      {/* Commit status list */}
      <CommitStatusList
        commits={commits}
        processedCount={progress.current}
        stage={progress.stage}
      />

      {/* Error display */}
      {error && (
        <div className="p-3 bg-red-400/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Cancel button */}
      {onCancel && progress.stage !== 'completing' && (
        <div className="flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-300 hover:text-slate-100 hover:bg-background-tertiary rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
