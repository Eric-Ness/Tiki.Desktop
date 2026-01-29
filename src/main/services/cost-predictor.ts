/**
 * Cost Predictor Service
 *
 * Predicts execution costs for GitHub issues based on extracted features
 * and historical execution data.
 */
import { join } from 'path'
import { readFile, writeFile, mkdir, access, constants } from 'fs/promises'
import {
  IssueFeatures,
  ExecutionRecord,
  extractFeatures,
  loadExecutionHistory,
  GitHubIssue
} from './feature-extractor'

/**
 * Cost prediction result with ranges and explanations
 */
export interface CostPrediction {
  estimatedTokens: {
    low: number // 25th percentile
    expected: number // 50th percentile
    high: number // 75th percentile
  }
  estimatedCost: {
    low: number
    expected: number
    high: number
  }
  confidence: 'low' | 'medium' | 'high'
  factors: PredictionFactor[]
  comparisons: {
    vsAverage: number // e.g., 1.5x average
    vsSimilar: number | null // vs similar issue types (null if no similar)
    vsRecent: number | null // vs recent 5 issues (null if not enough data)
  }
  breakdown: {
    planning: number // percentage
    execution: number
    verification: number
    fixes: number // Estimated retry/fix overhead
  }
  similarIssues: Array<{
    number: number
    title: string
    actualCost: number
    similarity: number // 0-1
  }>
}

/**
 * Factor explaining prediction adjustment
 */
export interface PredictionFactor {
  name: string
  impact: 'increases' | 'decreases' | 'neutral'
  weight: number // -100 to +100 percentage impact
  reason: string
}

/**
 * Budget configuration settings
 */
export interface BudgetSettings {
  dailyBudget: number | null
  weeklyBudget: number | null
  warnThreshold: number // Warn if > X times average (default 2.0)
}

// Base token costs per complexity level (without historical data)
const BASE_TOKENS: Record<string, number> = {
  minimal: 5000, // Very simple bug fix
  simple: 15000, // Simple feature or bug
  medium: 35000, // Standard feature
  complex: 70000, // Complex feature
  large: 120000 // Large refactor
}

// API pricing (Claude API)
const TOKEN_COST_PER_1K = {
  input: 0.003,
  output: 0.015,
  blended: 0.008 // Approximate blended rate
}

// Default budget settings
const DEFAULT_BUDGET_SETTINGS: BudgetSettings = {
  dailyBudget: null,
  weeklyBudget: null,
  warnThreshold: 2.0
}

/**
 * Get the analytics directory path
 */
function getAnalyticsPath(projectPath: string): string {
  return join(projectPath, '.tiki', 'analytics')
}

/**
 * Get the budget settings file path
 */
function getBudgetFilePath(projectPath: string): string {
  return join(getAnalyticsPath(projectPath), 'budget.json')
}

/**
 * Check if a path exists
 */
async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Ensure the analytics directory exists
 */
async function ensureAnalyticsDir(projectPath: string): Promise<void> {
  const analyticsPath = getAnalyticsPath(projectPath)
  if (!(await pathExists(analyticsPath))) {
    await mkdir(analyticsPath, { recursive: true })
  }
}

/**
 * Cost Predictor class for estimating issue execution costs
 */
export class CostPredictor {
  private historicalData: ExecutionRecord[] = []

  /**
   * Load historical execution data from a project
   */
  async loadHistory(projectPath: string): Promise<void> {
    this.historicalData = await loadExecutionHistory(projectPath)
  }

  /**
   * Predict cost for an issue based on features and historical data
   */
  predictCost(issue: GitHubIssue): CostPrediction {
    const features = extractFeatures(issue)
    return this.predictFromFeatures(features, issue)
  }

