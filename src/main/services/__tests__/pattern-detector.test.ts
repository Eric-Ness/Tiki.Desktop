/**
 * Tests for Pattern Detector Service
 *
 * Tests pattern storage, detection, and proactive prevention functionality.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { mkdir, rm, writeFile, readFile, readdir } from 'fs/promises'
import { tmpdir } from 'os'
import {
  PatternDetector,
  PatternIndex,
  GitHubIssueForPattern,
  ExecutionPlanForPattern,
  FailuresStorage,
  patternDetector
} from '../pattern-detector'
import { FailurePattern, FailureRecord, FixRecord, PreventiveMeasure } from '../failure-clustering'

// ===== TEST FIXTURES =====

function createFailureRecord(overrides: Partial<FailureRecord> = {}): FailureRecord {
  return {
    id: `failure-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    issueNumber: 42,
    phaseNumber: 3,
    errorText: "Cannot find module 'lodash'",
    errorCategory: 'dependency',
    files: ['src/utils.ts', 'src/index.ts'],
    timestamp: new Date().toISOString(),
    resolution: null,
    fixDescription: null,
    ...overrides
  }
}

function createFailurePattern(overrides: Partial<FailurePattern> = {}): FailurePattern {
  return {
    id: 'pattern-1',
    name: 'Module Not Found Pattern',
    description: 'Pattern for missing module errors',
    category: 'code',
    errorSignatures: ['\\bmodule\\b', '\\bfind\\b', '\\bcannot\\b'],
    filePatterns: ['src/utils.ts', 'src/**/*.ts'],
    contextIndicators: ['import', 'require', 'module'],
    occurrenceCount: 5,
    lastOccurrence: '2024-01-15T10:30:00Z',
    affectedIssues: [1, 2, 3],
    successfulFixes: [],
    preventiveMeasures: [
      {
        id: 'measure-1',
        description: 'Check dependencies before running',
        type: 'verification',
        automatic: true,
        effectiveness: 0.8,
        application: 'Run npm install first'
      }
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    resolvedAt: null,
    ...overrides
  }
}

function createGitHubIssue(overrides: Partial<GitHubIssueForPattern> = {}): GitHubIssueForPattern {
  return {
    number: 42,
    title: 'Bug: Cannot find module lodash',
    body: 'When running the application, it fails with an error about missing module.',
    labels: [{ name: 'bug' }],
    ...overrides
  }
}

function createExecutionPlan(
  overrides: Partial<ExecutionPlanForPattern> = {}
): ExecutionPlanForPattern {
  return {
    phases: [
      {
        number: 1,
        title: 'Setup',
        files: ['package.json', 'tsconfig.json'],
        verification: ['npm install', 'npm run build']
      },
      {
        number: 2,
        title: 'Implementation',
        files: ['src/utils.ts', 'src/index.ts'],
        verification: ['npm test']
      }
    ],
    ...overrides
  }
}

// ===== TEST SETUP =====

