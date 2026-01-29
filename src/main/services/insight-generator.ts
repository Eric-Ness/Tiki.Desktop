/**
 * Insight Generator Service
 *
 * Generates actionable insights from analytics data to help users
 * understand their productivity patterns and identify improvements.
 */
import { VelocityMetrics, ExecutionRecord } from './analytics-service'

// Type definitions
export type InsightType = 'positive' | 'improvement' | 'warning'
export type InsightCategory = 'success' | 'duration' | 'efficiency' | 'tokens' | 'trend'

export interface Insight {
  id: string
  type: InsightType
  category: InsightCategory
  title: string
  description: string
  metric?: {
    current: number
    previous?: number
    change?: number
  }
  priority: number // 1-5, higher = more important
}

export interface InsightInput {
  velocityMetrics: VelocityMetrics
  recentExecutions: ExecutionRecord[]
  previousMetrics?: VelocityMetrics
}

// Thresholds for insight generation
const THRESHOLDS = {
  SUCCESS_HIGH: 0.9, // >= 90% success rate is positive
  SUCCESS_LOW: 0.7, // < 70% success rate is warning
  DURATION_IMPROVED: -10, // >= 10% decrease is positive
  DURATION_INCREASED: 20, // >= 20% increase is warning
  RETRY_LOW: 0.05, // < 5% retry rate is positive
  RETRY_HIGH: 0.15, // > 15% retry rate is warning
  TOKENS_EFFICIENT: -15, // >= 15% decrease is positive
  TOKENS_HIGH: 25 // >= 25% increase is warning
}

// Priority levels
const PRIORITY = {
  WARNING_HIGH: 5,
  WARNING_MEDIUM: 4,
  IMPROVEMENT: 3,
  POSITIVE_HIGH: 3,
  POSITIVE_MEDIUM: 2,
  POSITIVE_LOW: 1
}

/**
 * Analyze success rate and generate appropriate insight
 */
export function analyzeSuccessRate(metrics: VelocityMetrics): Insight | null {
  const { completed, failed, successRate } = metrics.issues

  // Skip if no finished issues
  if (completed + failed === 0) {
    return null
  }

  const percentDisplay = Math.round(successRate * 100)

  if (successRate >= THRESHOLDS.SUCCESS_HIGH) {
    return {
      id: 'success-high',
      type: 'positive',
      category: 'success',
      title: 'High success rate',
      description: `Your success rate is ${percentDisplay}%, well above the 90% target.`,
      metric: { current: successRate },
      priority: PRIORITY.POSITIVE_MEDIUM
    }
  }

  if (successRate < THRESHOLDS.SUCCESS_LOW) {
    return {
      id: 'success-low',
      type: 'warning',
      category: 'success',
      title: 'Low success rate',
      description: `Your success rate is ${percentDisplay}%, below the 70% threshold. Consider reviewing failed issues for common patterns.`,
      metric: { current: successRate },
      priority: PRIORITY.WARNING_HIGH
    }
  }

  return null
}

/**
 * Analyze duration changes and generate appropriate insight
 */
export function analyzeDuration(metrics: VelocityMetrics): Insight | null {
  const { comparison } = metrics

  // Skip if no comparison data available
  if (!comparison) {
    return null
  }

  const { durationDelta } = comparison
  const currentAvgMinutes = Math.round(metrics.issues.avgDuration / 60000)

  if (durationDelta <= THRESHOLDS.DURATION_IMPROVED) {
    const improvementPercent = Math.abs(Math.round(durationDelta))
    return {
      id: 'duration-improved',
      type: 'positive',
      category: 'duration',
      title: 'Faster issue completion',
      description: `Average duration decreased by ${improvementPercent}%. Currently averaging ${currentAvgMinutes} minutes per issue.`,
      metric: {
        current: metrics.issues.avgDuration,
        change: durationDelta
      },
      priority: PRIORITY.POSITIVE_MEDIUM
    }
  }

  if (durationDelta >= THRESHOLDS.DURATION_INCREASED) {
    const increasePercent = Math.round(durationDelta)
    return {
      id: 'duration-increased',
      type: 'warning',
      category: 'duration',
      title: 'Slower issue completion',
      description: `Average duration increased by ${increasePercent}%. Currently averaging ${currentAvgMinutes} minutes per issue.`,
      metric: {
        current: metrics.issues.avgDuration,
        change: durationDelta
      },
      priority: PRIORITY.WARNING_MEDIUM
    }
  }

  return null
}

/**
 * Analyze retry rate and generate appropriate insight
 */
