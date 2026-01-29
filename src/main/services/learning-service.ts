/**
 * Learning Service
 *
 * Tracks strategy outcomes and adjusts confidence scores based on
 * historical success rates. Part of the smart retry system.
 */
import { join } from 'path'
import { readFile, writeFile, mkdir, access, constants, unlink } from 'fs/promises'
import { randomUUID } from 'crypto'

/**
 * Record of a strategy execution outcome
 */
export interface LearningRecord {
  /** Unique identifier for the record */
  id: string
  /** Timestamp when the outcome was recorded */
  timestamp: number
  /** ID of the error pattern that was matched */
  patternId: string
  /** ID of the strategy that was executed */
  strategyId: string
  /** Outcome of the strategy execution */
  outcome: 'success' | 'failure'
  /** Issue number where this occurred */
  issueNumber: number
  /** Phase number where this occurred */
  phaseNumber: number
  /** Hash of error pattern for grouping similar errors */
  errorSignature: string
}

/**
 * Calculated confidence adjustment for a pattern/strategy combination
 */
export interface ConfidenceAdjustment {
  /** ID of the error pattern */
  patternId: string
  /** ID of the strategy */
  strategyId: string
  /** Original base confidence score */
  baseConfidence: number
  /** Adjusted confidence after applying learning */
  adjustedConfidence: number
  /** Number of samples used in calculation */
  sampleSize: number
  /** Success rate (0-1 scale) */
  successRate: number
}

/**
 * Statistics about learning data
 */
export interface LearningStats {
  /** Total number of recorded outcomes */
  totalRecords: number
  /** Overall success rate across all strategies */
  successRate: number
  /** Top performing strategies by success count */
  topStrategies: Array<{
    strategyId: string
    successCount: number
    totalCount: number
    successRate: number
  }>
}

/**
 * Context for recording an outcome
 */
export interface RecordContext {
  projectPath: string
  issueNumber: number
  phaseNumber: number
  errorSignature: string
}

/**
 * Stored data structure for learning records
 */
interface LearningData {
  records: LearningRecord[]
  version: number
}

/** Minimum sample size before applying confidence adjustments */
const MIN_SAMPLE_SIZE = 3

/** Weight for base confidence in adjustment formula */
const BASE_CONFIDENCE_WEIGHT = 0.7

/** Weight for success rate in adjustment formula */
const SUCCESS_RATE_WEIGHT = 0.3

/**
 * Get the learning directory path
 */
function getLearningPath(projectPath: string): string {
  return join(projectPath, '.tiki', 'learning')
}

/**
 * Get the outcomes file path
 */
function getOutcomesFilePath(projectPath: string): string {
  return join(getLearningPath(projectPath), 'outcomes.json')
}

/**
 * Check if a path exists
 */
async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Ensure the learning directory exists
 */
async function ensureLearningDir(projectPath: string): Promise<void> {
  const learningPath = getLearningPath(projectPath)
  if (!(await pathExists(learningPath))) {
    await mkdir(learningPath, { recursive: true })
  }
}

/**
 * Learning Service
 *
 * Tracks strategy execution outcomes and calculates adjusted confidence
 * scores based on historical success rates.
 */
export class LearningService {
  // Lock mechanism for concurrent writes
  private writeLocks: Map<string, Promise<void>> = new Map()

  /**
   * Record a strategy execution outcome
   *
   * @param patternId The error pattern ID
   * @param strategyId The strategy ID that was executed
   * @param outcome Whether the strategy succeeded or failed
   * @param context Additional context including project path
   */
  async recordOutcome(
    patternId: string,
    strategyId: string,
    outcome: 'success' | 'failure',
    context: RecordContext
  ): Promise<void> {
    const { projectPath, issueNumber, phaseNumber, errorSignature } = context

    // Acquire lock for this project path
    await this.acquireLock(projectPath)

    try {
      await ensureLearningDir(projectPath)

      const data = await this.loadData(projectPath)

      const record: LearningRecord = {
        id: randomUUID(),
        timestamp: Date.now(),
        patternId,
        strategyId,
        outcome,
        issueNumber,
        phaseNumber,
        errorSignature
      }

      data.records.push(record)
      await this.saveData(projectPath, data)
    } finally {
      this.releaseLock(projectPath)
    }
  }

  /**
   * Get all learning records for a project
   *
   * @param projectPath The project path
   * @returns Array of learning records
   */
  async getAllRecords(projectPath: string): Promise<LearningRecord[]> {
    const data = await this.loadData(projectPath)
    return data.records
  }

  /**
   * Get adjusted confidence score for a pattern/strategy combination
   *
   * @param projectPath The project path
   * @param patternId The error pattern ID
   * @param strategyId The strategy ID
   * @param baseConfidence The original base confidence score
   * @returns Adjusted confidence score
   */
  async getAdjustedConfidence(
    projectPath: string,
    patternId: string,
    strategyId: string,
    baseConfidence: number
  ): Promise<number> {
    const data = await this.loadData(projectPath)

    // Filter records for this pattern/strategy combination
    const relevantRecords = data.records.filter(
      (r) => r.patternId === patternId && r.strategyId === strategyId
    )

    // Return base confidence if sample size is below minimum
    if (relevantRecords.length < MIN_SAMPLE_SIZE) {
      return baseConfidence
    }

    // Calculate success rate
    const successCount = relevantRecords.filter((r) => r.outcome === 'success').length
    const successRate = successCount / relevantRecords.length

    // Apply adjustment formula: adjustedConfidence = baseConfidence * 0.7 + successRate * 0.3
    const adjustedConfidence =
      baseConfidence * BASE_CONFIDENCE_WEIGHT + successRate * SUCCESS_RATE_WEIGHT

    return adjustedConfidence
  }

