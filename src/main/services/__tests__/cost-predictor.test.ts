/**
 * Tests for Cost Predictor Service
 *
 * Tests cost prediction, similar issue matching, confidence calculation,
 * and budget tracking functionality.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { mkdir, rm, readFile, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import {
  CostPredictor,
  CostPrediction,
  PredictionFactor,
  BudgetSettings,
  isHighCost,
  loadBudgetSettings,
  saveBudgetSettings,
  getDailySpend,
  getWeeklySpend
} from '../cost-predictor'
import { ExecutionRecord, IssueFeatures, GitHubIssue } from '../feature-extractor'

// Helper to create test execution records
function createTestRecord(
  overrides: Partial<ExecutionRecord> = {}
): ExecutionRecord {
  return {
    issueNumber: 1,
    issueTitle: 'Test Issue',
    features: {
      bodyLength: 500,
      criteriaCount: 3,
      estimatedFiles: 2,
      hasTests: false,
      issueType: 'feature',
      labelComplexity: 2,
      codeKeywords: ['typescript', 'react']
    },
    actualInputTokens: 10000,
    actualOutputTokens: 5000,
    actualCost: 0.12,
    phases: 1,
    durationMs: 30000,
    retries: 0,
    success: true,
    executedAt: new Date().toISOString(),
    ...overrides
  }
}

// Helper to create test issues
function createTestIssue(overrides: Partial<GitHubIssue> = {}): GitHubIssue {
  return {
    number: 42,
    title: 'feat: Add new feature',
    body: 'This is a test body with some content.\n- [ ] First item\n- [ ] Second item',
    labels: [{ name: 'enhancement' }],
    ...overrides
  }
}

describe('CostPredictor', () => {
  let testProjectPath: string
  let predictor: CostPredictor

  beforeEach(async () => {
    // Create a unique temp directory for each test
    testProjectPath = join(
      tmpdir(),
      `tiki-cost-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    )
    await mkdir(testProjectPath, { recursive: true })
    predictor = new CostPredictor()
  })

  afterEach(async () => {
    // Clean up temp directory
    try {
      await rm(testProjectPath, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('CostPrediction interface', () => {
    it('should return all required properties', () => {
      const issue = createTestIssue()
      const prediction = predictor.predictCost(issue)

      // Check estimatedTokens
      expect(prediction.estimatedTokens).toHaveProperty('low')
      expect(prediction.estimatedTokens).toHaveProperty('expected')
      expect(prediction.estimatedTokens).toHaveProperty('high')
      expect(typeof prediction.estimatedTokens.low).toBe('number')
      expect(typeof prediction.estimatedTokens.expected).toBe('number')
      expect(typeof prediction.estimatedTokens.high).toBe('number')

      // Check estimatedCost
      expect(prediction.estimatedCost).toHaveProperty('low')
      expect(prediction.estimatedCost).toHaveProperty('expected')
      expect(prediction.estimatedCost).toHaveProperty('high')
      expect(typeof prediction.estimatedCost.low).toBe('number')

      // Check confidence
      expect(['low', 'medium', 'high']).toContain(prediction.confidence)

      // Check factors
      expect(Array.isArray(prediction.factors)).toBe(true)

      // Check comparisons
      expect(prediction.comparisons).toHaveProperty('vsAverage')
      expect(prediction.comparisons).toHaveProperty('vsSimilar')
      expect(prediction.comparisons).toHaveProperty('vsRecent')

      // Check breakdown
      expect(prediction.breakdown).toHaveProperty('planning')
      expect(prediction.breakdown).toHaveProperty('execution')
      expect(prediction.breakdown).toHaveProperty('verification')
      expect(prediction.breakdown).toHaveProperty('fixes')

      // Check similarIssues
      expect(Array.isArray(prediction.similarIssues)).toBe(true)
    })

    it('should have token ranges in correct order (low <= expected <= high)', () => {
      const issue = createTestIssue()
      const prediction = predictor.predictCost(issue)

      expect(prediction.estimatedTokens.low).toBeLessThanOrEqual(
        prediction.estimatedTokens.expected
      )
      expect(prediction.estimatedTokens.expected).toBeLessThanOrEqual(
        prediction.estimatedTokens.high
      )
    })

    it('should have cost ranges in correct order', () => {
      const issue = createTestIssue()
      const prediction = predictor.predictCost(issue)

      expect(prediction.estimatedCost.low).toBeLessThanOrEqual(
        prediction.estimatedCost.expected
      )
      expect(prediction.estimatedCost.expected).toBeLessThanOrEqual(
        prediction.estimatedCost.high
      )
    })

    it('should have breakdown percentages summing to 100', () => {
      const issue = createTestIssue()
      const prediction = predictor.predictCost(issue)

      const total =
        prediction.breakdown.planning +
        prediction.breakdown.execution +
        prediction.breakdown.verification +
        prediction.breakdown.fixes

      expect(total).toBe(100)
    })
  })

  describe('PredictionFactor interface', () => {
    it('should return factors with required properties', () => {
      const issue = createTestIssue()
      const prediction = predictor.predictCost(issue)

      expect(prediction.factors.length).toBeGreaterThan(0)

      for (const factor of prediction.factors) {
        expect(factor).toHaveProperty('name')
        expect(factor).toHaveProperty('impact')
        expect(factor).toHaveProperty('weight')
        expect(factor).toHaveProperty('reason')

        expect(typeof factor.name).toBe('string')
        expect(['increases', 'decreases', 'neutral']).toContain(factor.impact)
        expect(typeof factor.weight).toBe('number')
        expect(factor.weight).toBeGreaterThanOrEqual(-100)
        expect(factor.weight).toBeLessThanOrEqual(100)
        expect(typeof factor.reason).toBe('string')
      }
    })

    it('should include issue type factor', () => {
      const issue = createTestIssue({ title: 'fix: Bug fix' })
      const prediction = predictor.predictCost(issue)

      const typeFactors = prediction.factors.filter(
        (f) =>
          f.name === 'Bug fix' ||
          f.name === 'New feature' ||
          f.name === 'Refactoring' ||
          f.name === 'Documentation' ||
          f.name === 'General task'
      )

      expect(typeFactors.length).toBe(1)
    })
  })

  describe('calculateBaseEstimate', () => {
    it('should return higher estimate for complex features', () => {
      const simpleIssue = createTestIssue({
        title: 'fix: Simple bug',
        body: 'Fix a typo',
        labels: [{ name: 'bug' }]
      })

      const complexIssue = createTestIssue({
        title: 'feat: Major refactor',
        body: `
This is a complex feature requiring changes to multiple systems.
- [ ] Update API
- [ ] Migrate database
- [ ] Update frontend
- [ ] Add tests
- [ ] Update documentation
- [ ] Performance optimization
`,
        labels: [{ name: 'feature' }, { name: 'breaking-change' }, { name: 'architecture' }]
      })

      const simplePrediction = predictor.predictCost(simpleIssue)
      const complexPrediction = predictor.predictCost(complexIssue)

      expect(complexPrediction.estimatedTokens.expected).toBeGreaterThan(
        simplePrediction.estimatedTokens.expected
      )
    })

    it('should return minimal estimate for simple bugs', () => {
      const issue = createTestIssue({
        title: 'fix: Typo',
        body: 'Fix typo in README',
        labels: [{ name: 'bug' }]
      })

      const prediction = predictor.predictCost(issue)

      // Should be in minimal/simple range
      expect(prediction.estimatedTokens.expected).toBeLessThan(30000)
    })

    it('should increase estimate for test requirements', () => {
      const withoutTests = createTestIssue({
        title: 'feat: Add button',
        body: 'Add a new button to the UI'
      })

      const withTests = createTestIssue({
        title: 'feat: Add button',
        body: 'Add a new button to the UI.\n\nShould include unit tests for the component.'
      })

      const predWithout = predictor.predictCost(withoutTests)
      const predWith = predictor.predictCost(withTests)

      expect(predWith.estimatedTokens.expected).toBeGreaterThan(
        predWithout.estimatedTokens.expected
      )
    })

    it('should increase estimate for many files', () => {
      const fewFiles = createTestIssue({
        title: 'feat: Update component',
        body: 'Update Button.tsx'
      })

      const manyFiles = createTestIssue({
        title: 'feat: Refactor all components',
        body: `Update multiple files:
- Button.tsx
- Input.tsx
- Select.tsx
- Modal.tsx
- Dialog.tsx
- Table.tsx
- Form.tsx
- Card.tsx
- List.tsx
- Grid.tsx
- Panel.tsx
`
      })

      const predFew = predictor.predictCost(fewFiles)
      const predMany = predictor.predictCost(manyFiles)

      expect(predMany.estimatedTokens.expected).toBeGreaterThan(
        predFew.estimatedTokens.expected
      )
    })
  })

  describe('findSimilarIssues', () => {
    it('should return empty array when no history', () => {
      const issue = createTestIssue()
      const prediction = predictor.predictCost(issue)

      expect(prediction.similarIssues).toEqual([])
    })

    it('should find similar issues by type', () => {
      const historicalRecords = [
        createTestRecord({
          issueNumber: 1,
          issueTitle: 'feat: Add feature A',
          features: {
            bodyLength: 500,
            criteriaCount: 2,
            estimatedFiles: 2,
            hasTests: false,
            issueType: 'feature',
            labelComplexity: 2,
            codeKeywords: ['typescript']
          }
        }),
        createTestRecord({
          issueNumber: 2,
          issueTitle: 'fix: Bug fix',
          features: {
            bodyLength: 200,
            criteriaCount: 1,
            estimatedFiles: 1,
            hasTests: false,
            issueType: 'bug',
            labelComplexity: 1,
            codeKeywords: []
          }
        })
      ]

      predictor.setHistoricalData(historicalRecords)

      const featureIssue = createTestIssue({
        title: 'feat: Add feature B',
        labels: [{ name: 'feature' }]
      })

      const prediction = predictor.predictCost(featureIssue)

      // Should find the feature issue as more similar
      expect(prediction.similarIssues.length).toBeGreaterThan(0)
      expect(prediction.similarIssues[0].number).toBe(1)
    })

    it('should limit similar issues to 5', () => {
      const historicalRecords = Array.from({ length: 10 }, (_, i) =>
        createTestRecord({
          issueNumber: i + 1,
          issueTitle: `feat: Feature ${i + 1}`,
          features: {
            bodyLength: 500,
            criteriaCount: 2,
            estimatedFiles: 2,
            hasTests: false,
            issueType: 'feature',
            labelComplexity: 2,
            codeKeywords: ['typescript']
          }
        })
      )

      predictor.setHistoricalData(historicalRecords)

      const issue = createTestIssue()
      const prediction = predictor.predictCost(issue)

      expect(prediction.similarIssues.length).toBeLessThanOrEqual(5)
    })

    it('should include similarity score between 0 and 1', () => {
      const historicalRecords = [
        createTestRecord({
          issueNumber: 1,
          issueTitle: 'feat: Similar feature',
          features: {
            bodyLength: 500,
            criteriaCount: 2,
            estimatedFiles: 2,
            hasTests: false,
            issueType: 'feature',
            labelComplexity: 2,
            codeKeywords: ['typescript']
          }
        })
      ]

      predictor.setHistoricalData(historicalRecords)

      const issue = createTestIssue()
      const prediction = predictor.predictCost(issue)

      for (const similar of prediction.similarIssues) {
        expect(similar.similarity).toBeGreaterThanOrEqual(0)
        expect(similar.similarity).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('calculateConfidence', () => {
    it('should return low confidence with no history and poor features', () => {
      const issue = createTestIssue({
        title: 'Issue',
        body: '',
        labels: []
      })

      const prediction = predictor.predictCost(issue)
      expect(prediction.confidence).toBe('low')
    })

    it('should return medium confidence with good feature coverage', () => {
      const issue = createTestIssue({
        title: 'feat: Add new dashboard',
        body: `
## Description
Add a new analytics dashboard with charts and graphs. This will display user metrics
including daily active users, revenue statistics, and engagement rates over time.
The dashboard should be responsive and work on both desktop and mobile devices.

## Implementation Details
We need to integrate with the existing API endpoints and add proper error handling.
The chart library should support interactive tooltips and zoom functionality.

## Acceptance Criteria
- [ ] Create dashboard component with React
- [ ] Add chart library integration
- [ ] Connect to backend API
- [ ] Add loading states
- [ ] Handle error cases gracefully
`,
        labels: [{ name: 'feature' }]
      })

      const prediction = predictor.predictCost(issue)
      expect(['medium', 'high']).toContain(prediction.confidence)
    })

    it('should return medium confidence with 1-2 similar issues', () => {
      predictor.setHistoricalData([
        createTestRecord({
          features: {
            bodyLength: 500,
            criteriaCount: 2,
            estimatedFiles: 2,
            hasTests: false,
            issueType: 'feature',
            labelComplexity: 2,
            codeKeywords: ['typescript']
          }
        })
      ])

      const issue = createTestIssue()
      const prediction = predictor.predictCost(issue)

      expect(prediction.confidence).toBe('medium')
    })

    it('should return high confidence with 3+ similar issues', () => {
      predictor.setHistoricalData([
        createTestRecord({
          issueNumber: 1,
          features: {
            bodyLength: 500,
            criteriaCount: 2,
            estimatedFiles: 2,
            hasTests: false,
            issueType: 'feature',
            labelComplexity: 2,
            codeKeywords: ['typescript']
          }
        }),
        createTestRecord({
          issueNumber: 2,
          features: {
            bodyLength: 600,
            criteriaCount: 3,
            estimatedFiles: 2,
            hasTests: false,
            issueType: 'feature',
            labelComplexity: 2,
            codeKeywords: ['react']
          }
        }),
        createTestRecord({
          issueNumber: 3,
          features: {
            bodyLength: 400,
            criteriaCount: 2,
            estimatedFiles: 3,
            hasTests: false,
            issueType: 'feature',
            labelComplexity: 3,
            codeKeywords: ['typescript', 'react']
          }
        })
      ])

      const issue = createTestIssue()
      const prediction = predictor.predictCost(issue)

      expect(prediction.confidence).toBe('high')
    })
  })

  describe('predictCost without history (pure heuristics)', () => {
    it('should work for minimal issue', () => {
      const issue: GitHubIssue = {
        number: 1,
        title: 'Simple task'
      }

      const prediction = predictor.predictCost(issue)

      expect(prediction.estimatedTokens.expected).toBeGreaterThan(0)
      expect(prediction.estimatedCost.expected).toBeGreaterThan(0)
      expect(prediction.confidence).toBe('low')
      expect(prediction.similarIssues).toEqual([])
    })

    it('should apply +/- 30% range without history', () => {
      const issue = createTestIssue()
      const prediction = predictor.predictCost(issue)

      const expected = prediction.estimatedTokens.expected
      const low = prediction.estimatedTokens.low
      const high = prediction.estimatedTokens.high

      // Low should be approximately 70% of expected
      expect(low).toBeCloseTo(expected * 0.7, -1)
      // High should be approximately 130% of expected
      expect(high).toBeCloseTo(expected * 1.3, -1)
    })

    it('should return vsAverage of 1 without history', () => {
      const issue = createTestIssue()
      const prediction = predictor.predictCost(issue)

      expect(prediction.comparisons.vsAverage).toBe(1)
    })

    it('should return null for vsSimilar and vsRecent without history', () => {
      const issue = createTestIssue()
      const prediction = predictor.predictCost(issue)

      expect(prediction.comparisons.vsSimilar).toBeNull()
      expect(prediction.comparisons.vsRecent).toBeNull()
    })
  })

  describe('predictCost with history', () => {
    beforeEach(() => {
      predictor.setHistoricalData([
        createTestRecord({
          issueNumber: 1,
          actualInputTokens: 8000,
          actualOutputTokens: 4000,
          actualCost: 0.10,
          features: {
            bodyLength: 500,
            criteriaCount: 2,
            estimatedFiles: 2,
            hasTests: false,
            issueType: 'feature',
            labelComplexity: 2,
            codeKeywords: ['typescript']
          }
        }),
        createTestRecord({
          issueNumber: 2,
          actualInputTokens: 12000,
          actualOutputTokens: 6000,
          actualCost: 0.14,
          features: {
            bodyLength: 600,
            criteriaCount: 3,
            estimatedFiles: 3,
            hasTests: false,
            issueType: 'feature',
            labelComplexity: 3,
            codeKeywords: ['react']
          }
        }),
        createTestRecord({
          issueNumber: 3,
          actualInputTokens: 10000,
          actualOutputTokens: 5000,
          actualCost: 0.12,
          features: {
            bodyLength: 400,
            criteriaCount: 2,
            estimatedFiles: 2,
            hasTests: false,
            issueType: 'feature',
            labelComplexity: 2,
            codeKeywords: ['typescript', 'react']
          }
        })
      ])
    })

    it('should use percentiles from similar issues', () => {
      const issue = createTestIssue()
      const prediction = predictor.predictCost(issue)

      // With 3 similar issues, should use actual percentiles
      expect(prediction.similarIssues.length).toBeGreaterThanOrEqual(3)
    })

    it('should calculate vsAverage comparison', () => {
      const issue = createTestIssue()
      const prediction = predictor.predictCost(issue)

      expect(prediction.comparisons.vsAverage).toBeGreaterThan(0)
    })

    it('should calculate vsSimilar comparison', () => {
      const issue = createTestIssue()
      const prediction = predictor.predictCost(issue)

      expect(prediction.comparisons.vsSimilar).not.toBeNull()
      expect(prediction.comparisons.vsSimilar).toBeGreaterThan(0)
    })

    it('should include similar issues with actualCost', () => {
      const issue = createTestIssue()
      const prediction = predictor.predictCost(issue)

      for (const similar of prediction.similarIssues) {
        expect(similar.actualCost).toBeGreaterThan(0)
      }
    })
  })

  describe('predictFromPlan', () => {
    it('should use plan phase count for multiplier', () => {
      const plan = {
        phases: [
          { files: ['file1.ts'], verification: ['npm test'] },
          { files: ['file2.ts'], verification: ['npm test'] },
          { files: ['file3.ts'], verification: ['npm test'] }
        ]
      }

      const issue = createTestIssue()

      const regularPrediction = predictor.predictCost(issue)
      const planPrediction = predictor.predictFromPlan(plan, issue)

      // Plan with 3 phases should have higher estimate
      expect(planPrediction.estimatedTokens.expected).toBeGreaterThan(
        regularPrediction.estimatedTokens.expected
      )
    })

    it('should include multi-phase factor', () => {
      const plan = {
        phases: [
          { files: ['file1.ts'], verification: [] },
          { files: ['file2.ts'], verification: [] }
        ]
      }

      const issue = createTestIssue()
      const prediction = predictor.predictFromPlan(plan, issue)

      const phaseFactor = prediction.factors.find((f) => f.name === 'Multi-phase plan')
      expect(phaseFactor).toBeDefined()
      expect(phaseFactor?.impact).toBe('increases')
    })

    it('should adjust file estimate based on plan', () => {
      const plan = {
        phases: [
          { files: ['file1.ts', 'file2.ts', 'file3.ts', 'file4.ts', 'file5.ts'], verification: [] }
        ]
      }

      const issue = createTestIssue({
        body: 'Simple change' // Would normally estimate 1 file
      })

      const regularPrediction = predictor.predictCost(issue)
      const planPrediction = predictor.predictFromPlan(plan, issue)

      // Plan specifies more files
      expect(planPrediction.estimatedTokens.expected).toBeGreaterThan(
        regularPrediction.estimatedTokens.expected
      )
    })
  })

  describe('explainFactors', () => {
    it('should include bug fix factor for bugs', () => {
      const issue = createTestIssue({
        title: 'fix: Bug',
        labels: [{ name: 'bug' }]
      })

      const prediction = predictor.predictCost(issue)
      const bugFactor = prediction.factors.find((f) => f.name === 'Bug fix')

      expect(bugFactor).toBeDefined()
      expect(bugFactor?.impact).toBe('decreases')
    })

    it('should include new feature factor for features', () => {
      const issue = createTestIssue({
        title: 'feat: New feature',
        labels: [{ name: 'feature' }]
      })

      const prediction = predictor.predictCost(issue)
      const featureFactor = prediction.factors.find((f) => f.name === 'New feature')

      expect(featureFactor).toBeDefined()
      expect(featureFactor?.impact).toBe('increases')
    })

    it('should include refactoring factor for refactors', () => {
      const issue = createTestIssue({
        title: 'refactor: Code cleanup',
        labels: [{ name: 'refactor' }]
      })

      const prediction = predictor.predictCost(issue)
      const refactorFactor = prediction.factors.find((f) => f.name === 'Refactoring')

      expect(refactorFactor).toBeDefined()
      expect(refactorFactor?.impact).toBe('increases')
    })

    it('should include complexity factors for high complexity', () => {
      const issue = createTestIssue({
        labels: [{ name: 'breaking-change' }, { name: 'architecture' }, { name: 'security' }]
      })

      const prediction = predictor.predictCost(issue)
      const complexityFactor = prediction.factors.find((f) =>
        f.name.includes('complexity')
      )

      expect(complexityFactor).toBeDefined()
    })

    it('should include test factor when tests required', () => {
      const issue = createTestIssue({
        body: 'Implement feature and add unit tests'
      })

      const prediction = predictor.predictCost(issue)
      const testFactor = prediction.factors.find((f) => f.name === 'Tests required')

      expect(testFactor).toBeDefined()
      expect(testFactor?.impact).toBe('increases')
    })

    it('should include acceptance criteria factor for many criteria', () => {
      const issue = createTestIssue({
        body: `
- [ ] Item 1
- [ ] Item 2
- [ ] Item 3
- [ ] Item 4
- [ ] Item 5
- [ ] Item 6
`
      })

      const prediction = predictor.predictCost(issue)
      const criteriaFactor = prediction.factors.find((f) =>
        f.name.includes('acceptance criteria')
      )

      expect(criteriaFactor).toBeDefined()
    })
  })

  describe('tokensToCost', () => {
    it('should calculate cost correctly', () => {
      // Using blended rate of 0.008 per 1K tokens
      const cost = predictor['tokensToCost'](10000)
      expect(cost).toBeCloseTo(0.08, 4)
    })

    it('should handle zero tokens', () => {
      const cost = predictor['tokensToCost'](0)
      expect(cost).toBe(0)
    })
  })

  describe('getAverageIssueCost', () => {
    it('should return null with no history', () => {
      expect(predictor.getAverageIssueCost()).toBeNull()
    })

    it('should calculate average correctly', () => {
      predictor.setHistoricalData([
        createTestRecord({ actualCost: 0.10 }),
        createTestRecord({ actualCost: 0.20 }),
        createTestRecord({ actualCost: 0.15 })
      ])

      const avg = predictor.getAverageIssueCost()
      expect(avg).toBeCloseTo(0.15, 4)
    })
  })

  describe('getRecentAverageCost', () => {
    it('should return null with insufficient history', () => {
      predictor.setHistoricalData([
        createTestRecord({ actualCost: 0.10 })
      ])

      expect(predictor.getRecentAverageCost(5)).toBeNull()
    })

    it('should calculate average of most recent', () => {
      const now = new Date()
      predictor.setHistoricalData([
        createTestRecord({
          actualCost: 0.10,
          executedAt: new Date(now.getTime() - 5000).toISOString()
        }),
        createTestRecord({
          actualCost: 0.20,
          executedAt: new Date(now.getTime() - 4000).toISOString()
        }),
        createTestRecord({
          actualCost: 0.30,
          executedAt: new Date(now.getTime() - 3000).toISOString()
        }),
        createTestRecord({
          actualCost: 0.40,
          executedAt: new Date(now.getTime() - 2000).toISOString()
        }),
        createTestRecord({
          actualCost: 0.50,
          executedAt: new Date(now.getTime() - 1000).toISOString()
        }),
        createTestRecord({
          actualCost: 0.01,
          executedAt: new Date(now.getTime() - 10000).toISOString() // Older, should not be included
        })
      ])

      const avg = predictor.getRecentAverageCost(5)
      // Most recent 5: 0.50, 0.40, 0.30, 0.20, 0.10 = 1.50 / 5 = 0.30
      expect(avg).toBeCloseTo(0.30, 4)
    })
  })

  describe('isHighCost', () => {
    it('should return true when cost exceeds threshold', () => {
      const prediction: CostPrediction = {
        estimatedTokens: { low: 70000, expected: 100000, high: 130000 },
        estimatedCost: { low: 0.56, expected: 0.80, high: 1.04 },
        confidence: 'medium',
        factors: [],
        comparisons: { vsAverage: 2.5, vsSimilar: null, vsRecent: null },
        breakdown: { planning: 15, execution: 55, verification: 20, fixes: 10 },
        similarIssues: []
      }

      expect(isHighCost(prediction, 0.32, 2.0)).toBe(true)
    })

    it('should return false when cost is below threshold', () => {
      const prediction: CostPrediction = {
        estimatedTokens: { low: 7000, expected: 10000, high: 13000 },
        estimatedCost: { low: 0.056, expected: 0.08, high: 0.104 },
        confidence: 'medium',
        factors: [],
        comparisons: { vsAverage: 0.8, vsSimilar: null, vsRecent: null },
        breakdown: { planning: 15, execution: 55, verification: 20, fixes: 10 },
        similarIssues: []
      }

      expect(isHighCost(prediction, 0.10, 2.0)).toBe(false)
    })

    it('should use absolute threshold when no average', () => {
      const lowCost: CostPrediction = {
        estimatedTokens: { low: 7000, expected: 10000, high: 13000 },
        estimatedCost: { low: 0.056, expected: 0.08, high: 0.104 },
        confidence: 'low',
        factors: [],
        comparisons: { vsAverage: 1, vsSimilar: null, vsRecent: null },
        breakdown: { planning: 15, execution: 55, verification: 20, fixes: 10 },
        similarIssues: []
      }

      const highCost: CostPrediction = {
        estimatedTokens: { low: 100000, expected: 150000, high: 200000 },
        estimatedCost: { low: 0.80, expected: 1.20, high: 1.60 },
        confidence: 'low',
        factors: [],
        comparisons: { vsAverage: 1, vsSimilar: null, vsRecent: null },
        breakdown: { planning: 15, execution: 55, verification: 20, fixes: 10 },
        similarIssues: []
      }

      expect(isHighCost(lowCost, null)).toBe(false)
      expect(isHighCost(highCost, null)).toBe(true)
    })

    it('should use custom threshold', () => {
      const prediction: CostPrediction = {
        estimatedTokens: { low: 14000, expected: 20000, high: 26000 },
        estimatedCost: { low: 0.112, expected: 0.16, high: 0.208 },
        confidence: 'medium',
        factors: [],
        comparisons: { vsAverage: 1.6, vsSimilar: null, vsRecent: null },
        breakdown: { planning: 15, execution: 55, verification: 20, fixes: 10 },
        similarIssues: []
      }

      // 0.16 is 1.6x of 0.10
      expect(isHighCost(prediction, 0.10, 1.5)).toBe(true)
      expect(isHighCost(prediction, 0.10, 2.0)).toBe(false)
    })
  })

  describe('Budget Settings', () => {
    describe('loadBudgetSettings', () => {
      it('should return defaults when no file exists', async () => {
        const settings = await loadBudgetSettings(testProjectPath)

        expect(settings.dailyBudget).toBeNull()
        expect(settings.weeklyBudget).toBeNull()
        expect(settings.warnThreshold).toBe(2.0)
      })

      it('should load settings from file', async () => {
        const analyticsPath = join(testProjectPath, '.tiki', 'analytics')
        await mkdir(analyticsPath, { recursive: true })

        const customSettings: BudgetSettings = {
          dailyBudget: 5.0,
          weeklyBudget: 25.0,
          warnThreshold: 1.5
        }

        await writeFile(
          join(analyticsPath, 'budget.json'),
          JSON.stringify(customSettings),
          'utf-8'
        )

        const settings = await loadBudgetSettings(testProjectPath)

        expect(settings.dailyBudget).toBe(5.0)
        expect(settings.weeklyBudget).toBe(25.0)
        expect(settings.warnThreshold).toBe(1.5)
      })

      it('should merge with defaults for partial settings', async () => {
        const analyticsPath = join(testProjectPath, '.tiki', 'analytics')
        await mkdir(analyticsPath, { recursive: true })

        await writeFile(
          join(analyticsPath, 'budget.json'),
          JSON.stringify({ dailyBudget: 10.0 }),
          'utf-8'
        )

        const settings = await loadBudgetSettings(testProjectPath)

        expect(settings.dailyBudget).toBe(10.0)
        expect(settings.weeklyBudget).toBeNull()
        expect(settings.warnThreshold).toBe(2.0)
      })
    })

    describe('saveBudgetSettings', () => {
      it('should create analytics directory and save settings', async () => {
        const settings: BudgetSettings = {
          dailyBudget: 5.0,
          weeklyBudget: 25.0,
          warnThreshold: 1.5
        }

        await saveBudgetSettings(testProjectPath, settings)

        const filePath = join(testProjectPath, '.tiki', 'analytics', 'budget.json')
        const content = await readFile(filePath, 'utf-8')
        const saved = JSON.parse(content)

        expect(saved.dailyBudget).toBe(5.0)
        expect(saved.weeklyBudget).toBe(25.0)
        expect(saved.warnThreshold).toBe(1.5)
      })

      it('should overwrite existing settings', async () => {
        const settings1: BudgetSettings = {
          dailyBudget: 5.0,
          weeklyBudget: 25.0,
          warnThreshold: 1.5
        }

        const settings2: BudgetSettings = {
          dailyBudget: 10.0,
          weeklyBudget: 50.0,
          warnThreshold: 3.0
        }

        await saveBudgetSettings(testProjectPath, settings1)
        await saveBudgetSettings(testProjectPath, settings2)

        const loaded = await loadBudgetSettings(testProjectPath)

        expect(loaded.dailyBudget).toBe(10.0)
        expect(loaded.weeklyBudget).toBe(50.0)
        expect(loaded.warnThreshold).toBe(3.0)
      })
    })
  })

  describe('Spend Tracking', () => {
    beforeEach(async () => {
      // Set up execution history
      const analyticsPath = join(testProjectPath, '.tiki', 'analytics')
      await mkdir(analyticsPath, { recursive: true })

      const now = new Date()
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)

      const lastWeek = new Date(now)
      lastWeek.setDate(lastWeek.getDate() - 8)

      const records: ExecutionRecord[] = [
        createTestRecord({
          issueNumber: 1,
          actualCost: 0.10,
          executedAt: now.toISOString()
        }),
        createTestRecord({
          issueNumber: 2,
          actualCost: 0.15,
          executedAt: now.toISOString()
        }),
        createTestRecord({
          issueNumber: 3,
          actualCost: 0.20,
          executedAt: yesterday.toISOString()
        }),
        createTestRecord({
          issueNumber: 4,
          actualCost: 0.50,
          executedAt: lastWeek.toISOString()
        })
      ]

      await writeFile(
        join(analyticsPath, 'executions.json'),
        JSON.stringify({ records, version: 1 }),
        'utf-8'
      )
    })

    describe('getDailySpend', () => {
      it('should sum costs for today only', async () => {
        const spend = await getDailySpend(testProjectPath)
        // Today: 0.10 + 0.15 = 0.25
        expect(spend).toBeCloseTo(0.25, 4)
      })

      it('should return 0 for no executions today', async () => {
        const analyticsPath = join(testProjectPath, '.tiki', 'analytics')
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)

        const records: ExecutionRecord[] = [
          createTestRecord({
            actualCost: 0.50,
            executedAt: yesterday.toISOString()
          })
        ]

        await writeFile(
          join(analyticsPath, 'executions.json'),
          JSON.stringify({ records, version: 1 }),
          'utf-8'
        )

        const spend = await getDailySpend(testProjectPath)
        expect(spend).toBe(0)
      })
    })

    describe('getWeeklySpend', () => {
      it('should sum costs for this week', async () => {
        const spend = await getWeeklySpend(testProjectPath)
        // This week: 0.10 + 0.15 + 0.20 = 0.45 (excludes lastWeek's 0.50)
        expect(spend).toBeCloseTo(0.45, 4)
      })

      it('should return 0 for no executions this week', async () => {
        const analyticsPath = join(testProjectPath, '.tiki', 'analytics')
        const lastMonth = new Date()
        lastMonth.setDate(lastMonth.getDate() - 30)

        const records: ExecutionRecord[] = [
          createTestRecord({
            actualCost: 0.50,
            executedAt: lastMonth.toISOString()
          })
        ]

        await writeFile(
          join(analyticsPath, 'executions.json'),
          JSON.stringify({ records, version: 1 }),
          'utf-8'
        )

        const spend = await getWeeklySpend(testProjectPath)
        expect(spend).toBe(0)
      })
    })
  })

  describe('loadHistory', () => {
    it('should load history from project path', async () => {
      const analyticsPath = join(testProjectPath, '.tiki', 'analytics')
      await mkdir(analyticsPath, { recursive: true })

      const records: ExecutionRecord[] = [
        createTestRecord({ issueNumber: 1 }),
        createTestRecord({ issueNumber: 2 })
      ]

      await writeFile(
        join(analyticsPath, 'executions.json'),
        JSON.stringify({ records, version: 1 }),
        'utf-8'
      )

      await predictor.loadHistory(testProjectPath)
      const data = predictor.getHistoricalData()

      expect(data.length).toBe(2)
      expect(data[0].issueNumber).toBe(1)
      expect(data[1].issueNumber).toBe(2)
    })

    it('should handle missing file gracefully', async () => {
      await predictor.loadHistory(testProjectPath)
      const data = predictor.getHistoricalData()

      expect(data).toEqual([])
    })
  })

  describe('tokensToBreakdown', () => {
    it('should adjust breakdown for bug fixes', () => {
      const issue = createTestIssue({
        title: 'fix: Bug',
        labels: [{ name: 'bug' }]
      })

      const prediction = predictor.predictCost(issue)

      // Bug fixes should have less planning, more verification/fixes
      expect(prediction.breakdown.planning).toBeLessThanOrEqual(15)
      expect(prediction.breakdown.verification).toBeGreaterThanOrEqual(20)
    })

    it('should adjust breakdown for documentation', () => {
      const issue = createTestIssue({
        title: 'docs: Update README',
        labels: [{ name: 'documentation' }]
      })

      const prediction = predictor.predictCost(issue)

      // Docs should have more execution, less verification/fixes
      expect(prediction.breakdown.execution).toBeGreaterThanOrEqual(60)
      expect(prediction.breakdown.fixes).toBeLessThanOrEqual(10)
    })

    it('should adjust breakdown for refactoring', () => {
      const issue = createTestIssue({
        title: 'refactor: Code cleanup',
        labels: [{ name: 'refactor' }]
      })

      const prediction = predictor.predictCost(issue)

      // Refactoring should have more planning
      expect(prediction.breakdown.planning).toBeGreaterThanOrEqual(15)
    })
  })
})