  /**
   * Predict cost using a plan with phases
   */
  predictFromPlan(
    plan: { phases: Array<{ files: string[]; verification: string[] }> },
    issue: GitHubIssue
  ): CostPrediction {
    const features = extractFeatures(issue)

    // Adjust estimated files based on plan
    const totalFiles = plan.phases.reduce((sum, phase) => sum + phase.files.length, 0)
    const totalVerifications = plan.phases.reduce(
      (sum, phase) => sum + phase.verification.length,
      0
    )

    // Create adjusted features based on plan
    const adjustedFeatures: IssueFeatures = {
      ...features,
      estimatedFiles: Math.max(features.estimatedFiles, totalFiles),
      hasTests: features.hasTests || totalVerifications > 0
    }

    // Calculate base estimate with plan multiplier
    const baseEstimate = this.calculateBaseEstimate(adjustedFeatures)
    const phaseMultiplier = 1 + (plan.phases.length - 1) * 0.15 // 15% increase per additional phase
    const planAdjustedEstimate = Math.round(baseEstimate * phaseMultiplier)

    // Find similar issues and adjust
    const similar = this.findSimilarIssues(adjustedFeatures)
    const tokenRange = this.adjustForSimilar(planAdjustedEstimate, similar)

    // Calculate confidence
    const confidence = this.calculateConfidence(similar.length, adjustedFeatures)

    // Calculate factors
    const factors = this.explainFactors(adjustedFeatures)

    // Add plan-specific factor
    if (plan.phases.length > 1) {
      factors.push({
        name: 'Multi-phase plan',
        impact: 'increases',
        weight: Math.round((phaseMultiplier - 1) * 100),
        reason: `${plan.phases.length} phases add coordination overhead`
      })
    }

    // Calculate comparisons
    const avgCost = this.getAverageIssueCost()
    const recentAvg = this.getRecentAverageCost(5)
    const similarAvg =
      similar.length > 0
        ? similar.reduce((sum, s) => sum + s.actualCost, 0) / similar.length
        : null

    const expectedCost = this.tokensToCost(tokenRange.expected)

    return {
      estimatedTokens: tokenRange,
      estimatedCost: {
        low: this.tokensToCost(tokenRange.low),
        expected: expectedCost,
        high: this.tokensToCost(tokenRange.high)
      },
      confidence,
      factors,
      comparisons: {
        vsAverage: avgCost ? Number((expectedCost / avgCost).toFixed(2)) : 1,
        vsSimilar: similarAvg ? Number((expectedCost / similarAvg).toFixed(2)) : null,
        vsRecent: recentAvg ? Number((expectedCost / recentAvg).toFixed(2)) : null
      },
      breakdown: this.tokensToBreakdown(tokenRange.expected, adjustedFeatures),
      similarIssues: similar.slice(0, 5).map((record) => ({
        number: record.issueNumber,
        title: record.issueTitle,
        actualCost: record.actualCost,
        similarity: this.calculateSimilarity(adjustedFeatures, record.features)
      }))
    }
  }

  /**
   * Internal method to predict from extracted features
   */
  private predictFromFeatures(features: IssueFeatures, issue: GitHubIssue): CostPrediction {
    const baseEstimate = this.calculateBaseEstimate(features)
    const similar = this.findSimilarIssues(features)
    const tokenRange = this.adjustForSimilar(baseEstimate, similar)
    const confidence = this.calculateConfidence(similar.length, features)
    const factors = this.explainFactors(features)

    // Calculate comparisons
    const avgCost = this.getAverageIssueCost()
    const recentAvg = this.getRecentAverageCost(5)
    const similarAvg =
      similar.length > 0
        ? similar.reduce((sum, s) => sum + s.actualCost, 0) / similar.length
        : null

    const expectedCost = this.tokensToCost(tokenRange.expected)

    return {
      estimatedTokens: tokenRange,
      estimatedCost: {
        low: this.tokensToCost(tokenRange.low),
        expected: expectedCost,
        high: this.tokensToCost(tokenRange.high)
      },
      confidence,
      factors,
      comparisons: {
        vsAverage: avgCost ? Number((expectedCost / avgCost).toFixed(2)) : 1,
        vsSimilar: similarAvg ? Number((expectedCost / similarAvg).toFixed(2)) : null,
        vsRecent: recentAvg ? Number((expectedCost / recentAvg).toFixed(2)) : null
      },
      breakdown: this.tokensToBreakdown(tokenRange.expected, features),
      similarIssues: similar.slice(0, 5).map((record) => ({
        number: record.issueNumber,
        title: record.issueTitle,
        actualCost: record.actualCost,
        similarity: this.calculateSimilarity(features, record.features)
      }))
    }
  }

