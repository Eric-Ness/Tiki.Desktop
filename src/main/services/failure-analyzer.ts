/**
 * Failure Analyzer Service
 *
 * Combines pattern matching with context analysis to provide
 * smart retry strategies for failed phases.
 */
import {
  ErrorCategory,
  ErrorClassification,
  ErrorPatternService,
  errorPatternService
} from './error-patterns'

/**
 * Retry strategy action types
 */
export type RetryAction = 'redo' | 'redo-with-context' | 'skip' | 'rollback-and-redo' | 'manual'

/**
 * Retry strategy definition
 */
export interface RetryStrategy {
  /** Unique identifier */
  id: string
  /** Human-readable name */
  name: string
  /** Description of what this strategy does */
  description: string
  /** Confidence score (0-1 scale) */
  confidence: number
  /** Error categories this strategy applies to */
  applicableTo: string[]
  /** The action to take */
  action: RetryAction
  /** Additional context hints to provide on redo */
  contextHints?: string[]
}

/**
 * Context information for failure analysis
 */
export interface FailureContext {
  /** Files involved in the failure */
  files: string[]
  /** Last command executed */
  lastCommand?: string
  /** Terminal output */
  terminalOutput?: string
}

/**
 * Complete failure analysis result
 */
export interface FailureAnalysis {
  /** Phase number where failure occurred */
  phaseNumber: number
  /** Issue number */
  issueNumber: number
  /** Timestamp of analysis */
  timestamp: number
  /** Original error text */
  errorText: string
  /** All matched classifications */
  classifications: ErrorClassification[]
  /** Primary (highest confidence) classification */
  primaryClassification: ErrorClassification | null
  /** Suggested retry strategies */
  suggestedStrategies: RetryStrategy[]
  /** Context information */
  context: FailureContext
}

/**
 * All error categories (for generic strategies)
 */
const ALL_CATEGORIES: ErrorCategory[] = [
  'syntax',
  'test',
  'dependency',
  'timeout',
  'permission',
  'network',
  'resource',
  'unknown'
]

/**
 * Built-in retry strategies
 */
export const BUILT_IN_STRATEGIES: RetryStrategy[] = [
  {
    id: 'simple-redo',
    name: 'Simple Redo',
    description:
      'Simply redo the phase without any changes. May work for transient errors or timing issues.',
    confidence: 0.2,
    applicableTo: ALL_CATEGORIES,
    action: 'redo'
  },
  {
    id: 'redo-with-error-context',
    name: 'Redo with Error Context',
    description:
      'Redo the phase with the error message included as context to help avoid the same mistake.',
    confidence: 0.5,
    applicableTo: ['syntax', 'test', 'dependency', 'unknown'],
    action: 'redo-with-context'
  },
  {
    id: 'fix-and-redo',
    name: 'Manual Fix then Redo',
    description:
      'The error requires manual intervention before retrying. Fix the issue and then redo the phase.',
    confidence: 0.5,
    applicableTo: ['syntax', 'test', 'permission', 'resource'],
    action: 'manual'
  },
  {
    id: 'rollback-and-redo',
    name: 'Rollback and Redo',
    description:
      'Rollback all changes from this phase and redo from scratch. Best for conflicts or corrupted state.',
    confidence: 0.7,
    applicableTo: ['syntax', 'test', 'dependency'],
    action: 'rollback-and-redo'
  },
  {
    id: 'skip-phase',
    name: 'Skip Phase',
    description:
      'Skip this phase entirely and continue with the next phase. Use with caution as it may cause issues downstream.',
    confidence: 0.2,
    applicableTo: ALL_CATEGORIES,
    action: 'skip'
  },
  {
    id: 'install-dependencies',
    name: 'Install Dependencies',
    description:
      'Run npm/yarn install to resolve missing dependencies before retrying the phase.',
    confidence: 0.8,
    applicableTo: ['dependency'],
    action: 'redo-with-context',
    contextHints: ['Run npm install or yarn install before retrying']
  }
]

/**
 * Create a strategy with enhanced context hints based on the error
 */
