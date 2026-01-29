/**
 * Pattern Detector Service
 *
 * Manages pattern storage, detection, and proactive prevention.
 * Integrates with failure-clustering for pattern recognition.
 */
import { promises as fs } from 'fs'
import { join } from 'path'
import {
  FailurePattern,
  FailureRecord,
  FixRecord,
  PatternMatch,
  PreventiveMeasure,
  clusterSimilarFailures,
  extractPattern,
  calculateSimilarity
} from './failure-clustering'

// ===== STORAGE PATHS =====

const PATTERNS_DIR = '.tiki/patterns'
const PATTERNS_INDEX = 'index.json'
const FAILURES_FILE = '.tiki/analytics/failures.json'

// ===== INTERFACES =====

export interface PatternIndex {
  patterns: string[] // Pattern IDs
  lastAnalysis: string
  version: string
}

export interface GitHubIssueForPattern {
  number: number
  title: string
  body?: string
  labels?: Array<{ name: string }>
}

export interface ExecutionPlanForPattern {
  phases: Array<{
    number: number
    title: string
    files: string[]
    verification: string[]
  }>
}

export interface FailuresStorage {
  failures: FailureRecord[]
  lastUpdated: string
  version: string
}

// ===== HELPER FUNCTIONS =====

/**
 * Helper to match error signatures against text
 */
function matchesErrorSignature(text: string, signatures: string[]): boolean {
  return signatures.some((sig) => {
    try {
      const regex = new RegExp(sig, 'i')
      return regex.test(text)
    } catch {
      return text.toLowerCase().includes(sig.toLowerCase())
    }
  })
}

/**
 * Helper to match file patterns using simple glob-like matching
 */
function matchesFilePatterns(files: string[], patterns: string[]): boolean {
  return patterns.some((pattern) => {
    // Simple glob matching - support * and **
    const regexPattern = pattern
      .replace(/\*\*/g, '___DOUBLE_STAR___')
      .replace(/\*/g, '[^/]*')
      .replace(/___DOUBLE_STAR___/g, '.*')
      .replace(/\./g, '\\.')

    try {
      const regex = new RegExp(regexPattern)
      return files.some((file) => regex.test(file))
    } catch {
      // Fallback to simple includes check
      return files.some((file) => file.includes(pattern) || pattern.includes(file))
    }
  })
}

/**
 * Helper to calculate pattern match confidence
 */
function calculateMatchConfidence(
  pattern: FailurePattern,
  issue: GitHubIssueForPattern,
  plan?: ExecutionPlanForPattern
): { confidence: number; matchedIndicators: string[] } {
  let confidence = 0
  const matchedIndicators: string[] = []

  const issueText = `${issue.title} ${issue.body || ''}`.toLowerCase()

  // Check error signatures (30% weight)
  for (const signature of pattern.errorSignatures) {
    if (matchesErrorSignature(issueText, [signature])) {
      confidence += 0.15
      matchedIndicators.push(`signature: ${signature}`)
    }
  }

  // Check context indicators (30% weight)
  for (const indicator of pattern.contextIndicators) {
    if (issueText.includes(indicator.toLowerCase())) {
      confidence += 0.1
      matchedIndicators.push(`indicator: ${indicator}`)
    }
  }

  // Check file patterns if plan is provided (30% weight)
  if (plan) {
    const allFiles = plan.phases.flatMap((phase) => phase.files)
    for (const filePattern of pattern.filePatterns) {
      if (matchesFilePatterns(allFiles, [filePattern])) {
        confidence += 0.15
        matchedIndicators.push(`file: ${filePattern}`)
      }
    }
  }

  // Check labels for category hints (10% weight)
  if (issue.labels) {
    const labelNames = issue.labels.map((l) => l.name.toLowerCase())
    const categoryMatch = labelNames.some((label) =>
      ['bug', 'error', 'fix', pattern.category].includes(label)
    )
    if (categoryMatch) {
      confidence += 0.1
      matchedIndicators.push(`category: ${pattern.category}`)
    }
  }

  // Cap confidence at 1
  confidence = Math.min(1, confidence)

  return { confidence, matchedIndicators }
}

// ===== PATTERN DETECTOR SERVICE =====

export class PatternDetector {
  private patterns: Map<string, FailurePattern> = new Map()
  private failures: FailureRecord[] = []
  private loaded = false
  private patternIdCounter = 0