  /**
   * Calculate base token estimate from features
   */
  calculateBaseEstimate(features: IssueFeatures): number {
    let base: number

    // Start with complexity tier based on issue type and label complexity
    const complexity = this.determineComplexityTier(features)
    base = BASE_TOKENS[complexity]

    // Adjust for body length (more detailed = more complex)
    if (features.bodyLength > 2000) {
      base *= 1.2
    } else if (features.bodyLength > 1000) {
      base *= 1.1
    } else if (features.bodyLength < 200) {
      base *= 0.9
    }

    // Adjust for acceptance criteria
    if (features.criteriaCount > 5) {
      base *= 1.3
    } else if (features.criteriaCount > 2) {
      base *= 1.15
    }

    // Adjust for estimated files
    if (features.estimatedFiles > 10) {
      base *= 1.5
    } else if (features.estimatedFiles > 5) {
      base *= 1.25
    } else if (features.estimatedFiles > 2) {
      base *= 1.1
    }

    // Adjust for tests
    if (features.hasTests) {
      base *= 1.2
    }

    // Adjust for code keywords (technical complexity)
    const keywordCount = features.codeKeywords.length
    if (keywordCount > 10) {
      base *= 1.2
    } else if (keywordCount > 5) {
      base *= 1.1
    }

    return Math.round(base)
  }

  /**
   * Determine complexity tier from features
   */
  private determineComplexityTier(
    features: IssueFeatures
  ): 'minimal' | 'simple' | 'medium' | 'complex' | 'large' {
    // Use label complexity as primary indicator
    const labelScore = features.labelComplexity

    // Calculate secondary indicators
    const fileScore = features.estimatedFiles
    const criteriaScore = features.criteriaCount
    const bodyScore = features.bodyLength > 1500 ? 2 : features.bodyLength > 500 ? 1 : 0

    const totalScore = labelScore + Math.min(fileScore / 2, 3) + Math.min(criteriaScore / 2, 3) + bodyScore

    // Issue type adjustments
    if (features.issueType === 'docs') {
      return totalScore > 5 ? 'medium' : 'simple'
    }

    if (features.issueType === 'bug') {
      if (totalScore <= 2) return 'minimal'
      if (totalScore <= 4) return 'simple'
      if (totalScore <= 7) return 'medium'
      return 'complex'
    }

    if (features.issueType === 'refactor') {
      if (totalScore <= 3) return 'medium'
      if (totalScore <= 6) return 'complex'
      return 'large'
    }

    // feature or other
    if (totalScore <= 2) return 'simple'
    if (totalScore <= 5) return 'medium'
    if (totalScore <= 8) return 'complex'
    return 'large'
  }

  /**
   * Find similar issues from historical data
   */
  findSimilarIssues(features: IssueFeatures, limit: number = 10): ExecutionRecord[] {
    if (this.historicalData.length === 0) {
      return []
    }

    // Calculate similarity for each historical record
    const withSimilarity = this.historicalData.map((record) => ({
      record,
      similarity: this.calculateSimilarity(features, record.features)
    }))

    // Filter to minimum similarity threshold and sort by similarity
    return withSimilarity
      .filter((item) => item.similarity >= 0.3)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map((item) => item.record)
  }

