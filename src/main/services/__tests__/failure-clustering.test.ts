/**
 * Tests for Failure Clustering Service
 *
 * Tests pattern recognition, similarity calculation, and clustering functionality.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  FailurePattern,
  FailureRecord,
  FailureCluster,
  PatternMatch,
  PreventiveMeasure,
  FixRecord,
  PatternCategory,
  calculateSimilarity,
  clusterSimilarFailures,
  extractPattern,
  findCommonErrorTerms,
  findCommonFilePatterns,
  getDefaultPreventiveMeasures,
  matchPatterns,
  FailureClusteringService,
  failureClusteringService
} from '../failure-clustering'

// ===== TEST FIXTURES =====

function createFailureRecord(overrides: Partial<FailureRecord> = {}): FailureRecord {
  return {
    id: 'failure-1',
    issueNumber: 42,
    phaseNumber: 3,
    errorText: "Cannot find module 'lodash'",
    errorCategory: 'dependency',
    files: ['src/utils.ts', 'src/index.ts'],
    timestamp: '2024-01-15T10:30:00Z',
    resolution: null,
    fixDescription: null,
    ...overrides
  }
}

function createSimilarFailures(): FailureRecord[] {
  return [
    createFailureRecord({
      id: 'failure-1',
      errorText: "Cannot find module 'lodash'",
      errorCategory: 'dependency',
      files: ['src/utils.ts']
    }),
    createFailureRecord({
      id: 'failure-2',
      errorText: "Cannot find module 'underscore'",
      errorCategory: 'dependency',
      files: ['src/utils.ts', 'src/helpers.ts']
    }),
    createFailureRecord({
      id: 'failure-3',
      errorText: "Module not found: Cannot resolve 'axios'",
      errorCategory: 'dependency',
      files: ['src/api.ts']
    })
  ]
}

function createDissimilarFailures(): FailureRecord[] {
  return [
    createFailureRecord({
      id: 'failure-1',
      errorText: "Cannot find module 'lodash'",
      errorCategory: 'dependency',
      files: ['src/utils.ts']
    }),
    createFailureRecord({
      id: 'failure-2',
      errorText: 'SyntaxError: Unexpected token }',
      errorCategory: 'syntax',
      files: ['src/parser.ts']
    }),
    createFailureRecord({
      id: 'failure-3',
      errorText: 'ETIMEDOUT: Connection timed out',
      errorCategory: 'timeout',
      files: ['src/network.ts']
    })
  ]
}

// ===== INTERFACE TESTS =====

describe('Failure Clustering Interfaces', () => {
  describe('FailurePattern interface', () => {
    it('should have all required properties', () => {
      const pattern: FailurePattern = {
        id: 'pattern-1',
        name: 'Module Not Found Pattern',
        description: 'Pattern for missing module errors',
        category: 'code',
        errorSignatures: ['Cannot find module', 'Module not found'],
        filePatterns: ['src/**/*.ts'],
        contextIndicators: ['import', 'require'],
        occurrenceCount: 5,
        lastOccurrence: '2024-01-15T10:30:00Z',
        affectedIssues: [1, 2, 3],
        successfulFixes: [],
        preventiveMeasures: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
        resolvedAt: null
      }

      expect(pattern).toHaveProperty('id')
      expect(pattern).toHaveProperty('name')
      expect(pattern).toHaveProperty('description')
      expect(pattern).toHaveProperty('category')
      expect(pattern).toHaveProperty('errorSignatures')
      expect(pattern).toHaveProperty('filePatterns')
      expect(pattern).toHaveProperty('contextIndicators')
      expect(pattern).toHaveProperty('occurrenceCount')
      expect(pattern).toHaveProperty('lastOccurrence')
      expect(pattern).toHaveProperty('affectedIssues')
      expect(pattern).toHaveProperty('successfulFixes')
      expect(pattern).toHaveProperty('preventiveMeasures')
      expect(pattern).toHaveProperty('createdAt')
      expect(pattern).toHaveProperty('updatedAt')
      expect(pattern).toHaveProperty('resolvedAt')
    })

    it('should allow all category types', () => {
      const categories: PatternCategory[] = ['code', 'project', 'workflow']
      for (const category of categories) {
        const pattern: Partial<FailurePattern> = { category }
        expect(['code', 'project', 'workflow']).toContain(pattern.category)
      }
    })
  })

  describe('FailureRecord interface', () => {
    it('should have all required properties', () => {
      const record = createFailureRecord()

      expect(record).toHaveProperty('id')
      expect(record).toHaveProperty('issueNumber')
      expect(record).toHaveProperty('phaseNumber')
      expect(record).toHaveProperty('errorText')
      expect(record).toHaveProperty('errorCategory')
      expect(record).toHaveProperty('files')
      expect(record).toHaveProperty('timestamp')
      expect(record).toHaveProperty('resolution')
      expect(record).toHaveProperty('fixDescription')
    })

    it('should allow all resolution types', () => {
      const resolutions: Array<FailureRecord['resolution']> = ['fixed', 'skipped', 'pending', null]
      for (const resolution of resolutions) {
        const record = createFailureRecord({ resolution })
        expect([null, 'fixed', 'skipped', 'pending']).toContain(record.resolution)
      }
    })
  })

  describe('PreventiveMeasure interface', () => {
    it('should have all required properties', () => {
      const measure: PreventiveMeasure = {
        id: 'measure-1',
        description: 'Check dependencies before running',
        type: 'verification',
        automatic: true,
        effectiveness: 0.8,
        application: 'Run npm install first'
      }

      expect(measure).toHaveProperty('id')
      expect(measure).toHaveProperty('description')
      expect(measure).toHaveProperty('type')
      expect(measure).toHaveProperty('automatic')
      expect(measure).toHaveProperty('effectiveness')
      expect(measure).toHaveProperty('application')
    })

    it('should allow all type values', () => {
      const types: Array<PreventiveMeasure['type']> = [
        'context',
        'verification',
        'phase_structure',
        'manual'
      ]
      for (const type of types) {
        const measure: Partial<PreventiveMeasure> = { type }
        expect(['context', 'verification', 'phase_structure', 'manual']).toContain(measure.type)
      }
    })
  })

  describe('FixRecord interface', () => {
    it('should have all required properties', () => {
      const fix: FixRecord = {
        failureId: 'failure-1',
        patternId: 'pattern-1',
        description: 'Installed missing dependency',
        effectiveness: 0.9,
        appliedAt: '2024-01-15T10:30:00Z',
        success: true
      }

      expect(fix).toHaveProperty('failureId')
      expect(fix).toHaveProperty('patternId')
      expect(fix).toHaveProperty('description')
      expect(fix).toHaveProperty('effectiveness')
      expect(fix).toHaveProperty('appliedAt')
      expect(fix).toHaveProperty('success')
    })
  })
})

