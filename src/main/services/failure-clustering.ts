/**
 * Failure Pattern Recognition and Clustering Service
 *
 * Provides pattern detection, similarity calculation, and clustering
 * for failure records to enable proactive prevention.
 */

// ===== TYPE DEFINITIONS =====

export type PatternCategory = 'code' | 'project' | 'workflow'

export interface FailurePattern {
  id: string
  name: string
  description: string
  category: PatternCategory

  // Detection
  errorSignatures: string[] // Regex patterns as strings
  filePatterns: string[] // Files often involved (glob patterns)
  contextIndicators: string[] // Keywords suggesting risk

  // Statistics
  occurrenceCount: number
  lastOccurrence: string // ISO date
  affectedIssues: number[]
  successfulFixes: FixRecord[]

  // Prevention
  preventiveMeasures: PreventiveMeasure[]

  // Metadata
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
}

export interface FailureRecord {
  id: string
  issueNumber: number
  phaseNumber: number
  errorText: string
  errorCategory: string // From failure-analysis
  files: string[] // Files involved
  timestamp: string
  resolution: 'fixed' | 'skipped' | 'pending' | null
  fixDescription: string | null
}

export interface FixRecord {
  failureId: string
  patternId: string
  description: string
  effectiveness: number // 0-1, updated over time
  appliedAt: string
  success: boolean
}

export interface PreventiveMeasure {
  id: string
  description: string
  type: 'context' | 'verification' | 'phase_structure' | 'manual'
  automatic: boolean // Can be auto-applied
  effectiveness: number // Historical success rate 0-1
  application: string // How to apply (instruction or code hint)
}

export interface FailureCluster {
  failures: FailureRecord[]
  similarity: number // Average pairwise similarity
  commonErrorTerms: string[]
  commonFiles: string[]
}

export interface PatternMatch {
  pattern: FailurePattern
  confidence: number // 0-1
  matchedIndicators: string[]
  suggestedMeasures: PreventiveMeasure[]
}

// ===== HELPER FUNCTIONS =====

/**
 * Common/stop words to filter from error text analysis
 */
const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'must',
  'shall',
  'can',
  'need',
  'dare',
  'ought',
  'used',
  'to',
  'of',
  'in',
  'for',
  'on',
  'with',
  'at',
  'by',
  'from',
  'as',
  'into',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'between',
  'under',
  'again',
  'further',
  'then',
  'once',
  'here',
  'there',
  'when',
  'where',
  'why',
  'how',
  'all',
  'each',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'nor',
  'not',
  'only',
  'own',
  'same',
  'so',
  'than',
  'too',
  'very',
  'just',
  'and',
  'but',
  'if',
  'or',
  'because',
  'until',
  'while',
  'this',
  'that',
  'these',
  'those',
  'it',
  'its'
])

/**
 * Tokenize error text into meaningful words
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
}

/**
 * Calculate Jaccard similarity between two sets
 */
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) {
    return 1
  }

  const intersection = new Set([...setA].filter((x) => setB.has(x)))
  const union = new Set([...setA, ...setB])

  return intersection.size / union.size
}

/**
 * Calculate similarity between two failures (0-1)
 *
 * Uses:
 * - Error text Jaccard similarity (word overlap)
 * - File overlap
 * - Error category match
 *
 * Weight: 50% error text, 30% files, 20% category
 */
export function calculateSimilarity(a: FailureRecord, b: FailureRecord): number {
  // Error text similarity (50%)
  const aTokens = new Set(tokenize(a.errorText))
  const bTokens = new Set(tokenize(b.errorText))
  const textSimilarity = jaccardSimilarity(aTokens, bTokens)

  // File overlap similarity (30%)
  const aFiles = new Set(a.files)
  const bFiles = new Set(b.files)
  const fileSimilarity = jaccardSimilarity(aFiles, bFiles)

  // Error category match (20%)
  const categorySimilarity = a.errorCategory === b.errorCategory ? 1 : 0

  // Weighted combination
  return textSimilarity * 0.5 + fileSimilarity * 0.3 + categorySimilarity * 0.2
}

/**
 * Calculate average pairwise similarity for a cluster
 */