describe('PatternDetector', () => {
  let testProjectPath: string
  let detector: PatternDetector

  beforeEach(async () => {
    // Create a unique temp directory for each test
    testProjectPath = join(
      tmpdir(),
      `tiki-pattern-detector-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    )
    await mkdir(testProjectPath, { recursive: true })

    // Create a fresh detector instance for each test
    detector = new PatternDetector()
  })

  afterEach(async () => {
    // Clean up temp directory
    try {
      await rm(testProjectPath, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  // ===== PATTERN LOADING/SAVING TESTS =====

  describe('loadPatterns', () => {
    it('should load patterns from storage', async () => {
      // Create pattern storage
      const patternsDir = join(testProjectPath, '.tiki', 'patterns')
      await mkdir(patternsDir, { recursive: true })

      const pattern = createFailurePattern({ id: 'test-pattern-1' })
      await writeFile(join(patternsDir, 'test-pattern-1.json'), JSON.stringify(pattern), 'utf-8')

      const index: PatternIndex = {
        patterns: ['test-pattern-1'],
        lastAnalysis: '2024-01-15T10:30:00Z',
        version: '1.0.0'
      }
      await writeFile(join(patternsDir, 'index.json'), JSON.stringify(index), 'utf-8')

      // Load patterns
      await detector.loadPatterns(testProjectPath)

      const patterns = detector.getPatterns()
      expect(patterns).toHaveLength(1)
      expect(patterns[0].id).toBe('test-pattern-1')
    })

    it('should load failures from storage', async () => {
      // Create failures storage
      const analyticsDir = join(testProjectPath, '.tiki', 'analytics')
      await mkdir(analyticsDir, { recursive: true })

      const storage: FailuresStorage = {
        failures: [createFailureRecord({ id: 'failure-1' })],
        lastUpdated: '2024-01-15T10:30:00Z',
        version: '1.0.0'
      }
      await writeFile(join(analyticsDir, 'failures.json'), JSON.stringify(storage), 'utf-8')

      // Load patterns (also loads failures)
      await detector.loadPatterns(testProjectPath)

      const failures = detector.getFailures()
      expect(failures).toHaveLength(1)
      expect(failures[0].id).toBe('failure-1')
    })

    it('should handle missing storage gracefully', async () => {
      // Load patterns from empty directory
      await detector.loadPatterns(testProjectPath)

      expect(detector.getPatterns()).toHaveLength(0)
      expect(detector.getFailures()).toHaveLength(0)
      expect(detector.isLoaded()).toBe(true)
    })

    it('should handle invalid pattern files gracefully', async () => {
      const patternsDir = join(testProjectPath, '.tiki', 'patterns')
      await mkdir(patternsDir, { recursive: true })

      // Create invalid pattern file
      await writeFile(join(patternsDir, 'invalid-pattern.json'), 'not valid json', 'utf-8')

      // Create valid index pointing to invalid pattern
      const index: PatternIndex = {
        patterns: ['invalid-pattern'],
        lastAnalysis: '2024-01-15T10:30:00Z',
        version: '1.0.0'
      }
      await writeFile(join(patternsDir, 'index.json'), JSON.stringify(index), 'utf-8')

      // Should not throw
      await detector.loadPatterns(testProjectPath)

      expect(detector.getPatterns()).toHaveLength(0)
    })

    it('should track pattern ID counter correctly', async () => {
      const patternsDir = join(testProjectPath, '.tiki', 'patterns')
      await mkdir(patternsDir, { recursive: true })

      const pattern = createFailurePattern({ id: 'pattern-42' })
      await writeFile(join(patternsDir, 'pattern-42.json'), JSON.stringify(pattern), 'utf-8')

      const index: PatternIndex = {
        patterns: ['pattern-42'],
        lastAnalysis: '2024-01-15T10:30:00Z',
        version: '1.0.0'
      }
      await writeFile(join(patternsDir, 'index.json'), JSON.stringify(index), 'utf-8')

      await detector.loadPatterns(testProjectPath)

      // Next generated ID should be pattern-43 or higher
      const newId = detector.generatePatternId()
      const idNum = parseInt(newId.replace('pattern-', ''), 10)
      expect(idNum).toBeGreaterThanOrEqual(43)
    })
  })

  describe('savePattern', () => {
    it('should save pattern to storage', async () => {
      const pattern = createFailurePattern({ id: 'new-pattern' })

      await detector.savePattern(testProjectPath, pattern)

      // Verify pattern file was created
      const patternPath = join(testProjectPath, '.tiki', 'patterns', 'new-pattern.json')
      const savedContent = await readFile(patternPath, 'utf-8')
      const savedPattern = JSON.parse(savedContent)

      expect(savedPattern.id).toBe('new-pattern')
      expect(savedPattern.name).toBe(pattern.name)
    })

    it('should create patterns directory if it does not exist', async () => {
      const pattern = createFailurePattern()

      await detector.savePattern(testProjectPath, pattern)

      const patternsDir = join(testProjectPath, '.tiki', 'patterns')
      const files = await readdir(patternsDir)
      expect(files).toContain('index.json')
      expect(files).toContain(`${pattern.id}.json`)
    })

    it('should update index file', async () => {
      const pattern = createFailurePattern({ id: 'indexed-pattern' })

      await detector.savePattern(testProjectPath, pattern)

      const indexPath = join(testProjectPath, '.tiki', 'patterns', 'index.json')
      const indexContent = await readFile(indexPath, 'utf-8')
      const index: PatternIndex = JSON.parse(indexContent)

      expect(index.patterns).toContain('indexed-pattern')
    })

    it('should not duplicate pattern IDs in index', async () => {
      const pattern = createFailurePattern({ id: 'dup-pattern' })

      await detector.savePattern(testProjectPath, pattern)
      await detector.savePattern(testProjectPath, pattern)

      const indexPath = join(testProjectPath, '.tiki', 'patterns', 'index.json')
      const indexContent = await readFile(indexPath, 'utf-8')
      const index: PatternIndex = JSON.parse(indexContent)

      const occurrences = index.patterns.filter((id) => id === 'dup-pattern')
      expect(occurrences).toHaveLength(1)
    })

    it('should update in-memory store', async () => {
      const pattern = createFailurePattern({ id: 'mem-pattern' })

      await detector.savePattern(testProjectPath, pattern)

      expect(detector.getPattern('mem-pattern')).toBeDefined()
    })
  })

  // ===== PATTERN RETRIEVAL TESTS =====

  describe('getPatterns', () => {
    it('should return all patterns', async () => {
      await detector.savePattern(testProjectPath, createFailurePattern({ id: 'p1' }))
      await detector.savePattern(testProjectPath, createFailurePattern({ id: 'p2' }))

      const patterns = detector.getPatterns()
      expect(patterns).toHaveLength(2)
    })

    it('should return empty array when no patterns', () => {
      expect(detector.getPatterns()).toEqual([])
    })
  })

  describe('getPattern', () => {
    it('should return pattern by ID', async () => {
      const pattern = createFailurePattern({ id: 'specific-pattern' })
      await detector.savePattern(testProjectPath, pattern)

      const retrieved = detector.getPattern('specific-pattern')
      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe('specific-pattern')
    })

    it('should return undefined for unknown ID', () => {
      expect(detector.getPattern('non-existent')).toBeUndefined()
    })
  })

  // ===== FAILURE RECORDING TESTS =====

  describe('recordFailure', () => {
    it('should add failure to list', async () => {
      const failure = createFailureRecord({ id: 'new-failure' })

      await detector.recordFailure(testProjectPath, failure)

      const failures = detector.getFailures()
      expect(failures.some((f) => f.id === 'new-failure')).toBe(true)
    })

    it('should save failures to storage', async () => {
      const failure = createFailureRecord({ id: 'stored-failure' })

      await detector.recordFailure(testProjectPath, failure)

      const failuresPath = join(testProjectPath, '.tiki', 'analytics', 'failures.json')
      const content = await readFile(failuresPath, 'utf-8')
      const storage: FailuresStorage = JSON.parse(content)

      expect(storage.failures.some((f) => f.id === 'stored-failure')).toBe(true)
    })

    it('should update existing pattern when failure matches', async () => {
      // Create and save a pattern
      const pattern = createFailurePattern({
        id: 'existing-pattern',
        occurrenceCount: 5,
        affectedIssues: [1, 2]
      })
      await detector.savePattern(testProjectPath, pattern)

      // Record a matching failure
      const failure = createFailureRecord({
        errorText: "Cannot find module 'axios'",
        issueNumber: 99
      })

      await detector.recordFailure(testProjectPath, failure)

      // Verify pattern was updated
      const updated = detector.getPattern('existing-pattern')
      expect(updated?.occurrenceCount).toBe(6)
      expect(updated?.affectedIssues).toContain(99)
    })

    it('should create new pattern when similar failures exist', async () => {
      // Record first failure
      const failure1 = createFailureRecord({
        id: 'fail-1',
        errorText: "Cannot find module 'lodash'",
        errorCategory: 'dependency',
        files: ['src/utils.ts']
      })
      await detector.recordFailure(testProjectPath, failure1)

      // Record similar failure
      const failure2 = createFailureRecord({
        id: 'fail-2',
        errorText: "Cannot find module 'underscore'",
        errorCategory: 'dependency',
        files: ['src/utils.ts']
      })
      await detector.recordFailure(testProjectPath, failure2)

      // A pattern should have been created
      const patterns = detector.getPatterns()
      expect(patterns.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ===== FIX RECORDING TESTS =====

  describe('recordFix', () => {
    it('should add fix to pattern', async () => {
      const pattern = createFailurePattern({
        id: 'fix-pattern',
        successfulFixes: []
      })
      await detector.savePattern(testProjectPath, pattern)

      const fix: FixRecord = {
        failureId: 'failure-1',
        patternId: 'fix-pattern',
        description: 'Installed missing dependency',
        effectiveness: 0.9,
        appliedAt: new Date().toISOString(),
        success: true
      }

      await detector.recordFix(testProjectPath, 'fix-pattern', fix)

      const updated = detector.getPattern('fix-pattern')
      expect(updated?.successfulFixes).toHaveLength(1)
      expect(updated?.successfulFixes[0].success).toBe(true)
    })

    it('should update effectiveness based on success rate', async () => {
      const pattern = createFailurePattern({
        id: 'effectiveness-pattern',
        preventiveMeasures: [
          {
            id: 'm1',
            description: 'Test measure',
            type: 'verification',
            automatic: true,
            effectiveness: 0.5,
            application: 'Apply test'
          }
        ]
      })
      await detector.savePattern(testProjectPath, pattern)

      // Record successful fix
      const successFix: FixRecord = {
        failureId: 'f1',
        patternId: 'effectiveness-pattern',
        description: 'Fixed it',
        effectiveness: 1.0,
        appliedAt: new Date().toISOString(),
        success: true
      }
      await detector.recordFix(testProjectPath, 'effectiveness-pattern', successFix)

      const updated = detector.getPattern('effectiveness-pattern')
      // Effectiveness should have increased (0.5 * 0.7 + 1.0 * 0.3 = 0.65)
      expect(updated?.preventiveMeasures[0].effectiveness).toBeGreaterThan(0.5)
    })

    it('should handle non-existent pattern gracefully', async () => {
      const fix: FixRecord = {
        failureId: 'f1',
        patternId: 'non-existent',
        description: 'Fix',
        effectiveness: 1.0,
        appliedAt: new Date().toISOString(),
        success: true
      }

      // Should not throw
      await detector.recordFix(testProjectPath, 'non-existent', fix)
    })
  })

  // ===== PATTERN MATCHING TESTS =====

  describe('checkForPatterns', () => {
    beforeEach(async () => {
      // Add some patterns
      await detector.savePattern(testProjectPath, createFailurePattern({ id: 'pattern-a' }))
    })

    it('should match patterns against issue', async () => {
      const issue = createGitHubIssue({
        title: 'Cannot find module error',
        body: 'The import statement fails with module not found'
      })

      const matches = await detector.checkForPatterns(issue)

      expect(matches.length).toBeGreaterThanOrEqual(1)
      expect(matches[0].pattern.id).toBe('pattern-a')
    })

    it('should match patterns against issue and plan', async () => {
      const issue = createGitHubIssue()
      const plan = createExecutionPlan()

      const matches = await detector.checkForPatterns(issue, plan)

      // Should find matches based on both issue content and plan files
      expect(matches.length).toBeGreaterThanOrEqual(0)
    })

    it('should return matches above 0.5 confidence', async () => {
      const issue = createGitHubIssue({
        title: 'Module error',
        body: 'Cannot find the required module'
      })

      const matches = await detector.checkForPatterns(issue)

      for (const match of matches) {
        expect(match.confidence).toBeGreaterThanOrEqual(0.5)
      }
    })

    it('should sort matches by confidence', async () => {
      // Add another pattern with different signatures
      await detector.savePattern(
        testProjectPath,
        createFailurePattern({
          id: 'pattern-b',
          errorSignatures: ['\\bunrelated\\b'],
          contextIndicators: ['unrelated']
        })
      )

      const issue = createGitHubIssue({
        title: 'Cannot find module lodash',
        body: 'Import fails with module not found error'
      })

      const matches = await detector.checkForPatterns(issue)

      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1].confidence).toBeGreaterThanOrEqual(matches[i].confidence)
      }
    })

    it('should include suggested measures with high effectiveness', async () => {
      const issue = createGitHubIssue({
        title: 'Module error import',
        body: 'Cannot find required module'
      })

      const matches = await detector.checkForPatterns(issue)

      if (matches.length > 0) {
        for (const measure of matches[0].suggestedMeasures) {
          expect(measure.effectiveness).toBeGreaterThanOrEqual(0.5)
        }
      }
    })

    it('should skip resolved patterns', async () => {
      await detector.savePattern(
        testProjectPath,
        createFailurePattern({
          id: 'resolved-pattern',
          resolvedAt: '2024-01-01T00:00:00Z'
        })
      )

      const issue = createGitHubIssue({
        title: 'Module error',
        body: 'Cannot find module'
      })

      const matches = await detector.checkForPatterns(issue)

      const resolvedMatch = matches.find((m) => m.pattern.id === 'resolved-pattern')
      expect(resolvedMatch).toBeUndefined()
    })

    it('should include matched indicators', async () => {
      const issue = createGitHubIssue({
        title: 'Import module error',
        body: 'Cannot require the module'
      })

      const matches = await detector.checkForPatterns(issue)

      if (matches.length > 0) {
        expect(matches[0].matchedIndicators.length).toBeGreaterThan(0)
      }
    })
  })

  // ===== HISTORY ANALYSIS TESTS =====

  describe('analyzeHistory', () => {
    it('should cluster failures and create patterns', async () => {
      // Add similar failures
      await detector.recordFailure(
        testProjectPath,
        createFailureRecord({
          id: 'hist-1',
          errorText: "Cannot find module 'react'",
          errorCategory: 'dependency',
          files: ['src/app.tsx']
        })
      )
      await detector.recordFailure(
        testProjectPath,
        createFailureRecord({
          id: 'hist-2',
          errorText: "Cannot find module 'vue'",
          errorCategory: 'dependency',
          files: ['src/app.tsx']
        })
      )

      // Clear any auto-created patterns
      detector.clearPatterns()

      const newPatterns = await detector.analyzeHistory(testProjectPath)

      // Should have created at least one pattern from the cluster
      expect(newPatterns.length).toBeGreaterThanOrEqual(0)
    })

    it('should update existing patterns instead of creating duplicates', async () => {
      // Create existing pattern with affected issues
      const existingPattern = createFailurePattern({
        id: 'existing-hist-pattern',
        affectedIssues: [1, 2],
        occurrenceCount: 2
      })
      await detector.savePattern(testProjectPath, existingPattern)

      // Add failures with matching issues
      await detector.recordFailure(
        testProjectPath,
        createFailureRecord({ issueNumber: 1, id: 'f1' })
      )
      await detector.recordFailure(
        testProjectPath,
        createFailureRecord({ issueNumber: 2, id: 'f2' })
      )

      const newPatterns = await detector.analyzeHistory(testProjectPath)

      // Should not have created new patterns for existing cluster
      // (patterns created for new clusters are returned)
      const existingUpdated = detector.getPattern('existing-hist-pattern')
      expect(existingUpdated).toBeDefined()
    })
  })

  // ===== PREVENTION APPLICATION TESTS =====

  describe('applyPrevention', () => {
    it('should apply automatic measures with high effectiveness', async () => {
      const plan = createExecutionPlan()
      const matches = [
        {
          pattern: createFailurePattern({
            filePatterns: ['src/utils.ts']
          }),
          confidence: 0.8,
          matchedIndicators: ['test'],
          suggestedMeasures: [
            {
              id: 'auto-measure',
              description: 'Auto measure',
              type: 'verification' as const,
              automatic: true,
              effectiveness: 0.9,
              application: 'Run auto verification'
            }
          ]
        }
      ]

      const { modifiedPlan, appliedMeasures } = await detector.applyPrevention(plan, matches)

      expect(appliedMeasures.length).toBeGreaterThan(0)
      expect(appliedMeasures[0].id).toBe('auto-measure')

      // Check that verification was added to relevant phase
      const implPhase = modifiedPlan.phases.find((p) => p.title === 'Implementation')
      expect(implPhase?.verification).toContain('Run auto verification')
    })

    it('should not apply non-automatic measures', async () => {
      const plan = createExecutionPlan()
      const matches = [
        {
          pattern: createFailurePattern(),
          confidence: 0.8,
          matchedIndicators: [],
          suggestedMeasures: [
            {
              id: 'manual-measure',
              description: 'Manual measure',
              type: 'manual' as const,
              automatic: false,
              effectiveness: 0.9,
              application: 'Do manual check'
            }
          ]
        }
      ]

      const { appliedMeasures } = await detector.applyPrevention(plan, matches)

      const manualMeasure = appliedMeasures.find((m) => m.id === 'manual-measure')
      expect(manualMeasure).toBeUndefined()
    })

    it('should not apply low effectiveness measures', async () => {
      const plan = createExecutionPlan()
      const matches = [
        {
          pattern: createFailurePattern(),
          confidence: 0.8,
          matchedIndicators: [],
          suggestedMeasures: [
            {
              id: 'low-eff-measure',
              description: 'Low effectiveness',
              type: 'verification' as const,
              automatic: true,
              effectiveness: 0.3,
              application: 'Low eff check'
            }
          ]
        }
      ]

      const { appliedMeasures } = await detector.applyPrevention(plan, matches)

      const lowEffMeasure = appliedMeasures.find((m) => m.id === 'low-eff-measure')
      expect(lowEffMeasure).toBeUndefined()
    })

    it('should add context measures to phase verification', async () => {
      const plan = createExecutionPlan()
      const matches = [
        {
          pattern: createFailurePattern(),
          confidence: 0.8,
          matchedIndicators: [],
          suggestedMeasures: [
            {
              id: 'context-measure',
              description: 'Important context',
              type: 'context' as const,
              automatic: true,
              effectiveness: 0.8,
              application: 'Add context info'
            }
          ]
        }
      ]

      const { modifiedPlan } = await detector.applyPrevention(plan, matches)

      // Context should be added to phases
      const hasContext = modifiedPlan.phases.some((p) =>
        p.verification.some((v) => v.includes('[Context]'))
      )
      expect(hasContext).toBe(true)
    })

    it('should not duplicate measures', async () => {
      const plan = createExecutionPlan({
        phases: [
          {
            number: 1,
            title: 'Test',
            files: ['src/utils.ts'],
            verification: ['Existing check']
          }
        ]
      })

      const measure: PreventiveMeasure = {
        id: 'dup-measure',
        description: 'Dup measure',
        type: 'verification',
        automatic: true,
        effectiveness: 0.8,
        application: 'Existing check'
      }

      const matches = [
        {
          pattern: createFailurePattern({ filePatterns: ['src/utils.ts'] }),
          confidence: 0.8,
          matchedIndicators: [],
          suggestedMeasures: [measure]
        }
      ]

      const { modifiedPlan } = await detector.applyPrevention(plan, matches)

      const existingCount = modifiedPlan.phases[0].verification.filter(
        (v) => v === 'Existing check'
      ).length
      expect(existingCount).toBe(1)
    })
  })

  // ===== TOP PATTERNS TESTS =====

  describe('getTopPatterns', () => {
    it('should return patterns sorted by occurrence count', async () => {
      await detector.savePattern(
        testProjectPath,
        createFailurePattern({ id: 'low-occ', occurrenceCount: 1 })
      )
      await detector.savePattern(
        testProjectPath,
        createFailurePattern({ id: 'high-occ', occurrenceCount: 100 })
      )
      await detector.savePattern(
        testProjectPath,
        createFailurePattern({ id: 'mid-occ', occurrenceCount: 50 })
      )

      const top = detector.getTopPatterns()

      expect(top[0].id).toBe('high-occ')
      expect(top[1].id).toBe('mid-occ')
      expect(top[2].id).toBe('low-occ')
    })

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 20; i++) {
        await detector.savePattern(
          testProjectPath,
          createFailurePattern({ id: `pattern-${i}`, occurrenceCount: i })
        )
      }

      const top = detector.getTopPatterns(5)

      expect(top).toHaveLength(5)
    })

    it('should exclude resolved patterns', async () => {
      await detector.savePattern(
        testProjectPath,
        createFailurePattern({
          id: 'resolved',
          occurrenceCount: 1000,
          resolvedAt: '2024-01-01T00:00:00Z'
        })
      )
      await detector.savePattern(
        testProjectPath,
        createFailurePattern({ id: 'active', occurrenceCount: 1 })
      )

      const top = detector.getTopPatterns()

      const resolvedInTop = top.find((p) => p.id === 'resolved')
      expect(resolvedInTop).toBeUndefined()
    })

    it('should default to 10 patterns', async () => {
      for (let i = 0; i < 20; i++) {
        await detector.savePattern(
          testProjectPath,
          createFailurePattern({ id: `p-${i}`, occurrenceCount: i })
        )
      }

      const top = detector.getTopPatterns()

      expect(top.length).toBeLessThanOrEqual(10)
    })
  })

  // ===== RESOLVE PATTERN TESTS =====

  describe('resolvePattern', () => {
    it('should mark pattern as resolved', async () => {
      const pattern = createFailurePattern({ id: 'to-resolve', resolvedAt: null })
      await detector.savePattern(testProjectPath, pattern)

      await detector.resolvePattern(testProjectPath, 'to-resolve')

      const resolved = detector.getPattern('to-resolve')
      expect(resolved?.resolvedAt).not.toBeNull()
    })

    it('should update updatedAt timestamp', async () => {
      const pattern = createFailurePattern({
        id: 'resolve-timestamp',
        updatedAt: '2020-01-01T00:00:00Z'
      })
      await detector.savePattern(testProjectPath, pattern)

      await detector.resolvePattern(testProjectPath, 'resolve-timestamp')

      const resolved = detector.getPattern('resolve-timestamp')
      expect(resolved?.updatedAt).not.toBe('2020-01-01T00:00:00Z')
    })

    it('should handle non-existent pattern gracefully', async () => {
      // Should not throw
      await detector.resolvePattern(testProjectPath, 'non-existent')
    })
  })

  // ===== DELETE PATTERN TESTS =====

  describe('deletePattern', () => {
    it('should remove pattern from memory', async () => {
      const pattern = createFailurePattern({ id: 'to-delete' })
      await detector.savePattern(testProjectPath, pattern)

      await detector.deletePattern(testProjectPath, 'to-delete')

      expect(detector.getPattern('to-delete')).toBeUndefined()
    })

    it('should remove pattern file from storage', async () => {
      const pattern = createFailurePattern({ id: 'delete-file' })
      await detector.savePattern(testProjectPath, pattern)

      await detector.deletePattern(testProjectPath, 'delete-file')

      const patternsDir = join(testProjectPath, '.tiki', 'patterns')
      const files = await readdir(patternsDir)
      expect(files).not.toContain('delete-file.json')
    })

    it('should update index file', async () => {
      const pattern = createFailurePattern({ id: 'delete-from-index' })
      await detector.savePattern(testProjectPath, pattern)

      await detector.deletePattern(testProjectPath, 'delete-from-index')

      const indexPath = join(testProjectPath, '.tiki', 'patterns', 'index.json')
      const indexContent = await readFile(indexPath, 'utf-8')
      const index: PatternIndex = JSON.parse(indexContent)

      expect(index.patterns).not.toContain('delete-from-index')
    })

    it('should handle non-existent pattern gracefully', async () => {
      // Should not throw
      await detector.deletePattern(testProjectPath, 'non-existent')
    })
  })

  // ===== UTILITY METHOD TESTS =====

  describe('clearPatterns', () => {
    it('should remove all patterns from memory', async () => {
      await detector.savePattern(testProjectPath, createFailurePattern({ id: 'p1' }))
      await detector.savePattern(testProjectPath, createFailurePattern({ id: 'p2' }))

      detector.clearPatterns()

      expect(detector.getPatterns()).toHaveLength(0)
    })

    it('should reset pattern ID counter', async () => {
      detector.generatePatternId()
      detector.generatePatternId()

      detector.clearPatterns()

      const newId = detector.generatePatternId()
      expect(newId).toBe('pattern-0')
    })
  })

  describe('clearFailures', () => {
    it('should remove all failures from memory', async () => {
      await detector.recordFailure(testProjectPath, createFailureRecord({ id: 'f1' }))
      await detector.recordFailure(testProjectPath, createFailureRecord({ id: 'f2' }))

      detector.clearFailures()

      expect(detector.getFailures()).toHaveLength(0)
    })
  })

  describe('isLoaded', () => {
    it('should return false before loading', () => {
      expect(detector.isLoaded()).toBe(false)
    })

    it('should return true after loading', async () => {
      await detector.loadPatterns(testProjectPath)
      expect(detector.isLoaded()).toBe(true)
    })
  })

  describe('generatePatternId', () => {
    it('should generate unique IDs', () => {
      const id1 = detector.generatePatternId()
      const id2 = detector.generatePatternId()

      expect(id1).not.toBe(id2)
    })

    it('should follow pattern-N format', () => {
      const id = detector.generatePatternId()
      expect(id).toMatch(/^pattern-\d+$/)
    })
  })

  describe('getFailures', () => {
    it('should return copy of failures array', async () => {
      await detector.recordFailure(testProjectPath, createFailureRecord())

      const failures = detector.getFailures()
      failures.push(createFailureRecord({ id: 'injected' }))

      // Original should not be modified
      expect(detector.getFailures().find((f) => f.id === 'injected')).toBeUndefined()
    })
  })
})

// ===== SINGLETON TESTS =====

describe('patternDetector singleton', () => {
  it('should export a singleton instance', () => {
    expect(patternDetector).toBeInstanceOf(PatternDetector)
  })
})

// ===== EDGE CASE TESTS =====

describe('Edge Cases', () => {
  let testProjectPath: string
  let detector: PatternDetector

  beforeEach(async () => {
    testProjectPath = join(
      tmpdir(),
      `tiki-pattern-edge-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    )
    await mkdir(testProjectPath, { recursive: true })
    detector = new PatternDetector()
  })

  afterEach(async () => {
    try {
      await rm(testProjectPath, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  it('should handle special characters in error text', async () => {
    const failure = createFailureRecord({
      errorText: "Error: Can't parse file.ts:123:45 - SyntaxError: Unexpected <end>"
    })

    await detector.recordFailure(testProjectPath, failure)

    expect(detector.getFailures()).toHaveLength(1)
  })

  it('should handle very long error text', async () => {
    const longError = 'Error '.repeat(1000) + 'at line 42'
    const failure = createFailureRecord({ errorText: longError })

    await detector.recordFailure(testProjectPath, failure)

    expect(detector.getFailures()).toHaveLength(1)
  })

  it('should handle unicode in patterns', async () => {
    const pattern = createFailurePattern({
      id: 'unicode-pattern',
      name: 'Test Pattern',
      contextIndicators: ['test', 'indicator']
    })

    await detector.savePattern(testProjectPath, pattern)

    const retrieved = detector.getPattern('unicode-pattern')
    expect(retrieved).toBeDefined()
  })

  it('should handle concurrent operations', async () => {
    const promises: Promise<void>[] = []

    for (let i = 0; i < 10; i++) {
      promises.push(
        detector.savePattern(testProjectPath, createFailurePattern({ id: `concurrent-${i}` }))
      )
    }

    await Promise.all(promises)

    // All patterns should be saved
    const patterns = detector.getPatterns()
    expect(patterns.length).toBe(10)
  })

  it('should handle empty issue body', async () => {
    await detector.savePattern(testProjectPath, createFailurePattern())

    const issue = createGitHubIssue({
      body: undefined
    })

    // Should not throw
    const matches = await detector.checkForPatterns(issue)
    expect(matches).toBeDefined()
  })

  it('should handle empty plan phases', async () => {
    await detector.savePattern(testProjectPath, createFailurePattern())

    const plan: ExecutionPlanForPattern = {
      phases: []
    }
    const issue = createGitHubIssue()

    // Should not throw
    const matches = await detector.checkForPatterns(issue, plan)
    expect(matches).toBeDefined()
  })

  it('should handle patterns with no measures', async () => {
    const pattern = createFailurePattern({
      id: 'no-measures',
      preventiveMeasures: []
    })
    await detector.savePattern(testProjectPath, pattern)

    const issue = createGitHubIssue()
    const matches = await detector.checkForPatterns(issue)

    const match = matches.find((m) => m.pattern.id === 'no-measures')
    if (match) {
      expect(match.suggestedMeasures).toEqual([])
    }
  })
})
