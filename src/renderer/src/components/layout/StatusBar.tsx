import { useTikiStore } from '../../stores/tiki-store'

interface StatusBarProps {
  version: string
  cwd: string
}

export function StatusBar({ version, cwd }: StatusBarProps) {
  const tikiState = useTikiStore((state) => state.tikiState)
  const currentPlan = useTikiStore((state) => state.currentPlan)

  // Extract project name from cwd
  const projectName = cwd ? cwd.split(/[/\\]/).pop() || '' : ''

  const getStatusColor = (status: string | undefined | null) => {
    switch (status) {
      case 'executing':
        return 'bg-status-running'
      case 'paused':
        return 'bg-amber-400'
      case 'failed':
        return 'bg-status-failed'
      default:
        return 'bg-slate-500'
    }
  }

  const getStatusText = () => {
    if (!tikiState?.status || tikiState.status === 'idle') {
      return 'Idle'
    }

    const statusLabel = tikiState.status.charAt(0).toUpperCase() + tikiState.status.slice(1)

    if (tikiState.activeIssue && tikiState.currentPhase) {
      const totalPhases = currentPlan?.phases?.length || '?'
      return `${statusLabel}: Phase ${tikiState.currentPhase}/${totalPhases} for issue #${tikiState.activeIssue}`
    }

    if (tikiState.activeIssue) {
      return `${statusLabel}: Issue #${tikiState.activeIssue}`
    }

    return statusLabel
  }

  return (
    <div className="h-6 bg-background-tertiary border-t border-border flex items-center px-3 text-xs text-slate-500">
      {/* Left side - Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${getStatusColor(tikiState?.status)}`} />
          <span>{getStatusText()}</span>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side - Info */}
      <div className="flex items-center gap-4">
        {/* Project name */}
        {projectName && (
          <div className="flex items-center gap-1.5">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span>{projectName}</span>
          </div>
        )}

        {/* Git branch indicator */}
        <div className="flex items-center gap-1.5 text-slate-400">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="6" y1="3" x2="6" y2="15" />
            <circle cx="18" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <path d="M18 9a9 9 0 0 1-9 9" />
          </svg>
          <span>master</span>
        </div>

        {/* Version */}
        <span className="text-slate-600">v{version || '0.0.0'}</span>
      </div>
    </div>
  )
}
