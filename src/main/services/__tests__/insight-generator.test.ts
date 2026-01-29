/**
 * Tests for InsightGenerator
 *
 * TDD: Tests written first, then implementation
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import {
  InsightType,
  InsightCategory,
  Insight,
  InsightInput,
  generateInsights,
  analyzeSuccessRate,
  analyzeDuration,
  analyzeRetryRate,
  analyzeTokenUsage,
  analyzeTrends
} from '../insight-generator'
import { VelocityMetrics, ExecutionRecord } from '../analytics-service'

describe('InsightGenerator', () => {
  // Helper to create VelocityMetrics with defaults
  function createVelocityMetrics(overrides: Partial<VelocityMetrics> = {}): VelocityMetrics {
    return {
      period: '7days',
      issues: {
        completed: 10,
        failed: 0,
        successRate: 1.0,
        avgDuration: 3600000 // 1 hour
      },
      phases: {
        completed: 30,
        retried: 0,
        retryRate: 0,
        avgDuration: 120000 // 2 minutes
      },
      tokens: {
        total: 100000,
        perIssue: 10000,
        perPhase: 3333
      },
      ...overrides
    }
  }

  // Helper to create ExecutionRecord
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

  describe('Interface definitions', () => {
    it('should have InsightType with correct values', () => {
      const types: InsightType[] = ['positive', 'improvement', 'warning']
      expect(types).toHaveLength(3)
    })

    it('should have InsightCategory with correct values', () => {
      const categories: InsightCategory[] = ['success', 'duration', 'efficiency', 'tokens', 'trend']
      expect(categories).toHaveLength(5)
    })

    it('should create valid Insight object', () => {
      const insight: Insight = {
        id: 'test-insight',
        type: 'positive',
        category: 'success',
        title: 'Test Insight',
        description: 'This is a test insight',
        metric: {
          current: 0.95,
          previous: 0.85,
          change: 0.1
        },
        priority: 3
      }

      expect(insight).toHaveProperty('id', 'test-insight')
      expect(insight).toHaveProperty('type', 'positive')
      expect(insight).toHaveProperty('category', 'success')
      expect(insight).toHaveProperty('title', 'Test Insight')
      expect(insight).toHaveProperty('description')
      expect(insight).toHaveProperty('metric')
      expect(insight.metric).toHaveProperty('current', 0.95)
      expect(insight.metric).toHaveProperty('previous', 0.85)
      expect(insight.metric).toHaveProperty('change', 0.1)
      expect(insight).toHaveProperty('priority', 3)
    })

    it('should create Insight without optional metric', () => {
      const insight: Insight = {
        id: 'simple-insight',
        type: 'improvement',
        category: 'trend',
        title: 'Simple Insight',
        description: 'This is a simple insight without metric',
        priority: 2
      }

      expect(insight.metric).toBeUndefined()
    })

    it('should create valid InsightInput object', () => {
      const input: InsightInput = {
        velocityMetrics: createVelocityMetrics(),
        recentExecutions: [createExecutionRecord()],
        previousMetrics: createVelocityMetrics()
      }

      expect(input).toHaveProperty('velocityMetrics')
      expect(input).toHaveProperty('recentExecutions')
      expect(input).toHaveProperty('previousMetrics')
    })

    it('should create InsightInput without optional previousMetrics', () => {
      const input: InsightInput = {
        velocityMetrics: createVelocityMetrics(),
        recentExecutions: []
      }

      expect(input.previousMetrics).toBeUndefined()
    })
  })

  describe('analyzeSuccessRate', () => {
    it('should return positive insight for success rate >= 90%', () => {
      const metrics = createVelocityMetrics({
        issues: { completed: 19, failed: 1, successRate: 0.95, avgDuration: 3600000 }
      })

      const insight = analyzeSuccessRate(metrics)

      expect(insight).not.toBeNull()
      expect(insight!.type).toBe('positive')
      expect(insight!.category).toBe('success')
      expect(insight!.id).toBe('success-high')
      expect(insight!.title).toContain('success rate')
      expect(insight!.description).toContain('95%')
      expect(insight!.metric?.current).toBe(0.95)
    })

    it('should return warning insight for success rate < 70%', () => {
      const metrics = createVelocityMetrics({
        issues: { completed: 6, failed: 4, successRate: 0.6, avgDuration: 3600000 }
      })

      const insight = analyzeSuccessRate(metrics)

      expect(insight).not.toBeNull()
      expect(insight!.type).toBe('warning')
      expect(insight!.category).toBe('success')
      expect(insight!.id).toBe('success-low')
      expect(insight!.title).toContain('success rate')
      expect(insight!.description).toContain('60%')
      expect(insight!.metric?.current).toBe(0.6)
    })

    it('should return null for success rate between 70% and 90%', () => {
      const metrics = createVelocityMetrics({
        issues: { completed: 8, failed: 2, successRate: 0.8, avgDuration: 3600000 }
      })

      const insight = analyzeSuccessRate(metrics)

      expect(insight).toBeNull()
    })

    it('should return null when no completed issues', () => {
      const metrics = createVelocityMetrics({
        issues: { completed: 0, failed: 0, successRate: 0, avgDuration: 0 }
      })

      const insight = analyzeSuccessRate(metrics)

      expect(insight).toBeNull()
    })

    it('should have higher priority for warning than positive', () => {
      const highSuccess = createVelocityMetrics({
        issues: { completed: 19, failed: 1, successRate: 0.95, avgDuration: 3600000 }
      })
      const lowSuccess = createVelocityMetrics({
        issues: { completed: 6, failed: 4, successRate: 0.6, avgDuration: 3600000 }
      })

      const positiveInsight = analyzeSuccessRate(highSuccess)
      const warningInsight = analyzeSuccessRate(lowSuccess)

      expect(warningInsight!.priority).toBeGreaterThan(positiveInsight!.priority)
    })
  })

  describe('analyzeDuration', () => {
    it('should return positive insight when avgDuration decreased by >= 10%', () => {
      const currentMetrics = createVelocityMetrics({
        issues: { completed: 10, failed: 0, successRate: 1.0, avgDuration: 3000000 }, // 50 min
        comparison: {
          issuesDelta: 0,
          successRateDelta: 0,
          durationDelta: -15, // 15% decrease
          tokensDelta: 0
        }
      })

      const insight = analyzeDuration(currentMetrics)

      expect(insight).not.toBeNull()
      expect(insight!.type).toBe('positive')
      expect(insight!.category).toBe('duration')
      expect(insight!.id).toBe('duration-improved')
      expect(insight!.metric?.change).toBe(-15)
    })

    it('should return warning insight when avgDuration increased by >= 20%', () => {
      const currentMetrics = createVelocityMetrics({
        issues: { completed: 10, failed: 0, successRate: 1.0, avgDuration: 4800000 }, // 80 min
        comparison: {
          issuesDelta: 0,
          successRateDelta: 0,
          durationDelta: 25, // 25% increase
          tokensDelta: 0
        }
      })

      const insight = analyzeDuration(currentMetrics)

      expect(insight).not.toBeNull()
      expect(insight!.type).toBe('warning')
      expect(insight!.category).toBe('duration')
      expect(insight!.id).toBe('duration-increased')
      expect(insight!.metric?.change).toBe(25)
    })

    it('should return null when duration change is within normal range', () => {
      const currentMetrics = createVelocityMetrics({
        issues: { completed: 10, failed: 0, successRate: 1.0, avgDuration: 3600000 },
        comparison: {
          issuesDelta: 0,
          successRateDelta: 0,
          durationDelta: 5, // Only 5% increase
          tokensDelta: 0
        }
      })

      const insight = analyzeDuration(currentMetrics)

      expect(insight).toBeNull()
    })

    it('should return null when no comparison data available', () => {
      const metrics = createVelocityMetrics({
        issues: { completed: 10, failed: 0, successRate: 1.0, avgDuration: 3600000 }
      })
      // No comparison property

      const insight = analyzeDuration(metrics)

      expect(insight).toBeNull()
    })

    it('should include duration values in description', () => {
      const currentMetrics = createVelocityMetrics({
        issues: { completed: 10, failed: 0, successRate: 1.0, avgDuration: 3000000 },
        comparison: {
          issuesDelta: 0,
          successRateDelta: 0,
          durationDelta: -20,
          tokensDelta: 0
        }
      })

      const insight = analyzeDuration(currentMetrics)

      expect(insight!.description).toBeTruthy()
    })
  })

  describe('analyzeRetryRate', () => {
    it('should return positive insight for retry rate < 5%', () => {
      const metrics = createVelocityMetrics({
        phases: { completed: 100, retried: 3, retryRate: 0.03, avgDuration: 120000 }
      })

      const insight = analyzeRetryRate(metrics)

      expect(insight).not.toBeNull()
      expect(insight!.type).toBe('positive')
      expect(insight!.category).toBe('efficiency')
      expect(insight!.id).toBe('retry-low')
      expect(insight!.metric?.current).toBe(0.03)
    })

    it('should return warning insight for retry rate > 15%', () => {
      const metrics = createVelocityMetrics({
        phases: { completed: 80, retried: 20, retryRate: 0.18, avgDuration: 120000 }
      })

      const insight = analyzeRetryRate(metrics)

      expect(insight).not.toBeNull()
      expect(insight!.type).toBe('warning')
      expect(insight!.category).toBe('efficiency')
      expect(insight!.id).toBe('retry-high')
      expect(insight!.description).toContain('smaller steps')
      expect(insight!.metric?.current).toBe(0.18)
    })

    it('should return null for retry rate between 5% and 15%', () => {
      const metrics = createVelocityMetrics({
        phases: { completed: 90, retried: 10, retryRate: 0.1, avgDuration: 120000 }
      })

      const insight = analyzeRetryRate(metrics)

      expect(insight).toBeNull()
    })

    it('should return null when no phases', () => {
      const metrics = createVelocityMetrics({
        phases: { completed: 0, retried: 0, retryRate: 0, avgDuration: 0 }
      })

      const insight = analyzeRetryRate(metrics)

      expect(insight).toBeNull()
    })

    it('should have higher priority for warning than positive', () => {
      const lowRetry = createVelocityMetrics({
        phases: { completed: 100, retried: 3, retryRate: 0.03, avgDuration: 120000 }
      })
      const highRetry = createVelocityMetrics({
        phases: { completed: 80, retried: 20, retryRate: 0.2, avgDuration: 120000 }
      })

      const positiveInsight = analyzeRetryRate(lowRetry)
      const warningInsight = analyzeRetryRate(highRetry)

      expect(warningInsight!.priority).toBeGreaterThan(positiveInsight!.priority)
    })
  })

  describe('analyzeTokenUsage', () => {
    it('should return positive insight when tokensPerIssue decreased by >= 15%', () => {
      const metrics = createVelocityMetrics({
        tokens: { total: 85000, perIssue: 8500, perPhase: 2833 },
        comparison: {
          issuesDelta: 0,
          successRateDelta: 0,
          durationDelta: 0,
          tokensDelta: -20 // 20% decrease in tokens
        }
      })

      const insight = analyzeTokenUsage(metrics)

      expect(insight).not.toBeNull()
      expect(insight!.type).toBe('positive')
      expect(insight!.category).toBe('tokens')
      expect(insight!.id).toBe('tokens-efficient')
    })

    it('should return warning insight when tokensPerIssue increased by >= 25%', () => {
      const metrics = createVelocityMetrics({
        tokens: { total: 150000, perIssue: 15000, perPhase: 5000 },
        comparison: {
          issuesDelta: 0,
          successRateDelta: 0,
          durationDelta: 0,
          tokensDelta: 30 // 30% increase
        }
      })

      const insight = analyzeTokenUsage(metrics)

      expect(insight).not.toBeNull()
      expect(insight!.type).toBe('warning')
      expect(insight!.category).toBe('tokens')
      expect(insight!.id).toBe('tokens-high')
    })

    it('should return null when token change is within normal range', () => {
      const metrics = createVelocityMetrics({
        tokens: { total: 110000, perIssue: 11000, perPhase: 3667 },
        comparison: {
          issuesDelta: 0,
          successRateDelta: 0,
          durationDelta: 0,
          tokensDelta: 10 // Only 10% increase
        }
      })

      const insight = analyzeTokenUsage(metrics)

      expect(insight).toBeNull()
    })

    it('should return null when no comparison data', () => {
      const metrics = createVelocityMetrics()

      const insight = analyzeTokenUsage(metrics)

      expect(insight).toBeNull()
    })
  })

  describe('analyzeTrends', () => {
    it('should return positive insight when issues completed increased', () => {
      const current = createVelocityMetrics({
        issues: { completed: 15, failed: 1, successRate: 0.94, avgDuration: 3600000 }
      })
      const previous = createVelocityMetrics({
        issues: { completed: 10, failed: 2, successRate: 0.83, avgDuration: 4000000 }
      })

      const insights = analyzeTrends(current, previous)

      const productivityInsight = insights.find((i) => i.id === 'trend-productivity-up')
      expect(productivityInsight).toBeDefined()
      expect(productivityInsight!.type).toBe('positive')
      expect(productivityInsight!.category).toBe('trend')
    })

    it('should return improvement insight when issues completed decreased', () => {
      const current = createVelocityMetrics({
        issues: { completed: 5, failed: 1, successRate: 0.83, avgDuration: 3600000 }
      })
      const previous = createVelocityMetrics({
        issues: { completed: 10, failed: 0, successRate: 1.0, avgDuration: 3600000 }
      })

      const insights = analyzeTrends(current, previous)

      const productivityInsight = insights.find((i) => i.id === 'trend-productivity-down')
      expect(productivityInsight).toBeDefined()
      expect(productivityInsight!.type).toBe('improvement')
      expect(productivityInsight!.category).toBe('trend')
    })

    it('should return empty array when no previous metrics', () => {
      const current = createVelocityMetrics()

      const insights = analyzeTrends(current, undefined)

      expect(insights).toEqual([])
    })

    it('should return empty array when previous has no completed issues', () => {
      const current = createVelocityMetrics({
        issues: { completed: 10, failed: 0, successRate: 1.0, avgDuration: 3600000 }
      })
      const previous = createVelocityMetrics({
        issues: { completed: 0, failed: 0, successRate: 0, avgDuration: 0 }
      })

      const insights = analyzeTrends(current, previous)

      expect(insights).toEqual([])
    })

    it('should detect multiple trends', () => {
      const current = createVelocityMetrics({
        issues: { completed: 20, failed: 0, successRate: 1.0, avgDuration: 2400000 },
        phases: { completed: 60, retried: 2, retryRate: 0.033, avgDuration: 80000 }
      })
      const previous = createVelocityMetrics({
        issues: { completed: 10, failed: 2, successRate: 0.83, avgDuration: 3600000 },
        phases: { completed: 30, retried: 6, retryRate: 0.2, avgDuration: 120000 }
      })

      const insights = analyzeTrends(current, previous)

      // Should potentially have multiple trend insights
      expect(insights.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('generateInsights', () => {
    it('should return array of insights', () => {
      const input: InsightInput = {
        velocityMetrics: createVelocityMetrics({
          issues: { completed: 19, failed: 1, successRate: 0.95, avgDuration: 3600000 }
        }),
        recentExecutions: []
      }

      const insights = generateInsights(input)

      expect(Array.isArray(insights)).toBe(true)
    })

    it('should sort insights by priority (highest first)', () => {
      const input: InsightInput = {
        velocityMetrics: createVelocityMetrics({
          issues: { completed: 6, failed: 4, successRate: 0.6, avgDuration: 3600000 }, // Warning
          phases: { completed: 100, retried: 3, retryRate: 0.03, avgDuration: 120000 } // Positive
        }),
        recentExecutions: []
      }

      const insights = generateInsights(input)

      // Verify sorted by priority descending
      for (let i = 1; i < insights.length; i++) {
        expect(insights[i].priority).toBeLessThanOrEqual(insights[i - 1].priority)
      }
    })

    it('should include success rate insight when applicable', () => {
      const input: InsightInput = {
        velocityMetrics: createVelocityMetrics({
          issues: { completed: 19, failed: 1, successRate: 0.95, avgDuration: 3600000 }
        }),
        recentExecutions: []
      }

      const insights = generateInsights(input)

      const successInsight = insights.find((i) => i.category === 'success')
      expect(successInsight).toBeDefined()
    })

    it('should include retry rate insight when applicable', () => {
      const input: InsightInput = {
        velocityMetrics: createVelocityMetrics({
          phases: { completed: 80, retried: 20, retryRate: 0.2, avgDuration: 120000 }
        }),
        recentExecutions: []
      }

      const insights = generateInsights(input)

      const retryInsight = insights.find((i) => i.category === 'efficiency')
      expect(retryInsight).toBeDefined()
    })

    it('should include duration insight when comparison available', () => {
      const input: InsightInput = {
        velocityMetrics: createVelocityMetrics({
          issues: { completed: 10, failed: 0, successRate: 1.0, avgDuration: 3000000 },
          comparison: {
            issuesDelta: 0,
            successRateDelta: 0,
            durationDelta: -25,
            tokensDelta: 0
          }
        }),
        recentExecutions: []
      }

      const insights = generateInsights(input)

      const durationInsight = insights.find((i) => i.category === 'duration')
      expect(durationInsight).toBeDefined()
    })

    it('should include token usage insight when comparison available', () => {
      const input: InsightInput = {
        velocityMetrics: createVelocityMetrics({
          tokens: { total: 75000, perIssue: 7500, perPhase: 2500 },
          comparison: {
            issuesDelta: 0,
            successRateDelta: 0,
            durationDelta: 0,
            tokensDelta: -20
          }
        }),
        recentExecutions: []
      }

      const insights = generateInsights(input)

      const tokenInsight = insights.find((i) => i.category === 'tokens')
      expect(tokenInsight).toBeDefined()
    })

    it('should include trend insights when previous metrics provided', () => {
      const input: InsightInput = {
        velocityMetrics: createVelocityMetrics({
          issues: { completed: 15, failed: 0, successRate: 1.0, avgDuration: 3600000 }
        }),
        recentExecutions: [],
        previousMetrics: createVelocityMetrics({
          issues: { completed: 8, failed: 2, successRate: 0.8, avgDuration: 4000000 }
        })
      }

      const insights = generateInsights(input)

      const trendInsight = insights.find((i) => i.category === 'trend')
      expect(trendInsight).toBeDefined()
    })

    it('should return empty array when no insights applicable', () => {
      const input: InsightInput = {
        velocityMetrics: createVelocityMetrics({
          issues: { completed: 0, failed: 0, successRate: 0, avgDuration: 0 },
          phases: { completed: 0, retried: 0, retryRate: 0, avgDuration: 0 }
        }),
        recentExecutions: []
      }

      const insights = generateInsights(input)

      expect(insights).toEqual([])
    })

    it('should not have duplicate insights', () => {
      const input: InsightInput = {
        velocityMetrics: createVelocityMetrics({
          issues: { completed: 19, failed: 1, successRate: 0.95, avgDuration: 3600000 },
          phases: { completed: 100, retried: 3, retryRate: 0.03, avgDuration: 120000 }
        }),
        recentExecutions: []
      }

      const insights = generateInsights(input)
      const ids = insights.map((i) => i.id)
      const uniqueIds = [...new Set(ids)]

      expect(ids.length).toBe(uniqueIds.length)
    })

    it('should generate multiple insights from various analyzers', () => {
      const input: InsightInput = {
        velocityMetrics: createVelocityMetrics({
          issues: { completed: 19, failed: 1, successRate: 0.95, avgDuration: 3000000 },
          phases: { completed: 100, retried: 3, retryRate: 0.03, avgDuration: 120000 },
          comparison: {
            issuesDelta: 50,
            successRateDelta: 10,
            durationDelta: -15,
            tokensDelta: -20
          }
        }),
        recentExecutions: [],
        previousMetrics: createVelocityMetrics({
          issues: { completed: 10, failed: 2, successRate: 0.83, avgDuration: 4000000 }
        })
      }

      const insights = generateInsights(input)

      // Should have insights from multiple categories
      const categories = new Set(insights.map((i) => i.category))
      expect(categories.size).toBeGreaterThanOrEqual(2)
    })
  })

  describe('insight examples from requirements', () => {
    it('should generate high success rate insight matching example', () => {
      const input: InsightInput = {
        velocityMetrics: createVelocityMetrics({
          issues: { completed: 19, failed: 1, successRate: 0.95, avgDuration: 3600000 }
        }),
        recentExecutions: []
      }

      const insights = generateInsights(input)
      const successInsight = insights.find((i) => i.id === 'success-high')

      expect(successInsight).toBeDefined()
      expect(successInsight!.type).toBe('positive')
      expect(successInsight!.category).toBe('success')
      expect(successInsight!.title.toLowerCase()).toContain('success rate')
      expect(successInsight!.description).toContain('95%')
      expect(successInsight!.metric?.current).toBe(0.95)
    })

    it('should generate high retry rate warning matching example', () => {
      const input: InsightInput = {
        velocityMetrics: createVelocityMetrics({
          phases: { completed: 82, retried: 18, retryRate: 0.18, avgDuration: 120000 }
        }),
        recentExecutions: []
      }

      const insights = generateInsights(input)
      const retryInsight = insights.find((i) => i.id === 'retry-high')

      expect(retryInsight).toBeDefined()
      expect(retryInsight!.type).toBe('warning')
      expect(retryInsight!.category).toBe('efficiency')
      expect(retryInsight!.title.toLowerCase()).toContain('retry')
      expect(retryInsight!.description).toContain('18%')
      expect(retryInsight!.description.toLowerCase()).toContain('smaller steps')
      expect(retryInsight!.metric?.current).toBe(0.18)
    })
  })

  describe('priority values', () => {
    it('should have priority between 1 and 5', () => {
      const input: InsightInput = {
        velocityMetrics: createVelocityMetrics({
          issues: { completed: 6, failed: 4, successRate: 0.6, avgDuration: 3600000 },
          phases: { completed: 80, retried: 20, retryRate: 0.2, avgDuration: 120000 },
          comparison: {
            issuesDelta: -50,
            successRateDelta: -20,
            durationDelta: 30,
            tokensDelta: 40
          }
        }),
        recentExecutions: [],
        previousMetrics: createVelocityMetrics({
          issues: { completed: 12, failed: 0, successRate: 1.0, avgDuration: 2400000 }
        })
      }

      const insights = generateInsights(input)

      for (const insight of insights) {
        expect(insight.priority).toBeGreaterThanOrEqual(1)
        expect(insight.priority).toBeLessThanOrEqual(5)
      }
    })

    it('should give warnings higher priority than positive insights', () => {
      const input: InsightInput = {
        velocityMetrics: createVelocityMetrics({
          issues: { completed: 6, failed: 4, successRate: 0.6, avgDuration: 3600000 }, // Warning: low success
          phases: { completed: 100, retried: 2, retryRate: 0.02, avgDuration: 120000 } // Positive: low retry
        }),
        recentExecutions: []
      }

      const insights = generateInsights(input)

      const warningInsights = insights.filter((i) => i.type === 'warning')
      const positiveInsights = insights.filter((i) => i.type === 'positive')

      if (warningInsights.length > 0 && positiveInsights.length > 0) {
        const maxPositivePriority = Math.max(...positiveInsights.map((i) => i.priority))
        const minWarningPriority = Math.min(...warningInsights.map((i) => i.priority))
        expect(minWarningPriority).toBeGreaterThanOrEqual(maxPositivePriority)
      }
    })
  })
})
