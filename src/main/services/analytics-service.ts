/**
 * Analytics Service
 *
 * Core service for tracking velocity metrics and execution analytics.
 * Stores execution data and provides aggregated metrics for the velocity dashboard.
 */
import { app } from 'electron'
import { join } from 'path'
import { mkdir, readFile, writeFile } from 'fs/promises'

// Type definitions
export type TimePeriod = '7days' | '30days' | '90days' | 'all'
export type MetricType = 'issues' | 'phases' | 'tokens' | 'duration'
export type Granularity = 'day' | 'week' | 'month'

export interface PhaseRecord {
  number: number
  title: string
  startedAt: string
  completedAt?: string
  duration: number
  status: 'completed' | 'failed' | 'skipped'
  tokens: number
  retried: boolean
}

export interface ExecutionRecord {
  issueNumber: number
  issueTitle: string
  issueType: 'bug' | 'feature' | 'refactor' | 'docs' | 'other'
  startedAt: string
  completedAt?: string
  status: 'completed' | 'failed' | 'in_progress'
  phases: PhaseRecord[]
  totalTokens: number
  retryCount: number
}

export interface VelocityMetrics {
  period: TimePeriod
  issues: {
    completed: number
    failed: number
    successRate: number
    avgDuration: number
  }
  phases: {
    completed: number
    retried: number
    retryRate: number
    avgDuration: number
  }
  tokens: {
    total: number
    perIssue: number
    perPhase: number
  }
  comparison?: {
    issuesDelta: number
    successRateDelta: number
    durationDelta: number
    tokensDelta: number
  }
}

export interface TimeSeriesPoint {
  date: string
  value: number
}

export interface BreakdownItem {
  label: string
  value: number
  percentage: number
}

interface StorageData {
  executions: ExecutionRecord[]
  lastUpdated: string
}

export class AnalyticsService {
  private cwd: string
  private storagePath: string
  private writeLock: Promise<void> = Promise.resolve()

  constructor(cwd?: string) {
    this.cwd = cwd || (typeof app !== 'undefined' ? app.getPath('userData') : process.cwd())
    this.storagePath = join(this.cwd, '.tiki', 'analytics', 'executions.json')
  }

  /**
   * Get aggregated velocity metrics for a period
   */
  async getVelocityMetrics(period: TimePeriod): Promise<VelocityMetrics> {
    const executions = await this.loadExecutions()
    const { startDate, endDate } = this.getPeriodDates(period)
    const previousPeriodDates = this.getPreviousPeriodDates(period)

    // Filter executions for current period
    const currentPeriodExecutions = executions.filter((e) => {
      const execDate = new Date(e.startedAt)
      return execDate >= startDate && execDate <= endDate
    })

    // Filter executions for previous period
    const previousPeriodExecutions = executions.filter((e) => {
      const execDate = new Date(e.startedAt)
      return execDate >= previousPeriodDates.startDate && execDate < previousPeriodDates.endDate
    })

    // Calculate current period metrics
    const currentMetrics = this.calculateMetrics(currentPeriodExecutions)

    // Calculate comparison if previous period has data
    let comparison: VelocityMetrics['comparison'] | undefined
    if (previousPeriodExecutions.length > 0 && period !== 'all') {
      const previousMetrics = this.calculateMetrics(previousPeriodExecutions)
      comparison = this.calculateComparison(currentMetrics, previousMetrics)
    }

    return {
      period,
      issues: currentMetrics.issues,
      phases: currentMetrics.phases,
      tokens: currentMetrics.tokens,
      comparison
    }
  }

