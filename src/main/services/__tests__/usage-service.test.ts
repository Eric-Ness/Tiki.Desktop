/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { UsageService, MODEL_PRICING } from '../usage-service'

// Mock crypto for UUID generation
vi.mock('crypto', () => ({
  randomUUID: vi.fn().mockReturnValue('mock-uuid-123')
}))

// Mock electron - needed for default constructor
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue(os.tmpdir())
  }
}))

describe('usage-service', () => {
  let tempDir: string
  let usageFilePath: string

  beforeEach(() => {
    // Create a unique temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'usage-test-'))
    usageFilePath = path.join(tempDir, 'usage.json')
  })

  afterEach(() => {
    // Clean up temp directory
    try {
      if (fs.existsSync(usageFilePath)) {
        fs.unlinkSync(usageFilePath)
      }
      fs.rmdirSync(tempDir)
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('UsageService initialization', () => {
    it('should load existing records from storage if file exists', () => {
      const existingRecords = [
        {
          id: 'existing-1',
          timestamp: '2024-01-15T10:00:00.000Z',
          inputTokens: 1000,
          outputTokens: 500,
          model: 'claude-3-sonnet',
          sessionId: 'session-1'
        }
      ]
      fs.writeFileSync(usageFilePath, JSON.stringify(existingRecords))

      const service = new UsageService(usageFilePath)
      const records = service.getRecords()

      expect(records).toHaveLength(1)
      expect(records[0].id).toBe('existing-1')
      expect(records[0].inputTokens).toBe(1000)
    })

    it('should start with empty records if file does not exist', () => {
      const service = new UsageService(usageFilePath)
      const records = service.getRecords()

      expect(records).toHaveLength(0)
    })

    it('should handle corrupted storage file gracefully', () => {
      fs.writeFileSync(usageFilePath, 'invalid json {{{')

      const service = new UsageService(usageFilePath)
      const records = service.getRecords()

      expect(records).toHaveLength(0)
    })
  })

  describe('addRecord', () => {
    it('should add a new usage record with generated id and timestamp', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))

      const service = new UsageService(usageFilePath)

      service.addRecord({
        inputTokens: 500,
        outputTokens: 1000,
        model: 'claude-3-sonnet',
        sessionId: 'test-session'
      })

      const records = service.getRecords()
      expect(records).toHaveLength(1)
      expect(records[0]).toMatchObject({
        id: 'mock-uuid-123',
        timestamp: '2024-01-15T12:00:00.000Z',
        inputTokens: 500,
        outputTokens: 1000,
        model: 'claude-3-sonnet',
        sessionId: 'test-session'
      })

      vi.useRealTimers()
    })

    it('should save records to storage after adding', () => {
      const service = new UsageService(usageFilePath)

      service.addRecord({
        inputTokens: 100,
        outputTokens: 200,
        model: 'claude-3-haiku',
        sessionId: 'test-session'
      })

      // Verify file was written
      expect(fs.existsSync(usageFilePath)).toBe(true)
      const savedData = JSON.parse(fs.readFileSync(usageFilePath, 'utf8'))
      expect(savedData).toHaveLength(1)
    })

    it('should include optional issueNumber when provided', () => {
      const service = new UsageService(usageFilePath)

      service.addRecord({
        inputTokens: 100,
        outputTokens: 200,
        model: 'claude-3-sonnet',
        sessionId: 'test-session',
        issueNumber: 42
      })

      const records = service.getRecords()
      expect(records[0].issueNumber).toBe(42)
    })
  })

  describe('getRecords', () => {
    it('should return all records when no since date is provided', () => {
      const existingRecords = [
        {
          id: '1',
          timestamp: '2024-01-10T10:00:00.000Z',
          inputTokens: 100,
          outputTokens: 50,
          model: 'claude-3-sonnet',
          sessionId: 'session-1'
        },
        {
          id: '2',
          timestamp: '2024-01-15T10:00:00.000Z',
          inputTokens: 200,
          outputTokens: 100,
          model: 'claude-3-sonnet',
          sessionId: 'session-2'
        }
      ]
      fs.writeFileSync(usageFilePath, JSON.stringify(existingRecords))

      const service = new UsageService(usageFilePath)
      const records = service.getRecords()

      expect(records).toHaveLength(2)
    })

    it('should filter records by since date', () => {
      const existingRecords = [
        {
          id: '1',
          timestamp: '2024-01-10T10:00:00.000Z',
          inputTokens: 100,
          outputTokens: 50,
          model: 'claude-3-sonnet',
          sessionId: 'session-1'
        },
        {
          id: '2',
          timestamp: '2024-01-15T10:00:00.000Z',
          inputTokens: 200,
          outputTokens: 100,
          model: 'claude-3-sonnet',
          sessionId: 'session-2'
        },
        {
          id: '3',
          timestamp: '2024-01-20T10:00:00.000Z',
          inputTokens: 300,
          outputTokens: 150,
          model: 'claude-3-sonnet',
          sessionId: 'session-3'
        }
      ]
      fs.writeFileSync(usageFilePath, JSON.stringify(existingRecords))

      const service = new UsageService(usageFilePath)
      const records = service.getRecords(new Date('2024-01-14T00:00:00.000Z'))

      expect(records).toHaveLength(2)
      expect(records[0].id).toBe('2')
      expect(records[1].id).toBe('3')
    })
  })

  describe('getSummary', () => {
    it('should calculate correct totals for all records', () => {
      const existingRecords = [
        {
          id: '1',
          timestamp: '2024-01-10T10:00:00.000Z',
          inputTokens: 1000,
          outputTokens: 500,
          model: 'claude-3-sonnet',
          sessionId: 'session-1'
        },
        {
          id: '2',
          timestamp: '2024-01-15T10:00:00.000Z',
          inputTokens: 2000,
          outputTokens: 1000,
          model: 'claude-3-sonnet',
          sessionId: 'session-2'
        }
      ]
      fs.writeFileSync(usageFilePath, JSON.stringify(existingRecords))

      const service = new UsageService(usageFilePath)
      const summary = service.getSummary()

      expect(summary.totalInputTokens).toBe(3000)
      expect(summary.totalOutputTokens).toBe(1500)
      expect(summary.recordCount).toBe(2)
    })

    it('should calculate estimated cost based on model pricing', () => {
      // claude-3-sonnet: input $3/1M, output $15/1M
      const existingRecords = [
        {
          id: '1',
          timestamp: '2024-01-10T10:00:00.000Z',
          inputTokens: 1000000, // 1M tokens = $3
          outputTokens: 1000000, // 1M tokens = $15
          model: 'claude-3-sonnet',
          sessionId: 'session-1'
        }
      ]
      fs.writeFileSync(usageFilePath, JSON.stringify(existingRecords))

      const service = new UsageService(usageFilePath)
      const summary = service.getSummary()

      expect(summary.estimatedCost).toBe(18) // $3 + $15
    })

    it('should use default pricing for unknown models', () => {
      const existingRecords = [
        {
          id: '1',
          timestamp: '2024-01-10T10:00:00.000Z',
          inputTokens: 1000000,
          outputTokens: 1000000,
          model: 'unknown-model',
          sessionId: 'session-1'
        }
      ]
      fs.writeFileSync(usageFilePath, JSON.stringify(existingRecords))

      const service = new UsageService(usageFilePath)
      const summary = service.getSummary()

      // Default pricing is same as claude-3-sonnet: $3 input + $15 output
      expect(summary.estimatedCost).toBe(18)
    })

    it('should filter by since date when provided', () => {
      const existingRecords = [
        {
          id: '1',
          timestamp: '2024-01-10T10:00:00.000Z',
          inputTokens: 1000,
          outputTokens: 500,
          model: 'claude-3-sonnet',
          sessionId: 'session-1'
        },
        {
          id: '2',
          timestamp: '2024-01-15T10:00:00.000Z',
          inputTokens: 2000,
          outputTokens: 1000,
          model: 'claude-3-sonnet',
          sessionId: 'session-2'
        }
      ]
      fs.writeFileSync(usageFilePath, JSON.stringify(existingRecords))

      const service = new UsageService(usageFilePath)
      const summary = service.getSummary(new Date('2024-01-14T00:00:00.000Z'))

      expect(summary.totalInputTokens).toBe(2000)
      expect(summary.totalOutputTokens).toBe(1000)
      expect(summary.recordCount).toBe(1)
    })

    it('should return zeros for empty records', () => {
      const service = new UsageService(usageFilePath)
      const summary = service.getSummary()

      expect(summary.totalInputTokens).toBe(0)
      expect(summary.totalOutputTokens).toBe(0)
      expect(summary.estimatedCost).toBe(0)
      expect(summary.recordCount).toBe(0)
    })

    it('should handle mixed model pricing correctly', () => {
      const existingRecords = [
        {
          id: '1',
          timestamp: '2024-01-10T10:00:00.000Z',
          inputTokens: 1000000, // $3
          outputTokens: 1000000, // $15
          model: 'claude-3-sonnet',
          sessionId: 'session-1'
        },
        {
          id: '2',
          timestamp: '2024-01-15T10:00:00.000Z',
          inputTokens: 1000000, // $0.25
          outputTokens: 1000000, // $1.25
          model: 'claude-3-haiku',
          sessionId: 'session-2'
        }
      ]
      fs.writeFileSync(usageFilePath, JSON.stringify(existingRecords))

      const service = new UsageService(usageFilePath)
      const summary = service.getSummary()

      // sonnet: $18, haiku: $1.50
      expect(summary.estimatedCost).toBe(19.5)
    })
  })

  describe('getIssueUsage', () => {
    it('should return usage summary for a specific issue', () => {
      const existingRecords = [
        {
          id: '1',
          timestamp: '2024-01-10T10:00:00.000Z',
          inputTokens: 1000,
          outputTokens: 500,
          model: 'claude-3-sonnet',
          sessionId: 'session-1',
          issueNumber: 42
        },
        {
          id: '2',
          timestamp: '2024-01-15T10:00:00.000Z',
          inputTokens: 2000,
          outputTokens: 1000,
          model: 'claude-3-sonnet',
          sessionId: 'session-1',
          issueNumber: 42
        },
        {
          id: '3',
          timestamp: '2024-01-15T10:00:00.000Z',
          inputTokens: 500,
          outputTokens: 250,
          model: 'claude-3-sonnet',
          sessionId: 'session-2',
          issueNumber: 99
        }
      ]
      fs.writeFileSync(usageFilePath, JSON.stringify(existingRecords))

      const service = new UsageService(usageFilePath)
      const summary = service.getIssueUsage(42)

      expect(summary.totalInputTokens).toBe(3000)
      expect(summary.totalOutputTokens).toBe(1500)
      expect(summary.recordCount).toBe(2)
    })

    it('should return zeros for issue with no usage', () => {
      const existingRecords = [
        {
          id: '1',
          timestamp: '2024-01-10T10:00:00.000Z',
          inputTokens: 1000,
          outputTokens: 500,
          model: 'claude-3-sonnet',
          sessionId: 'session-1',
          issueNumber: 42
        }
      ]
      fs.writeFileSync(usageFilePath, JSON.stringify(existingRecords))

      const service = new UsageService(usageFilePath)
      const summary = service.getIssueUsage(99)

      expect(summary.totalInputTokens).toBe(0)
      expect(summary.totalOutputTokens).toBe(0)
      expect(summary.recordCount).toBe(0)
    })
  })

  describe('getSessionUsage', () => {
    it('should return usage summary for a specific session', () => {
      const existingRecords = [
        {
          id: '1',
          timestamp: '2024-01-10T10:00:00.000Z',
          inputTokens: 1000,
          outputTokens: 500,
          model: 'claude-3-sonnet',
          sessionId: 'session-1'
        },
        {
          id: '2',
          timestamp: '2024-01-15T10:00:00.000Z',
          inputTokens: 2000,
          outputTokens: 1000,
          model: 'claude-3-sonnet',
          sessionId: 'session-1'
        },
        {
          id: '3',
          timestamp: '2024-01-15T10:00:00.000Z',
          inputTokens: 500,
          outputTokens: 250,
          model: 'claude-3-sonnet',
          sessionId: 'session-2'
        }
      ]
      fs.writeFileSync(usageFilePath, JSON.stringify(existingRecords))

      const service = new UsageService(usageFilePath)
      const summary = service.getSessionUsage('session-1')

      expect(summary.totalInputTokens).toBe(3000)
      expect(summary.totalOutputTokens).toBe(1500)
      expect(summary.recordCount).toBe(2)
    })
  })

  describe('clearHistory', () => {
    it('should clear all records', () => {
      const existingRecords = [
        {
          id: '1',
          timestamp: '2024-01-10T10:00:00.000Z',
          inputTokens: 1000,
          outputTokens: 500,
          model: 'claude-3-sonnet',
          sessionId: 'session-1'
        }
      ]
      fs.writeFileSync(usageFilePath, JSON.stringify(existingRecords))

      const service = new UsageService(usageFilePath)

      // Verify initial state
      expect(service.getRecords()).toHaveLength(1)

      service.clearHistory()

      expect(service.getRecords()).toHaveLength(0)
      // Verify file was updated
      const savedData = JSON.parse(fs.readFileSync(usageFilePath, 'utf8'))
      expect(savedData).toHaveLength(0)
    })
  })

  describe('getDailyUsage', () => {
    it('should return usage grouped by day', () => {
      const existingRecords = [
        {
          id: '1',
          timestamp: '2024-01-10T10:00:00.000Z',
          inputTokens: 1000,
          outputTokens: 500,
          model: 'claude-3-sonnet',
          sessionId: 'session-1'
        },
        {
          id: '2',
          timestamp: '2024-01-10T15:00:00.000Z',
          inputTokens: 2000,
          outputTokens: 1000,
          model: 'claude-3-sonnet',
          sessionId: 'session-1'
        },
        {
          id: '3',
          timestamp: '2024-01-11T10:00:00.000Z',
          inputTokens: 500,
          outputTokens: 250,
          model: 'claude-3-sonnet',
          sessionId: 'session-2'
        }
      ]
      fs.writeFileSync(usageFilePath, JSON.stringify(existingRecords))

      const service = new UsageService(usageFilePath)
      const dailyUsage = service.getDailyUsage()

      expect(dailyUsage).toHaveLength(2)
      expect(dailyUsage[0].date).toBe('2024-01-10')
      expect(dailyUsage[0].totalInputTokens).toBe(3000)
      expect(dailyUsage[0].totalOutputTokens).toBe(1500)
      expect(dailyUsage[1].date).toBe('2024-01-11')
      expect(dailyUsage[1].totalInputTokens).toBe(500)
    })

    it('should filter by days count', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))

      const existingRecords = [
        {
          id: '1',
          timestamp: '2024-01-10T10:00:00.000Z',
          inputTokens: 1000,
          outputTokens: 500,
          model: 'claude-3-sonnet',
          sessionId: 'session-1'
        },
        {
          id: '2',
          timestamp: '2024-01-14T10:00:00.000Z',
          inputTokens: 2000,
          outputTokens: 1000,
          model: 'claude-3-sonnet',
          sessionId: 'session-1'
        }
      ]
      fs.writeFileSync(usageFilePath, JSON.stringify(existingRecords))

      const service = new UsageService(usageFilePath)
      const dailyUsage = service.getDailyUsage(3) // Last 3 days (13, 14, 15)

      expect(dailyUsage).toHaveLength(1)
      expect(dailyUsage[0].date).toBe('2024-01-14')

      vi.useRealTimers()
    })
  })

  describe('MODEL_PRICING', () => {
    it('should calculate correct pricing for claude-3-opus', () => {
      const existingRecords = [
        {
          id: '1',
          timestamp: '2024-01-10T10:00:00.000Z',
          inputTokens: 1000000, // $15
          outputTokens: 1000000, // $75
          model: 'claude-3-opus',
          sessionId: 'session-1'
        }
      ]
      fs.writeFileSync(usageFilePath, JSON.stringify(existingRecords))

      const service = new UsageService(usageFilePath)
      const summary = service.getSummary()

      expect(summary.estimatedCost).toBe(90) // $15 + $75
    })

    it('should calculate correct pricing for claude-3.5-sonnet', () => {
      const existingRecords = [
        {
          id: '1',
          timestamp: '2024-01-10T10:00:00.000Z',
          inputTokens: 1000000, // $3
          outputTokens: 1000000, // $15
          model: 'claude-3.5-sonnet',
          sessionId: 'session-1'
        }
      ]
      fs.writeFileSync(usageFilePath, JSON.stringify(existingRecords))

      const service = new UsageService(usageFilePath)
      const summary = service.getSummary()

      expect(summary.estimatedCost).toBe(18) // $3 + $15
    })

    it('should have correct pricing constants', () => {
      expect(MODEL_PRICING['claude-3-opus']).toEqual({ input: 15, output: 75 })
      expect(MODEL_PRICING['claude-3-sonnet']).toEqual({ input: 3, output: 15 })
      expect(MODEL_PRICING['claude-3-haiku']).toEqual({ input: 0.25, output: 1.25 })
      expect(MODEL_PRICING['claude-3.5-sonnet']).toEqual({ input: 3, output: 15 })
      expect(MODEL_PRICING['default']).toEqual({ input: 3, output: 15 })
    })
  })
})