  /**
   * Calculate similarity between two feature sets (0-1)
   */
  private calculateSimilarity(a: IssueFeatures, b: IssueFeatures): number {
    let score = 0
    let maxScore = 0

    // Issue type match (highest weight)
    maxScore += 3
    if (a.issueType === b.issueType) {
      score += 3
    }

    // Label complexity similarity
    maxScore += 2
    const complexityDiff = Math.abs(a.labelComplexity - b.labelComplexity)
    if (complexityDiff === 0) score += 2
    else if (complexityDiff <= 2) score += 1.5
    else if (complexityDiff <= 4) score += 1

    // Estimated files similarity
    maxScore += 2
    const fileDiff = Math.abs(a.estimatedFiles - b.estimatedFiles)
    if (fileDiff === 0) score += 2
    else if (fileDiff <= 2) score += 1.5
    else if (fileDiff <= 5) score += 1

    // Test requirement match
    maxScore += 1
    if (a.hasTests === b.hasTests) {
      score += 1
    }

    // Criteria count similarity
    maxScore += 1
    const criteriaDiff = Math.abs(a.criteriaCount - b.criteriaCount)
    if (criteriaDiff === 0) score += 1
    else if (criteriaDiff <= 2) score += 0.5

    // Code keywords overlap
    maxScore += 1
    const keywordOverlap = a.codeKeywords.filter((k) => b.codeKeywords.includes(k)).length
    const maxKeywords = Math.max(a.codeKeywords.length, b.codeKeywords.length, 1)
    score += keywordOverlap / maxKeywords

    return score / maxScore
  }

  /**
   * Adjust base estimate using similar issue data
   */
  adjustForSimilar(
    baseEstimate: number,
    similar: ExecutionRecord[]
  ): { low: number; expected: number; high: number } {
    if (similar.length === 0) {
      // No historical data - use +/- 30% range
      return {
        low: Math.round(baseEstimate * 0.7),
        expected: baseEstimate,
        high: Math.round(baseEstimate * 1.3)
      }
    }

    // Calculate total tokens from similar issues
    const similarTokens = similar.map((r) => r.actualInputTokens + r.actualOutputTokens)

    // Sort for percentile calculation
    similarTokens.sort((a, b) => a - b)

    // Use percentiles if we have enough data
    if (similar.length >= 3) {
      const p25Index = Math.floor(similarTokens.length * 0.25)
      const p50Index = Math.floor(similarTokens.length * 0.5)
      const p75Index = Math.floor(similarTokens.length * 0.75)

      return {
        low: similarTokens[p25Index],
        expected: similarTokens[p50Index],
        high: similarTokens[p75Index]
      }
    }

    // With 1-2 similar issues, use their average but apply range
    const avgSimilar = similarTokens.reduce((sum, t) => sum + t, 0) / similarTokens.length

    // Blend base estimate with similar average (weighted toward similar)
    const blended = Math.round(avgSimilar * 0.7 + baseEstimate * 0.3)

    return {
      low: Math.round(blended * 0.8),
      expected: blended,
      high: Math.round(blended * 1.2)
    }
  }

  /**
   * Calculate confidence level based on historical match quality
   */
  calculateConfidence(
    similarCount: number,
    features: IssueFeatures
  ): 'low' | 'medium' | 'high' {
    // High confidence: 3+ similar issues
    if (similarCount >= 3) {
      return 'high'
    }

    // Medium confidence: 1-2 similar issues OR good feature coverage
    if (similarCount >= 1) {
      return 'medium'
    }

    // Check if we have good feature coverage for heuristic confidence
    const hasGoodCoverage =
      features.bodyLength > 200 &&
      (features.criteriaCount > 0 || features.labelComplexity > 0)

    if (hasGoodCoverage) {
      return 'medium'
    }

    // Low confidence: no historical data, poor features
    return 'low'
  }

