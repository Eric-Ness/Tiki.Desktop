/**
 * Strategy Executor Service
 *
 * Generates commands for executing retry strategies and tracks execution state.
 * The actual execution is done by the renderer sending commands to the terminal.
 */
import { randomUUID } from 'crypto'
import { RetryStrategy, RetryAction } from './failure-analyzer'

/**
 * Generated command to be executed
 */
export interface GeneratedCommand {
  /** The command string to execute */
  command: string
  /** Sequence number for ordering multiple commands */
  sequence: number
  /** Human-readable description of what this command does */
  description: string
}

/**
 * Execution outcome types
 */
export type ExecutionOutcome = 'pending' | 'success' | 'failure' | 'cancelled'

/**
 * Strategy execution tracking
 */
export interface StrategyExecution {
  /** Unique execution ID */
  id: string
  /** ID of the strategy being executed */
  strategyId: string
  /** Issue number this execution is for */
  issueNumber: number
  /** Phase number this execution is for */
  phaseNumber: number
  /** Timestamp when execution started */
  startedAt: number
  /** Timestamp when execution completed (null if still running) */
  completedAt: number | null
  /** Current outcome status */
  outcome: ExecutionOutcome
  /** Resulting phase status after execution */
  resultPhaseStatus?: string
  /** Additional notes about the execution */
  notes?: string
  /** Generated commands to execute */
  commands?: GeneratedCommand[]
}

/**
 * Command generators for each strategy action type
 */
const commandGenerators: Record<
  RetryAction,
  (
    strategy: RetryStrategy,
    issueNumber: number,
    phaseNumber: number,
    cwd: string
  ) => GeneratedCommand[]
> = {
  redo: (_strategy, issueNumber, phaseNumber) => {
    return [
      {
        command: `/tiki:redo-phase ${issueNumber} ${phaseNumber}`,
        sequence: 1,
        description: `Redo phase ${phaseNumber} for issue #${issueNumber}`
      }
    ]
  },

  'redo-with-context': (strategy, issueNumber, phaseNumber) => {
    // Check if this is the install-dependencies strategy
    if (strategy.id === 'install-dependencies') {
      return [
        {
          command: 'npm install',
          sequence: 1,
          description: 'Install missing dependencies'
        },
        {
          command: `/tiki:redo-phase ${issueNumber} ${phaseNumber} --context "${strategy.contextHints?.join('; ') || ''}"`,
          sequence: 2,
          description: `Redo phase ${phaseNumber} for issue #${issueNumber} with error context`
        }
      ]
    }

    return [
      {
        command: `/tiki:redo-phase ${issueNumber} ${phaseNumber} --context "${strategy.contextHints?.join('; ') || ''}"`,
        sequence: 1,
        description: `Redo phase ${phaseNumber} for issue #${issueNumber} with error context`
      }
    ]
  },

  skip: (_strategy, issueNumber, phaseNumber) => {
    return [
      {
        command: `/tiki:skip-phase ${issueNumber} ${phaseNumber}`,
        sequence: 1,
        description: `Skip phase ${phaseNumber} for issue #${issueNumber}`
      }
    ]
  },

  'rollback-and-redo': (_strategy, issueNumber, phaseNumber) => {
    return [
      {
        command: `/tiki:rollback --issue ${issueNumber} --phase ${phaseNumber}`,
        sequence: 1,
        description: `Rollback changes from phase ${phaseNumber} for issue #${issueNumber}`
      },
      {
        command: `/tiki:redo-phase ${issueNumber} ${phaseNumber}`,
        sequence: 2,
        description: `Redo phase ${phaseNumber} for issue #${issueNumber}`
      }
    ]
  },

  manual: () => {
    // Manual action doesn't generate commands
    return []
  }
}

/**
 * Strategy Executor Service
 *
 * Manages strategy execution by generating commands and tracking execution state.
 */
export class StrategyExecutorService {
  private executions: Map<string, StrategyExecution> = new Map()

  /**
   * Execute a strategy by generating commands and tracking execution state
   *
   * @param strategy The retry strategy to execute
   * @param issueNumber The issue number
   * @param phaseNumber The phase number
   * @param cwd The working directory path
   * @returns The execution tracking object with generated commands
   */
  async executeStrategy(
    strategy: RetryStrategy,
    issueNumber: number,
    phaseNumber: number,
    cwd: string
  ): Promise<StrategyExecution> {
    const executionId = randomUUID()
    const generator = commandGenerators[strategy.action]

    // Generate commands for the strategy
    const commands = generator(strategy, issueNumber, phaseNumber, cwd)

    // Build notes from context hints
    let notes: string | undefined
    if (strategy.action === 'manual') {
      notes =
        'This strategy requires manual intervention. Please fix the issue and then run redo-phase.'
      if (strategy.contextHints && strategy.contextHints.length > 0) {
        notes += '\n\nContext hints:\n' + strategy.contextHints.map((h) => `- ${h}`).join('\n')
      }
    } else if (strategy.contextHints && strategy.contextHints.length > 0) {
      notes = 'Context hints:\n' + strategy.contextHints.map((h) => `- ${h}`).join('\n')
    }

    const execution: StrategyExecution = {
      id: executionId,
      strategyId: strategy.id,
      issueNumber,
      phaseNumber,
      startedAt: Date.now(),
      completedAt: null,
      outcome: 'pending',
      notes,
      commands
    }

    // Store the execution for tracking
    this.executions.set(executionId, execution)

    return execution
  }

  /**
   * Get the current status of an execution
   *
   * @param executionId The execution ID to look up
   * @returns The execution status or null if not found
   */
  getExecutionStatus(executionId: string): StrategyExecution | null {
    return this.executions.get(executionId) || null
  }

  /**
   * Cancel an execution if it's still pending
   *
   * @param executionId The execution ID to cancel
   * @returns true if cancelled, false if not found or not cancellable
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId)

    if (!execution) {
      return false
    }

    // Can only cancel pending executions
    if (execution.outcome !== 'pending') {
      return false
    }

    execution.outcome = 'cancelled'
    execution.completedAt = Date.now()

    return true
  }

  /**
   * Update the status of an execution
   *
   * @param executionId The execution ID to update
   * @param outcome The new outcome status
   * @param resultPhaseStatus Optional resulting phase status
   * @returns true if updated, false if not found
   */
  updateExecutionStatus(
    executionId: string,
    outcome: ExecutionOutcome,
    resultPhaseStatus?: string
  ): boolean {
    const execution = this.executions.get(executionId)

    if (!execution) {
      return false
    }

    execution.outcome = outcome
    execution.completedAt = Date.now()

    if (resultPhaseStatus) {
      execution.resultPhaseStatus = resultPhaseStatus
    }

    return true
  }

  /**
   * Get execution history for a specific issue
   *
   * @param issueNumber The issue number to get history for
   * @returns Array of executions for the issue
   */
  getExecutionHistory(issueNumber: number): StrategyExecution[] {
    return Array.from(this.executions.values()).filter((e) => e.issueNumber === issueNumber)
  }
}

/** Singleton instance */
export const strategyExecutorService = new StrategyExecutorService()