function calculateClusterSimilarity(failures: FailureRecord[]): number {
  if (failures.length < 2) {
    return 1
  }

  let totalSimilarity = 0
  let pairCount = 0

  for (let i = 0; i < failures.length; i++) {
    for (let j = i + 1; j < failures.length; j++) {
      totalSimilarity += calculateSimilarity(failures[i], failures[j])
      pairCount++
    }
  }

  return pairCount > 0 ? totalSimilarity / pairCount : 1
}

/**
 * Find the best matching cluster for a failure
 */
function findBestCluster(
  failure: FailureRecord,
  clusters: FailureCluster[],
  minSimilarity: number
): { cluster: FailureCluster; similarity: number } | null {
  let bestCluster: FailureCluster | null = null
  let bestSimilarity = 0

  for (const cluster of clusters) {
    // Calculate average similarity to all failures in cluster
    let totalSimilarity = 0
    for (const clusterFailure of cluster.failures) {
      totalSimilarity += calculateSimilarity(failure, clusterFailure)
    }
    const avgSimilarity = totalSimilarity / cluster.failures.length

    if (avgSimilarity >= minSimilarity && avgSimilarity > bestSimilarity) {
      bestCluster = cluster
      bestSimilarity = avgSimilarity
    }
  }

  return bestCluster ? { cluster: bestCluster, similarity: bestSimilarity } : null
}

/**
 * Cluster failures by similarity
 *
 * @param failures - Array of failure records to cluster
 * @param minSimilarity - Minimum similarity threshold (default 0.6)
 * @returns Array of clusters with 2+ failures
 */
export function clusterSimilarFailures(
  failures: FailureRecord[],
  minSimilarity: number = 0.6
): FailureCluster[] {
  if (failures.length === 0) {
    return []
  }

  const clusters: FailureCluster[] = []

  for (const failure of failures) {
    const match = findBestCluster(failure, clusters, minSimilarity)

    if (match) {
      // Add to existing cluster
      match.cluster.failures.push(failure)
      // Update cluster metrics
      match.cluster.similarity = calculateClusterSimilarity(match.cluster.failures)
      match.cluster.commonErrorTerms = findCommonErrorTerms(match.cluster.failures)
      match.cluster.commonFiles = findCommonFilePatterns(match.cluster.failures)
    } else {
      // Create new cluster
      clusters.push({
        failures: [failure],
        similarity: 1,
        commonErrorTerms: findCommonErrorTerms([failure]),
        commonFiles: [...failure.files]
      })
    }
  }

  // Return only clusters with 2+ failures
  return clusters.filter((cluster) => cluster.failures.length >= 2)
}

/**
 * Find common error terms across failures
 */
export function findCommonErrorTerms(failures: FailureRecord[]): string[] {
  if (failures.length === 0) {
    return []
  }

  // Count term occurrences across all failures
  const termCounts = new Map<string, number>()

  for (const failure of failures) {
    const tokens = new Set(tokenize(failure.errorText))
    for (const token of tokens) {
      termCounts.set(token, (termCounts.get(token) || 0) + 1)
    }
  }

  // Find terms that appear in at least half of the failures
  const threshold = Math.max(2, Math.ceil(failures.length / 2))
  const commonTerms: Array<{ term: string; count: number }> = []

  for (const [term, count] of termCounts) {
    if (count >= threshold) {
      commonTerms.push({ term, count })
    }
  }

  // Sort by count descending, take top 10
  return commonTerms
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((t) => t.term)
}

/**
 * Find common file patterns across failures
 */
export function findCommonFilePatterns(failures: FailureRecord[]): string[] {
  if (failures.length === 0) {
    return []
  }

  // Count file occurrences
  const fileCounts = new Map<string, number>()

  for (const failure of failures) {
    for (const file of failure.files) {
      fileCounts.set(file, (fileCounts.get(file) || 0) + 1)
    }
  }

  // Find files that appear in at least 2 failures
  const commonFiles: Array<{ file: string; count: number }> = []

  for (const [file, count] of fileCounts) {
    if (count >= 2) {
      commonFiles.push({ file, count })
    }
  }

  // Sort by count descending
  return commonFiles.sort((a, b) => b.count - a.count).map((f) => f.file)
}

/**
 * Get default preventive measures based on category
 */
