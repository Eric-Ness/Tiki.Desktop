/**
 * Tests for FailureAnalyzerService
 *
 * TDD: Tests written first, then implementation
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  FailureAnalysis,
  RetryStrategy,
  FailureAnalyzerService,
  failureAnalyzerService,
  BUILT_IN_STRATEGIES
} from '../failure-analyzer'
import { ErrorClassification } from '../error-patterns'

describe('FailureAnalyzerService', () => {
  let service: FailureAnalyzerService

  beforeEach(() => {
    service = new FailureAnalyzerService()
  })

  describe('RetryStrategy interface', () => {
    it('should have all required properties in built-in strategies', () => {
      const strategies = BUILT_IN_STRATEGIES

      for (const strategy of strategies) {
        expect(strategy).toHaveProperty('id')
        expect(strategy).toHaveProperty('name')
        expect(strategy).toHaveProperty('description')
        expect(strategy).toHaveProperty('confidence')
        expect(strategy).toHaveProperty('applicableTo')
        expect(strategy).toHaveProperty('action')

        // Validate types
        expect(typeof strategy.id).toBe('string')
        expect(typeof strategy.name).toBe('string')
        expect(typeof strategy.description).toBe('string')
        expect(typeof strategy.confidence).toBe('number')
        expect(Array.isArray(strategy.applicableTo)).toBe(true)
        expect(['redo', 'redo-with-context', 'skip', 'rollback-and-redo', 'manual']).toContain(
          strategy.action
        )

        // Confidence should be between 0 and 1
        expect(strategy.confidence).toBeGreaterThanOrEqual(0)
        expect(strategy.confidence).toBeLessThanOrEqual(1)
      }
    })

    it('should include all 6 required built-in strategies', () => {
      const strategies = BUILT_IN_STRATEGIES
      const strategyIds = strategies.map((s) => s.id)

      expect(strategyIds).toContain('simple-redo')
      expect(strategyIds).toContain('redo-with-error-context')
      expect(strategyIds).toContain('fix-and-redo')
      expect(strategyIds).toContain('rollback-and-redo')
      expect(strategyIds).toContain('skip-phase')
      expect(strategyIds).toContain('install-dependencies')
    })

    it('simple-redo should have low confidence', () => {
      const strategy = BUILT_IN_STRATEGIES.find((s) => s.id === 'simple-redo')
      expect(strategy).toBeDefined()
      expect(strategy!.confidence).toBeLessThanOrEqual(0.3)
      expect(strategy!.action).toBe('redo')
    })

    it('redo-with-error-context should have medium confidence', () => {
      const strategy = BUILT_IN_STRATEGIES.find((s) => s.id === 'redo-with-error-context')
      expect(strategy).toBeDefined()
      expect(strategy!.confidence).toBeGreaterThanOrEqual(0.4)
      expect(strategy!.confidence).toBeLessThanOrEqual(0.6)
      expect(strategy!.action).toBe('redo-with-context')
    })

    it('fix-and-redo should have medium confidence and manual action', () => {
      const strategy = BUILT_IN_STRATEGIES.find((s) => s.id === 'fix-and-redo')
      expect(strategy).toBeDefined()
      expect(strategy!.confidence).toBeGreaterThanOrEqual(0.4)
      expect(strategy!.confidence).toBeLessThanOrEqual(0.6)
      expect(strategy!.action).toBe('manual')
    })

    it('rollback-and-redo should have high confidence for conflict errors', () => {
      const strategy = BUILT_IN_STRATEGIES.find((s) => s.id === 'rollback-and-redo')
      expect(strategy).toBeDefined()
      expect(strategy!.confidence).toBeGreaterThanOrEqual(0.7)
      expect(strategy!.action).toBe('rollback-and-redo')
    })

    it('skip-phase should have low confidence', () => {
      const strategy = BUILT_IN_STRATEGIES.find((s) => s.id === 'skip-phase')
      expect(strategy).toBeDefined()
      expect(strategy!.confidence).toBeLessThanOrEqual(0.3)
      expect(strategy!.action).toBe('skip')
    })

    it('install-dependencies should have high confidence for module errors', () => {
      const strategy = BUILT_IN_STRATEGIES.find((s) => s.id === 'install-dependencies')
      expect(strategy).toBeDefined()
      expect(strategy!.confidence).toBeGreaterThanOrEqual(0.7)
      expect(strategy!.applicableTo).toContain('dependency')
    })
  })

  describe('analyzeFailure', () => {
    it('should return a FailureAnalysis with all required properties', async () => {
      const context = {
        files: ['src/test.ts'],
        lastCommand: 'npm test',
        terminalOutput: 'Error: Cannot find module "lodash"'
      }

      const analysis = await service.analyzeFailure(
        42,
        3,
        'Error: Cannot find module "lodash"',
        context
      )

      // Check all required properties exist
      expect(analysis).toHaveProperty('phaseNumber')
      expect(analysis).toHaveProperty('issueNumber')
      expect(analysis).toHaveProperty('timestamp')
      expect(analysis).toHaveProperty('errorText')
      expect(analysis).toHaveProperty('classifications')
      expect(analysis).toHaveProperty('primaryClassification')
      expect(analysis).toHaveProperty('suggestedStrategies')
      expect(analysis).toHaveProperty('context')

      // Check values
      expect(analysis.phaseNumber).toBe(3)
      expect(analysis.issueNumber).toBe(42)
      expect(typeof analysis.timestamp).toBe('number')
      expect(analysis.errorText).toBe('Error: Cannot find module "lodash"')
      expect(Array.isArray(analysis.classifications)).toBe(true)
      expect(Array.isArray(analysis.suggestedStrategies)).toBe(true)
      expect(analysis.context.files).toEqual(['src/test.ts'])
      expect(analysis.context.lastCommand).toBe('npm test')
      expect(analysis.context.terminalOutput).toBe('Error: Cannot find module "lodash"')
    })

    it('should classify dependency errors correctly', async () => {
      const analysis = await service.analyzeFailure(
        1,
        1,
        "Error: Cannot find module 'express'",
        { files: [] }
      )

      expect(analysis.classifications.length).toBeGreaterThan(0)
      expect(analysis.primaryClassification).not.toBeNull()
      expect(analysis.primaryClassification?.category).toBe('dependency')
    })

    it('should classify syntax errors correctly', async () => {
      const analysis = await service.analyzeFailure(
        1,
        1,
        'SyntaxError: Unexpected token }',
        { files: [] }
      )

      expect(analysis.classifications.length).toBeGreaterThan(0)
      expect(analysis.primaryClassification).not.toBeNull()
      expect(analysis.primaryClassification?.category).toBe('syntax')
    })

    it('should classify test failures correctly', async () => {
      const analysis = await service.analyzeFailure(
        1,
        1,
        'FAIL src/test.spec.ts\nExpected: 5\nReceived: 3',
        { files: [] }
      )

      expect(analysis.classifications.length).toBeGreaterThan(0)
      expect(analysis.primaryClassification).not.toBeNull()
      expect(analysis.primaryClassification?.category).toBe('test')
    })

    it('should include at least 3 strategies for classified errors', async () => {
      const analysis = await service.analyzeFailure(
        1,
        1,
        "Error: Cannot find module 'lodash'",
        { files: [] }
      )

      expect(analysis.suggestedStrategies.length).toBeGreaterThanOrEqual(3)
    })

    it('should select the highest confidence classification as primary', async () => {
      const analysis = await service.analyzeFailure(
        1,
        1,
        "Error: Cannot find module 'lodash'",
        { files: [] }
      )

      if (analysis.classifications.length > 1) {
        const maxConfidence = Math.max(...analysis.classifications.map((c) => c.confidence))
        expect(analysis.primaryClassification?.confidence).toBe(maxConfidence)
      }
    })

    it('should return null primaryClassification for unknown errors', async () => {
      const analysis = await service.analyzeFailure(
        1,
        1,
        'Some completely random unrecognized error text xyz123',
        { files: [] }
      )

      expect(analysis.primaryClassification).toBeNull()
      expect(analysis.classifications).toHaveLength(0)
    })

    it('should include timestamp close to current time', async () => {
      const before = Date.now()
      const analysis = await service.analyzeFailure(1, 1, 'SyntaxError: test', { files: [] })
      const after = Date.now()

      expect(analysis.timestamp).toBeGreaterThanOrEqual(before)
      expect(analysis.timestamp).toBeLessThanOrEqual(after)
    })
  })

  describe('getAvailableStrategies', () => {
    it('should return strategies applicable to dependency errors', () => {
      const classification: ErrorClassification = {
        patternId: 'module-not-found',
        category: 'dependency',
        confidence: 0.9,
        matchedText: "Cannot find module 'lodash'",
        context: {}
      }

      const strategies = service.getAvailableStrategies(classification)

      expect(strategies.length).toBeGreaterThan(0)
      // Should include install-dependencies for dependency errors
      const installStrategy = strategies.find((s) => s.id === 'install-dependencies')
      expect(installStrategy).toBeDefined()
    })

    it('should return strategies applicable to syntax errors', () => {
      const classification: ErrorClassification = {
        patternId: 'syntax-error-generic',
        category: 'syntax',
        confidence: 0.9,
        matchedText: 'SyntaxError: Unexpected token',
        context: {}
      }

      const strategies = service.getAvailableStrategies(classification)

      expect(strategies.length).toBeGreaterThan(0)
      // Should include redo-with-error-context for syntax errors
      const redoStrategy = strategies.find((s) => s.id === 'redo-with-error-context')
      expect(redoStrategy).toBeDefined()
    })

    it('should return strategies applicable to test errors', () => {
      const classification: ErrorClassification = {
        patternId: 'test-assertion-failure',
        category: 'test',
        confidence: 0.9,
        matchedText: 'AssertionError: expected 5 to equal 3',
        context: {}
      }

      const strategies = service.getAvailableStrategies(classification)

      expect(strategies.length).toBeGreaterThan(0)
    })

    it('should always include generic strategies', () => {
      const classification: ErrorClassification = {
        patternId: 'unknown',
        category: 'unknown',
        confidence: 0.5,
        matchedText: 'some error',
        context: {}
      }

      const strategies = service.getAvailableStrategies(classification)

      // Should include at least simple-redo and skip-phase for any error
      expect(strategies.length).toBeGreaterThanOrEqual(2)
      expect(strategies.find((s) => s.id === 'simple-redo')).toBeDefined()
      expect(strategies.find((s) => s.id === 'skip-phase')).toBeDefined()
    })
  })

  describe('buildSuggestedStrategies', () => {
    it('should combine strategies from multiple classifications', () => {
      const classifications: ErrorClassification[] = [
        {
          patternId: 'module-not-found',
          category: 'dependency',
          confidence: 0.95,
          matchedText: "Cannot find module 'lodash'",
          context: {}
        },
        {
          patternId: 'syntax-error-generic',
          category: 'syntax',
          confidence: 0.85,
          matchedText: 'SyntaxError',
          context: {}
        }
      ]

      const strategies = service.buildSuggestedStrategies(classifications, { files: [] })

      expect(strategies.length).toBeGreaterThanOrEqual(3)
    })

    it('should sort strategies by confidence descending', () => {
      const classifications: ErrorClassification[] = [
        {
          patternId: 'module-not-found',
          category: 'dependency',
          confidence: 0.95,
          matchedText: "Cannot find module 'lodash'",
          context: {}
        }
      ]

      const strategies = service.buildSuggestedStrategies(classifications, { files: [] })

      for (let i = 1; i < strategies.length; i++) {
        expect(strategies[i - 1].confidence).toBeGreaterThanOrEqual(strategies[i].confidence)
      }
    })

    it('should not duplicate strategies', () => {
      const classifications: ErrorClassification[] = [
        {
          patternId: 'module-not-found',
          category: 'dependency',
          confidence: 0.95,
          matchedText: "Cannot find module 'lodash'",
          context: {}
        },
        {
          patternId: 'npm-dependency-error',
          category: 'dependency',
          confidence: 0.9,
          matchedText: 'npm ERR!',
          context: {}
        }
      ]

      const strategies = service.buildSuggestedStrategies(classifications, { files: [] })
      const strategyIds = strategies.map((s) => s.id)
      const uniqueIds = [...new Set(strategyIds)]

      expect(strategyIds.length).toBe(uniqueIds.length)
    })

    it('should return generic strategies for empty classifications', () => {
      const strategies = service.buildSuggestedStrategies([], { files: [] })

      expect(strategies.length).toBeGreaterThanOrEqual(2)
      expect(strategies.find((s) => s.id === 'simple-redo')).toBeDefined()
      expect(strategies.find((s) => s.id === 'skip-phase')).toBeDefined()
    })

    it('should include context hints when files are provided', () => {
      const classifications: ErrorClassification[] = [
        {
          patternId: 'module-not-found',
          category: 'dependency',
          confidence: 0.95,
          matchedText: "Cannot find module 'lodash'",
          context: { file: 'src/test.ts', line: 10 }
        }
      ]

      const strategies = service.buildSuggestedStrategies(classifications, {
        files: ['src/test.ts'],
        lastCommand: 'npm test'
      })

      // At least one strategy should have context hints
      const hasContextHints = strategies.some((s) => s.contextHints && s.contextHints.length > 0)
      expect(hasContextHints).toBe(true)
    })
  })

  describe('singleton export', () => {
    it('should export a singleton instance', () => {
      expect(failureAnalyzerService).toBeInstanceOf(FailureAnalyzerService)
    })
  })

  describe('FailureAnalysis interface validation', () => {
    it('should have correct context structure', async () => {
      const analysis = await service.analyzeFailure(1, 1, 'SyntaxError: test', {
        files: ['file1.ts', 'file2.ts'],
        lastCommand: 'npm run build',
        terminalOutput: 'Build failed'
      })

      expect(analysis.context.files).toEqual(['file1.ts', 'file2.ts'])
      expect(analysis.context.lastCommand).toBe('npm run build')
      expect(analysis.context.terminalOutput).toBe('Build failed')
    })

    it('should handle minimal context', async () => {
      const analysis = await service.analyzeFailure(1, 1, 'Error', {
        files: []
      })

      expect(analysis.context.files).toEqual([])
      expect(analysis.context.lastCommand).toBeUndefined()
      expect(analysis.context.terminalOutput).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('should handle empty error text', async () => {
      const analysis = await service.analyzeFailure(1, 1, '', { files: [] })

      expect(analysis.classifications).toHaveLength(0)
      expect(analysis.primaryClassification).toBeNull()
      expect(analysis.suggestedStrategies.length).toBeGreaterThanOrEqual(2)
    })

    it('should handle very long error text', async () => {
      const longError = 'Error: '.repeat(1000) + "Cannot find module 'lodash'"
      const analysis = await service.analyzeFailure(1, 1, longError, { files: [] })

      expect(analysis.classifications.length).toBeGreaterThan(0)
    })

    it('should handle multiple error types in same text', async () => {
      const multiError = `
        Error: Cannot find module 'lodash'
        SyntaxError: Unexpected token
        FAIL src/test.spec.ts
      `
      const analysis = await service.analyzeFailure(1, 1, multiError, { files: [] })

      // Should find multiple classifications
      expect(analysis.classifications.length).toBeGreaterThan(1)
      // Primary should be the highest confidence one
      expect(analysis.primaryClassification).not.toBeNull()
    })

    it('should handle network errors', async () => {
      const analysis = await service.analyzeFailure(1, 1, 'ECONNREFUSED: Connection refused', {
        files: []
      })

      expect(analysis.primaryClassification?.category).toBe('network')
    })

    it('should handle permission errors', async () => {
      const analysis = await service.analyzeFailure(1, 1, 'EACCES: permission denied', {
        files: []
      })

      expect(analysis.primaryClassification?.category).toBe('permission')
    })

    it('should handle timeout errors', async () => {
      const analysis = await service.analyzeFailure(1, 1, 'ETIMEDOUT: Connection timed out', {
        files: []
      })

      expect(analysis.primaryClassification?.category).toBe('timeout')
    })

    it('should handle resource errors', async () => {
      const analysis = await service.analyzeFailure(
        1,
        1,
        'FATAL ERROR: JavaScript heap out of memory',
        { files: [] }
      )

      expect(analysis.primaryClassification?.category).toBe('resource')
    })
  })
})
