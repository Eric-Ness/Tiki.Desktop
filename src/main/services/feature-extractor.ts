/**
 * Feature Extractor Service
 *
 * Extracts features from GitHub issues for cost prediction.
 * Stores execution history for training prediction models.
 */
import { join } from 'path'
import { readFile, writeFile, mkdir, access, constants } from 'fs/promises'

/**
 * Features extracted from a GitHub issue
 */
export interface IssueFeatures {
  /** Length of the issue body in characters */
  bodyLength: number
  /** Number of acceptance criteria (checklist items) */
  criteriaCount: number
  /** Estimated number of files affected */
  estimatedFiles: number
  /** Whether tests are required */
  hasTests: boolean
  /** Classification of issue type */
  issueType: 'bug' | 'feature' | 'refactor' | 'docs' | 'other'
  /** Complexity score based on labels (0-10) */
  labelComplexity: number
  /** Technical keywords found in the issue */
  codeKeywords: string[]
}

/**
 * Record of an issue execution for historical analysis
 */
export interface ExecutionRecord {
  /** GitHub issue number */
  issueNumber: number
  /** Issue title */
  issueTitle: string
  /** Features extracted from the issue */
  features: IssueFeatures
  /** Actual input tokens used */
  actualInputTokens: number
  /** Actual output tokens generated */
  actualOutputTokens: number
  /** Actual cost in dollars */
  actualCost: number
  /** Number of phases executed */
  phases: number
  /** Total duration in milliseconds */
  durationMs: number
  /** Number of retries attempted */
  retries: number
  /** Whether execution succeeded */
  success: boolean
  /** ISO timestamp of execution */
  executedAt: string
}

/**
 * GitHub issue input structure
 */
export interface GitHubIssue {
  number: number
  title: string
  body?: string
  labels?: Array<{ name: string }>
}

// Technical keywords to search for in issue bodies
const CODE_KEYWORDS = [
  'api',
  'database',
  'migration',
  'typescript',
  'react',
  'component',
  'test',
  'async',
  'promise',
  'hook',
  'state',
  'redux',
  'context',
  'router',
  'endpoint',
  'schema',
  'interface',
  'class',
  'function',
  'module',
  'import',
  'export',
  'refactor',
  'optimize',
  'performance',
  'security',
  'authentication',
  'authorization',
  'validation',
  'error',
  'exception',
  'logging',
  'cache',
  'memory',
  'cpu',
  'webpack',
  'vite',
  'electron',
  'node',
  'npm',
  'yarn',
  'git',
  'ci',
  'cd',
  'deploy',
  'build',
  'docker',
  'kubernetes'
]

// Labels that indicate higher complexity
const COMPLEXITY_LABELS: Record<string, number> = {
  // High complexity (3 points each)
  breaking: 3,
  'breaking-change': 3,
  'breaking change': 3,
  major: 3,
  architecture: 3,
  security: 3,

  // Medium complexity (2 points each)
  enhancement: 2,
  feature: 2,
  'new feature': 2,
  refactor: 2,
  performance: 2,
  migration: 2,

  // Lower complexity (1 point each)
  bug: 1,
  bugfix: 1,
  'bug fix': 1,
  fix: 1,
  patch: 1,
  minor: 1,
  docs: 1,
  documentation: 1,
  chore: 1,
  maintenance: 1,
  test: 1,
  tests: 1
}

/**
 * Storage data structure for execution records
 */
interface ExecutionData {
  records: ExecutionRecord[]
  version: number
}

/**
 * Get the analytics directory path
 */
function getAnalyticsPath(projectPath: string): string {
  return join(projectPath, '.tiki', 'analytics')
}

/**
 * Get the executions file path
 */