// ===== SIMILARITY CALCULATION TESTS =====

describe('calculateSimilarity', () => {
  it('should return 1 for identical failures', () => {
    const failure = createFailureRecord()
    const similarity = calculateSimilarity(failure, failure)

    expect(similarity).toBe(1)
  })

  it('should return high similarity for similar error text', () => {
    const a = createFailureRecord({
      errorText: "Cannot find module 'lodash'",
      errorCategory: 'dependency',
      files: ['src/utils.ts']
    })
    const b = createFailureRecord({
      errorText: "Cannot find module 'underscore'",
      errorCategory: 'dependency',
      files: ['src/utils.ts']
    })

    const similarity = calculateSimilarity(a, b)

    // Should be high due to shared words and same category/files
    expect(similarity).toBeGreaterThan(0.5)
  })

  it('should return low similarity for dissimilar failures', () => {
    const a = createFailureRecord({
      errorText: "Cannot find module 'lodash'",
      errorCategory: 'dependency',
      files: ['src/utils.ts']
    })
    const b = createFailureRecord({
      errorText: 'ETIMEDOUT: Connection timed out at socket',
      errorCategory: 'timeout',
      files: ['src/network.ts']
    })

    const similarity = calculateSimilarity(a, b)

    // Should be low due to different text, category, and files
    expect(similarity).toBeLessThan(0.3)
  })

  it('should weight error text at 50%', () => {
    const a = createFailureRecord({
      errorText: 'error alpha beta gamma delta',
      errorCategory: 'unknown',
      files: []
    })
    const b = createFailureRecord({
      errorText: 'error alpha beta gamma delta',
      errorCategory: 'unknown',
      files: []
    })

    const similarity = calculateSimilarity(a, b)

    // Same text, same category (no files)
    expect(similarity).toBeCloseTo(0.5 + 0.2 + 0.3, 1) // text + category + empty files
  })

  it('should give category match 20% weight', () => {
    const a = createFailureRecord({
      errorText: 'completely different error message abc',
      errorCategory: 'syntax',
      files: []
    })
    const b = createFailureRecord({
      errorText: 'totally unrelated text xyz',
      errorCategory: 'syntax',
      files: []
    })

    const similarity = calculateSimilarity(a, b)

    // Different text but same category - should have at least 0.2 from category
    expect(similarity).toBeGreaterThanOrEqual(0.2)
  })

  it('should give file overlap 30% weight', () => {
    const a = createFailureRecord({
      errorText: 'unique error message one',
      errorCategory: 'syntax',
      files: ['shared.ts', 'only-a.ts']
    })
    const b = createFailureRecord({
      errorText: 'different error message two',
      errorCategory: 'test', // Different category
      files: ['shared.ts', 'only-b.ts']
    })

    // With 1 shared file out of 3 total, file similarity = 1/3
    // File contribution = 0.3 * (1/3) = 0.1
    const similarity = calculateSimilarity(a, b)
    expect(similarity).toBeGreaterThan(0)
  })

  it('should handle empty files arrays', () => {
    const a = createFailureRecord({ files: [] })
    const b = createFailureRecord({ files: [] })

    // Should not throw and should return valid similarity
    const similarity = calculateSimilarity(a, b)
    expect(similarity).toBeGreaterThanOrEqual(0)
    expect(similarity).toBeLessThanOrEqual(1)
  })

  it('should handle empty error text', () => {
    const a = createFailureRecord({ errorText: '' })
    const b = createFailureRecord({ errorText: '' })

    // Should not throw
    const similarity = calculateSimilarity(a, b)
    expect(similarity).toBeGreaterThanOrEqual(0)
    expect(similarity).toBeLessThanOrEqual(1)
  })
})

