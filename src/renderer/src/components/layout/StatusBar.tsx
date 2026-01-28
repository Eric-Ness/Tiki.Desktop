import { useTikiStore } from '../../stores/tiki-store'

interface StatusBarProps {
  version: string
}

export function StatusBar({ version }: StatusBarProps) {
  const tikiState = useTikiStore((state) => state.tikiState)
  const currentPlan = useTikiStore((state) => state.currentPlan)

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
        <span>Tiki Desktop v{version || '0.0.0'}</span>
      </div>
    </div>
  )
}