function getExecutionsFilePath(projectPath: string): string {
  return join(getAnalyticsPath(projectPath), 'executions.json')
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
 * Parse acceptance criteria from issue body
 * Looks for markdown checklist items: - [ ] or - [x]
 */
export function parseAcceptanceCriteria(body: string): number {
  if (!body) return 0

  // Match markdown checklist items: - [ ], - [x], * [ ], * [x]
  const checklistPattern = /^[\s]*[-*]\s*\[[ xX]?\]/gm
  const matches = body.match(checklistPattern)

  return matches ? matches.length : 0
}

/**
 * Estimate the number of files affected based on keywords in the issue body
 */
export function estimateAffectedFiles(body: string): number {
  if (!body) return 1

  const lowerBody = body.toLowerCase()
  let estimate = 1

  // File mentions (e.g., "file.ts", "component.tsx")
  const filePatterns = /[\w-]+\.(ts|tsx|js|jsx|json|css|scss|html|md|yml|yaml)/gi
  const fileMatches = body.match(filePatterns)
  if (fileMatches) {
    estimate = Math.max(estimate, fileMatches.length)
  }

  // Directory mentions (e.g., "src/", "components/")
  const dirPatterns = /[\w-]+\//g
  const dirMatches = body.match(dirPatterns)
  if (dirMatches) {
    estimate = Math.max(estimate, Math.ceil(dirMatches.length / 2) + 1)
  }

  // Keywords suggesting multiple files
  if (lowerBody.includes('all') && lowerBody.includes('files')) estimate = Math.max(estimate, 5)
  if (lowerBody.includes('multiple') && lowerBody.includes('files')) estimate = Math.max(estimate, 3)
  if (lowerBody.includes('refactor')) estimate = Math.max(estimate, 3)
  if (lowerBody.includes('migrate') || lowerBody.includes('migration'))
    estimate = Math.max(estimate, 5)
  if (lowerBody.includes('across') || lowerBody.includes('throughout'))
    estimate = Math.max(estimate, 4)

  // Cap at reasonable maximum
  return Math.min(estimate, 20)
}

/**
 * Detect if the issue involves test requirements
 */
export function detectTestRequirements(body: string, labels: string[]): boolean {
  if (!body && labels.length === 0) return false

  const lowerBody = (body || '').toLowerCase()
  const lowerLabels = labels.map((l) => l.toLowerCase())

  // Check labels first
  if (lowerLabels.some((l) => l.includes('test') || l === 'testing' || l === 'tests')) {
    return true
  }

  // Check body for test-related keywords
  const testKeywords = [
    'add test',
    'write test',
    'unit test',
    'integration test',
    'e2e test',
    'test coverage',
    'should test',
    'need test',
    'needs test',
    'test case',
    'test suite',
    'vitest',
    'jest',
    'mocha',
    'chai',
    'testing',
    'spec file',
    '.test.',
    '.spec.'
  ]

  return testKeywords.some((keyword) => lowerBody.includes(keyword))
}

/**
 * Classify the issue type based on title and labels
 */
export function classifyIssueType(
  title: string,
  labels: string[]
): IssueFeatures['issueType'] {
  const lowerTitle = title.toLowerCase()
  const lowerLabels = labels.map((l) => l.toLowerCase())

  // Check labels first (higher priority)
  if (lowerLabels.some((l) => l.includes('bug') || l === 'fix' || l === 'bugfix')) {
    return 'bug'
  }
  if (lowerLabels.some((l) => l.includes('feature') || l === 'enhancement' || l === 'feat')) {
    return 'feature'
  }
  if (lowerLabels.some((l) => l.includes('refactor') || l === 'refactoring')) {
    return 'refactor'
  }
  if (lowerLabels.some((l) => l.includes('doc') || l === 'documentation' || l === 'docs')) {
    return 'docs'
  }

  // Check title patterns - order matters! Check docs before feat since "docs" contains "add"
  if (lowerTitle.startsWith('docs:') || lowerTitle.startsWith('docs(') || lowerTitle.includes('document')) {
    return 'docs'
  }
  if (lowerTitle.startsWith('fix:') || lowerTitle.startsWith('fix(') || lowerTitle.includes('bug')) {
    return 'bug'
  }
  if (lowerTitle.startsWith('feat:') || lowerTitle.startsWith('feat(') || lowerTitle.includes('add ') || lowerTitle.includes('implement')) {
    return 'feature'
  }
  if (lowerTitle.startsWith('refactor:') || lowerTitle.startsWith('refactor(') || lowerTitle.includes('refactor')) {
    return 'refactor'
  }

  return 'other'
}

/**
 * Calculate complexity score based on labels (0-10)
 */
export function calculateLabelComplexity(labels: string[]): number {
  if (!labels || labels.length === 0) return 0

  let score = 0
  const lowerLabels = labels.map((l) => l.toLowerCase())

  for (const label of lowerLabels) {
    // Check exact matches first
    if (COMPLEXITY_LABELS[label] !== undefined) {
      score += COMPLEXITY_LABELS[label]
      continue
    }

    // Check partial matches
    for (const [key, value] of Object.entries(COMPLEXITY_LABELS)) {
      if (label.includes(key)) {
        score += value
        break
      }
    }
  }

  // Normalize to 0-10 scale (max 10)
  return Math.min(score, 10)
}

/**
 * Extract technical code keywords from issue body
 */
export function extractCodeKeywords(body: string): string[] {
  if (!body) return []

  const lowerBody = body.toLowerCase()
  const foundKeywords: string[] = []

  for (const keyword of CODE_KEYWORDS) {
    // Use word boundary matching to avoid partial matches
    const pattern = new RegExp(`\\b${keyword}\\b`, 'i')
    if (pattern.test(lowerBody)) {
      foundKeywords.push(keyword)
    }
  }

  // Remove duplicates and return
  return [...new Set(foundKeywords)]
}

/**
 * Extract features from a GitHub issue
 */
export function extractFeatures(issue: GitHubIssue): IssueFeatures {
  const body = issue.body || ''
  const labels = issue.labels?.map((l) => l.name) || []

  return {
    bodyLength: body.length,
    criteriaCount: parseAcceptanceCriteria(body),
    estimatedFiles: estimateAffectedFiles(body),
    hasTests: detectTestRequirements(body, labels),
    issueType: classifyIssueType(issue.title, labels),
    labelComplexity: calculateLabelComplexity(labels),
    codeKeywords: extractCodeKeywords(body)
  }
}

/**
 * Load execution history from storage
 */
export async function loadExecutionHistory(projectPath: string): Promise<ExecutionRecord[]> {
  const filePath = getExecutionsFilePath(projectPath)

  try {
    if (await pathExists(filePath)) {
      const content = await readFile(filePath, 'utf-8')
      const data = JSON.parse(content) as ExecutionData
      return data.records || []
    }
  } catch {
    // Return empty array on error (corrupted file, etc.)
  }

  return []
}

/**
 * Save an execution record to storage
 */
export async function saveExecutionRecord(
  projectPath: string,
  record: ExecutionRecord
): Promise<void> {
  await ensureAnalyticsDir(projectPath)

  const filePath = getExecutionsFilePath(projectPath)
  let data: ExecutionData = { records: [], version: 1 }

  try {
    if (await pathExists(filePath)) {
      const content = await readFile(filePath, 'utf-8')
      data = JSON.parse(content) as ExecutionData
    }
  } catch {
    // Start with empty data on error
  }

  data.records.push(record)
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

/**
 * Get recent execution records
 */
export async function getRecentExecutions(
  projectPath: string,
  limit: number = 50
): Promise<ExecutionRecord[]> {
  const records = await loadExecutionHistory(projectPath)

  // Sort by executedAt descending and take the most recent
  return records
    .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())
    .slice(0, limit)
}
