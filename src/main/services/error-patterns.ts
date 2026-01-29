/**
 * Error Pattern Database Service
 *
 * Provides offline pattern matching for common error types to help
 * with smart retry strategies for failed phases.
 */

export type ErrorCategory =
  | 'syntax'
  | 'test'
  | 'dependency'
  | 'timeout'
  | 'permission'
  | 'network'
  | 'resource'
  | 'unknown'

export interface ErrorPattern {
  /** Unique identifier for the pattern */
  id: string
  /** Human-readable name */
  name: string
  /** Error category */
  category: ErrorCategory
  /** Regex patterns to match */
  patterns: RegExp[]
  /** Base confidence score (0-1 scale) */
  baseConfidence: number
  /** Strategy IDs to suggest for this error type */
  suggestedStrategies: string[]
}

export interface ErrorClassification {
  /** ID of the matched pattern */
  patternId: string
  /** Error category */
  category: ErrorCategory
  /** Confidence score (0-1 scale) */
  confidence: number
  /** The text that matched the pattern */
  matchedText: string
  /** Additional context extracted from the error */
  context: {
    line?: number
    file?: string
  }
}

/**
 * Built-in error patterns for common error types
 */
const BUILT_IN_PATTERNS: ErrorPattern[] = [
  // ===== SYNTAX ERRORS =====
  {
    id: 'syntax-error-generic',
    name: 'JavaScript/TypeScript Syntax Error',
    category: 'syntax',
    patterns: [
      /SyntaxError:\s*.+/i,
      /Unexpected token/i,
      /Unexpected end of input/i,
      /Invalid or unexpected token/i
    ],
    baseConfidence: 0.9,
    suggestedStrategies: ['fix-syntax', 'retry-with-context']
  },
  {
    id: 'typescript-error',
    name: 'TypeScript Compilation Error',
    category: 'syntax',
    patterns: [
      /error TS\d+:/i,
      /TS\d+: .+/i,
      /Cannot find name '.+'/i,
      /Property '.+' does not exist on type/i,
      /Type '.+' is not assignable to type/i,
      /Argument of type '.+' is not assignable/i
    ],
    baseConfidence: 0.95,
    suggestedStrategies: ['fix-types', 'retry-with-context']
  },
  {
    id: 'eslint-error',
    name: 'ESLint/Linting Error',
    category: 'syntax',
    patterns: [
      /Parsing error:/i,
      /@typescript-eslint\/.+/i,
      /eslint\(.+\):/i,
      /\d+:\d+\s+error\s+.+/i
    ],
    baseConfidence: 0.85,
    suggestedStrategies: ['fix-lint', 'retry-with-context']
  },

  // ===== TEST ERRORS =====
  {
    id: 'test-assertion-failure',
    name: 'Test Assertion Failure',
    category: 'test',
    patterns: [
      /AssertionError:/i,
      /expect\(.+\)\.toBe\(.+\)/i,
      /expect\(.+\)\.toEqual\(.+\)/i,
      /Expected:.+Received:/is,
      /expected .+ to (equal|be|match|contain)/i
    ],
    baseConfidence: 0.9,
    suggestedStrategies: ['fix-test', 'retry-with-context']
  },
  {
    id: 'vitest-failure',
    name: 'Vitest Test Failure',
    category: 'test',
    patterns: [/FAIL\s+.+\.spec\.(ts|js|tsx|jsx)/i, /FAIL\s+.+\.test\.(ts|js|tsx|jsx)/i],
    baseConfidence: 0.95,
    suggestedStrategies: ['fix-test', 'retry-with-context']
  },
  {
    id: 'jest-failure',
    name: 'Jest Test Failure',
    category: 'test',
    patterns: [
      /Test Suites:\s+\d+\s+failed/i,
      /Tests:\s+\d+\s+failed/i,
      /FAIL\s+src\/.+\.test\.(ts|js)/i
    ],
    baseConfidence: 0.95,
    suggestedStrategies: ['fix-test', 'retry-with-context']
  },
  {
    id: 'test-timeout',
    name: 'Test Timeout',
    category: 'test',
    patterns: [
      /Test timed out in \d+ms/i,
      /Timeout - Async callback was not invoked/i,
      /vitest\.setConfig\(\{\s*testTimeout/i,
      /jest\.setTimeout/i
    ],
    baseConfidence: 0.85,
    suggestedStrategies: ['increase-timeout', 'retry-with-delay']
  },

  // ===== DEPENDENCY ERRORS =====
  {
    id: 'module-not-found',
    name: 'Module Not Found',
    category: 'dependency',
    patterns: [
      /Cannot find module '.+'/i,
      /Module not found:/i,
      /Error: Cannot resolve module/i,
      /Require stack:/i
    ],
    baseConfidence: 0.95,
    suggestedStrategies: ['install-dependency', 'retry-with-install']
  },
  {
    id: 'import-error',
    name: 'ES Module Import Error',
    category: 'dependency',
    patterns: [
      /Cannot use import statement outside a module/i,
      /SyntaxError: Unexpected token 'export'/i,
      /ERR_REQUIRE_ESM/i,
      /Must use import to load ES Module/i
    ],
    baseConfidence: 0.9,
    suggestedStrategies: ['fix-module-config', 'retry-with-context']
  },
  {
    id: 'npm-dependency-error',
    name: 'NPM Dependency Resolution Error',
    category: 'dependency',
    patterns: [
      /npm ERR! code ERESOLVE/i,
      /npm ERR! ERESOLVE unable to resolve/i,
      /npm ERR! peer dep missing/i,
      /peer dependency .+ is not installed/i,
      /Could not resolve dependency/i
    ],
    baseConfidence: 0.9,
    suggestedStrategies: ['fix-dependencies', 'retry-with-install']
  },

  // ===== TIMEOUT ERRORS =====
  {
    id: 'connection-timeout',
    name: 'Connection Timeout',
    category: 'timeout',
    patterns: [
      /ETIMEDOUT/i,
      /connect ETIMEDOUT/i,
      /Connection timed out/i,
      /operation timed out/i
    ],
    baseConfidence: 0.9,
    suggestedStrategies: ['retry-with-backoff', 'increase-timeout']
  },
  {
    id: 'socket-timeout',
    name: 'Socket Timeout',
    category: 'timeout',
    patterns: [/ESOCKETTIMEDOUT/i, /socket hang up/i, /socket timeout/i, /request timeout/i],
    baseConfidence: 0.85,
    suggestedStrategies: ['retry-with-backoff', 'increase-timeout']
  },

  // ===== PERMISSION ERRORS =====
  {
    id: 'permission-denied',
    name: 'Permission Denied',
    category: 'permission',
    patterns: [
      /EACCES:\s*permission denied/i,
      /Permission denied/i,
      /Access denied/i,
      /EACCES/i
    ],
    baseConfidence: 0.95,
    suggestedStrategies: ['fix-permissions', 'run-as-admin']
  },
  {
    id: 'operation-not-permitted',
    name: 'Operation Not Permitted',
    category: 'permission',
    patterns: [/EPERM:\s*operation not permitted/i, /EPERM/i, /Operation not permitted/i],
    baseConfidence: 0.9,
    suggestedStrategies: ['fix-permissions', 'run-as-admin']
  },

  // ===== NETWORK ERRORS =====
  {
    id: 'connection-refused',
    name: 'Connection Refused',
    category: 'network',
    patterns: [/ECONNREFUSED/i, /connect ECONNREFUSED/i, /Connection refused/i],
    baseConfidence: 0.9,
    suggestedStrategies: ['check-server', 'retry-with-backoff']
  },
  {
    id: 'dns-error',
    name: 'DNS Resolution Error',
    category: 'network',
    patterns: [
      /ENOTFOUND/i,
      /getaddrinfo ENOTFOUND/i,
      /DNS lookup failed/i,
      /Could not resolve host/i
    ],
    baseConfidence: 0.9,
    suggestedStrategies: ['check-dns', 'retry-with-backoff']
  },
  {
    id: 'connection-reset',
    name: 'Connection Reset',
    category: 'network',
    patterns: [/ECONNRESET/i, /read ECONNRESET/i, /Connection reset by peer/i],
    baseConfidence: 0.85,
    suggestedStrategies: ['retry-with-backoff', 'check-network']
  },

  // ===== RESOURCE ERRORS =====
  {
    id: 'out-of-memory',
    name: 'Out of Memory',
    category: 'resource',
    patterns: [
      /JavaScript heap out of memory/i,
      /FATAL ERROR:.*Allocation failed/i,
      /out of memory/i,
      /OOMKilled/i,
      /memory limit exceeded/i
    ],
    baseConfidence: 0.95,
    suggestedStrategies: ['increase-memory', 'optimize-code']
  },
  {
    id: 'too-many-files',
    name: 'Too Many Open Files',
    category: 'resource',
    patterns: [/EMFILE:\s*too many open files/i, /EMFILE/i, /Too many open files/i],
    baseConfidence: 0.9,
    suggestedStrategies: ['increase-file-limit', 'fix-file-handles']
  },
  {
    id: 'disk-space',
    name: 'No Disk Space',
    category: 'resource',
    patterns: [/ENOSPC:\s*no space left on device/i, /ENOSPC/i, /No space left on device/i],
    baseConfidence: 0.95,
    suggestedStrategies: ['free-disk-space', 'clean-cache']
  }
]

/**
 * Extract file path from error text
 */
function extractFilePath(errorText: string): string | undefined {
  // Match common file path patterns
  const patterns = [
    /(?:in|at|from)\s+([/\\]?[\w./\\-]+\.(ts|js|tsx|jsx|json))/i,
    /([/\\]?src[/\\][\w./\\-]+\.(ts|js|tsx|jsx))/i,
    /([/\\]?[\w./\\-]+\.(ts|js|tsx|jsx)):\d+:\d+/i
  ]

  for (const pattern of patterns) {
    const match = errorText.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return undefined
}

/**
 * Extract line number from error text
 */
function extractLineNumber(errorText: string): number | undefined {
  // Match common line number patterns
  const patterns = [
    /:\s*(\d+):\d+\s*-?\s*error/i, // src/file.ts:123:45 - error
    /:(\d+):\d+/i, // file.ts:123:45
    /line\s+(\d+)/i, // line 123
    /at\s+.+:(\d+):\d+/i // at function (file.ts:123:45)
  ]

  for (const pattern of patterns) {
    const match = errorText.match(pattern)
    if (match && match[1]) {
      const lineNum = parseInt(match[1], 10)
      if (!isNaN(lineNum) && lineNum > 0) {
        return lineNum
      }
    }
  }

  return undefined
}

export class ErrorPatternService {
  private patterns: Map<string, ErrorPattern> = new Map()

  constructor() {
    // Load built-in patterns
    for (const pattern of BUILT_IN_PATTERNS) {
      this.patterns.set(pattern.id, pattern)
    }
  }

  /**
   * Classify an error text against known patterns
   * @returns Classifications sorted by confidence (highest first)
   */
  classifyError(errorText: string): ErrorClassification[] {
    if (!errorText || errorText.trim() === '') {
      return []
    }

    const classifications: Map<string, ErrorClassification> = new Map()

    // Extract context once for all matches
    const file = extractFilePath(errorText)
    const line = extractLineNumber(errorText)

    for (const pattern of this.patterns.values()) {
      for (const regex of pattern.patterns) {
        const match = errorText.match(regex)
        if (match) {
          const matchedText = match[0]

          // Calculate confidence (could be enhanced with more factors)
          let confidence = pattern.baseConfidence

          // Boost confidence if we found context
          if (file || line) {
            confidence = Math.min(1, confidence + 0.05)
          }

          // Only keep the highest confidence match for each pattern
          const existing = classifications.get(pattern.id)
          if (!existing || confidence > existing.confidence) {
            classifications.set(pattern.id, {
              patternId: pattern.id,
              category: pattern.category,
              confidence,
              matchedText,
              context: {
                line,
                file
              }
            })
          }

          // Only match first regex per pattern
          break
        }
      }
    }

    // Convert to array and sort by confidence (highest first)
    return Array.from(classifications.values()).sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Get a pattern by its ID
   */
  getPattern(id: string): ErrorPattern | undefined {
    return this.patterns.get(id)
  }

  /**
   * Get all registered patterns
   */
  getAllPatterns(): ErrorPattern[] {
    return Array.from(this.patterns.values())
  }

  /**
   * Add a custom pattern (replaces existing if same ID)
   */
  addCustomPattern(pattern: ErrorPattern): void {
    this.patterns.set(pattern.id, pattern)
  }
}

/** Singleton instance */
export const errorPatternService = new ErrorPatternService()
