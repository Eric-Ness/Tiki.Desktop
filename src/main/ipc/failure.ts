import { ipcMain } from 'electron'
import {
  failureAnalyzerService,
  FailureContext,
  FailureAnalysis,
  RetryStrategy
} from '../services/failure-analyzer'
import { ErrorClassification } from '../services/error-patterns'
import { strategyExecutorService, StrategyExecution } from '../services/strategy-executor'
import { learningService, LearningStats, RecordContext } from '../services/learning-service'

/**
 * Register IPC handlers for failure analysis and retry operations
 */
export function registerFailureHandlers(): void {
  // Analyze a phase failure
  ipcMain.handle(
    'failure:analyze',
    async (
      _,
      {
        issueNumber,
        phaseNumber,
        errorText,
        context
      }: {
        issueNumber: number
        phaseNumber: number
        errorText: string
        context: FailureContext
      }
    ): Promise<FailureAnalysis> => {
      return failureAnalyzerService.analyzeFailure(issueNumber, phaseNumber, errorText, context)
    }
  )

  // Get available strategies for an error classification
  ipcMain.handle(
    'failure:get-strategies',
    async (
      _,
      { classification }: { classification: ErrorClassification }
    ): Promise<RetryStrategy[]> => {
      return failureAnalyzerService.getAvailableStrategies(classification)
    }
  )

  // Execute a retry strategy
  ipcMain.handle(
    'failure:execute-strategy',
    async (
      _,
      {
        strategy,
        issueNumber,
        phaseNumber,
        cwd
      }: {
        strategy: RetryStrategy
        issueNumber: number
        phaseNumber: number
        cwd: string
      }
    ): Promise<StrategyExecution> => {
      return strategyExecutorService.executeStrategy(strategy, issueNumber, phaseNumber, cwd)
    }
  )

  // Get status of an execution
  ipcMain.handle(
    'failure:get-execution-status',
    async (_, { executionId }: { executionId: string }): Promise<StrategyExecution | null> => {
      return strategyExecutorService.getExecutionStatus(executionId)
    }
  )

  // Cancel an in-progress execution
  ipcMain.handle(
    'failure:cancel-execution',
    async (_, { executionId }: { executionId: string }): Promise<boolean> => {
      return strategyExecutorService.cancelExecution(executionId)
    }
  )

  // Record strategy outcome for learning
  ipcMain.handle(
    'failure:record-outcome',
    async (
      _,
      {
        patternId,
        strategyId,
        outcome,
        context
      }: {
        patternId: string
        strategyId: string
        outcome: 'success' | 'failure'
        context: RecordContext
      }
    ): Promise<void> => {
      return learningService.recordOutcome(patternId, strategyId, outcome, context)
    }
  )

  // Get learning statistics
  ipcMain.handle(
    'failure:get-learning-stats',
    async (_, { projectPath }: { projectPath: string }): Promise<LearningStats> => {
      return learningService.getLearningStats(projectPath)
    }
  )
}
