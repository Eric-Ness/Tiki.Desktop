/**
 * Tests for AnalyticsService
 *
 * TDD: Tests written first, then implementation
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'path'
import { mkdir, rm, readFile, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import {
  AnalyticsService,
  ExecutionRecord,
  PhaseRecord,
  VelocityMetrics,
  TimeSeriesPoint,
  BreakdownItem,
  TimePeriod,
  MetricType,
  Granularity,
  analyticsService
} from '../analytics-service'

describe('AnalyticsService', () => {
  let service: AnalyticsService
  let testProjectPath: string

  beforeEach(async () => {
    // Create a unique temp directory for each test
    testProjectPath = join(
      tmpdir(),
      `tiki-analytics-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    )
    await mkdir(testProjectPath, { recursive: true })
    service = new AnalyticsService(testProjectPath)
  })

  afterEach(async () => {
    // Clean up temp directory
    try {
      await rm(testProjectPath, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
    vi.useRealTimers()
  })

  // Helper to create test execution records
  function createExecutionRecord(overrides: Partial<ExecutionRecord> = {}): ExecutionRecord {
    return {
      issueNumber: 1,
      issueTitle: 'Test Issue',
      issueType: 'feature',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      status: 'completed',
      phases: [],
      totalTokens: 1000,
      retryCount: 0,
      ...overrides
    }
  }

  // Helper to create test phase records
  function createPhaseRecord(overrides: Partial<PhaseRecord> = {}): PhaseRecord {
    return {
      number: 1,
      title: 'Test Phase',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      duration: 60000,
      status: 'completed',
      tokens: 500,
      retried: false,
      ...overrides
    }
  }

  describe('Interface definitions', () => {
    it('should have TimePeriod type with correct values', async () => {
      const periods: TimePeriod[] = ['7days', '30days', '90days', 'all']
      expect(periods).toHaveLength(4)
    })

    it('should have MetricType type with correct values', async () => {
      const metrics: MetricType[] = ['issues', 'phases', 'tokens', 'duration']
      expect(metrics).toHaveLength(4)
    })

    it('should have Granularity type with correct values', async () => {
      const granularities: Granularity[] = ['day', 'week', 'month']
      expect(granularities).toHaveLength(3)
    })

    it('should create valid ExecutionRecord', () => {
      const record = createExecutionRecord({
        issueNumber: 42,
        issueTitle: 'Add new feature',
        issueType: 'bug',
        status: 'completed',
        phases: [createPhaseRecord()],
        totalTokens: 5000,
        retryCount: 1
      })

      expect(record).toHaveProperty('issueNumber', 42)
      expect(record).toHaveProperty('issueTitle', 'Add new feature')
      expect(record).toHaveProperty('issueType', 'bug')
      expect(record).toHaveProperty('startedAt')
      expect(record).toHaveProperty('completedAt')
      expect(record).toHaveProperty('status', 'completed')
      expect(record).toHaveProperty('phases')
      expect(record.phases).toHaveLength(1)
      expect(record).toHaveProperty('totalTokens', 5000)
      expect(record).toHaveProperty('retryCount', 1)
    })

    it('should create valid PhaseRecord', () => {
      const phase = createPhaseRecord({
        number: 3,
        title: 'Implementation Phase',
        duration: 120000,
        status: 'completed',
        tokens: 2500,
        retried: true
      })

      expect(phase).toHaveProperty('number', 3)
      expect(phase).toHaveProperty('title', 'Implementation Phase')
      expect(phase).toHaveProperty('startedAt')
      expect(phase).toHaveProperty('completedAt')
      expect(phase).toHaveProperty('duration', 120000)
      expect(phase).toHaveProperty('status', 'completed')
      expect(phase).toHaveProperty('tokens', 2500)
      expect(phase).toHaveProperty('retried', true)
    })
  })

  describe('recordExecution', () => {
    it('should persist execution to file', async () => {
      const record = createExecutionRecord({ issueNumber: 42 })
      await service.recordExecution(record)

      // Verify file exists and contains the record
      const filePath = join(testProjectPath, '.tiki', 'analytics', 'executions.json')
      const content = await readFile(filePath, 'utf-8')
      const data = JSON.parse(content)

      expect(data.executions).toBeDefined()
      expect(data.executions).toHaveLength(1)
      expect(data.executions[0].issueNumber).toBe(42)
      expect(data.lastUpdated).toBeDefined()
    })

    it('should append to existing executions', async () => {
      const record1 = createExecutionRecord({ issueNumber: 1 })
      const record2 = createExecutionRecord({ issueNumber: 2 })

      await service.recordExecution(record1)
      await service.recordExecution(record2)

      const executions = await service.getRecentExecutions()
      expect(executions).toHaveLength(2)
    })

    it('should create directory if it does not exist', async () => {
      const newPath = join(testProjectPath, 'new-project')
      await mkdir(newPath, { recursive: true })
      const newService = new AnalyticsService(newPath)

      await newService.recordExecution(createExecutionRecord())

      const executions = await newService.getRecentExecutions()
      expect(executions).toHaveLength(1)
    })

    it('should record all issue types correctly', async () => {
      const types: Array<'bug' | 'feature' | 'refactor' | 'docs' | 'other'> = [
        'bug',
        'feature',
        'refactor',
        'docs',
        'other'
      ]

      for (let i = 0; i < types.length; i++) {
        await service.recordExecution(
          createExecutionRecord({ issueNumber: i + 1, issueType: types[i] })
        )
      }

      const executions = await service.getRecentExecutions()
      expect(executions).toHaveLength(5)
      expect(executions.map((e) => e.issueType).sort()).toEqual(types.sort())
    })

    it('should record all status types correctly', async () => {
      const statuses: Array<'completed' | 'failed' | 'in_progress'> = [
        'completed',
        'failed',
        'in_progress'
      ]

      for (let i = 0; i < statuses.length; i++) {
        await service.recordExecution(
          createExecutionRecord({ issueNumber: i + 1, status: statuses[i] })
        )
      }

      const executions = await service.getRecentExecutions()
      expect(executions).toHaveLength(3)
      expect(executions.map((e) => e.status).sort()).toEqual(statuses.sort())
    })
  })

  describe('getRecentExecutions', () => {
    it('should return all executions when no limit specified', async () => {
      for (let i = 0; i < 5; i++) {
        await service.recordExecution(createExecutionRecord({ issueNumber: i }))
      }

      const executions = await service.getRecentExecutions()
      expect(executions).toHaveLength(5)
    })

    it('should return limited executions when limit specified', async () => {
      for (let i = 0; i < 10; i++) {
        await service.recordExecution(createExecutionRecord({ issueNumber: i }))
      }

      const executions = await service.getRecentExecutions(3)
      expect(executions).toHaveLength(3)
    })

    it('should return executions in reverse chronological order (most recent first)', async () => {
      vi.useFakeTimers()

      vi.setSystemTime(new Date('2024-01-01T10:00:00.000Z'))
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 1,
          startedAt: '2024-01-01T10:00:00.000Z'
        })
      )

      vi.setSystemTime(new Date('2024-01-02T10:00:00.000Z'))
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 2,
          startedAt: '2024-01-02T10:00:00.000Z'
        })
      )

      vi.setSystemTime(new Date('2024-01-03T10:00:00.000Z'))
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 3,
          startedAt: '2024-01-03T10:00:00.000Z'
        })
      )

      const executions = await service.getRecentExecutions()
      expect(executions[0].issueNumber).toBe(3)
      expect(executions[1].issueNumber).toBe(2)
      expect(executions[2].issueNumber).toBe(1)
    })

    it('should return empty array when no executions exist', async () => {
      const executions = await service.getRecentExecutions()
      expect(executions).toEqual([])
    })
  })

  describe('getVelocityMetrics', () => {
    it('should return correct structure with all properties', async () => {
      await service.recordExecution(createExecutionRecord())

      const metrics = await service.getVelocityMetrics('7days')

      expect(metrics).toHaveProperty('period', '7days')
      expect(metrics).toHaveProperty('issues')
      expect(metrics.issues).toHaveProperty('completed')
      expect(metrics.issues).toHaveProperty('failed')
      expect(metrics.issues).toHaveProperty('successRate')
      expect(metrics.issues).toHaveProperty('avgDuration')
      expect(metrics).toHaveProperty('phases')
      expect(metrics.phases).toHaveProperty('completed')
      expect(metrics.phases).toHaveProperty('retried')
      expect(metrics.phases).toHaveProperty('retryRate')
      expect(metrics.phases).toHaveProperty('avgDuration')
      expect(metrics).toHaveProperty('tokens')
      expect(metrics.tokens).toHaveProperty('total')
      expect(metrics.tokens).toHaveProperty('perIssue')
      expect(metrics.tokens).toHaveProperty('perPhase')
    })

    it('should return zeros for empty data', async () => {
      const metrics = await service.getVelocityMetrics('7days')

      expect(metrics.issues.completed).toBe(0)
      expect(metrics.issues.failed).toBe(0)
      expect(metrics.issues.successRate).toBe(0)
      expect(metrics.issues.avgDuration).toBe(0)
      expect(metrics.phases.completed).toBe(0)
      expect(metrics.phases.retried).toBe(0)
      expect(metrics.phases.retryRate).toBe(0)
      expect(metrics.phases.avgDuration).toBe(0)
      expect(metrics.tokens.total).toBe(0)
      expect(metrics.tokens.perIssue).toBe(0)
      expect(metrics.tokens.perPhase).toBe(0)
    })

    it('should calculate correct issue metrics', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))

      // 3 completed, 1 failed
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 1,
          status: 'completed',
          startedAt: '2024-01-14T10:00:00.000Z',
          completedAt: '2024-01-14T11:00:00.000Z' // 1 hour
        })
      )
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 2,
          status: 'completed',
          startedAt: '2024-01-14T12:00:00.000Z',
          completedAt: '2024-01-14T14:00:00.000Z' // 2 hours
        })
      )
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 3,
          status: 'completed',
          startedAt: '2024-01-14T15:00:00.000Z',
          completedAt: '2024-01-14T18:00:00.000Z' // 3 hours
        })
      )
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 4,
          status: 'failed',
          startedAt: '2024-01-14T19:00:00.000Z',
          completedAt: '2024-01-14T19:30:00.000Z' // 30 minutes
        })
      )

      const metrics = await service.getVelocityMetrics('7days')

      expect(metrics.issues.completed).toBe(3)
      expect(metrics.issues.failed).toBe(1)
      expect(metrics.issues.successRate).toBeCloseTo(0.75, 2) // 3/4
      // Average duration = (1 + 2 + 3) hours / 3 completed = 2 hours = 7200000ms
      expect(metrics.issues.avgDuration).toBe(7200000)
    })

    it('should calculate correct phase metrics', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))

      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 1,
          startedAt: '2024-01-14T10:00:00.000Z',
          phases: [
            createPhaseRecord({ number: 1, duration: 60000, status: 'completed', retried: false }),
            createPhaseRecord({ number: 2, duration: 120000, status: 'completed', retried: true }),
            createPhaseRecord({ number: 3, duration: 90000, status: 'completed', retried: false })
          ]
        })
      )
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 2,
          startedAt: '2024-01-14T12:00:00.000Z',
          phases: [
            createPhaseRecord({ number: 1, duration: 30000, status: 'completed', retried: true })
          ]
        })
      )

      const metrics = await service.getVelocityMetrics('7days')

      expect(metrics.phases.completed).toBe(4)
      expect(metrics.phases.retried).toBe(2)
      expect(metrics.phases.retryRate).toBeCloseTo(0.5, 2) // 2/4
      // Average duration = (60000 + 120000 + 90000 + 30000) / 4 = 75000ms
      expect(metrics.phases.avgDuration).toBe(75000)
    })

    it('should calculate correct token metrics', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))

      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 1,
          startedAt: '2024-01-14T10:00:00.000Z',
          totalTokens: 10000,
          phases: [
            createPhaseRecord({ tokens: 3000 }),
            createPhaseRecord({ tokens: 4000 }),
            createPhaseRecord({ tokens: 3000 })
          ]
        })
      )
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 2,
          startedAt: '2024-01-14T12:00:00.000Z',
          totalTokens: 6000,
          phases: [createPhaseRecord({ tokens: 6000 })]
        })
      )

      const metrics = await service.getVelocityMetrics('7days')

      expect(metrics.tokens.total).toBe(16000)
      expect(metrics.tokens.perIssue).toBe(8000) // 16000 / 2
      expect(metrics.tokens.perPhase).toBe(4000) // 16000 / 4
    })

    it('should filter by 7days period', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))

      // Within 7 days
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 1,
          startedAt: '2024-01-14T10:00:00.000Z',
          status: 'completed'
        })
      )
      // Outside 7 days
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 2,
          startedAt: '2024-01-01T10:00:00.000Z',
          status: 'completed'
        })
      )

      const metrics = await service.getVelocityMetrics('7days')

      expect(metrics.issues.completed).toBe(1)
    })

    it('should filter by 30days period', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-02-15T12:00:00.000Z'))

      // Within 30 days
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 1,
          startedAt: '2024-02-01T10:00:00.000Z',
          status: 'completed'
        })
      )
      // Outside 30 days
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 2,
          startedAt: '2024-01-01T10:00:00.000Z',
          status: 'completed'
        })
      )

      const metrics = await service.getVelocityMetrics('30days')

      expect(metrics.issues.completed).toBe(1)
    })

    it('should filter by 90days period', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-04-15T12:00:00.000Z'))

      // Within 90 days
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 1,
          startedAt: '2024-02-01T10:00:00.000Z',
          status: 'completed'
        })
      )
      // Outside 90 days
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 2,
          startedAt: '2024-01-01T10:00:00.000Z',
          status: 'completed'
        })
      )

      const metrics = await service.getVelocityMetrics('90days')

      expect(metrics.issues.completed).toBe(1)
    })

    it('should include all executions for "all" period', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-12-01T12:00:00.000Z'))

      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 1,
          startedAt: '2024-01-01T10:00:00.000Z',
          status: 'completed'
        })
      )
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 2,
          startedAt: '2023-01-01T10:00:00.000Z',
          status: 'completed'
        })
      )

      const metrics = await service.getVelocityMetrics('all')

      expect(metrics.issues.completed).toBe(2)
    })

    it('should include comparison data with percentage changes', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))

      // Current period (last 7 days): 4 completed, 1 failed, avg duration 2h, 11000 tokens total
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 1,
          status: 'completed',
          startedAt: '2024-01-14T10:00:00.000Z',
          completedAt: '2024-01-14T12:00:00.000Z',
          totalTokens: 2500
        })
      )
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 2,
          status: 'completed',
          startedAt: '2024-01-13T10:00:00.000Z',
          completedAt: '2024-01-13T12:00:00.000Z',
          totalTokens: 2500
        })
      )
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 3,
          status: 'completed',
          startedAt: '2024-01-12T10:00:00.000Z',
          completedAt: '2024-01-12T12:00:00.000Z',
          totalTokens: 2500
        })
      )
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 4,
          status: 'completed',
          startedAt: '2024-01-11T10:00:00.000Z',
          completedAt: '2024-01-11T12:00:00.000Z',
          totalTokens: 2500
        })
      )
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 5,
          status: 'failed',
          startedAt: '2024-01-10T10:00:00.000Z',
          completedAt: '2024-01-10T11:00:00.000Z',
          totalTokens: 1000
        })
      )

      // Previous period (7-14 days ago): 2 completed, 0 failed, avg duration 1h, 4000 tokens total
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 6,
          status: 'completed',
          startedAt: '2024-01-05T10:00:00.000Z',
          completedAt: '2024-01-05T11:00:00.000Z',
          totalTokens: 2000
        })
      )
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 7,
          status: 'completed',
          startedAt: '2024-01-04T10:00:00.000Z',
          completedAt: '2024-01-04T11:00:00.000Z',
          totalTokens: 2000
        })
      )

      const metrics = await service.getVelocityMetrics('7days')

      expect(metrics.comparison).toBeDefined()
      // issuesDelta: (4 - 2) / 2 * 100 = 100% increase
      expect(metrics.comparison!.issuesDelta).toBeCloseTo(100, 0)
      // successRateDelta: (0.8 - 1.0) / 1.0 * 100 = -20% (worse)
      expect(metrics.comparison!.successRateDelta).toBeCloseTo(-20, 0)
      // durationDelta: (2h - 1h) / 1h * 100 = 100% longer
      expect(metrics.comparison!.durationDelta).toBeCloseTo(100, 0)
      // tokensDelta: (11000 - 4000) / 4000 * 100 = 175% increase
      expect(metrics.comparison!.tokensDelta).toBeCloseTo(175, 0)
    })

    it('should not include comparison when no previous period data', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))

      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 1,
          startedAt: '2024-01-14T10:00:00.000Z',
          status: 'completed'
        })
      )

      const metrics = await service.getVelocityMetrics('7days')

      // Comparison should be undefined when no previous period data
      expect(metrics.comparison).toBeUndefined()
    })

    it('should not count in_progress issues as completed or failed', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))

      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 1,
          status: 'in_progress',
          startedAt: '2024-01-14T10:00:00.000Z',
          completedAt: undefined
        })
      )

      const metrics = await service.getVelocityMetrics('7days')

      expect(metrics.issues.completed).toBe(0)
      expect(metrics.issues.failed).toBe(0)
    })
  })

  describe('getTimeSeriesData', () => {
    it('should return correct structure', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))

      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 1,
          startedAt: '2024-01-14T10:00:00.000Z',
          status: 'completed'
        })
      )

      const data = await service.getTimeSeriesData('issues', '7days', 'day')

      expect(Array.isArray(data)).toBe(true)
      if (data.length > 0) {
        expect(data[0]).toHaveProperty('date')
        expect(data[0]).toHaveProperty('value')
        expect(typeof data[0].date).toBe('string')
        expect(typeof data[0].value).toBe('number')
      }
    })

    it('should return empty array for no data', async () => {
      const data = await service.getTimeSeriesData('issues', '7days', 'day')
      expect(data).toEqual([])
    })

    it('should aggregate by day granularity', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))

      // 2 issues on day 1, 1 issue on day 2
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 1,
          startedAt: '2024-01-14T10:00:00.000Z',
          status: 'completed'
        })
      )
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 2,
          startedAt: '2024-01-14T15:00:00.000Z',
          status: 'completed'
        })
      )
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 3,
          startedAt: '2024-01-13T10:00:00.000Z',
          status: 'completed'
        })
      )

      const data = await service.getTimeSeriesData('issues', '7days', 'day')

      const day14 = data.find((d) => d.date === '2024-01-14')
      const day13 = data.find((d) => d.date === '2024-01-13')

      expect(day14?.value).toBe(2)
      expect(day13?.value).toBe(1)
    })

    it('should aggregate by week granularity', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-31T12:00:00.000Z'))

      // Week 1: 2 issues
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 1,
          startedAt: '2024-01-28T10:00:00.000Z',
          status: 'completed'
        })
      )
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 2,
          startedAt: '2024-01-29T10:00:00.000Z',
          status: 'completed'
        })
      )
      // Week 2: 1 issue
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 3,
          startedAt: '2024-01-20T10:00:00.000Z',
          status: 'completed'
        })
      )

      const data = await service.getTimeSeriesData('issues', '30days', 'week')

      expect(data.length).toBeGreaterThanOrEqual(2)
    })

    it('should aggregate by month granularity', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-04-01T12:00:00.000Z'))

      // January: 1 issue
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 1,
          startedAt: '2024-01-15T10:00:00.000Z',
          status: 'completed'
        })
      )
      // February: 2 issues
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 2,
          startedAt: '2024-02-10T10:00:00.000Z',
          status: 'completed'
        })
      )
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 3,
          startedAt: '2024-02-20T10:00:00.000Z',
          status: 'completed'
        })
      )

      const data = await service.getTimeSeriesData('issues', '90days', 'month')

      const jan = data.find((d) => d.date.startsWith('2024-01'))
      const feb = data.find((d) => d.date.startsWith('2024-02'))

      expect(jan?.value).toBe(1)
      expect(feb?.value).toBe(2)
    })

    it('should handle issues metric type', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))

      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 1,
          startedAt: '2024-01-14T10:00:00.000Z',
          status: 'completed'
        })
      )

      const data = await service.getTimeSeriesData('issues', '7days', 'day')
      expect(data.some((d) => d.value === 1)).toBe(true)
    })

    it('should handle phases metric type', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))

      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 1,
          startedAt: '2024-01-14T10:00:00.000Z',
          phases: [
            createPhaseRecord({ status: 'completed' }),
            createPhaseRecord({ status: 'completed' }),
            createPhaseRecord({ status: 'completed' })
          ]
        })
      )

      const data = await service.getTimeSeriesData('phases', '7days', 'day')
      expect(data.some((d) => d.value === 3)).toBe(true)
    })

    it('should handle tokens metric type', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))

      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 1,
          startedAt: '2024-01-14T10:00:00.000Z',
          totalTokens: 5000
        })
      )

      const data = await service.getTimeSeriesData('tokens', '7days', 'day')
      expect(data.some((d) => d.value === 5000)).toBe(true)
    })

    it('should handle duration metric type', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))

      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 1,
          startedAt: '2024-01-14T10:00:00.000Z',
          completedAt: '2024-01-14T12:00:00.000Z', // 2 hours
          status: 'completed'
        })
      )

      const data = await service.getTimeSeriesData('duration', '7days', 'day')
      // Duration should be 2 hours = 7200000ms
      expect(data.some((d) => d.value === 7200000)).toBe(true)
    })

    it('should sort results chronologically', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))

      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 1,
          startedAt: '2024-01-14T10:00:00.000Z'
        })
      )
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 2,
          startedAt: '2024-01-12T10:00:00.000Z'
        })
      )
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 3,
          startedAt: '2024-01-13T10:00:00.000Z'
        })
      )

      const data = await service.getTimeSeriesData('issues', '7days', 'day')

      // Verify dates are in ascending order
      for (let i = 1; i < data.length; i++) {
        expect(data[i].date >= data[i - 1].date).toBe(true)
      }
    })
  })

  describe('getBreakdown', () => {
    it('should return correct structure', async () => {
      await service.recordExecution(createExecutionRecord({ issueType: 'feature' }))

      const breakdown = await service.getBreakdown('type')

      expect(Array.isArray(breakdown)).toBe(true)
      if (breakdown.length > 0) {
        expect(breakdown[0]).toHaveProperty('label')
        expect(breakdown[0]).toHaveProperty('value')
        expect(breakdown[0]).toHaveProperty('percentage')
        expect(typeof breakdown[0].label).toBe('string')
        expect(typeof breakdown[0].value).toBe('number')
        expect(typeof breakdown[0].percentage).toBe('number')
      }
    })

    it('should return empty array for no data', async () => {
      const breakdown = await service.getBreakdown('type')
      expect(breakdown).toEqual([])
    })

    it('should breakdown by type dimension', async () => {
      // 3 features, 2 bugs, 1 refactor
      await service.recordExecution(createExecutionRecord({ issueNumber: 1, issueType: 'feature' }))
      await service.recordExecution(createExecutionRecord({ issueNumber: 2, issueType: 'feature' }))
      await service.recordExecution(createExecutionRecord({ issueNumber: 3, issueType: 'feature' }))
      await service.recordExecution(createExecutionRecord({ issueNumber: 4, issueType: 'bug' }))
      await service.recordExecution(createExecutionRecord({ issueNumber: 5, issueType: 'bug' }))
      await service.recordExecution(createExecutionRecord({ issueNumber: 6, issueType: 'refactor' }))

      const breakdown = await service.getBreakdown('type')

      const features = breakdown.find((b) => b.label === 'feature')
      const bugs = breakdown.find((b) => b.label === 'bug')
      const refactors = breakdown.find((b) => b.label === 'refactor')

      expect(features?.value).toBe(3)
      expect(features?.percentage).toBeCloseTo(50, 0)
      expect(bugs?.value).toBe(2)
      expect(bugs?.percentage).toBeCloseTo(33.33, 0)
      expect(refactors?.value).toBe(1)
      expect(refactors?.percentage).toBeCloseTo(16.67, 0)
    })

    it('should breakdown by phase dimension', async () => {
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 1,
          phases: [
            createPhaseRecord({ number: 1, title: 'Planning' }),
            createPhaseRecord({ number: 2, title: 'Implementation' }),
            createPhaseRecord({ number: 3, title: 'Testing' })
          ]
        })
      )
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 2,
          phases: [
            createPhaseRecord({ number: 1, title: 'Planning' }),
            createPhaseRecord({ number: 2, title: 'Implementation' })
          ]
        })
      )

      const breakdown = await service.getBreakdown('phase')

      const planning = breakdown.find((b) => b.label === 'Planning')
      const implementation = breakdown.find((b) => b.label === 'Implementation')
      const testing = breakdown.find((b) => b.label === 'Testing')

      expect(planning?.value).toBe(2)
      expect(implementation?.value).toBe(2)
      expect(testing?.value).toBe(1)
    })

    it('should breakdown by status dimension', async () => {
      // 3 completed, 2 failed, 1 in_progress
      await service.recordExecution(createExecutionRecord({ issueNumber: 1, status: 'completed' }))
      await service.recordExecution(createExecutionRecord({ issueNumber: 2, status: 'completed' }))
      await service.recordExecution(createExecutionRecord({ issueNumber: 3, status: 'completed' }))
      await service.recordExecution(createExecutionRecord({ issueNumber: 4, status: 'failed' }))
      await service.recordExecution(createExecutionRecord({ issueNumber: 5, status: 'failed' }))
      await service.recordExecution(createExecutionRecord({ issueNumber: 6, status: 'in_progress' }))

      const breakdown = await service.getBreakdown('status')

      const completed = breakdown.find((b) => b.label === 'completed')
      const failed = breakdown.find((b) => b.label === 'failed')
      const inProgress = breakdown.find((b) => b.label === 'in_progress')

      expect(completed?.value).toBe(3)
      expect(completed?.percentage).toBeCloseTo(50, 0)
      expect(failed?.value).toBe(2)
      expect(failed?.percentage).toBeCloseTo(33.33, 0)
      expect(inProgress?.value).toBe(1)
      expect(inProgress?.percentage).toBeCloseTo(16.67, 0)
    })

    it('should sort breakdown by value descending', async () => {
      await service.recordExecution(createExecutionRecord({ issueNumber: 1, issueType: 'docs' }))
      await service.recordExecution(createExecutionRecord({ issueNumber: 2, issueType: 'feature' }))
      await service.recordExecution(createExecutionRecord({ issueNumber: 3, issueType: 'feature' }))
      await service.recordExecution(createExecutionRecord({ issueNumber: 4, issueType: 'feature' }))
      await service.recordExecution(createExecutionRecord({ issueNumber: 5, issueType: 'bug' }))
      await service.recordExecution(createExecutionRecord({ issueNumber: 6, issueType: 'bug' }))

      const breakdown = await service.getBreakdown('type')

      // Should be sorted: feature (3), bug (2), docs (1)
      expect(breakdown[0].label).toBe('feature')
      expect(breakdown[1].label).toBe('bug')
      expect(breakdown[2].label).toBe('docs')
    })

    it('should calculate percentages that sum to 100', async () => {
      await service.recordExecution(createExecutionRecord({ issueNumber: 1, issueType: 'feature' }))
      await service.recordExecution(createExecutionRecord({ issueNumber: 2, issueType: 'bug' }))
      await service.recordExecution(createExecutionRecord({ issueNumber: 3, issueType: 'refactor' }))

      const breakdown = await service.getBreakdown('type')

      const totalPercentage = breakdown.reduce((sum, b) => sum + b.percentage, 0)
      expect(totalPercentage).toBeCloseTo(100, 0)
    })
  })

  describe('file persistence', () => {
    it('should persist data across service instances', async () => {
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 42,
          issueTitle: 'Persist Test'
        })
      )

      // Create new instance
      const newService = new AnalyticsService(testProjectPath)
      const executions = await newService.getRecentExecutions()

      expect(executions).toHaveLength(1)
      expect(executions[0].issueNumber).toBe(42)
      expect(executions[0].issueTitle).toBe('Persist Test')
    })

    it('should handle corrupted file gracefully', async () => {
      // Create corrupted file
      const analyticsPath = join(testProjectPath, '.tiki', 'analytics')
      await mkdir(analyticsPath, { recursive: true })
      await writeFile(join(analyticsPath, 'executions.json'), 'not valid json', 'utf-8')

      // Should not throw, should return empty
      const executions = await service.getRecentExecutions()
      expect(Array.isArray(executions)).toBe(true)
      expect(executions).toHaveLength(0)
    })

    it('should handle missing file gracefully', async () => {
      const newPath = join(testProjectPath, 'new-project')
      await mkdir(newPath, { recursive: true })
      const newService = new AnalyticsService(newPath)

      const executions = await newService.getRecentExecutions()
      expect(executions).toEqual([])
    })
  })

  describe('edge cases', () => {
    it('should handle execution with no phases', async () => {
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 1,
          phases: []
        })
      )

      const metrics = await service.getVelocityMetrics('all')
      expect(metrics.phases.completed).toBe(0)
      expect(metrics.tokens.perPhase).toBe(0) // Avoid division by zero
    })

    it('should handle execution with no completedAt', async () => {
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 1,
          status: 'in_progress',
          completedAt: undefined
        })
      )

      const metrics = await service.getVelocityMetrics('all')
      // Should not crash, duration should not be calculated for incomplete issues
      expect(metrics.issues.avgDuration).toBe(0)
    })

    it('should handle concurrent writes', async () => {
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(
          service.recordExecution(
            createExecutionRecord({
              issueNumber: i,
              issueTitle: `Issue ${i}`
            })
          )
        )
      }

      await Promise.all(promises)

      const executions = await service.getRecentExecutions()
      expect(executions.length).toBe(10)
    })

    it('should handle very large token counts', async () => {
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 1,
          totalTokens: 1000000000 // 1 billion tokens
        })
      )

      const metrics = await service.getVelocityMetrics('all')
      expect(metrics.tokens.total).toBe(1000000000)
    })

    it('should handle zero duration correctly', async () => {
      const now = new Date().toISOString()
      await service.recordExecution(
        createExecutionRecord({
          issueNumber: 1,
          startedAt: now,
          completedAt: now, // Same time
          status: 'completed'
        })
      )

      const metrics = await service.getVelocityMetrics('all')
      expect(metrics.issues.avgDuration).toBe(0)
    })
  })

  describe('singleton export', () => {
    it('should export a singleton instance', () => {
      expect(analyticsService).toBeInstanceOf(AnalyticsService)
    })
  })
})