  /**
   * Load patterns and failures from storage
   */
  async loadPatterns(projectPath: string): Promise<void> {
    // Load pattern index
    const indexPath = join(projectPath, PATTERNS_DIR, PATTERNS_INDEX)

    try {
      const indexContent = await fs.readFile(indexPath, 'utf-8')
      const index: PatternIndex = JSON.parse(indexContent)

      // Load each pattern
      for (const patternId of index.patterns) {
        const patternPath = join(projectPath, PATTERNS_DIR, `${patternId}.json`)
        try {
          const patternContent = await fs.readFile(patternPath, 'utf-8')
          const pattern: FailurePattern = JSON.parse(patternContent)
          this.patterns.set(pattern.id, pattern)

          // Track highest ID for counter
          const idMatch = pattern.id.match(/pattern-(\d+)/)
          if (idMatch) {
            const num = parseInt(idMatch[1], 10)
            if (num >= this.patternIdCounter) {
              this.patternIdCounter = num + 1
            }
          }
        } catch {
          // Skip invalid pattern files
        }
      }
    } catch {
      // No index file yet, start fresh
    }

    // Load failures
    const failuresPath = join(projectPath, FAILURES_FILE)
    try {
      const failuresContent = await fs.readFile(failuresPath, 'utf-8')
      const storage: FailuresStorage = JSON.parse(failuresContent)
      this.failures = storage.failures || []
    } catch {
      // No failures file yet
      this.failures = []
    }

    this.loaded = true
  }

  /**
   * Save a pattern to storage
   */
  async savePattern(projectPath: string, pattern: FailurePattern): Promise<void> {
    // Ensure patterns directory exists
    const patternsDir = join(projectPath, PATTERNS_DIR)
    await fs.mkdir(patternsDir, { recursive: true })

    // Save pattern file
    const patternPath = join(patternsDir, `${pattern.id}.json`)
    await fs.writeFile(patternPath, JSON.stringify(pattern, null, 2), 'utf-8')

    // Update index
    const indexPath = join(patternsDir, PATTERNS_INDEX)
    let index: PatternIndex

    try {
      const indexContent = await fs.readFile(indexPath, 'utf-8')
      index = JSON.parse(indexContent)
    } catch {
      index = {
        patterns: [],
        lastAnalysis: new Date().toISOString(),
        version: '1.0.0'
      }
    }

    if (!index.patterns.includes(pattern.id)) {
      index.patterns.push(pattern.id)
    }
    index.lastAnalysis = new Date().toISOString()

    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8')

    // Update in-memory store
    this.patterns.set(pattern.id, pattern)
  }

  /**
   * Save failures to storage
   */
  private async saveFailures(projectPath: string): Promise<void> {
    const analyticsDir = join(projectPath, '.tiki', 'analytics')
    await fs.mkdir(analyticsDir, { recursive: true })

    const storage: FailuresStorage = {
      failures: this.failures,
      lastUpdated: new Date().toISOString(),
      version: '1.0.0'
    }

    const failuresPath = join(projectPath, FAILURES_FILE)
    await fs.writeFile(failuresPath, JSON.stringify(storage, null, 2), 'utf-8')
  }

  /**
   * Get all patterns
   */
  getPatterns(): FailurePattern[] {
    return Array.from(this.patterns.values())
  }

  /**
   * Get pattern by ID
   */
  getPattern(id: string): FailurePattern | undefined {
    return this.patterns.get(id)
  }

  /**
   * Get all failures
   */
  getFailures(): FailureRecord[] {
    return [...this.failures]
  }

  /**
   * Record a new failure
   */
  async recordFailure(projectPath: string, failure: FailureRecord): Promise<void> {
    // Add to failures list
    this.failures.push(failure)

    // Save to failures file
    await this.saveFailures(projectPath)

    // Check if matches existing pattern
    for (const pattern of this.patterns.values()) {
      const similarity = this.calculateFailurePatternSimilarity(failure, pattern)
      if (similarity > 0.5) {
        // Update pattern occurrence count
        pattern.occurrenceCount++
        pattern.lastOccurrence = failure.timestamp
        if (!pattern.affectedIssues.includes(failure.issueNumber)) {
          pattern.affectedIssues.push(failure.issueNumber)
        }
        pattern.updatedAt = new Date().toISOString()
        await this.savePattern(projectPath, pattern)
        return
      }
    }

    // Check if creates new pattern with other similar failures
    const similarFailures = this.failures.filter(
      (f) => f.id !== failure.id && calculateSimilarity(failure, f) > 0.6
    )

    if (similarFailures.length >= 1) {
      // Have at least 2 similar failures (including the new one)
      const cluster = {
        failures: [failure, ...similarFailures],
        similarity: calculateSimilarity(failure, similarFailures[0]),
        commonErrorTerms: this.extractCommonTerms([failure, ...similarFailures]),
        commonFiles: this.extractCommonFiles([failure, ...similarFailures])
      }

      const newPattern = extractPattern(cluster, `pattern-${this.patternIdCounter++}`)
      await this.savePattern(projectPath, newPattern)
    }
  }