export function getDefaultPreventiveMeasures(category: PatternCategory): PreventiveMeasure[] {
  switch (category) {
    case 'code':
      return [
        {
          id: 'code-review-context',
          description: 'Include relevant code context in phase instructions',
          type: 'context',
          automatic: true,
          effectiveness: 0.7,
          application: 'Add file references and error patterns to phase context'
        },
        {
          id: 'code-verify-syntax',
          description: 'Verify syntax before proceeding',
          type: 'verification',
          automatic: true,
          effectiveness: 0.8,
          application: 'Run linting/type-checking after code changes'
        }
      ]

    case 'project':
      return [
        {
          id: 'project-deps-check',
          description: 'Check project dependencies before starting',
          type: 'verification',
          automatic: true,
          effectiveness: 0.75,
          application: 'Run npm install and verify package.json'
        },
        {
          id: 'project-structure-hint',
          description: 'Include project structure context',
          type: 'context',
          automatic: true,
          effectiveness: 0.65,
          application: 'Add project layout information to phase instructions'
        }
      ]

    case 'workflow':
      return [
        {
          id: 'workflow-phase-order',
          description: 'Verify correct phase ordering',
          type: 'phase_structure',
          automatic: false,
          effectiveness: 0.8,
          application: 'Review phase dependencies and ordering'
        },
        {
          id: 'workflow-checkpoint',
          description: 'Add verification checkpoints',
          type: 'verification',
          automatic: true,
          effectiveness: 0.7,
          application: 'Insert test runs between major steps'
        }
      ]

    default:
      return [
        {
          id: 'generic-context',
          description: 'Include error history in context',
          type: 'context',
          automatic: true,
          effectiveness: 0.5,
          application: 'Add previous error information to phase instructions'
        }
      ]
  }
}

/**
 * Determine pattern category from cluster characteristics
 */
function determineCategory(cluster: FailureCluster): PatternCategory {
  const errorCategories = cluster.failures.map((f) => f.errorCategory)

  // Count category types
  const codeRelated = errorCategories.filter((c) => ['syntax', 'test'].includes(c)).length
  const projectRelated = errorCategories.filter((c) =>
    ['dependency', 'resource', 'permission'].includes(c)
  ).length
  const workflowRelated = errorCategories.filter((c) => ['timeout', 'network'].includes(c)).length

  // Determine dominant category
  if (codeRelated >= projectRelated && codeRelated >= workflowRelated) {
    return 'code'
  } else if (projectRelated >= workflowRelated) {
    return 'project'
  } else {
    return 'workflow'
  }
}

/**
 * Generate pattern name from common terms
 */
function generatePatternName(commonTerms: string[]): string {
  if (commonTerms.length === 0) {
    return 'Unknown Pattern'
  }

  // Capitalize first term
  const primaryTerm = commonTerms[0].charAt(0).toUpperCase() + commonTerms[0].slice(1)

  if (commonTerms.length === 1) {
    return `${primaryTerm} Error Pattern`
  }

  // Combine top 2-3 terms
  const terms = commonTerms.slice(0, Math.min(3, commonTerms.length))
  return terms.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(' ') + ' Pattern'
}

/**
 * Generate error signatures from cluster
 */
function generateErrorSignatures(cluster: FailureCluster): string[] {
  const signatures: string[] = []

  // Use common terms to create regex patterns
  for (const term of cluster.commonErrorTerms.slice(0, 5)) {
    // Escape special regex characters
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    signatures.push(`\\b${escaped}\\b`)
  }

  return signatures
}

/**
 * Extract pattern from cluster
 */
export function extractPattern(cluster: FailureCluster, id: string): FailurePattern {
  const category = determineCategory(cluster)
  const now = new Date().toISOString()

  // Get timestamps for statistics
  const timestamps = cluster.failures.map((f) => f.timestamp).sort()
  const lastOccurrence = timestamps[timestamps.length - 1] || now

  // Get unique issue numbers
  const affectedIssues = [...new Set(cluster.failures.map((f) => f.issueNumber))]

  return {
    id,
    name: generatePatternName(cluster.commonErrorTerms),
    description: `Pattern detected from ${cluster.failures.length} similar failures with ${Math.round(cluster.similarity * 100)}% similarity`,
    category,

    // Detection
    errorSignatures: generateErrorSignatures(cluster),
    filePatterns: cluster.commonFiles,
    contextIndicators: cluster.commonErrorTerms,

    // Statistics
    occurrenceCount: cluster.failures.length,
    lastOccurrence,
    affectedIssues,
    successfulFixes: [],

    // Prevention
    preventiveMeasures: getDefaultPreventiveMeasures(category),

    // Metadata
    createdAt: now,
    updatedAt: now,
    resolvedAt: null
  }
}