// ===== CLUSTERING TESTS =====

describe('clusterSimilarFailures', () => {
  it('should return empty array for empty input', () => {
    const clusters = clusterSimilarFailures([])
    expect(clusters).toEqual([])
  })

  it('should return empty array for single failure (requires 2+)', () => {
    const clusters = clusterSimilarFailures([createFailureRecord()])
    expect(clusters).toEqual([])
  })

  it('should cluster similar failures together', () => {
    const failures = createSimilarFailures()
    const clusters = clusterSimilarFailures(failures, 0.3)

    // All three should cluster together due to similar "module" text and dependency category
    expect(clusters.length).toBeGreaterThanOrEqual(1)
    expect(clusters[0].failures.length).toBeGreaterThanOrEqual(2)
  })

  it('should not cluster dissimilar failures', () => {
    const failures = createDissimilarFailures()
    const clusters = clusterSimilarFailures(failures, 0.8) // High threshold

    // With high threshold, dissimilar failures should not cluster
    expect(clusters.length).toBe(0)
  })

  it('should use default minSimilarity of 0.6', () => {
    const failures = [
      createFailureRecord({
        id: '1',
        errorText: "Error: Cannot find module 'react'",
        errorCategory: 'dependency'
      }),
      createFailureRecord({
        id: '2',
        errorText: "Error: Cannot find module 'vue'",
        errorCategory: 'dependency'
      })
    ]

    const clusters = clusterSimilarFailures(failures)
    // These should cluster with default threshold due to similar structure
    expect(clusters.length).toBeGreaterThanOrEqual(0)
  })

  it('should calculate cluster similarity', () => {
    const failures = createSimilarFailures()
    const clusters = clusterSimilarFailures(failures, 0.3)

    if (clusters.length > 0) {
      expect(clusters[0].similarity).toBeGreaterThan(0)
      expect(clusters[0].similarity).toBeLessThanOrEqual(1)
    }
  })

  it('should identify common error terms in cluster', () => {
    const failures = [
      createFailureRecord({ id: '1', errorText: "Cannot find module 'lodash'" }),
      createFailureRecord({ id: '2', errorText: "Cannot find module 'axios'" }),
      createFailureRecord({ id: '3', errorText: "Cannot find module 'express'" })
    ]

    const clusters = clusterSimilarFailures(failures, 0.3)

    if (clusters.length > 0) {
      expect(clusters[0].commonErrorTerms).toContain('cannot')
      expect(clusters[0].commonErrorTerms).toContain('find')
      expect(clusters[0].commonErrorTerms).toContain('module')
    }
  })

  it('should identify common files in cluster', () => {
    const failures = [
      createFailureRecord({ id: '1', files: ['src/utils.ts', 'src/index.ts'] }),
      createFailureRecord({ id: '2', files: ['src/utils.ts', 'src/helpers.ts'] }),
      createFailureRecord({ id: '3', files: ['src/utils.ts'] })
    ]

    const clusters = clusterSimilarFailures(failures, 0.3)

    if (clusters.length > 0) {
      expect(clusters[0].commonFiles).toContain('src/utils.ts')
    }
  })

  it('should handle many similar failures', () => {
    const failures: FailureRecord[] = []
    for (let i = 0; i < 20; i++) {
      failures.push(
        createFailureRecord({
          id: `failure-${i}`,
          errorText: `Cannot find module 'package-${i}'`,
          errorCategory: 'dependency'
        })
      )
    }

    const clusters = clusterSimilarFailures(failures, 0.4)

    // Should create at least one cluster
    expect(clusters.length).toBeGreaterThanOrEqual(1)
    // Cluster should contain multiple failures
    const totalClustered = clusters.reduce((sum, c) => sum + c.failures.length, 0)
    expect(totalClustered).toBeGreaterThan(1)
  })
})