function enhanceStrategyWithContext(
  strategy: RetryStrategy,
  classification: ErrorClassification,
  context: FailureContext
): RetryStrategy {
  const hints: string[] = [...(strategy.contextHints || [])]

  // Add file context if available
  if (classification.context.file) {
    hints.push(`Error occurred in file: ${classification.context.file}`)
  }
  if (classification.context.line) {
    hints.push(`Error at line: ${classification.context.line}`)
  }

  // Add context from the failure context
  if (context.files.length > 0) {
    hints.push(`Related files: ${context.files.join(', ')}`)
  }
  if (context.lastCommand) {
    hints.push(`Last command: ${context.lastCommand}`)
  }

  // Add error-specific hints
  if (classification.matchedText) {
    hints.push(`Original error: ${classification.matchedText}`)
  }

  return {
    ...strategy,
    contextHints: hints.length > 0 ? hints : undefined
  }
}

/**
 * Failure Analyzer Service
 */
export class FailureAnalyzerService {
  private errorPatternService: ErrorPatternService
  private strategies: Map<string, RetryStrategy> = new Map()

  constructor(patternService?: ErrorPatternService) {
    this.errorPatternService = patternService || errorPatternService

    // Index built-in strategies
    for (const strategy of BUILT_IN_STRATEGIES) {
      this.strategies.set(strategy.id, strategy)
    }
  }

  /**
   * Analyze a failure and return suggested strategies
   */
  async analyzeFailure(
    issueNumber: number,
    phaseNumber: number,
    errorText: string,
    context: FailureContext
  ): Promise<FailureAnalysis> {
    // Classify the error
    const classifications = this.errorPatternService.classifyError(errorText)

    // Determine primary classification (highest confidence)
    const primaryClassification = classifications.length > 0 ? classifications[0] : null

    // Build suggested strategies
    const suggestedStrategies = this.buildSuggestedStrategies(classifications, context)

    return {
      phaseNumber,
      issueNumber,
      timestamp: Date.now(),
      errorText,
      classifications,
      primaryClassification,
      suggestedStrategies,
      context
    }
  }

  /**
   * Get available strategies for a classification
   */
  getAvailableStrategies(classification: ErrorClassification): RetryStrategy[] {
    const strategies: RetryStrategy[] = []
    const category = classification.category

    for (const strategy of this.strategies.values()) {
      // Include strategy if it applies to this category or applies to all
      if (strategy.applicableTo.includes(category) || strategy.applicableTo.includes('unknown')) {
        strategies.push(strategy)
      }
    }

    // Sort by confidence descending
    return strategies.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Build suggested strategies from classifications and context
   */
  buildSuggestedStrategies(
    classifications: ErrorClassification[],
    context: FailureContext
  ): RetryStrategy[] {
    const seenIds = new Set<string>()
    const strategies: RetryStrategy[] = []

    // For each classification, get applicable strategies
    for (const classification of classifications) {
      const applicable = this.getAvailableStrategies(classification)

      for (const strategy of applicable) {
        if (!seenIds.has(strategy.id)) {
          seenIds.add(strategy.id)
          // Enhance the strategy with context information
          strategies.push(enhanceStrategyWithContext(strategy, classification, context))
        }
      }
    }

    // If no classifications, add generic strategies
    if (classifications.length === 0) {
      // Add simple-redo and skip-phase as fallbacks
      const simpleRedo = this.strategies.get('simple-redo')
      const skipPhase = this.strategies.get('skip-phase')
      const redoWithContext = this.strategies.get('redo-with-error-context')

      if (simpleRedo && !seenIds.has('simple-redo')) {
        seenIds.add('simple-redo')
        strategies.push(simpleRedo)
      }
      if (skipPhase && !seenIds.has('skip-phase')) {
        seenIds.add('skip-phase')
        strategies.push(skipPhase)
      }
      if (redoWithContext && !seenIds.has('redo-with-error-context')) {
        seenIds.add('redo-with-error-context')
        strategies.push(redoWithContext)
      }
    }

    // Sort by confidence descending
    return strategies.sort((a, b) => b.confidence - a.confidence)
  }
}

/** Singleton instance */
export const failureAnalyzerService = new FailureAnalyzerService()