/**
 * Match a failure against known patterns
 */
export function matchPatterns(failure: FailureRecord, patterns: FailurePattern[]): PatternMatch[] {
  const matches: PatternMatch[] = []

  for (const pattern of patterns) {
    let confidence = 0
    const matchedIndicators: string[] = []

    // Check error signatures
    for (const signature of pattern.errorSignatures) {
      try {
        const regex = new RegExp(signature, 'i')
        if (regex.test(failure.errorText)) {
          confidence += 0.3
          matchedIndicators.push(`signature: ${signature}`)
        }
      } catch {
        // Invalid regex, skip
      }
    }

    // Check file patterns
    for (const filePattern of pattern.filePatterns) {
      if (failure.files.some((f) => f.includes(filePattern) || filePattern.includes(f))) {
        confidence += 0.2
        matchedIndicators.push(`file: ${filePattern}`)
      }
    }

    // Check context indicators
    const errorLower = failure.errorText.toLowerCase()
    for (const indicator of pattern.contextIndicators) {
      if (errorLower.includes(indicator.toLowerCase())) {
        confidence += 0.1
        matchedIndicators.push(`indicator: ${indicator}`)
      }
    }

    // Cap confidence at 1
    confidence = Math.min(1, confidence)

    // Only include matches with some confidence
    if (confidence > 0.2) {
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

// ===== SERVICE CLASS =====

/**
 * Failure Clustering Service
 *
 * Manages failure pattern recognition, clustering, and prevention suggestions.
 */
export class FailureClusteringService {
  private patterns: Map<string, FailurePattern> = new Map()
  private failures: FailureRecord[] = []
  private patternIdCounter = 0

  /**
   * Add a failure record
   */
  addFailure(failure: FailureRecord): void {
    this.failures.push(failure)
  }

  /**
   * Get all failures
   */
  getFailures(): FailureRecord[] {
    return [...this.failures]
  }

  /**
   * Clear all failures
   */
  clearFailures(): void {
    this.failures = []
  }

  /**
   * Analyze failures and detect patterns
   */
  analyzeAndCluster(minSimilarity?: number): FailureCluster[] {
    return clusterSimilarFailures(this.failures, minSimilarity)
  }

  /**
   * Extract and store patterns from clusters
   */
  extractPatterns(clusters: FailureCluster[]): FailurePattern[] {
    const newPatterns: FailurePattern[] = []

    for (const cluster of clusters) {
      const id = `pattern-${++this.patternIdCounter}`
      const pattern = extractPattern(cluster, id)
      this.patterns.set(id, pattern)
      newPatterns.push(pattern)
    }

    return newPatterns
  }

  /**
   * Get all stored patterns
   */
  getPatterns(): FailurePattern[] {
    return Array.from(this.patterns.values())
  }

  /**
   * Match a failure against stored patterns
   */
  matchFailure(failure: FailureRecord): PatternMatch[] {
    return matchPatterns(failure, this.getPatterns())
  }

  /**
   * Add a custom pattern
   */
  addPattern(pattern: FailurePattern): void {
    this.patterns.set(pattern.id, pattern)
  }

  /**
   * Get pattern by ID
   */
  getPattern(id: string): FailurePattern | undefined {
    return this.patterns.get(id)
  }

  /**
   * Update pattern statistics
   */
  updatePatternStatistics(patternId: string, failure: FailureRecord): void {
    const pattern = this.patterns.get(patternId)
    if (pattern) {
      pattern.occurrenceCount++
      pattern.lastOccurrence = failure.timestamp
      if (!pattern.affectedIssues.includes(failure.issueNumber)) {
        pattern.affectedIssues.push(failure.issueNumber)
      }
      pattern.updatedAt = new Date().toISOString()
    }
  }

  /**
   * Record a successful fix for a pattern
   */
  recordFix(fix: FixRecord): void {
    const pattern = this.patterns.get(fix.patternId)
    if (pattern) {
      pattern.successfulFixes.push(fix)
      pattern.updatedAt = new Date().toISOString()
    }
  }

  /**
   * Generate next pattern ID
   */
  generatePatternId(): string {
    return `pattern-${++this.patternIdCounter}`
  }
}

/** Singleton instance */
export const failureClusteringService = new FailureClusteringService()
