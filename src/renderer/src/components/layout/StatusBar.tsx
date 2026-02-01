import { useTikiStore } from '../../stores/tiki-store'
import { useEditorStore, selectActiveFile } from '../../stores/editor-store'
import { PlanUsageWidget } from '../usage/PlanUsageWidget'
import { BranchStatus } from '../git/BranchStatus'
import { LayoutPresetSelector } from './LayoutPresetSelector'
import { CIStatusIndicator } from './CIStatusIndicator'
import { LearningModeToggle } from '../learning'

interface StatusBarProps {
  version: string
  cwd: string
  onOpenWorkflowDashboard?: () => void
}

export function StatusBar({ version, cwd, onOpenWorkflowDashboard }: StatusBarProps) {
  const tikiState = useTikiStore((state) => state.tikiState)
  const currentPlan = useTikiStore((state) => state.currentPlan)
  const layoutMode = useTikiStore((state) => state.layoutMode)
  const activeFile = useEditorStore(selectActiveFile)

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
        {/* Development mode info (cursor position, language) */}
        {layoutMode === 'development' && activeFile && (
          <>
            <div className="flex items-center gap-3 text-slate-400">
              <span>
                Ln {activeFile.cursorPosition.lineNumber}, Col {activeFile.cursorPosition.column}
              </span>
              <span className="text-slate-500">{activeFile.language}</span>
              <span className="text-slate-600">UTF-8</span>
            </div>
            <div className="w-px h-4 bg-slate-700" />
          </>
        )}

        {/* Learning Mode Toggle */}
        <LearningModeToggle compact />

        {/* Separator */}
        <div className="w-px h-4 bg-slate-700" />

        {/* Layout Preset Selector */}
        <LayoutPresetSelector />

        {/* Separator */}
        <div className="w-px h-4 bg-slate-700" />

        {/* CI Status Indicator */}
        {cwd && <CIStatusIndicator cwd={cwd} onOpenDashboard={onOpenWorkflowDashboard} />}

        {/* Separator */}
        <div className="w-px h-4 bg-slate-700" />

        {/* Plan Usage Widget */}
        <PlanUsageWidget />

        {/* Separator */}
        <div className="w-px h-4 bg-slate-700" />

        {/* Project name */}
        {projectName && (
          <div className="flex items-center gap-1.5">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span>{projectName}</span>
          </div>
        )}

        {/* Git branch indicator with dropdown */}
        {cwd && <BranchStatus cwd={cwd} />}

        {/* Version */}
        <span className="text-slate-600">v{version || '0.0.0'}</span>
      </div>
    </div>
  )
}
