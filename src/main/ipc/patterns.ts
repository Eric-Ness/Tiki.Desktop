import { ipcMain } from 'electron'
import {
  patternDetector,
  GitHubIssueForPattern,
  ExecutionPlanForPattern
} from '../services/pattern-detector'
import {
  FailurePattern,
  FailureRecord,
  FixRecord,
  PatternMatch,
  PreventiveMeasure
} from '../services/failure-clustering'

/**
 * Register IPC handlers for pattern detection and proactive prevention
 */
export function registerPatternHandlers(): void {
  // patterns:list - List all detected patterns
  ipcMain.handle(
    'patterns:list',
    async (_, { cwd }: { cwd: string }): Promise<FailurePattern[]> => {
      await patternDetector.loadPatterns(cwd)
      return patternDetector.getPatterns()
    }
  )

  // patterns:get - Get pattern details
  ipcMain.handle(
    'patterns:get',
    async (
      _,
      { cwd, patternId }: { cwd: string; patternId: string }
    ): Promise<FailurePattern | undefined> => {
      await patternDetector.loadPatterns(cwd)
      return patternDetector.getPattern(patternId)
    }
  )

  // patterns:check - Check issue/plan against patterns
  ipcMain.handle(
    'patterns:check',
    async (
      _,
      {
        cwd,
        issue,
        plan
      }: {
        cwd: string
        issue: GitHubIssueForPattern
        plan?: ExecutionPlanForPattern
      }
    ): Promise<PatternMatch[]> => {
      await patternDetector.loadPatterns(cwd)
      return patternDetector.checkForPatterns(issue, plan)
    }
  )

  // patterns:record-failure - Record new failure
  ipcMain.handle(
    'patterns:record-failure',
    async (
      _,
      { cwd, failure }: { cwd: string; failure: FailureRecord }
    ): Promise<{ success: boolean }> => {
      await patternDetector.recordFailure(cwd, failure)
      return { success: true }
    }
  )

  // patterns:record-fix - Record successful fix
  ipcMain.handle(
    'patterns:record-fix',
    async (
      _,
      { cwd, patternId, fix }: { cwd: string; patternId: string; fix: FixRecord }
    ): Promise<{ success: boolean }> => {
      await patternDetector.recordFix(cwd, patternId, fix)
      return { success: true }
    }
  )

  // patterns:analyze - Re-analyze failure history
  ipcMain.handle(
    'patterns:analyze',
    async (_, { cwd }: { cwd: string }): Promise<FailurePattern[]> => {
      return patternDetector.analyzeHistory(cwd)
    }
  )

  // patterns:apply-prevention - Apply preventive measures
  ipcMain.handle(
    'patterns:apply-prevention',
    async (
      _,
      {
        cwd,
        plan,
        matches
      }: {
        cwd: string
        plan: ExecutionPlanForPattern
        matches: PatternMatch[]
      }
    ): Promise<{ modifiedPlan: ExecutionPlanForPattern; appliedMeasures: PreventiveMeasure[] }> => {
      await patternDetector.loadPatterns(cwd)
      return patternDetector.applyPrevention(plan, matches)
    }
  )

  // patterns:resolve - Mark pattern as resolved
  ipcMain.handle(
    'patterns:resolve',
    async (
      _,
      { cwd, patternId }: { cwd: string; patternId: string }
    ): Promise<{ success: boolean }> => {
      await patternDetector.resolvePattern(cwd, patternId)
      return { success: true }
    }
  )

  // patterns:delete - Delete a pattern
  ipcMain.handle(
    'patterns:delete',
    async (
      _,
      { cwd, patternId }: { cwd: string; patternId: string }
    ): Promise<{ success: boolean }> => {
      await patternDetector.deletePattern(cwd, patternId)
      return { success: true }
    }
  )

  // patterns:top - Get top patterns by occurrence
  ipcMain.handle(
    'patterns:top',
    async (
      _,
      { cwd, limit }: { cwd: string; limit?: number }
    ): Promise<FailurePattern[]> => {
      await patternDetector.loadPatterns(cwd)
      return patternDetector.getTopPatterns(limit)
    }
  )
}