  /**
   * Calculate similarity between a failure and a pattern
   */
  private calculateFailurePatternSimilarity(
    failure: FailureRecord,
    pattern: FailurePattern
  ): number {
    let score = 0

    // Check error signatures
    if (matchesErrorSignature(failure.errorText, pattern.errorSignatures)) {
      score += 0.4
    }

    // Check file patterns
    if (matchesFilePatterns(failure.files, pattern.filePatterns)) {
      score += 0.3
    }

    // Check context indicators
    const errorLower = failure.errorText.toLowerCase()
    const matchedIndicators = pattern.contextIndicators.filter((ind) =>
      errorLower.includes(ind.toLowerCase())
    )
    score += Math.min(0.3, matchedIndicators.length * 0.1)

    return Math.min(1, score)
  }

  /**
   * Extract common terms from failures
   */
  private extractCommonTerms(failures: FailureRecord[]): string[] {
    const termCounts = new Map<string, number>()

    for (const failure of failures) {
      const words = failure.errorText
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2)

      const uniqueWords = new Set(words)
      for (const word of uniqueWords) {
        termCounts.set(word, (termCounts.get(word) || 0) + 1)
      }
    }

    return Array.from(termCounts.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([term]) => term)
  }

  /**
   * Extract common files from failures
   */
  private extractCommonFiles(failures: FailureRecord[]): string[] {
    const fileCounts = new Map<string, number>()

    for (const failure of failures) {
      for (const file of failure.files) {
        fileCounts.set(file, (fileCounts.get(file) || 0) + 1)
      }
    }

    return Array.from(fileCounts.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([file]) => file)
  }

  /**
   * Record a successful fix for a pattern
   */
  async recordFix(projectPath: string, patternId: string, fix: FixRecord): Promise<void> {
    const pattern = this.patterns.get(patternId)
    if (!pattern) {
      return
    }

    // Add fix to pattern
    pattern.successfulFixes.push(fix)

    // Update effectiveness based on success rate
    const successfulFixes = pattern.successfulFixes.filter((f) => f.success)
    const totalFixes = pattern.successfulFixes.length

    if (totalFixes > 0) {
      const successRate = successfulFixes.length / totalFixes
      // Update preventive measures effectiveness based on fix success rate
      for (const measure of pattern.preventiveMeasures) {
        // Blend existing effectiveness with observed success rate
        measure.effectiveness = measure.effectiveness * 0.7 + successRate * 0.3
      }
    }

    pattern.updatedAt = new Date().toISOString()

    // Save pattern
    await this.savePattern(projectPath, pattern)
  }

  /**
   * Check issue/plan against known patterns
   */
  async checkForPatterns(
    issue: GitHubIssueForPattern,
    plan?: ExecutionPlanForPattern
  ): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = []

    for (const pattern of this.patterns.values()) {
      // Skip resolved patterns
      if (pattern.resolvedAt) {
        continue
      }

      const { confidence, matchedIndicators } = calculateMatchConfidence(pattern, issue, plan)

      // Only include matches above 0.5 confidence
      if (confidence >= 0.5) {
        matches.push({
          pattern,
          confidence,
          matchedIndicators,
          suggestedMeasures: pattern.preventiveMeasures.filter((m) => m.effectiveness >= 0.5)
        })
      }
    }

    // Sort by confidence descending
    return matches.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Re-analyze all failures to find patterns
   */
  async analyzeHistory(projectPath: string): Promise<FailurePattern[]> {
    // Run clustering
    const clusters = clusterSimilarFailures(this.failures, 0.6)

    const newPatterns: FailurePattern[] = []

    for (const cluster of clusters) {
      // Check if this cluster overlaps significantly with existing pattern
      let existingPattern: FailurePattern | undefined

      for (const pattern of this.patterns.values()) {
        const overlap = cluster.failures.filter((f) =>
          pattern.affectedIssues.includes(f.issueNumber)
        )
        if (overlap.length > cluster.failures.length / 2) {
          existingPattern = pattern
          break
        }
      }

      if (existingPattern) {
        // Update existing pattern
        existingPattern.occurrenceCount = Math.max(
          existingPattern.occurrenceCount,
          cluster.failures.length
        )
        existingPattern.updatedAt = new Date().toISOString()
        await this.savePattern(projectPath, existingPattern)
      } else {
        // Create new pattern
        const newPattern = extractPattern(cluster, `pattern-${this.patternIdCounter++}`)
        await this.savePattern(projectPath, newPattern)
        newPatterns.push(newPattern)
      }
    }

    return newPatterns
  }

  /**
   * Apply preventive measures to a plan
   */
  async applyPrevention(
    plan: ExecutionPlanForPattern,
    matches: PatternMatch[]
  ): Promise<{ modifiedPlan: ExecutionPlanForPattern; appliedMeasures: PreventiveMeasure[] }> {
    const appliedMeasures: PreventiveMeasure[] = []
    const modifiedPlan = JSON.parse(JSON.stringify(plan)) as ExecutionPlanForPattern

    for (const match of matches) {
      for (const measure of match.suggestedMeasures) {
        // Only apply automatic measures with high effectiveness
        if (measure.automatic && measure.effectiveness >= 0.6) {
          appliedMeasures.push(measure)

          // Apply measure based on type
          switch (measure.type) {
            case 'verification':
              // Add verification steps to relevant phases
              for (const phase of modifiedPlan.phases) {
                const hasRelevantFiles = match.pattern.filePatterns.some((fp) =>
                  phase.files.some((f) => f.includes(fp) || fp.includes(f))
                )
                if (hasRelevantFiles && !phase.verification.includes(measure.application)) {
                  phase.verification.push(measure.application)
                }
              }
              break

            case 'context':
              // Add context to phase titles/verification
              for (const phase of modifiedPlan.phases) {
                if (!phase.verification.includes(`[Context] ${measure.description}`)) {
                  phase.verification.unshift(`[Context] ${measure.description}`)
                }
              }
              break

            case 'phase_structure':
              // Add checkpoint phases if needed
              // This is more complex and may require manual review
              break
          }
        }
      }
    }

    return { modifiedPlan, appliedMeasures }
  }

  /**
   * Get patterns with highest occurrence
   */
  getTopPatterns(limit: number = 10): FailurePattern[] {
    return this.getPatterns()
      .filter((p) => !p.resolvedAt)
      .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
      .slice(0, limit)
  }

  /**
   * Mark pattern as resolved
   */
  async resolvePattern(projectPath: string, patternId: string): Promise<void> {
    const pattern = this.patterns.get(patternId)
    if (!pattern) {
      return
    }

    pattern.resolvedAt = new Date().toISOString()
    pattern.updatedAt = new Date().toISOString()

    await this.savePattern(projectPath, pattern)
  }

  /**
   * Delete a pattern
   */
  async deletePattern(projectPath: string, patternId: string): Promise<void> {
    const pattern = this.patterns.get(patternId)
    if (!pattern) {
      return
    }

    // Remove from memory
    this.patterns.delete(patternId)

    // Remove pattern file
    const patternPath = join(projectPath, PATTERNS_DIR, `${patternId}.json`)
    try {
      await fs.unlink(patternPath)
    } catch {
      // File may not exist
    }

    // Update index
    const indexPath = join(projectPath, PATTERNS_DIR, PATTERNS_INDEX)
    try {
      const indexContent = await fs.readFile(indexPath, 'utf-8')
      const index: PatternIndex = JSON.parse(indexContent)
      index.patterns = index.patterns.filter((id) => id !== patternId)
      index.lastAnalysis = new Date().toISOString()
      await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8')
    } catch {
      // Index may not exist
    }
  }

  /**
   * Clear all patterns (for testing)
   */
  clearPatterns(): void {
    this.patterns.clear()
    this.patternIdCounter = 0
  }

  /**
   * Clear all failures (for testing)
   */
  clearFailures(): void {
    this.failures = []
  }

  /**
   * Check if patterns have been loaded
   */
  isLoaded(): boolean {
    return this.loaded
  }

  /**
   * Generate next pattern ID
   */
  generatePatternId(): string {
    return `pattern-${this.patternIdCounter++}`
  }
}

// Singleton instance
export const patternDetector = new PatternDetector()