  /**
   * Get time series data for charts
   */
  async getTimeSeriesData(
    metric: MetricType,
    period: TimePeriod,
    granularity: Granularity
  ): Promise<TimeSeriesPoint[]> {
    const executions = await this.loadExecutions()
    const { startDate, endDate } = this.getPeriodDates(period)

    // Filter executions for period
    const periodExecutions = executions.filter((e) => {
      const execDate = new Date(e.startedAt)
      return execDate >= startDate && execDate <= endDate
    })

    if (periodExecutions.length === 0) {
      return []
    }

    // Group by granularity
    const grouped = new Map<string, ExecutionRecord[]>()

    for (const exec of periodExecutions) {
      const dateKey = this.getDateKey(new Date(exec.startedAt), granularity)
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, [])
      }
      grouped.get(dateKey)!.push(exec)
    }

    // Calculate metric for each group
    const results: TimeSeriesPoint[] = []

    for (const [dateKey, execs] of grouped) {
      let value = 0

      switch (metric) {
        case 'issues':
          value = execs.length
          break
        case 'phases':
          value = execs.reduce((sum, e) => sum + e.phases.length, 0)
          break
        case 'tokens':
          value = execs.reduce((sum, e) => sum + e.totalTokens, 0)
          break
        case 'duration':
          const completedExecs = execs.filter((e) => e.status === 'completed' && e.completedAt)
          if (completedExecs.length > 0) {
            value = completedExecs.reduce((sum, e) => {
              const duration =
                new Date(e.completedAt!).getTime() - new Date(e.startedAt).getTime()
              return sum + duration
            }, 0)
          }
          break
      }

      results.push({ date: dateKey, value })
    }

    // Sort chronologically
    results.sort((a, b) => a.date.localeCompare(b.date))

    return results
  }

  /**
   * Get breakdown by dimension
   */
  async getBreakdown(dimension: 'type' | 'phase' | 'status'): Promise<BreakdownItem[]> {
    const executions = await this.loadExecutions()

    if (executions.length === 0) {
      return []
    }

    const counts = new Map<string, number>()

    switch (dimension) {
      case 'type':
        for (const exec of executions) {
          const count = counts.get(exec.issueType) || 0
          counts.set(exec.issueType, count + 1)
        }
        break
      case 'phase':
        for (const exec of executions) {
          for (const phase of exec.phases) {
            const count = counts.get(phase.title) || 0
            counts.set(phase.title, count + 1)
          }
        }
        break
      case 'status':
        for (const exec of executions) {
          const count = counts.get(exec.status) || 0
          counts.set(exec.status, count + 1)
        }
        break
    }

    // Calculate total
    let total = 0
    for (const count of counts.values()) {
      total += count
    }

    // Convert to breakdown items
    const items: BreakdownItem[] = []
    for (const [label, value] of counts) {
      items.push({
        label,
        value,
        percentage: total > 0 ? (value / total) * 100 : 0
      })
    }

    // Sort by value descending
    items.sort((a, b) => b.value - a.value)

    return items
  }

  /**
   * Record an execution
   */
  async recordExecution(record: ExecutionRecord): Promise<void> {
    // Use lock to handle concurrent writes
    await this.withWriteLock(async () => {
      const executions = await this.loadExecutions()
      executions.push(record)
      await this.saveExecutions(executions)
    })
  }

  private async withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
    const previousLock = this.writeLock
    let resolve: () => void
    this.writeLock = new Promise<void>((r) => {
      resolve = r
    })

    try {
      await previousLock
      return await fn()
    } finally {
      resolve!()
    }
  }

  /**
   * Get recent executions
   */
  async getRecentExecutions(limit?: number): Promise<ExecutionRecord[]> {
    const executions = await this.loadExecutions()

    // Sort by startedAt descending (most recent first)
    const sorted = [...executions].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    )

    if (limit !== undefined && limit > 0) {
      return sorted.slice(0, limit)
    }

    return sorted
  }

  // Private helper methods

  private async loadExecutions(): Promise<ExecutionRecord[]> {
    try {
      const content = await readFile(this.storagePath, 'utf-8')
      const data: StorageData = JSON.parse(content)
      return data.executions || []
    } catch {
      return []
    }
  }

  private async saveExecutions(executions: ExecutionRecord[]): Promise<void> {
    const dirPath = join(this.cwd, '.tiki', 'analytics')
    await mkdir(dirPath, { recursive: true })

    const data: StorageData = {
      executions,
      lastUpdated: new Date().toISOString()
    }

    await writeFile(this.storagePath, JSON.stringify(data, null, 2), 'utf-8')
  }

  private getPeriodDates(period: TimePeriod): { startDate: Date; endDate: Date } {
    const endDate = new Date()
    let startDate: Date

    switch (period) {
      case '7days':
        startDate = new Date(endDate)
        startDate.setDate(startDate.getDate() - 7)
        break
      case '30days':
        startDate = new Date(endDate)
        startDate.setDate(startDate.getDate() - 30)
        break
      case '90days':
        startDate = new Date(endDate)
        startDate.setDate(startDate.getDate() - 90)
        break
      case 'all':
      default:
        startDate = new Date(0) // Beginning of time
        break
    }

    return { startDate, endDate }
  }

  private getPreviousPeriodDates(period: TimePeriod): { startDate: Date; endDate: Date } {
    const { startDate: currentStart } = this.getPeriodDates(period)

    // Previous period ends where current period starts
    const endDate = new Date(currentStart)

    let startDate: Date
    switch (period) {
      case '7days':
        startDate = new Date(endDate)
        startDate.setDate(startDate.getDate() - 7)
        break
      case '30days':
        startDate = new Date(endDate)
        startDate.setDate(startDate.getDate() - 30)
        break
      case '90days':
        startDate = new Date(endDate)
        startDate.setDate(startDate.getDate() - 90)
        break
      case 'all':
      default:
        startDate = new Date(0)
        break
    }

    return { startDate, endDate }
  }

  private calculateMetrics(executions: ExecutionRecord[]): {
    issues: VelocityMetrics['issues']
    phases: VelocityMetrics['phases']
    tokens: VelocityMetrics['tokens']
  } {
    // Issue metrics
    const completedIssues = executions.filter((e) => e.status === 'completed')
    const failedIssues = executions.filter((e) => e.status === 'failed')
    const totalFinished = completedIssues.length + failedIssues.length

    let avgIssueDuration = 0
    if (completedIssues.length > 0) {
      const totalDuration = completedIssues.reduce((sum, e) => {
        if (e.completedAt) {
          return sum + (new Date(e.completedAt).getTime() - new Date(e.startedAt).getTime())
        }
        return sum
      }, 0)
      avgIssueDuration = totalDuration / completedIssues.length
    }

    // Phase metrics
    const allPhases = executions.flatMap((e) => e.phases)
    const completedPhases = allPhases.filter((p) => p.status === 'completed')
    const retriedPhases = allPhases.filter((p) => p.retried)

    let avgPhaseDuration = 0
    if (allPhases.length > 0) {
      const totalPhaseDuration = allPhases.reduce((sum, p) => sum + p.duration, 0)
      avgPhaseDuration = totalPhaseDuration / allPhases.length
    }

    // Token metrics
    const totalTokens = executions.reduce((sum, e) => sum + e.totalTokens, 0)
    const tokensPerIssue = executions.length > 0 ? totalTokens / executions.length : 0
    const tokensPerPhase = allPhases.length > 0 ? totalTokens / allPhases.length : 0

    return {
      issues: {
        completed: completedIssues.length,
        failed: failedIssues.length,
        successRate: totalFinished > 0 ? completedIssues.length / totalFinished : 0,
        avgDuration: avgIssueDuration
      },
      phases: {
        completed: completedPhases.length,
        retried: retriedPhases.length,
        retryRate: allPhases.length > 0 ? retriedPhases.length / allPhases.length : 0,
        avgDuration: avgPhaseDuration
      },
      tokens: {
        total: totalTokens,
        perIssue: tokensPerIssue,
        perPhase: tokensPerPhase
      }
    }
  }

  private calculateComparison(
    current: ReturnType<typeof this.calculateMetrics>,
    previous: ReturnType<typeof this.calculateMetrics>
  ): VelocityMetrics['comparison'] {
    // Calculate percentage changes
    const issuesDelta =
      previous.issues.completed > 0
        ? ((current.issues.completed - previous.issues.completed) / previous.issues.completed) * 100
        : current.issues.completed > 0
          ? 100
          : 0

    const successRateDelta =
      previous.issues.successRate > 0
        ? ((current.issues.successRate - previous.issues.successRate) /
            previous.issues.successRate) *
          100
        : current.issues.successRate > 0
          ? 100
          : 0

    const durationDelta =
      previous.issues.avgDuration > 0
        ? ((current.issues.avgDuration - previous.issues.avgDuration) /
            previous.issues.avgDuration) *
          100
        : current.issues.avgDuration > 0
          ? 100
          : 0

    const tokensDelta =
      previous.tokens.total > 0
        ? ((current.tokens.total - previous.tokens.total) / previous.tokens.total) * 100
        : current.tokens.total > 0
          ? 100
          : 0

    return {
      issuesDelta,
      successRateDelta,
      durationDelta,
      tokensDelta
    }
  }

  private getDateKey(date: Date, granularity: Granularity): string {
    switch (granularity) {
      case 'day':
        return date.toISOString().split('T')[0]
      case 'week':
        // Get the Monday of the week
        const d = new Date(date)
        const day = d.getDay()
        const diff = d.getDate() - day + (day === 0 ? -6 : 1)
        d.setDate(diff)
        return `Week of ${d.toISOString().split('T')[0]}`
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    }
  }
}

// Singleton export for use in main process
export const analyticsService = new AnalyticsService()
