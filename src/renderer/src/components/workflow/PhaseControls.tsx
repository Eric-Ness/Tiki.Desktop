import { useState, useCallback } from 'react'
import { useTikiStore } from '../../stores/tiki-store'

interface PhaseControlsProps {
  onPause: () => Promise<void>
  onResume: () => Promise<void>
  onSkip: (phaseNumber: number) => Promise<void>
  onRedo: (phaseNumber: number) => Promise<void>
}

export function PhaseControls({ onPause, onResume, onSkip, onRedo }: PhaseControlsProps) {
  const tikiState = useTikiStore((state) => state.tikiState)
  const currentPlan = useTikiStore((state) => state.currentPlan)
  const selectedNode = useTikiStore((state) => state.selectedNode)
  const [executing, setExecuting] = useState<string | null>(null)

  // Determine what actions are available based on state
  const isExecuting = tikiState?.status === 'executing'
  const isPaused = tikiState?.status === 'paused'
  const hasActiveIssue = !!tikiState?.activeIssue

  // Parse selected phase number from node id
  const selectedPhaseNumber = selectedNode?.startsWith('phase-')
    ? parseInt(selectedNode.replace('phase-', ''), 10)
    : null

  // Get selected phase info
  const selectedPhase = selectedPhaseNumber
    ? currentPlan?.phases?.find((p) => p.number === selectedPhaseNumber)
    : null

  const canSkip =
    selectedPhase &&
    (selectedPhase.status === 'pending' || selectedPhase.status === 'in_progress')
  const canRedo =
    selectedPhase &&
    (selectedPhase.status === 'completed' || selectedPhase.status === 'failed')

  // Execute action with loading state
  const executeAction = useCallback(
    async (action: string, fn: () => Promise<void>) => {
      setExecuting(action)
      try {
        await fn()
      } finally {
        setTimeout(() => setExecuting(null), 500)
      }
    },
    []
  )

  const handlePauseResume = useCallback(() => {
    if (isExecuting) {
      executeAction('pause', onPause)
    } else if (isPaused || hasActiveIssue) {
      executeAction('resume', onResume)
    }
  }, [isExecuting, isPaused, hasActiveIssue, executeAction, onPause, onResume])

  const handleSkip = useCallback(() => {
    if (selectedPhaseNumber && canSkip) {
      executeAction('skip', () => onSkip(selectedPhaseNumber))
    }
  }, [selectedPhaseNumber, canSkip, executeAction, onSkip])

  const handleRedo = useCallback(() => {
    if (selectedPhaseNumber && canRedo) {
      executeAction('redo', () => onRedo(selectedPhaseNumber))
    }
  }, [selectedPhaseNumber, canRedo, executeAction, onRedo])

  // Don't show controls if there's no active execution
  if (!hasActiveIssue && !currentPlan) {
    return null
  }

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-background-secondary/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg">
      {/* Play/Pause Button */}
      <button
        onClick={handlePauseResume}
        disabled={!hasActiveIssue || executing === 'pause' || executing === 'resume'}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
          isExecuting
            ? 'bg-amber-600 hover:bg-amber-500 text-white'
            : 'bg-green-600 hover:bg-green-500 text-white'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={isExecuting ? 'Pause execution' : 'Resume execution'}
      >
        {executing === 'pause' || executing === 'resume' ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : isExecuting ? (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
        {isExecuting ? 'Pause' : 'Resume'}
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-border" />

      {/* Skip Button */}
      <button
        onClick={handleSkip}
        disabled={!canSkip || !!executing}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={canSkip ? `Skip phase ${selectedPhaseNumber}` : 'Select a pending phase to skip'}
      >
        {executing === 'skip' ? (
          <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 4l10 8-10 8V4zm9 0h4v16h-4V4z" />
          </svg>
        )}
        Skip
      </button>

      {/* Redo Button */}
      <button
        onClick={handleRedo}
        disabled={!canRedo || !!executing}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={canRedo ? `Redo phase ${selectedPhaseNumber}` : 'Select a completed/failed phase to redo'}
      >
        {executing === 'redo' ? (
          <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        )}
        Redo
      </button>

      {/* Status indicator */}
      {hasActiveIssue && (
        <>
          <div className="w-px h-6 bg-border" />
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span
              className={`w-2 h-2 rounded-full ${
                isExecuting
                  ? 'bg-green-500 animate-pulse'
                  : isPaused
                    ? 'bg-amber-500'
                    : 'bg-slate-500'
              }`}
            />
            {isExecuting ? 'Executing' : isPaused ? 'Paused' : 'Idle'}
            {tikiState?.currentPhase && ` - Phase ${tikiState.currentPhase}`}
          </div>
        </>
      )}
    </div>
  )
}