  /**
   * Explain factors affecting the prediction
   */
  explainFactors(features: IssueFeatures): PredictionFactor[] {
    const factors: PredictionFactor[] = []

    // Issue type factor
    const typeFactors: Record<string, PredictionFactor> = {
      bug: {
        name: 'Bug fix',
        impact: 'decreases',
        weight: -15,
        reason: 'Bug fixes typically require less exploration than new features'
      },
      feature: {
        name: 'New feature',
        impact: 'increases',
        weight: 20,
        reason: 'New features require more planning and implementation'
      },
      refactor: {
        name: 'Refactoring',
        impact: 'increases',
        weight: 30,
        reason: 'Refactoring often touches many files and requires careful changes'
      },
      docs: {
        name: 'Documentation',
        impact: 'decreases',
        weight: -25,
        reason: 'Documentation tasks typically require fewer code changes'
      },
      other: {
        name: 'General task',
        impact: 'neutral',
        weight: 0,
        reason: 'Standard task with average complexity'
      }
    }
    factors.push(typeFactors[features.issueType])

    // Complexity factor
    if (features.labelComplexity >= 6) {
      factors.push({
        name: 'High complexity labels',
        impact: 'increases',
        weight: 40,
        reason: 'Labels indicate significant complexity'
      })
    } else if (features.labelComplexity >= 3) {
      factors.push({
        name: 'Medium complexity labels',
        impact: 'increases',
        weight: 20,
        reason: 'Labels indicate moderate complexity'
      })
    }

    // File count factor
    if (features.estimatedFiles > 10) {
      factors.push({
        name: 'Many files affected',
        impact: 'increases',
        weight: 50,
        reason: `Estimated ${features.estimatedFiles} files need changes`
      })
    } else if (features.estimatedFiles > 5) {
      factors.push({
        name: 'Multiple files affected',
        impact: 'increases',
        weight: 25,
        reason: `Estimated ${features.estimatedFiles} files need changes`
      })
    } else if (features.estimatedFiles <= 1) {
      factors.push({
        name: 'Single file change',
        impact: 'decreases',
        weight: -20,
        reason: 'Changes likely limited to a single file'
      })
    }

    // Test requirement factor
    if (features.hasTests) {
      factors.push({
        name: 'Tests required',
        impact: 'increases',
        weight: 20,
        reason: 'Writing tests adds to implementation time'
      })
    }

    // Acceptance criteria factor
    if (features.criteriaCount > 5) {
      factors.push({
        name: 'Many acceptance criteria',
        impact: 'increases',
        weight: 30,
        reason: `${features.criteriaCount} criteria to verify`
      })
    } else if (features.criteriaCount > 2) {
      factors.push({
        name: 'Multiple acceptance criteria',
        impact: 'increases',
        weight: 15,
        reason: `${features.criteriaCount} criteria to verify`
      })
    }

    // Body length factor (detailed description)
    if (features.bodyLength > 2000) {
      factors.push({
        name: 'Detailed description',
        impact: 'increases',
        weight: 20,
        reason: 'Long description suggests complex requirements'
      })
    } else if (features.bodyLength < 200) {
      factors.push({
        name: 'Brief description',
        impact: 'neutral',
        weight: 0,
        reason: 'Limited context may require more exploration'
      })
    }

    // Technical complexity factor
    if (features.codeKeywords.length > 10) {
      factors.push({
        name: 'High technical complexity',
        impact: 'increases',
        weight: 20,
        reason: `${features.codeKeywords.length} technical concepts mentioned`
      })
    }

    return factors
  }

  /**
   * Break down token estimate into phases
   */
  tokensToBreakdown(
    tokens: number,
    features: IssueFeatures
  ): CostPrediction['breakdown'] {
    // Default breakdown percentages
    let planning = 15
    let execution = 55
    let verification = 20
    let fixes = 10

    // Adjust based on features
    if (features.issueType === 'refactor') {
      planning = 20
      execution = 50
      verification = 20
      fixes = 10
    } else if (features.issueType === 'bug') {
      planning = 10
      execution = 50
      verification = 25
      fixes = 15
    } else if (features.issueType === 'docs') {
      planning = 10
      execution = 70
      verification = 15
      fixes = 5
    }

    // More criteria = more verification
    if (features.criteriaCount > 5) {
      verification += 10
      execution -= 10
    }

    // Tests required = more verification
    if (features.hasTests) {
      verification += 5
      execution -= 5
    }

    // High complexity = more fixes
    if (features.labelComplexity >= 6) {
      fixes += 5
      execution -= 5
    }

    return { planning, execution, verification, fixes }
  }