export function analyzeRetryRate(metrics: VelocityMetrics): Insight | null {
  const { completed, retryRate } = metrics.phases

  // Skip if no phases
  if (completed === 0 && metrics.phases.retried === 0) {
    return null
  }

  const percentDisplay = Math.round(retryRate * 100)

  if (retryRate < THRESHOLDS.RETRY_LOW) {
    return {
      id: 'retry-low',
      type: 'positive',
      category: 'efficiency',
      title: 'Low retry rate',
      description: `Phase retry rate is ${percentDisplay}%, indicating efficient execution.`,
      metric: { current: retryRate },
      priority: PRIORITY.POSITIVE_LOW
    }
  }

  if (retryRate > THRESHOLDS.RETRY_HIGH) {
    return {
      id: 'retry-high',
      type: 'warning',
      category: 'efficiency',
      title: 'High retry rate',
      description: `Phase retry rate is ${percentDisplay}%. Consider breaking phases into smaller steps.`,
      metric: { current: retryRate },
      priority: PRIORITY.WARNING_MEDIUM
    }
  }

  return null
}

/**
 * Analyze token usage and generate appropriate insight
 */
export function analyzeTokenUsage(metrics: VelocityMetrics): Insight | null {
  const { comparison } = metrics

  // Skip if no comparison data available
  if (!comparison) {
    return null
  }

  const { tokensDelta } = comparison
  const currentTokensPerIssue = Math.round(metrics.tokens.perIssue)

  if (tokensDelta <= THRESHOLDS.TOKENS_EFFICIENT) {
    const improvementPercent = Math.abs(Math.round(tokensDelta))
    return {
      id: 'tokens-efficient',
      type: 'positive',
      category: 'tokens',
      title: 'Improved token efficiency',
      description: `Token usage decreased by ${improvementPercent}%. Currently using ${currentTokensPerIssue.toLocaleString()} tokens per issue.`,
      metric: {
        current: metrics.tokens.perIssue,
        change: tokensDelta
      },
      priority: PRIORITY.POSITIVE_LOW
    }
  }

  if (tokensDelta >= THRESHOLDS.TOKENS_HIGH) {
    const increasePercent = Math.round(tokensDelta)
    return {
      id: 'tokens-high',
      type: 'warning',
      category: 'tokens',
      title: 'High token usage',
      description: `Token usage increased by ${increasePercent}%. Currently using ${currentTokensPerIssue.toLocaleString()} tokens per issue.`,
      metric: {
        current: metrics.tokens.perIssue,
        change: tokensDelta
      },
      priority: PRIORITY.WARNING_MEDIUM
    }
  }

  return null
}

/**
 * Analyze trends between current and previous periods
 */
export function analyzeTrends(
  current: VelocityMetrics,
  previous?: VelocityMetrics
): Insight[] {
  const insights: Insight[] = []

  // Skip if no previous metrics or no data in previous period
  if (!previous || previous.issues.completed === 0) {
    return insights
  }

  const currentCompleted = current.issues.completed
  const previousCompleted = previous.issues.completed

  // Calculate percentage change in completed issues
  const completedChange =
    ((currentCompleted - previousCompleted) / previousCompleted) * 100

  if (completedChange > 0) {
    const changePercent = Math.round(completedChange)
    insights.push({
      id: 'trend-productivity-up',
      type: 'positive',
      category: 'trend',
      title: 'Productivity increasing',
      description: `Completed ${currentCompleted} issues this period, up ${changePercent}% from ${previousCompleted} in the previous period.`,
      metric: {
        current: currentCompleted,
        previous: previousCompleted,
        change: completedChange
      },
      priority: PRIORITY.POSITIVE_HIGH
    })
  } else if (completedChange < -20) {
    // Only flag significant decreases
    const changePercent = Math.abs(Math.round(completedChange))
    insights.push({
      id: 'trend-productivity-down',
      type: 'improvement',
      category: 'trend',
      title: 'Productivity trending down',
      description: `Completed ${currentCompleted} issues this period, down ${changePercent}% from ${previousCompleted} in the previous period.`,
      metric: {
        current: currentCompleted,
        previous: previousCompleted,
        change: completedChange
      },
      priority: PRIORITY.IMPROVEMENT
    })
  }

  return insights
}

/**
 * Generate all insights from metrics
 */
export function generateInsights(input: InsightInput): Insight[] {
  const { velocityMetrics, previousMetrics } = input
  const insights: Insight[] = []

  // Analyze success rate
  const successInsight = analyzeSuccessRate(velocityMetrics)
  if (successInsight) {
    insights.push(successInsight)
  }

  // Analyze duration
  const durationInsight = analyzeDuration(velocityMetrics)
  if (durationInsight) {
    insights.push(durationInsight)
  }

  // Analyze retry rate
  const retryInsight = analyzeRetryRate(velocityMetrics)
  if (retryInsight) {
    insights.push(retryInsight)
  }

  // Analyze token usage
  const tokenInsight = analyzeTokenUsage(velocityMetrics)
  if (tokenInsight) {
    insights.push(tokenInsight)
  }

  // Analyze trends
  const trendInsights = analyzeTrends(velocityMetrics, previousMetrics)
  insights.push(...trendInsights)

  // Sort by priority (highest first)
  insights.sort((a, b) => b.priority - a.priority)

  return insights
}