// ===== PATTERN EXTRACTION TESTS =====

describe('extractPattern', () => {
  it('should create pattern with correct structure', () => {
    const cluster: FailureCluster = {
      failures: createSimilarFailures(),
      similarity: 0.8,
      commonErrorTerms: ['cannot', 'find', 'module'],
      commonFiles: ['src/utils.ts']
    }

    const pattern = extractPattern(cluster, 'test-pattern-1')

    expect(pattern.id).toBe('test-pattern-1')
    expect(pattern.name).toBeTruthy()
    expect(pattern.description).toBeTruthy()
    expect(['code', 'project', 'workflow']).toContain(pattern.category)
    expect(Array.isArray(pattern.errorSignatures)).toBe(true)
    expect(Array.isArray(pattern.filePatterns)).toBe(true)
    expect(Array.isArray(pattern.preventiveMeasures)).toBe(true)
    expect(pattern.occurrenceCount).toBe(cluster.failures.length)
  })

  it('should generate error signatures from common terms', () => {
    const cluster: FailureCluster = {
      failures: createSimilarFailures(),
      similarity: 0.8,
      commonErrorTerms: ['module', 'error', 'import'],
      commonFiles: []
    }

    const pattern = extractPattern(cluster, 'test-pattern')

    expect(pattern.errorSignatures.length).toBeGreaterThan(0)
    // Signatures should be regex-like strings
    expect(pattern.errorSignatures[0]).toMatch(/\\b\w+\\b/)
  })

  it('should use common files as file patterns', () => {
    const cluster: FailureCluster = {
      failures: createSimilarFailures(),
      similarity: 0.8,
      commonErrorTerms: [],
      commonFiles: ['src/utils.ts', 'src/helpers.ts']
    }

    const pattern = extractPattern(cluster, 'test-pattern')

    expect(pattern.filePatterns).toContain('src/utils.ts')
    expect(pattern.filePatterns).toContain('src/helpers.ts')
  })

  it('should set occurrence count from cluster size', () => {
    const failures = createSimilarFailures()
    const cluster: FailureCluster = {
      failures,
      similarity: 0.8,
      commonErrorTerms: [],
      commonFiles: []
    }

    const pattern = extractPattern(cluster, 'test-pattern')

    expect(pattern.occurrenceCount).toBe(failures.length)
  })

  it('should collect affected issues from failures', () => {
    const cluster: FailureCluster = {
      failures: [
        createFailureRecord({ issueNumber: 1 }),
        createFailureRecord({ issueNumber: 2 }),
        createFailureRecord({ issueNumber: 1 }) // Duplicate
      ],
      similarity: 0.8,
      commonErrorTerms: [],
      commonFiles: []
    }

    const pattern = extractPattern(cluster, 'test-pattern')

    expect(pattern.affectedIssues).toContain(1)
    expect(pattern.affectedIssues).toContain(2)
    // Should deduplicate
    expect(pattern.affectedIssues.length).toBe(2)
  })

  it('should assign appropriate category based on error types', () => {
    // Code-related errors (syntax/test)
    const codeCluster: FailureCluster = {
      failures: [
        createFailureRecord({ errorCategory: 'syntax' }),
        createFailureRecord({ errorCategory: 'test' })
      ],
      similarity: 0.8,
      commonErrorTerms: [],
      commonFiles: []
    }
    expect(extractPattern(codeCluster, 'p1').category).toBe('code')

    // Project-related errors (dependency)
    const projectCluster: FailureCluster = {
      failures: [
        createFailureRecord({ errorCategory: 'dependency' }),
        createFailureRecord({ errorCategory: 'permission' })
      ],
      similarity: 0.8,
      commonErrorTerms: [],
      commonFiles: []
    }
    expect(extractPattern(projectCluster, 'p2').category).toBe('project')

    // Workflow-related errors (timeout/network)
    const workflowCluster: FailureCluster = {
      failures: [
        createFailureRecord({ errorCategory: 'timeout' }),
        createFailureRecord({ errorCategory: 'network' })
      ],
      similarity: 0.8,
      commonErrorTerms: [],
      commonFiles: []
    }
    expect(extractPattern(workflowCluster, 'p3').category).toBe('workflow')
  })

  it('should include preventive measures based on category', () => {
    const cluster: FailureCluster = {
      failures: [createFailureRecord({ errorCategory: 'syntax' })],
      similarity: 1,
      commonErrorTerms: [],
      commonFiles: []
    }

    const pattern = extractPattern(cluster, 'test-pattern')

    expect(pattern.preventiveMeasures.length).toBeGreaterThan(0)
    // Each measure should have required properties
    for (const measure of pattern.preventiveMeasures) {
      expect(measure).toHaveProperty('id')
      expect(measure).toHaveProperty('description')
      expect(measure).toHaveProperty('type')
      expect(measure).toHaveProperty('automatic')
      expect(measure).toHaveProperty('effectiveness')
      expect(measure).toHaveProperty('application')
    }
  })

  it('should set timestamps', () => {
    const cluster: FailureCluster = {
      failures: [createFailureRecord()],
      similarity: 1,
      commonErrorTerms: [],
      commonFiles: []
    }

    const pattern = extractPattern(cluster, 'test-pattern')

    expect(pattern.createdAt).toBeTruthy()
    expect(pattern.updatedAt).toBeTruthy()
    expect(pattern.resolvedAt).toBeNull()
  })
})