  /**
   * Convert tokens to cost
   */
  tokensToCost(tokens: number): number {
    // Use blended rate for simplicity
    return Number(((tokens / 1000) * TOKEN_COST_PER_1K.blended).toFixed(4))
  }

  /**
   * Get average cost across all historical issues
   */
  getAverageIssueCost(): number | null {
    if (this.historicalData.length === 0) {
      return null
    }

    const totalCost = this.historicalData.reduce((sum, r) => sum + r.actualCost, 0)
    return Number((totalCost / this.historicalData.length).toFixed(4))
  }

  /**
   * Get average cost for recent issues
   */
  getRecentAverageCost(count: number = 5): number | null {
    if (this.historicalData.length < count) {
      return null
    }

    // Sort by execution date descending
    const sorted = [...this.historicalData].sort(
      (a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
    )

    const recent = sorted.slice(0, count)
    const totalCost = recent.reduce((sum, r) => sum + r.actualCost, 0)
    return Number((totalCost / recent.length).toFixed(4))
  }

  /**
   * Get historical data (for testing)
   */
  getHistoricalData(): ExecutionRecord[] {
    return this.historicalData
  }

  /**
   * Set historical data directly (for testing)
   */
  setHistoricalData(data: ExecutionRecord[]): void {
    this.historicalData = data
  }
}

/**
 * Check if a prediction exceeds the high cost threshold
 */
export function isHighCost(
  prediction: CostPrediction,
  averageCost: number | null,
  threshold: number = 2.0
): boolean {
  if (averageCost === null || averageCost === 0) {
    // Without average, use absolute threshold ($1.00)
    return prediction.estimatedCost.expected > 1.0
  }

  return prediction.estimatedCost.expected > averageCost * threshold
}

/**
 * Load budget settings from storage
 */
export async function loadBudgetSettings(projectPath: string): Promise<BudgetSettings> {
  const filePath = getBudgetFilePath(projectPath)

  try {
    if (await pathExists(filePath)) {
      const content = await readFile(filePath, 'utf-8')
      const data = JSON.parse(content) as Partial<BudgetSettings>
      return {
        ...DEFAULT_BUDGET_SETTINGS,
        ...data
      }
    }
  } catch {
    // Return defaults on error
  }

  return { ...DEFAULT_BUDGET_SETTINGS }
}

/**
 * Save budget settings to storage
 */
export async function saveBudgetSettings(
  projectPath: string,
  settings: BudgetSettings
): Promise<void> {
  await ensureAnalyticsDir(projectPath)

  const filePath = getBudgetFilePath(projectPath)
  await writeFile(filePath, JSON.stringify(settings, null, 2), 'utf-8')
}

/**
 * Get total spend for today
 */
export async function getDailySpend(projectPath: string): Promise<number> {
  const history = await loadExecutionHistory(projectPath)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayRecords = history.filter((r) => {
    const recordDate = new Date(r.executedAt)
    return recordDate >= today
  })

  return Number(todayRecords.reduce((sum, r) => sum + r.actualCost, 0).toFixed(4))
}

/**
 * Get total spend for this week (starting Monday)
 */
export async function getWeeklySpend(projectPath: string): Promise<number> {
  const history = await loadExecutionHistory(projectPath)

  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - daysSinceMonday)
  weekStart.setHours(0, 0, 0, 0)

  const weekRecords = history.filter((r) => {
    const recordDate = new Date(r.executedAt)
    return recordDate >= weekStart
  })

  return Number(weekRecords.reduce((sum, r) => sum + r.actualCost, 0).toFixed(4))
}
