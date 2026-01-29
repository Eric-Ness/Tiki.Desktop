/**
 * Tests for LearningService
 *
 * TDD: Tests written first, then implementation
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'path'
import { mkdir, rm, readFile, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import {
  LearningService,
  LearningRecord,
  ConfidenceAdjustment,
  LearningStats,
  learningService
} from '../learning-service'

describe('LearningService', () => {
  let service: LearningService
  let testProjectPath: string

  beforeEach(async () => {
    // Create a unique temp directory for each test
    testProjectPath = join(tmpdir(), `tiki-learning-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    await mkdir(testProjectPath, { recursive: true })
    service = new LearningService()
  })

  afterEach(async () => {
    // Clean up temp directory
    try {
      await rm(testProjectPath, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('LearningRecord interface', () => {
    it('should have all required properties when recording an outcome', async () => {
      await service.recordOutcome('pattern-1', 'strategy-1', 'success', {
        projectPath: testProjectPath,
        issueNumber: 42,
        phaseNumber: 3,
        errorSignature: 'abc123'
      })

      const records = await service.getAllRecords(testProjectPath)
      expect(records.length).toBe(1)

      const record = records[0]
      expect(record).toHaveProperty('id')
      expect(record).toHaveProperty('timestamp')
      expect(record).toHaveProperty('patternId')
      expect(record).toHaveProperty('strategyId')
      expect(record).toHaveProperty('outcome')
      expect(record).toHaveProperty('issueNumber')
      expect(record).toHaveProperty('phaseNumber')
      expect(record).toHaveProperty('errorSignature')

      // Validate types
      expect(typeof record.id).toBe('string')
      expect(typeof record.timestamp).toBe('number')
      expect(record.patternId).toBe('pattern-1')
      expect(record.strategyId).toBe('strategy-1')
      expect(record.outcome).toBe('success')
      expect(record.issueNumber).toBe(42)
      expect(record.phaseNumber).toBe(3)
      expect(record.errorSignature).toBe('abc123')
    })

    it('should generate unique IDs for each record', async () => {
      await service.recordOutcome('pattern-1', 'strategy-1', 'success', {
        projectPath: testProjectPath,
        issueNumber: 1,
        phaseNumber: 1,
        errorSignature: 'sig1'
      })

      await service.recordOutcome('pattern-1', 'strategy-1', 'failure', {
        projectPath: testProjectPath,
        issueNumber: 1,
        phaseNumber: 2,
        errorSignature: 'sig2'
      })

      const records = await service.getAllRecords(testProjectPath)
      expect(records[0].id).not.toBe(records[1].id)
    })
  })

  describe('recordOutcome', () => {
    it('should persist outcome to file', async () => {
      await service.recordOutcome('syntax-error', 'simple-redo', 'success', {
        projectPath: testProjectPath,
        issueNumber: 10,
        phaseNumber: 2,
        errorSignature: 'hash123'
      })

      // Verify file exists and contains the record
      const filePath = join(testProjectPath, '.tiki', 'learning', 'outcomes.json')
      const content = await readFile(filePath, 'utf-8')
      const data = JSON.parse(content)

      expect(data.records).toBeDefined()
      expect(data.records.length).toBe(1)
      expect(data.records[0].patternId).toBe('syntax-error')
    })

    it('should append to existing records', async () => {
      await service.recordOutcome('pattern-a', 'strategy-1', 'success', {
        projectPath: testProjectPath,
        issueNumber: 1,
        phaseNumber: 1,
        errorSignature: 'sig1'
      })

      await service.recordOutcome('pattern-b', 'strategy-2', 'failure', {
        projectPath: testProjectPath,
        issueNumber: 2,
        phaseNumber: 2,
        errorSignature: 'sig2'
      })

      const records = await service.getAllRecords(testProjectPath)
      expect(records.length).toBe(2)
    })

    it('should create directory if it does not exist', async () => {
      const newPath = join(testProjectPath, 'new-project')
      await mkdir(newPath, { recursive: true })

      await service.recordOutcome('pattern-1', 'strategy-1', 'success', {
        projectPath: newPath,
        issueNumber: 1,
        phaseNumber: 1,
        errorSignature: 'sig1'
      })

      const records = await service.getAllRecords(newPath)
      expect(records.length).toBe(1)
    })

    it('should record both success and failure outcomes', async () => {
      await service.recordOutcome('pattern-1', 'strategy-1', 'success', {
        projectPath: testProjectPath,
        issueNumber: 1,
        phaseNumber: 1,
        errorSignature: 'sig1'
      })

      await service.recordOutcome('pattern-1', 'strategy-1', 'failure', {
        projectPath: testProjectPath,
        issueNumber: 2,
        phaseNumber: 1,
        errorSignature: 'sig2'
      })

      const records = await service.getAllRecords(testProjectPath)
      const successes = records.filter(r => r.outcome === 'success')
      const failures = records.filter(r => r.outcome === 'failure')

      expect(successes.length).toBe(1)
      expect(failures.length).toBe(1)
    })
  })

  describe('ConfidenceAdjustment interface', () => {
    it('should have all required properties', async () => {
      // Record enough outcomes to trigger adjustment calculation
      for (let i = 0; i < 5; i++) {
        await service.recordOutcome('pattern-test', 'strategy-test', i < 3 ? 'success' : 'failure', {
          projectPath: testProjectPath,
          issueNumber: i,
          phaseNumber: 1,
          errorSignature: `sig${i}`
        })
      }

      const adjustments = await service.getConfidenceAdjustments(testProjectPath, 0.8)

      expect(adjustments.length).toBeGreaterThan(0)
      const adjustment = adjustments[0]

      expect(adjustment).toHaveProperty('patternId')
      expect(adjustment).toHaveProperty('strategyId')
      expect(adjustment).toHaveProperty('baseConfidence')
      expect(adjustment).toHaveProperty('adjustedConfidence')
      expect(adjustment).toHaveProperty('sampleSize')
      expect(adjustment).toHaveProperty('successRate')

      // Validate types
      expect(typeof adjustment.patternId).toBe('string')
      expect(typeof adjustment.strategyId).toBe('string')
      expect(typeof adjustment.baseConfidence).toBe('number')
      expect(typeof adjustment.adjustedConfidence).toBe('number')
      expect(typeof adjustment.sampleSize).toBe('number')
      expect(typeof adjustment.successRate).toBe('number')
    })
  })

  describe('getAdjustedConfidence', () => {
    it('should return base confidence when sample size is less than 3', async () => {
      // Record only 2 outcomes (below minimum sample size)
      await service.recordOutcome('pattern-1', 'strategy-1', 'success', {
        projectPath: testProjectPath,
        issueNumber: 1,
        phaseNumber: 1,
        errorSignature: 'sig1'
      })

      await service.recordOutcome('pattern-1', 'strategy-1', 'success', {
        projectPath: testProjectPath,
        issueNumber: 2,
        phaseNumber: 1,
        errorSignature: 'sig2'
      })

      const baseConfidence = 0.8
      const adjusted = await service.getAdjustedConfidence(testProjectPath, 'pattern-1', 'strategy-1', baseConfidence)

      expect(adjusted).toBe(baseConfidence)
    })

    it('should apply adjustment formula when sample size is 3 or more', async () => {
      // Record 4 outcomes: 3 success, 1 failure (75% success rate)
      for (let i = 0; i < 4; i++) {
        await service.recordOutcome('pattern-adj', 'strategy-adj', i < 3 ? 'success' : 'failure', {
          projectPath: testProjectPath,
          issueNumber: i,
          phaseNumber: 1,
          errorSignature: `sig${i}`
        })
      }

      const baseConfidence = 0.8
      const adjusted = await service.getAdjustedConfidence(testProjectPath, 'pattern-adj', 'strategy-adj', baseConfidence)

      // Formula: adjustedConfidence = baseConfidence * 0.7 + successRate * 0.3
      // successRate = 3/4 = 0.75
      // adjusted = 0.8 * 0.7 + 0.75 * 0.3 = 0.56 + 0.225 = 0.785
      expect(adjusted).toBeCloseTo(0.785, 3)
    })

    it('should calculate correct success rate', async () => {
      // 2 success, 2 failure = 50% success rate
      await service.recordOutcome('p1', 's1', 'success', {
        projectPath: testProjectPath, issueNumber: 1, phaseNumber: 1, errorSignature: 's1'
      })
      await service.recordOutcome('p1', 's1', 'success', {
        projectPath: testProjectPath, issueNumber: 2, phaseNumber: 1, errorSignature: 's2'
      })
      await service.recordOutcome('p1', 's1', 'failure', {
        projectPath: testProjectPath, issueNumber: 3, phaseNumber: 1, errorSignature: 's3'
      })
      await service.recordOutcome('p1', 's1', 'failure', {
        projectPath: testProjectPath, issueNumber: 4, phaseNumber: 1, errorSignature: 's4'
      })

      const baseConfidence = 1.0
      const adjusted = await service.getAdjustedConfidence(testProjectPath, 'p1', 's1', baseConfidence)

      // Formula: 1.0 * 0.7 + 0.5 * 0.3 = 0.7 + 0.15 = 0.85
      expect(adjusted).toBeCloseTo(0.85, 3)
    })

    it('should return base confidence when no records exist for pattern/strategy', async () => {
      const baseConfidence = 0.6
      const adjusted = await service.getAdjustedConfidence(testProjectPath, 'non-existent', 'non-existent', baseConfidence)

      expect(adjusted).toBe(baseConfidence)
    })

    it('should handle 100% success rate', async () => {
      // 3 successes, 0 failures
      for (let i = 0; i < 3; i++) {
        await service.recordOutcome('perfect', 'strategy', 'success', {
          projectPath: testProjectPath, issueNumber: i, phaseNumber: 1, errorSignature: `sig${i}`
        })
      }

      const baseConfidence = 0.5
      const adjusted = await service.getAdjustedConfidence(testProjectPath, 'perfect', 'strategy', baseConfidence)

      // Formula: 0.5 * 0.7 + 1.0 * 0.3 = 0.35 + 0.3 = 0.65
      expect(adjusted).toBeCloseTo(0.65, 3)
    })

    it('should handle 0% success rate', async () => {
      // 0 successes, 3 failures
      for (let i = 0; i < 3; i++) {
        await service.recordOutcome('always-fail', 'strategy', 'failure', {
          projectPath: testProjectPath, issueNumber: i, phaseNumber: 1, errorSignature: `sig${i}`
        })
      }

      const baseConfidence = 0.9
      const adjusted = await service.getAdjustedConfidence(testProjectPath, 'always-fail', 'strategy', baseConfidence)

      // Formula: 0.9 * 0.7 + 0.0 * 0.3 = 0.63 + 0 = 0.63
      expect(adjusted).toBeCloseTo(0.63, 3)
    })
  })

  describe('getConfidenceAdjustments', () => {
    it('should return adjustments for all pattern/strategy combinations', async () => {
      // Record outcomes for multiple pattern/strategy combinations
      await service.recordOutcome('p1', 's1', 'success', {
        projectPath: testProjectPath, issueNumber: 1, phaseNumber: 1, errorSignature: 'sig1'
      })
      await service.recordOutcome('p1', 's1', 'success', {
        projectPath: testProjectPath, issueNumber: 2, phaseNumber: 1, errorSignature: 'sig2'
      })
      await service.recordOutcome('p1', 's1', 'success', {
        projectPath: testProjectPath, issueNumber: 3, phaseNumber: 1, errorSignature: 'sig3'
      })

      await service.recordOutcome('p2', 's2', 'failure', {
        projectPath: testProjectPath, issueNumber: 4, phaseNumber: 1, errorSignature: 'sig4'
      })
      await service.recordOutcome('p2', 's2', 'failure', {
        projectPath: testProjectPath, issueNumber: 5, phaseNumber: 1, errorSignature: 'sig5'
      })
      await service.recordOutcome('p2', 's2', 'failure', {
        projectPath: testProjectPath, issueNumber: 6, phaseNumber: 1, errorSignature: 'sig6'
      })

      const adjustments = await service.getConfidenceAdjustments(testProjectPath, 0.7)

      expect(adjustments.length).toBe(2)

      const p1s1 = adjustments.find(a => a.patternId === 'p1' && a.strategyId === 's1')
      const p2s2 = adjustments.find(a => a.patternId === 'p2' && a.strategyId === 's2')

      expect(p1s1).toBeDefined()
      expect(p1s1!.successRate).toBe(1.0)

      expect(p2s2).toBeDefined()
      expect(p2s2!.successRate).toBe(0.0)
    })

    it('should not include combinations with less than minimum sample size', async () => {
      // Only 2 records for this combination
      await service.recordOutcome('small-sample', 'strategy', 'success', {
        projectPath: testProjectPath, issueNumber: 1, phaseNumber: 1, errorSignature: 'sig1'
      })
      await service.recordOutcome('small-sample', 'strategy', 'success', {
        projectPath: testProjectPath, issueNumber: 2, phaseNumber: 1, errorSignature: 'sig2'
      })

      const adjustments = await service.getConfidenceAdjustments(testProjectPath, 0.5)

      const smallSample = adjustments.find(a => a.patternId === 'small-sample')
      expect(smallSample).toBeUndefined()
    })

    it('should return empty array when no records exist', async () => {
      const adjustments = await service.getConfidenceAdjustments(testProjectPath, 0.5)
      expect(adjustments).toEqual([])
    })
  })

  describe('getLearningStats', () => {
    it('should return correct total records count', async () => {
      await service.recordOutcome('p1', 's1', 'success', {
        projectPath: testProjectPath, issueNumber: 1, phaseNumber: 1, errorSignature: 'sig1'
      })
      await service.recordOutcome('p1', 's1', 'failure', {
        projectPath: testProjectPath, issueNumber: 2, phaseNumber: 1, errorSignature: 'sig2'
      })
      await service.recordOutcome('p2', 's2', 'success', {
        projectPath: testProjectPath, issueNumber: 3, phaseNumber: 1, errorSignature: 'sig3'
      })

      const stats = await service.getLearningStats(testProjectPath)

      expect(stats.totalRecords).toBe(3)
    })

    it('should calculate correct overall success rate', async () => {
      // 3 success, 1 failure = 75%
      await service.recordOutcome('p1', 's1', 'success', {
        projectPath: testProjectPath, issueNumber: 1, phaseNumber: 1, errorSignature: 'sig1'
      })
      await service.recordOutcome('p1', 's1', 'success', {
        projectPath: testProjectPath, issueNumber: 2, phaseNumber: 1, errorSignature: 'sig2'
      })
      await service.recordOutcome('p1', 's1', 'success', {
        projectPath: testProjectPath, issueNumber: 3, phaseNumber: 1, errorSignature: 'sig3'
      })
      await service.recordOutcome('p1', 's1', 'failure', {
        projectPath: testProjectPath, issueNumber: 4, phaseNumber: 1, errorSignature: 'sig4'
      })

      const stats = await service.getLearningStats(testProjectPath)

      expect(stats.successRate).toBeCloseTo(0.75, 3)
    })

    it('should identify top strategies by success count', async () => {
      // Strategy A: 5 successes
      for (let i = 0; i < 5; i++) {
        await service.recordOutcome('p1', 'strategy-a', 'success', {
          projectPath: testProjectPath, issueNumber: i, phaseNumber: 1, errorSignature: `sig-a-${i}`
        })
      }

      // Strategy B: 3 successes
      for (let i = 0; i < 3; i++) {
        await service.recordOutcome('p1', 'strategy-b', 'success', {
          projectPath: testProjectPath, issueNumber: 10 + i, phaseNumber: 1, errorSignature: `sig-b-${i}`
        })
      }

      // Strategy C: 1 success
      await service.recordOutcome('p1', 'strategy-c', 'success', {
        projectPath: testProjectPath, issueNumber: 100, phaseNumber: 1, errorSignature: 'sig-c-1'
      })

      const stats = await service.getLearningStats(testProjectPath)

      expect(stats.topStrategies.length).toBeGreaterThan(0)
      expect(stats.topStrategies[0].strategyId).toBe('strategy-a')
      expect(stats.topStrategies[0].successCount).toBe(5)
    })

    it('should return zeros when no records exist', async () => {
      const stats = await service.getLearningStats(testProjectPath)

      expect(stats.totalRecords).toBe(0)
      expect(stats.successRate).toBe(0)
      expect(stats.topStrategies).toEqual([])
    })

    it('should include LearningStats required properties', async () => {
      await service.recordOutcome('p1', 's1', 'success', {
        projectPath: testProjectPath, issueNumber: 1, phaseNumber: 1, errorSignature: 'sig1'
      })

      const stats = await service.getLearningStats(testProjectPath)

      expect(stats).toHaveProperty('totalRecords')
      expect(stats).toHaveProperty('successRate')
      expect(stats).toHaveProperty('topStrategies')

      expect(typeof stats.totalRecords).toBe('number')
      expect(typeof stats.successRate).toBe('number')
      expect(Array.isArray(stats.topStrategies)).toBe(true)
    })
  })

  describe('clearLearningData', () => {
    it('should remove all learning records', async () => {
      // Add some records
      await service.recordOutcome('p1', 's1', 'success', {
        projectPath: testProjectPath, issueNumber: 1, phaseNumber: 1, errorSignature: 'sig1'
      })
      await service.recordOutcome('p2', 's2', 'failure', {
        projectPath: testProjectPath, issueNumber: 2, phaseNumber: 2, errorSignature: 'sig2'
      })

      // Verify records exist
      let records = await service.getAllRecords(testProjectPath)
      expect(records.length).toBe(2)

      // Clear data
      await service.clearLearningData(testProjectPath)

      // Verify records are gone
      records = await service.getAllRecords(testProjectPath)
      expect(records.length).toBe(0)
    })

    it('should not throw when no data exists', async () => {
      // Should not throw
      await expect(service.clearLearningData(testProjectPath)).resolves.not.toThrow()
    })

    it('should reset stats after clearing', async () => {
      await service.recordOutcome('p1', 's1', 'success', {
        projectPath: testProjectPath, issueNumber: 1, phaseNumber: 1, errorSignature: 'sig1'
      })

      await service.clearLearningData(testProjectPath)

      const stats = await service.getLearningStats(testProjectPath)
      expect(stats.totalRecords).toBe(0)
      expect(stats.successRate).toBe(0)
    })
  })

  describe('file persistence', () => {
    it('should persist data across service instances', async () => {
      // Record with first instance
      await service.recordOutcome('persist-test', 'strategy', 'success', {
        projectPath: testProjectPath, issueNumber: 1, phaseNumber: 1, errorSignature: 'sig1'
      })

      // Create new instance and read
      const newService = new LearningService()
      const records = await newService.getAllRecords(testProjectPath)

      expect(records.length).toBe(1)
      expect(records[0].patternId).toBe('persist-test')
    })

    it('should handle corrupted file gracefully', async () => {
      // Create corrupted file
      const learningPath = join(testProjectPath, '.tiki', 'learning')
      await mkdir(learningPath, { recursive: true })
      await writeFile(join(learningPath, 'outcomes.json'), 'not valid json', 'utf-8')

      // Should not throw, should return empty or handle gracefully
      const records = await service.getAllRecords(testProjectPath)
      expect(Array.isArray(records)).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle very long error signatures', async () => {
      const longSignature = 'a'.repeat(1000)
      await service.recordOutcome('p1', 's1', 'success', {
        projectPath: testProjectPath,
        issueNumber: 1,
        phaseNumber: 1,
        errorSignature: longSignature
      })

      const records = await service.getAllRecords(testProjectPath)
      expect(records[0].errorSignature).toBe(longSignature)
    })

    it('should handle special characters in pattern/strategy IDs', async () => {
      await service.recordOutcome('pattern-with-special_chars.v2', 'strategy:type/subtype', 'success', {
        projectPath: testProjectPath,
        issueNumber: 1,
        phaseNumber: 1,
        errorSignature: 'sig'
      })

      const records = await service.getAllRecords(testProjectPath)
      expect(records[0].patternId).toBe('pattern-with-special_chars.v2')
      expect(records[0].strategyId).toBe('strategy:type/subtype')
    })

    it('should handle phase number 0', async () => {
      await service.recordOutcome('p1', 's1', 'success', {
        projectPath: testProjectPath,
        issueNumber: 1,
        phaseNumber: 0,
        errorSignature: 'sig'
      })

      const records = await service.getAllRecords(testProjectPath)
      expect(records[0].phaseNumber).toBe(0)
    })

    it('should handle concurrent writes', async () => {
      // Simulate multiple concurrent writes
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(
          service.recordOutcome('p1', 's1', i % 2 === 0 ? 'success' : 'failure', {
            projectPath: testProjectPath,
            issueNumber: i,
            phaseNumber: 1,
            errorSignature: `sig${i}`
          })
        )
      }

      await Promise.all(promises)

      const records = await service.getAllRecords(testProjectPath)
      expect(records.length).toBe(10)
    })
  })

  describe('singleton export', () => {
    it('should export a singleton instance', () => {
      expect(learningService).toBeInstanceOf(LearningService)
    })
  })
})
