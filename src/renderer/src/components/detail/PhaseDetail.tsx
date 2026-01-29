import { useState, useEffect, useCallback } from 'react'
import { useTikiStore } from '../../stores/tiki-store'
import { useLearning, type PhaseExplanation as PhaseExplanationData } from '../../contexts/LearningContext'
import { PhaseChanges } from '../diff'
import { RollbackDialog } from '../rollback'
import { FailureAnalysis } from './FailureAnalysis'
import { StrategySelector } from './StrategySelector'
import { RetryControls } from './RetryControls'
import { FilePreviewList } from '../code'
import { PhaseExplanation } from '../learning'
import type {
  FailureAnalysis as FailureAnalysisType,
  RetryStrategy,
  StrategyExecution
} from '../../../../preload/index'

export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'

export interface PhaseData {
  number: number
  title: string
  status: PhaseStatus
  files: string[]
  verification: string[]
  summary?: string
  error?: string
  // Git refs for diff viewing (optional - set when phase completes)
  startCommit?: string
  endCommit?: string
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

export function PhaseDetail({ phase }: PhaseDetailProps) {
  const { number, title, status, files, verification, summary, error, startCommit, endCommit } = phase
  const isCompleted = status === 'completed'
  const isFailed = status === 'failed'
  const showSummary = isCompleted && summary && summary.trim() !== ''
  const showError = isFailed && error && error.trim() !== ''
  const hasChanges = (isCompleted || isFailed) && startCommit && endCommit

  // Track whether changes section is expanded
  const [showChanges, setShowChanges] = useState(false)

  // Rollback state
  const [showRollbackDialog, setShowRollbackDialog] = useState(false)
  const [hasTrackedCommits, setHasTrackedCommits] = useState(false)

  // Failure analysis state
  const [failureAnalysis, setFailureAnalysis] = useState<FailureAnalysisType | null>(null)
  const [selectedStrategy, setSelectedStrategy] = useState<RetryStrategy | null>(null)
  const [execution, setExecution] = useState<StrategyExecution | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  // Get issue number from current plan and project path
  const activeProject = useTikiStore((state) => state.activeProject)
  const currentPlan = useTikiStore((state) => state.currentPlan)
  const issueNumber = currentPlan?.issue?.number

  // Project cwd for file preview
  const [projectCwd, setProjectCwd] = useState<string>('')

  // Learning mode state
  const { learningModeEnabled, getPhaseExplanation, markConceptSeen } = useLearning()
  const [phaseExplanation, setPhaseExplanation] = useState<PhaseExplanationData | null>(null)

  useEffect(() => {
    const getCwd = async () => {
      // Try to get from active project, fallback to app cwd
      if (activeProject?.path) {
        setProjectCwd(activeProject.path)
      } else {
        const cwd = await window.tikiDesktop.getCwd()
        setProjectCwd(cwd)
      }
    }
    getCwd()
  }, [activeProject?.path])

  // Load phase explanation when learning mode is enabled
  useEffect(() => {
    if (learningModeEnabled && title) {
      getPhaseExplanation({ title, files })
        .then(setPhaseExplanation)
    } else {
      setPhaseExplanation(null)
    }
  }, [learningModeEnabled, title, files, getPhaseExplanation])

  // Check if the phase has tracked commits for rollback
  useEffect(() => {
    const checkCommits = async () => {
      if (!activeProject?.path || !issueNumber || !number) {
        setHasTrackedCommits(false)
        return
      }
      try {
        const commits = await window.tikiDesktop.rollback.getPhaseCommits(
          activeProject.path,
          issueNumber,
          number
        )
        setHasTrackedCommits(commits.length > 0)
      } catch (err) {
        console.error('Failed to check phase commits:', err)
        setHasTrackedCommits(false)
      }
    }
    checkCommits()
  }, [activeProject?.path, issueNumber, number])

  // Auto-analyze failure when phase fails and has an error
  useEffect(() => {
    const autoAnalyze = async () => {
      if (!isFailed || !error || !issueNumber || !number) {
        return
      }

      // Don't re-analyze if we already have an analysis for this phase
      if (failureAnalysis && failureAnalysis.phaseNumber === number) {
        return
      }

      setIsAnalyzing(true)
      setAnalysisError(null)

      try {
        const analysis = await window.tikiDesktop.failure.analyze(
          issueNumber,
          number,
          error,
          { files }
        )
        setFailureAnalysis(analysis)
      } catch (err) {
        console.error('Failed to analyze failure:', err)
        setAnalysisError(err instanceof Error ? err.message : 'Failed to analyze failure')
      } finally {
        setIsAnalyzing(false)
      }
    }

    autoAnalyze()
  }, [isFailed, error, issueNumber, number, files, failureAnalysis])

  // Handler to manually trigger analysis
  const handleAnalyze = useCallback(async () => {
    if (!error || !issueNumber || !number) {
      return
    }

    setIsAnalyzing(true)
    setAnalysisError(null)
    setFailureAnalysis(null)

    try {
      const analysis = await window.tikiDesktop.failure.analyze(
        issueNumber,
        number,
        error,
        { files }
      )
      setFailureAnalysis(analysis)
    } catch (err) {
      console.error('Failed to analyze failure:', err)
      setAnalysisError(err instanceof Error ? err.message : 'Failed to analyze failure')
    } finally {
      setIsAnalyzing(false)
    }
  }, [error, issueNumber, number, files])

  // Handler for strategy selection
  const handleStrategySelect = useCallback((strategy: RetryStrategy) => {
    setSelectedStrategy(strategy)
  }, [])

  // Handler to execute selected strategy
  const handleExecute = useCallback(async (strategy: RetryStrategy) => {
    if (!activeProject?.path || !issueNumber || !number) {
      return
    }

    // Use provided strategy or fall back to selected strategy
    const strategyToExecute = strategy.id ? strategy : selectedStrategy
    if (!strategyToExecute) {
      return
    }

    try {
      const result = await window.tikiDesktop.failure.executeStrategy(
        strategyToExecute,
        issueNumber,
        number,
        activeProject.path
      )
      setExecution(result)

      // Poll for execution status if pending
      if (result.outcome === 'pending') {
        const pollInterval = setInterval(async () => {
          try {
            const status = await window.tikiDesktop.failure.getExecutionStatus(result.id)
            if (status) {
              setExecution(status)
              if (status.outcome !== 'pending') {
                clearInterval(pollInterval)
                // Record outcome for learning
                if (failureAnalysis?.primaryClassification) {
                  await window.tikiDesktop.failure.recordOutcome(
                    failureAnalysis.primaryClassification.patternId,
                    strategyToExecute.id,
                    status.outcome === 'success' ? 'success' : 'failure',
                    {
                      projectPath: activeProject.path,
                      issueNumber,
                      phaseNumber: number,
                      errorSignature: error || ''
                    }
                  )
                }
              }
            }
          } catch (err) {
            console.error('Failed to get execution status:', err)
            clearInterval(pollInterval)
          }
        }, 1000)

        // Clean up after 5 minutes max
        setTimeout(() => clearInterval(pollInterval), 300000)
      }
    } catch (err) {
      console.error('Failed to execute strategy:', err)
      setExecution({
        id: `error-${Date.now()}`,
        strategyId: strategyToExecute.id,
        issueNumber,
        phaseNumber: number,
        startedAt: Date.now(),
        completedAt: Date.now(),
        outcome: 'failure',
        notes: err instanceof Error ? err.message : 'Execution failed'
      })
    }
  }, [activeProject?.path, issueNumber, number, selectedStrategy, error, failureAnalysis])

  // Handler to cancel execution
  const handleCancel = useCallback(async () => {
    if (!execution) {
      return
    }

    try {
      await window.tikiDesktop.failure.cancelExecution(execution.id)
      setExecution((prev) =>
        prev ? { ...prev, outcome: 'cancelled', completedAt: Date.now() } : null
      )
    } catch (err) {
      console.error('Failed to cancel execution:', err)
    }
  }, [execution])

  return (
    <div className="p-4 space-y-6">
      {/* Phase explanation for learning mode */}
      {learningModeEnabled && phaseExplanation && (
        <PhaseExplanation
          explanation={phaseExplanation}
          onConceptClick={(conceptId) => {
            markConceptSeen(conceptId)
            // Could show concept card here in future enhancement
          }}
        />
      )}

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

      {/* Rollback button - only visible when phase is completed and has tracked commits */}
      {isCompleted && hasTrackedCommits && issueNumber && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRollbackDialog(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-500 active:bg-amber-600 text-white rounded transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Rollback Phase
          </button>
        </div>
      )}

      {/* Files section */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Files</h3>
        {files.length > 0 ? (
          <FilePreviewList
            files={files}
            cwd={projectCwd}
            fromRef={startCommit}
            toRef={endCommit}
            autoExpandFirst={true}
          />
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

      {/* Failure Analysis Section (only shown when failed) */}
      {isFailed && issueNumber && (
        <div className="space-y-4" data-testid="failure-analysis-section">
          {/* Analyzing indicator */}
          {isAnalyzing && (
            <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <svg
                className="w-5 h-5 text-cyan-400 animate-spin"
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
              <span className="text-sm text-slate-300">Analyzing failure...</span>
            </div>
          )}

          {/* Analysis error */}
          {analysisError && !isAnalyzing && (
            <div className="p-4 bg-red-900/30 rounded-lg border border-red-700">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-red-300">{analysisError}</p>
                  <button
                    onClick={handleAnalyze}
                    className="mt-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Failure Analysis display */}
          {failureAnalysis && !isAnalyzing && (
            <FailureAnalysis
              analysis={failureAnalysis}
              onStrategySelect={handleStrategySelect}
            />
          )}

          {/* Strategy Selector */}
          {failureAnalysis && failureAnalysis.suggestedStrategies.length > 0 && !isAnalyzing && (
            <StrategySelector
              strategies={failureAnalysis.suggestedStrategies}
              onSelect={handleStrategySelect}
              disabled={execution?.outcome === 'pending'}
            />
          )}

          {/* Retry Controls */}
          {(selectedStrategy || execution) && !isAnalyzing && (
            <RetryControls
              issueNumber={issueNumber}
              phaseNumber={number}
              execution={execution}
              onExecute={handleExecute}
              onCancel={handleCancel}
            />
          )}

          {/* Execute button when strategy is selected but no execution */}
          {selectedStrategy && !execution && !isAnalyzing && (
            <button
              onClick={() => handleExecute(selectedStrategy)}
              className="w-full px-4 py-2 text-sm font-medium bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-600 text-white rounded-lg transition-colors"
              data-testid="execute-strategy-button"
            >
              Execute: {selectedStrategy.name}
            </button>
          )}

          {/* Re-analyze button (when analysis exists but user wants to refresh) */}
          {failureAnalysis && !isAnalyzing && (
            <button
              onClick={handleAnalyze}
              className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
              data-testid="reanalyze-button"
            >
              Re-analyze failure
            </button>
          )}
        </div>
      )}

      {/* Changes section (only shown when phase has commit refs) */}
      {hasChanges && (
        <div>
          <button
            onClick={() => setShowChanges(!showChanges)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2 hover:text-white transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showChanges ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            Changes
          </button>

          {showChanges && (
            <div
              data-testid="changes-section"
              className="bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700"
              style={{ height: '400px' }}
            >
              <PhaseChanges fromRef={startCommit} toRef={endCommit} />
            </div>
          )}
        </div>
      )}

      {/* Rollback Dialog */}
      {issueNumber && (
        <RollbackDialog
          isOpen={showRollbackDialog}
          onClose={() => setShowRollbackDialog(false)}
          scope="phase"
          target={{ issueNumber, phaseNumber: number }}
          issueNumber={issueNumber}
          phaseNumber={number}
        />
      )}
    </div>
  )
}
