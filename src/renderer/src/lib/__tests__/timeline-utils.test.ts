import { describe, it, expect } from 'vitest'
import {
  formatDuration,
  formatTime,
  generateTicks,
  calculateTotalDuration,
  calculateOffset,
  calculateEndTime,
  extractTimeline
} from '../timeline-utils'
import type { PhaseExecution, ExecutionTimeline } from '../../types/timeline'
import type { ExecutionPlan, TikiState } from '../../stores/tiki-store'

describe('timeline-utils', () => {
  describe('formatDuration', () => {
    it('should format milliseconds to human readable string', () => {
      expect(formatDuration(1000)).toBe('1s')
      expect(formatDuration(60000)).toBe('1m 0s')
      expect(formatDuration(90000)).toBe('1m 30s')
      expect(formatDuration(3600000)).toBe('1h 0m')
      expect(formatDuration(3661000)).toBe('1h 1m')
    })

    it('should handle undefined duration', () => {
      expect(formatDuration(undefined)).toBe('--')
    })

    it('should handle zero duration', () => {
      expect(formatDuration(0)).toBe('0s')
    })
  })

  describe('formatTime', () => {
    it('should format Date to time string', () => {
      const date = new Date('2024-01-15T10:30:45.000Z')
      const result = formatTime(date)
      // Should be in HH:MM format
      expect(result).toMatch(/^\d{1,2}:\d{2}/)
    })

    it('should handle midnight', () => {
      const date = new Date('2024-01-15T00:00:00.000Z')
      const result = formatTime(date)
      expect(result).toMatch(/^\d{1,2}:\d{2}/)
    })
  })

  describe('generateTicks', () => {
    it('should generate correct number of ticks', () => {
      const start = new Date('2024-01-15T10:00:00.000Z')
      const end = new Date('2024-01-15T10:30:00.000Z')

      const ticks = generateTicks(start, end, 5)
      expect(ticks).toHaveLength(5)
    })

    it('should have ticks evenly distributed', () => {
      const start = new Date('2024-01-15T10:00:00.000Z')
      const end = new Date('2024-01-15T10:40:00.000Z')

      const ticks = generateTicks(start, end, 5)

      // First tick should be at start
      expect(ticks[0].getTime()).toBe(start.getTime())
      // Last tick should be at end
      expect(ticks[4].getTime()).toBe(end.getTime())
    })

    it('should handle same start and end time', () => {
      const time = new Date('2024-01-15T10:00:00.000Z')

      const ticks = generateTicks(time, time, 3)
      expect(ticks).toHaveLength(3)
      ticks.forEach((tick) => {
        expect(tick.getTime()).toBe(time.getTime())
      })
    })
  })

  describe('calculateTotalDuration', () => {
    it('should calculate total duration from executions', () => {
      const executions: PhaseExecution[] = [
        {
          phaseNumber: 1,
          phaseName: 'Phase 1',
          issueNumber: 25,
          startedAt: '2024-01-15T10:00:00.000Z',
          completedAt: '2024-01-15T10:05:00.000Z',
          status: 'completed',
          durationMs: 300000
        },
        {
          phaseNumber: 2,
          phaseName: 'Phase 2',
          issueNumber: 25,
          startedAt: '2024-01-15T10:05:00.000Z',
          completedAt: '2024-01-15T10:15:00.000Z',
          status: 'completed',
          durationMs: 600000
        }
      ]

      expect(calculateTotalDuration(executions)).toBe(900000) // 15 minutes
    })

    it('should return 0 for empty executions', () => {
      expect(calculateTotalDuration([])).toBe(0)
    })

    it('should handle running executions without duration', () => {
      const now = Date.now()
      const executions: PhaseExecution[] = [
        {
          phaseNumber: 1,
          phaseName: 'Phase 1',
          issueNumber: 25,
          startedAt: new Date(now - 60000).toISOString(), // Started 1 minute ago
          status: 'running'
        }
      ]

      const duration = calculateTotalDuration(executions)
      expect(duration).toBeGreaterThanOrEqual(60000)
    })
  })

  describe('calculateOffset', () => {
    it('should calculate correct offset for a phase', () => {
      const executions: PhaseExecution[] = [
        {
          phaseNumber: 1,
          phaseName: 'Phase 1',
          issueNumber: 25,
          startedAt: '2024-01-15T10:00:00.000Z',
          completedAt: '2024-01-15T10:05:00.000Z',
          status: 'completed',
          durationMs: 300000
        },
        {
          phaseNumber: 2,
          phaseName: 'Phase 2',
          issueNumber: 25,
          startedAt: '2024-01-15T10:05:00.000Z',
          completedAt: '2024-01-15T10:15:00.000Z',
          status: 'completed',
          durationMs: 600000
        }
      ]

      expect(calculateOffset(executions, 0)).toBe(0)
      expect(calculateOffset(executions, 1)).toBe(300000)
    })

    it('should return 0 for first phase', () => {
      const executions: PhaseExecution[] = [
        {
          phaseNumber: 1,
          phaseName: 'Phase 1',
          issueNumber: 25,
          startedAt: '2024-01-15T10:00:00.000Z',
          status: 'running'
        }
      ]

      expect(calculateOffset(executions, 0)).toBe(0)
    })
  })

  describe('calculateEndTime', () => {
    it('should return the end time of the last completed phase', () => {
      const timeline: ExecutionTimeline = {
        executions: [
          {
            phaseNumber: 1,
            phaseName: 'Phase 1',
            issueNumber: 25,
            startedAt: '2024-01-15T10:00:00.000Z',
            completedAt: '2024-01-15T10:05:00.000Z',
            status: 'completed',
            durationMs: 300000
          },
          {
            phaseNumber: 2,
            phaseName: 'Phase 2',
            issueNumber: 25,
            startedAt: '2024-01-15T10:05:00.000Z',
            completedAt: '2024-01-15T10:15:00.000Z',
            status: 'completed',
            durationMs: 600000
          }
        ],
        issueNumber: 25,
        startedAt: '2024-01-15T10:00:00.000Z'
      }

      const endTime = calculateEndTime(timeline)
      expect(endTime.toISOString()).toBe('2024-01-15T10:15:00.000Z')
    })

    it('should use current time for running phases', () => {
      const timeline: ExecutionTimeline = {
        executions: [
          {
            phaseNumber: 1,
            phaseName: 'Phase 1',
            issueNumber: 25,
            startedAt: '2024-01-15T10:00:00.000Z',
            status: 'running'
          }
        ],
        currentExecution: {
          phaseNumber: 1,
          phaseName: 'Phase 1',
          issueNumber: 25,
          startedAt: '2024-01-15T10:00:00.000Z',
          status: 'running'
        },
        issueNumber: 25,
        startedAt: '2024-01-15T10:00:00.000Z'
      }

      const before = Date.now()
      const endTime = calculateEndTime(timeline)
      const after = Date.now()

      expect(endTime.getTime()).toBeGreaterThanOrEqual(before)
      expect(endTime.getTime()).toBeLessThanOrEqual(after)
    })

    it('should return startedAt for empty executions', () => {
      const timeline: ExecutionTimeline = {
        executions: [],
        issueNumber: 25,
        startedAt: '2024-01-15T10:00:00.000Z'
      }

      const endTime = calculateEndTime(timeline)
      expect(endTime.toISOString()).toBe('2024-01-15T10:00:00.000Z')
    })
  })

  describe('extractTimeline', () => {
    const basePlan: ExecutionPlan = {
      issue: { number: 25, title: 'Test Issue' },
      status: 'executing',
      phases: [
        {
          number: 1,
          title: 'Setup',
          status: 'completed',
          files: ['src/main.ts'],
          verification: ['Test passes'],
          summary: 'Setup completed'
        },
        {
          number: 2,
          title: 'Implementation',
          status: 'in_progress',
          files: ['src/feature.ts'],
          verification: ['Feature works']
        },
        {
          number: 3,
          title: 'Testing',
          status: 'pending',
          files: [],
          verification: ['All tests pass']
        }
      ]
    }

    const baseState: TikiState = {
      activeIssue: 25,
      currentPhase: 2,
      status: 'executing',
      completedPhases: [1],
      lastActivity: '2024-01-15T10:10:00.000Z'
    }

    it('should extract timeline from execution plan', () => {
      const timeline = extractTimeline(basePlan, baseState)

      expect(timeline.issueNumber).toBe(25)
      expect(timeline.executions).toHaveLength(2) // Only completed + running
    })

    it('should include completed phases', () => {
      const timeline = extractTimeline(basePlan, baseState)

      const completedPhase = timeline.executions.find((e) => e.phaseNumber === 1)
      expect(completedPhase).toBeDefined()
      expect(completedPhase?.status).toBe('completed')
    })

    it('should include running phase as current execution', () => {
      const timeline = extractTimeline(basePlan, baseState)

      expect(timeline.currentExecution).toBeDefined()
      expect(timeline.currentExecution?.phaseNumber).toBe(2)
      expect(timeline.currentExecution?.status).toBe('running')
    })

    it('should include failed phases', () => {
      const failedPlan: ExecutionPlan = {
        ...basePlan,
        phases: [
          { ...basePlan.phases[0], status: 'completed' },
          { ...basePlan.phases[1], status: 'failed', error: 'Build error' }
        ]
      }
      const failedState: TikiState = {
        ...baseState,
        status: 'failed',
        currentPhase: null
      }

      const timeline = extractTimeline(failedPlan, failedState)

      const failedPhase = timeline.executions.find((e) => e.phaseNumber === 2)
      expect(failedPhase).toBeDefined()
      expect(failedPhase?.status).toBe('failed')
      expect(failedPhase?.error).toBe('Build error')
    })

    it('should include skipped phases', () => {
      const skippedPlan: ExecutionPlan = {
        ...basePlan,
        phases: [
          { ...basePlan.phases[0], status: 'completed' },
          { ...basePlan.phases[1], status: 'skipped' },
          { ...basePlan.phases[2], status: 'completed' }
        ]
      }

      const timeline = extractTimeline(skippedPlan, baseState)

      const skippedPhase = timeline.executions.find((e) => e.phaseNumber === 2)
      expect(skippedPhase).toBeDefined()
      expect(skippedPhase?.status).toBe('skipped')
    })

    it('should handle null plan', () => {
      const timeline = extractTimeline(null, baseState)

      expect(timeline.executions).toHaveLength(0)
      expect(timeline.issueNumber).toBe(0)
    })

    it('should handle null state', () => {
      const timeline = extractTimeline(basePlan, null)

      expect(timeline.issueNumber).toBe(25)
      // Should include phases based on plan status
    })
  })
})