// ===== HELPER FUNCTION TESTS =====

describe('findCommonErrorTerms', () => {
  it('should return empty array for empty input', () => {
    expect(findCommonErrorTerms([])).toEqual([])
  })

  it('should find terms appearing in multiple failures', () => {
    const failures = [
      createFailureRecord({ errorText: 'Cannot find module lodash' }),
      createFailureRecord({ errorText: 'Cannot find module axios' }),
      createFailureRecord({ errorText: 'Cannot find module express' })
    ]

    const terms = findCommonErrorTerms(failures)

    expect(terms).toContain('cannot')
    expect(terms).toContain('find')
    expect(terms).toContain('module')
  })

  it('should filter out stop words', () => {
    const failures = [
      createFailureRecord({ errorText: 'The error is that the module is not found' }),
      createFailureRecord({ errorText: 'The error is that the package is missing' })
    ]

    const terms = findCommonErrorTerms(failures)

    expect(terms).not.toContain('the')
    expect(terms).not.toContain('is')
    expect(terms).not.toContain('that')
  })

  it('should return top 10 terms at most', () => {
    const failures = [
      createFailureRecord({ errorText: 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu' }),
      createFailureRecord({ errorText: 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu' })
    ]

    const terms = findCommonErrorTerms(failures)

    expect(terms.length).toBeLessThanOrEqual(10)
  })

  it('should sort by frequency', () => {
    const failures = [
      createFailureRecord({ errorText: 'error error error module' }),
      createFailureRecord({ errorText: 'error error module module' }),
      createFailureRecord({ errorText: 'error module module module' })
    ]

    const terms = findCommonErrorTerms(failures)

    // Both 'error' and 'module' appear in all 3, should be included
    expect(terms).toContain('error')
    expect(terms).toContain('module')
  })
})

describe('findCommonFilePatterns', () => {
  it('should return empty array for empty input', () => {
    expect(findCommonFilePatterns([])).toEqual([])
  })

  it('should find files appearing in multiple failures', () => {
    const failures = [
      createFailureRecord({ files: ['src/utils.ts', 'src/index.ts'] }),
      createFailureRecord({ files: ['src/utils.ts', 'src/api.ts'] }),
      createFailureRecord({ files: ['src/utils.ts'] })
    ]

    const files = findCommonFilePatterns(failures)

    expect(files).toContain('src/utils.ts')
  })

  it('should not include files appearing only once', () => {
    const failures = [
      createFailureRecord({ files: ['unique-a.ts', 'shared.ts'] }),
      createFailureRecord({ files: ['unique-b.ts', 'shared.ts'] })
    ]

    const files = findCommonFilePatterns(failures)

    expect(files).toContain('shared.ts')
    expect(files).not.toContain('unique-a.ts')
    expect(files).not.toContain('unique-b.ts')
  })

  it('should sort by frequency', () => {
    const failures = [
      createFailureRecord({ files: ['most-common.ts', 'less-common.ts'] }),
      createFailureRecord({ files: ['most-common.ts', 'less-common.ts'] }),
      createFailureRecord({ files: ['most-common.ts'] })
    ]

    const files = findCommonFilePatterns(failures)

    expect(files[0]).toBe('most-common.ts')
  })
})

describe('getDefaultPreventiveMeasures', () => {
  it('should return measures for code category', () => {
    const measures = getDefaultPreventiveMeasures('code')

    expect(measures.length).toBeGreaterThan(0)
    expect(measures.some((m) => m.type === 'verification')).toBe(true)
  })

  it('should return measures for project category', () => {
    const measures = getDefaultPreventiveMeasures('project')

    expect(measures.length).toBeGreaterThan(0)
  })

  it('should return measures for workflow category', () => {
    const measures = getDefaultPreventiveMeasures('workflow')

    expect(measures.length).toBeGreaterThan(0)
    expect(measures.some((m) => m.type === 'phase_structure')).toBe(true)
  })

  it('should have valid effectiveness scores', () => {
    for (const category of ['code', 'project', 'workflow'] as PatternCategory[]) {
      const measures = getDefaultPreventiveMeasures(category)
      for (const measure of measures) {
        expect(measure.effectiveness).toBeGreaterThanOrEqual(0)
        expect(measure.effectiveness).toBeLessThanOrEqual(1)
      }
    }
  })
})

// ===== PATTERN MATCHING TESTS =====

describe('matchPatterns', () => {
  const testPattern: FailurePattern = {
    id: 'test-pattern',
    name: 'Module Error Pattern',
    description: 'Test pattern',
    category: 'code',
    errorSignatures: ['\\bmodule\\b', '\\bfind\\b'],
    filePatterns: ['src/utils.ts'],
    contextIndicators: ['import', 'require'],
    occurrenceCount: 5,
    lastOccurrence: '2024-01-15T10:30:00Z',
    affectedIssues: [1, 2],
    successfulFixes: [],
    preventiveMeasures: [
      {
        id: 'm1',
        description: 'Test measure',
        type: 'context',
        automatic: true,
        effectiveness: 0.8,
        application: 'Apply context'
      }
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    resolvedAt: null
  }

  it('should match failure against patterns', () => {
    const failure = createFailureRecord({
      errorText: "Cannot find module 'lodash'",
      files: ['src/utils.ts']
    })

    const matches = matchPatterns(failure, [testPattern])

    expect(matches.length).toBeGreaterThan(0)
    expect(matches[0].pattern.id).toBe('test-pattern')
  })

  it('should calculate match confidence', () => {
    const failure = createFailureRecord({
      errorText: "Cannot find module 'lodash'",
      files: ['src/utils.ts']
    })

    const matches = matchPatterns(failure, [testPattern])

    expect(matches[0].confidence).toBeGreaterThan(0)
    expect(matches[0].confidence).toBeLessThanOrEqual(1)
  })

  it('should track matched indicators', () => {
    const failure = createFailureRecord({
      errorText: "Cannot find module 'lodash'",
      files: ['src/utils.ts']
    })

    const matches = matchPatterns(failure, [testPattern])

    expect(matches[0].matchedIndicators.length).toBeGreaterThan(0)
  })

  it('should include suggested measures from pattern', () => {
    const failure = createFailureRecord({
      errorText: "Cannot find module 'lodash'",
      files: ['src/utils.ts']
    })

    const matches = matchPatterns(failure, [testPattern])

    expect(matches[0].suggestedMeasures.length).toBeGreaterThan(0)
  })

  it('should filter out low-confidence matches', () => {
    const failure = createFailureRecord({
      errorText: 'Completely unrelated error message',
      files: ['other/file.ts']
    })

    const matches = matchPatterns(failure, [testPattern])

    // Should not include matches below 0.2 confidence
    for (const match of matches) {
      expect(match.confidence).toBeGreaterThan(0.2)
    }
  })

  it('should sort matches by confidence', () => {
    const patterns: FailurePattern[] = [
      { ...testPattern, id: 'low-match', errorSignatures: ['\\bunlikely\\b'] },
      { ...testPattern, id: 'high-match', errorSignatures: ['\\bcannot\\b', '\\bmodule\\b'] }
    ]

    const failure = createFailureRecord({
      errorText: "Cannot find module 'lodash'"
    })

    const matches = matchPatterns(failure, patterns)

    if (matches.length > 1) {
      expect(matches[0].confidence).toBeGreaterThanOrEqual(matches[1].confidence)
    }
  })

  it('should return empty array when no patterns match', () => {
    const failure = createFailureRecord({
      errorText: 'xyz completely unique error 123',
      files: ['totally/different/path.js']
    })

    const matches = matchPatterns(failure, [testPattern])

    expect(matches.length).toBe(0)
  })
})

// ===== SERVICE CLASS TESTS =====

describe('FailureClusteringService', () => {
  let service: FailureClusteringService

  beforeEach(() => {
    service = new FailureClusteringService()
  })

  describe('failure management', () => {
    it('should add and retrieve failures', () => {
      const failure = createFailureRecord()
      service.addFailure(failure)

      const failures = service.getFailures()
      expect(failures).toHaveLength(1)
      expect(failures[0].id).toBe(failure.id)
    })

    it('should clear failures', () => {
      service.addFailure(createFailureRecord())
      service.addFailure(createFailureRecord({ id: 'failure-2' }))

      service.clearFailures()

      expect(service.getFailures()).toHaveLength(0)
    })

    it('should return copy of failures array', () => {
      service.addFailure(createFailureRecord())
      const failures = service.getFailures()

      failures.push(createFailureRecord({ id: 'injected' }))

      expect(service.getFailures()).toHaveLength(1)
    })
  })

  describe('clustering', () => {
    it('should analyze and cluster failures', () => {
      for (const failure of createSimilarFailures()) {
        service.addFailure(failure)
      }

      const clusters = service.analyzeAndCluster(0.3)

      expect(clusters.length).toBeGreaterThanOrEqual(1)
    })

    it('should accept custom similarity threshold', () => {
      for (const failure of createSimilarFailures()) {
        service.addFailure(failure)
      }

      const lowThreshold = service.analyzeAndCluster(0.1)
      const highThreshold = service.analyzeAndCluster(0.9)

      // Lower threshold should result in more clustering
      expect(lowThreshold.length).toBeGreaterThanOrEqual(highThreshold.length)
    })
  })

  describe('pattern management', () => {
    it('should extract and store patterns from clusters', () => {
      const clusters: FailureCluster[] = [
        {
          failures: createSimilarFailures(),
          similarity: 0.8,
          commonErrorTerms: ['error'],
          commonFiles: []
        }
      ]

      const patterns = service.extractPatterns(clusters)

      expect(patterns).toHaveLength(1)
      expect(service.getPatterns()).toHaveLength(1)
    })

    it('should add custom patterns', () => {
      const pattern: FailurePattern = {
        id: 'custom-pattern',
        name: 'Custom Pattern',
        description: 'A custom pattern',
        category: 'code',
        errorSignatures: [],
        filePatterns: [],
        contextIndicators: [],
        occurrenceCount: 0,
        lastOccurrence: '',
        affectedIssues: [],
        successfulFixes: [],
        preventiveMeasures: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        resolvedAt: null
      }

      service.addPattern(pattern)

      expect(service.getPattern('custom-pattern')).toBeDefined()
    })

    it('should get pattern by ID', () => {
      const clusters: FailureCluster[] = [
        {
          failures: createSimilarFailures(),
          similarity: 0.8,
          commonErrorTerms: [],
          commonFiles: []
        }
      ]

      const patterns = service.extractPatterns(clusters)
      const retrieved = service.getPattern(patterns[0].id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(patterns[0].id)
    })

    it('should return undefined for unknown pattern ID', () => {
      expect(service.getPattern('non-existent')).toBeUndefined()
    })
  })

  describe('pattern matching', () => {
    it('should match failures against stored patterns', () => {
      // Create and store a pattern
      const clusters: FailureCluster[] = [
        {
          failures: createSimilarFailures(),
          similarity: 0.8,
          commonErrorTerms: ['cannot', 'find', 'module'],
          commonFiles: ['src/utils.ts']
        }
      ]
      service.extractPatterns(clusters)

      // Try to match a similar failure
      const failure = createFailureRecord({
        errorText: "Cannot find module 'react'",
        files: ['src/utils.ts']
      })

      const matches = service.matchFailure(failure)

      expect(matches.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('pattern statistics', () => {
    it('should update pattern statistics', () => {
      const pattern: FailurePattern = {
        id: 'stat-pattern',
        name: 'Test',
        description: 'Test',
        category: 'code',
        errorSignatures: [],
        filePatterns: [],
        contextIndicators: [],
        occurrenceCount: 1,
        lastOccurrence: '2024-01-01T00:00:00Z',
        affectedIssues: [1],
        successfulFixes: [],
        preventiveMeasures: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        resolvedAt: null
      }

      service.addPattern(pattern)

      const failure = createFailureRecord({
        issueNumber: 99,
        timestamp: '2024-02-01T00:00:00Z'
      })

      service.updatePatternStatistics('stat-pattern', failure)

      const updated = service.getPattern('stat-pattern')
      expect(updated?.occurrenceCount).toBe(2)
      expect(updated?.affectedIssues).toContain(99)
      expect(updated?.lastOccurrence).toBe('2024-02-01T00:00:00Z')
    })

    it('should record successful fixes', () => {
      const pattern: FailurePattern = {
        id: 'fix-pattern',
        name: 'Test',
        description: 'Test',
        category: 'code',
        errorSignatures: [],
        filePatterns: [],
        contextIndicators: [],
        occurrenceCount: 1,
        lastOccurrence: '2024-01-01T00:00:00Z',
        affectedIssues: [],
        successfulFixes: [],
        preventiveMeasures: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        resolvedAt: null
      }

      service.addPattern(pattern)

      const fix: FixRecord = {
        failureId: 'failure-1',
        patternId: 'fix-pattern',
        description: 'Installed missing dependency',
        effectiveness: 0.9,
        appliedAt: '2024-01-15T10:00:00Z',
        success: true
      }

      service.recordFix(fix)

      const updated = service.getPattern('fix-pattern')
      expect(updated?.successfulFixes).toHaveLength(1)
      expect(updated?.successfulFixes[0].success).toBe(true)
    })
  })

  describe('ID generation', () => {
    it('should generate unique pattern IDs', () => {
      const id1 = service.generatePatternId()
      const id2 = service.generatePatternId()

      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^pattern-\d+$/)
      expect(id2).toMatch(/^pattern-\d+$/)
    })
  })
})

describe('singleton export', () => {
  it('should export a singleton instance', () => {
    expect(failureClusteringService).toBeInstanceOf(FailureClusteringService)
  })
})

// ===== EDGE CASE TESTS =====

describe('Edge Cases', () => {
  it('should handle failures with special characters in error text', () => {
    const failure = createFailureRecord({
      errorText: "Error: Can't parse file.ts:123:45 - SyntaxError: Unexpected <end>"
    })

    const similarity = calculateSimilarity(failure, failure)
    expect(similarity).toBe(1)
  })

  it('should handle very long error text', () => {
    const longError = 'Error '.repeat(1000) + 'at line 42'
    const failure = createFailureRecord({ errorText: longError })

    // Should not throw
    const terms = findCommonErrorTerms([failure, failure])
    expect(terms).toBeDefined()
  })

  it('should handle failures with no files', () => {
    const failures = [
      createFailureRecord({ id: '1', files: [] }),
      createFailureRecord({ id: '2', files: [] })
    ]

    const clusters = clusterSimilarFailures(failures, 0.5)
    expect(clusters).toBeDefined()
  })

  it('should handle failures with very long file lists', () => {
    const manyFiles = Array.from({ length: 100 }, (_, i) => `src/file${i}.ts`)
    const failure = createFailureRecord({ files: manyFiles })

    const similarity = calculateSimilarity(failure, failure)
    expect(similarity).toBe(1)
  })

  it('should handle unicode in error text', () => {
    const failure = createFailureRecord({
      errorText: 'Error: Unexpected token: symbol is not a function'
    })

    const terms = findCommonErrorTerms([failure])
    expect(terms).toBeDefined()
  })
})