  /**
   * Get confidence adjustments for all pattern/strategy combinations
   *
   * @param projectPath The project path
   * @param defaultBaseConfidence Default base confidence to use
   * @returns Array of confidence adjustments
   */
  async getConfidenceAdjustments(
    projectPath: string,
    defaultBaseConfidence: number
  ): Promise<ConfidenceAdjustment[]> {
    const data = await this.loadData(projectPath)

    // Group records by pattern/strategy combination
    const combinations = new Map<
      string,
      {
        patternId: string
        strategyId: string
        records: LearningRecord[]
      }
    >()

    for (const record of data.records) {
      const key = `${record.patternId}|${record.strategyId}`
      if (!combinations.has(key)) {
        combinations.set(key, {
          patternId: record.patternId,
          strategyId: record.strategyId,
          records: []
        })
      }
      combinations.get(key)!.records.push(record)
    }

    // Calculate adjustments for combinations with enough samples
    const adjustments: ConfidenceAdjustment[] = []

    for (const combo of combinations.values()) {
      if (combo.records.length >= MIN_SAMPLE_SIZE) {
        const successCount = combo.records.filter((r) => r.outcome === 'success').length
        const successRate = successCount / combo.records.length
        const adjustedConfidence =
          defaultBaseConfidence * BASE_CONFIDENCE_WEIGHT + successRate * SUCCESS_RATE_WEIGHT

        adjustments.push({
          patternId: combo.patternId,
          strategyId: combo.strategyId,
          baseConfidence: defaultBaseConfidence,
          adjustedConfidence,
          sampleSize: combo.records.length,
          successRate
        })
      }
    }

    return adjustments
  }

  /**
   * Get learning statistics for a project
   *
   * @param projectPath The project path
   * @returns Learning statistics
   */
  async getLearningStats(projectPath: string): Promise<LearningStats> {
    const data = await this.loadData(projectPath)
    const records = data.records

    if (records.length === 0) {
      return {
        totalRecords: 0,
        successRate: 0,
        topStrategies: []
      }
    }

    // Calculate overall success rate
    const totalSuccesses = records.filter((r) => r.outcome === 'success').length
    const successRate = totalSuccesses / records.length

    // Group by strategy for top strategies
    const strategyStats = new Map<
      string,
      {
        strategyId: string
        successCount: number
        totalCount: number
      }
    >()

    for (const record of records) {
      if (!strategyStats.has(record.strategyId)) {
        strategyStats.set(record.strategyId, {
          strategyId: record.strategyId,
          successCount: 0,
          totalCount: 0
        })
      }

      const stats = strategyStats.get(record.strategyId)!
      stats.totalCount++
      if (record.outcome === 'success') {
        stats.successCount++
      }
    }

    // Sort by success count and take top strategies
    const topStrategies = Array.from(strategyStats.values())
      .map((s) => ({
        strategyId: s.strategyId,
        successCount: s.successCount,
        totalCount: s.totalCount,
        successRate: s.totalCount > 0 ? s.successCount / s.totalCount : 0
      }))
      .sort((a, b) => b.successCount - a.successCount)

    return {
      totalRecords: records.length,
      successRate,
      topStrategies
    }
  }

  /**
   * Clear all learning data for a project
   *
   * @param projectPath The project path
   */
  async clearLearningData(projectPath: string): Promise<void> {
    const filePath = getOutcomesFilePath(projectPath)

    try {
      if (await pathExists(filePath)) {
        await unlink(filePath)
      }
    } catch {
      // Ignore errors when clearing (file might not exist)
    }
  }

  /**
   * Load learning data from file
   */
  private async loadData(projectPath: string): Promise<LearningData> {
    const filePath = getOutcomesFilePath(projectPath)

    try {
      if (await pathExists(filePath)) {
        const content = await readFile(filePath, 'utf-8')
        const data = JSON.parse(content) as LearningData
        return data
      }
    } catch {
      // Return empty data on error (corrupted file, etc.)
    }

    return {
      records: [],
      version: 1
    }
  }

  /**
   * Save learning data to file
   */
  private async saveData(projectPath: string, data: LearningData): Promise<void> {
    const filePath = getOutcomesFilePath(projectPath)
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
  }

  /**
   * Acquire a write lock for a project path
   */
  private async acquireLock(projectPath: string): Promise<void> {
    while (this.writeLocks.has(projectPath)) {
      await this.writeLocks.get(projectPath)
    }

    let resolveLock: () => void
    const lockPromise = new Promise<void>((resolve) => {
      resolveLock = resolve
    })

    this.writeLocks.set(projectPath, lockPromise)

    // Store the resolver so we can call it in releaseLock
    ;(lockPromise as Promise<void> & { resolve?: () => void }).resolve = resolveLock!
  }

  /**
   * Release the write lock for a project path
   */
  private releaseLock(projectPath: string): void {
    const lockPromise = this.writeLocks.get(projectPath) as
      | (Promise<void> & { resolve?: () => void })
      | undefined
    if (lockPromise?.resolve) {
      lockPromise.resolve()
    }
    this.writeLocks.delete(projectPath)
  }
}

/** Singleton instance */
export const learningService = new LearningService()
