/**
 * Variable Extractor Service
 *
 * Extracts generalizable variables from completed execution plans.
 * Supports pattern detection for issue numbers, file paths, component names,
 * route paths, and repeated strings across phases.
 */
import type { TemplateVariable, VariableType } from './template-service'

/**
 * Execution plan structure (simplified from renderer store)
 */
export interface ExecutionPlan {
  issue: {
    number: number
    title: string
  }
  status: string
  phases: Array<{
    number: number
    title: string
    status: string
    files: string[]
    verification: string[]
    summary?: string
    error?: string
  }>
}

/**
 * Detected pattern from a plan
 */
export interface DetectedPattern {
  /** The detected value/pattern */
  pattern: string
  /** Suggested variable name for this pattern */
  suggestedVariable: string
  /** Number of times this pattern appears */
  occurrences: number
  /** Contexts where this pattern appears */
  contexts: string[]
  /** Type of the variable */
  type: VariableType
}

/**
 * Variable Extractor
 *
 * Analyzes execution plans to extract generalizable variables
 * that can be used in templates.
 */
export class VariableExtractor {
  /**
   * Extract variables from a completed execution plan
   *
   * @param plan The execution plan to analyze
   * @returns Array of template variables
   */
  extractVariables(plan: ExecutionPlan): TemplateVariable[] {
    const patterns = this.detectPatterns(plan)
    const variables: TemplateVariable[] = []
    const seenNames = new Set<string>()

    // Always include issue number if valid
    if (plan.issue.number > 0) {
      variables.push({
        name: 'issueNumber',
        description: 'The GitHub issue number for this plan',
        type: 'number',
        defaultValue: String(plan.issue.number),
        required: true
      })
      seenNames.add('issueNumber')
    }

    // Convert detected patterns to variables
    for (const pattern of patterns) {
      // Skip if we already have a variable with this name
      if (seenNames.has(pattern.suggestedVariable)) {
        continue
      }

      // Skip issue number patterns since we already added it
      if (pattern.suggestedVariable === 'issueNumber') {
        continue
      }

      // Only include patterns that appear multiple times or are significant
      if (pattern.occurrences >= 2 || this.isSignificantPattern(pattern)) {
        variables.push({
          name: pattern.suggestedVariable,
          description: this.generateDescription(pattern),
          type: pattern.type,
          defaultValue: pattern.pattern,
          required: true
        })
        seenNames.add(pattern.suggestedVariable)
      }
    }

    return variables
  }

  /**
   * Detect patterns in a plan
   *
   * @param plan The execution plan to analyze
   * @returns Array of detected patterns
   */
  detectPatterns(plan: ExecutionPlan): DetectedPattern[] {
    const patterns: Map<string, DetectedPattern> = new Map()

    // Helper to add or update a pattern
    const addPattern = (
      value: string,
      context: string,
      suggestedVariable: string,
      type: VariableType
    ): void => {
      if (!value || value.length === 0) return

      const key = `${suggestedVariable}:${value}`
      const existing = patterns.get(key)

      if (existing) {
        existing.occurrences++
        if (!existing.contexts.includes(context)) {
          existing.contexts.push(context)
        }
      } else {
        patterns.set(key, {
          pattern: value,
          suggestedVariable,
          occurrences: 1,
          contexts: [context],
          type
        })
      }
    }

    // Detect issue number patterns
    if (plan.issue.number > 0) {
      const issueNum = plan.issue.number
      const hashPattern = `#${issueNum}`
      const issuePattern = `issue-${issueNum}`

      // Check title
      if (plan.issue.title.includes(hashPattern)) {
        addPattern(hashPattern, 'issue title', 'issueNumber', 'number')
      }
      if (plan.issue.title.includes(issuePattern)) {
        addPattern(issuePattern, 'issue title', 'issueNumber', 'number')
      }

      // Check phases
      for (const phase of plan.phases) {
        // Check phase title
        if (phase.title.includes(hashPattern)) {
          addPattern(hashPattern, `phase ${phase.number} title`, 'issueNumber', 'number')
        }
        if (phase.title.includes(issuePattern)) {
          addPattern(issuePattern, `phase ${phase.number} title`, 'issueNumber', 'number')
        }

        // Check verification steps
        for (const v of phase.verification) {
          if (v.includes(hashPattern)) {
            addPattern(hashPattern, `phase ${phase.number} verification`, 'issueNumber', 'number')
          }
          if (v.includes(issuePattern)) {
            addPattern(issuePattern, `phase ${phase.number} verification`, 'issueNumber', 'number')
          }
        }
      }
    }

    // Detect component/model names from file paths
    const componentNames = new Map<string, string[]>()

    for (const phase of plan.phases) {
      for (const file of phase.files) {
        // Extract PascalCase names from file paths
        const pascalCaseMatches = file.match(/[A-Z][a-zA-Z0-9]+/g) || []

        for (const match of pascalCaseMatches) {
          // Skip common non-component words
          if (['README', 'TODO', 'CHANGELOG', 'LICENSE'].includes(match)) {
            continue
          }

          const contexts = componentNames.get(match) || []
          contexts.push(file)
          componentNames.set(match, contexts)
        }
      }
    }

    // Add component patterns
    for (const [name, contexts] of componentNames) {
      const isService = contexts.some((c) => c.toLowerCase().includes('service'))
      const isModel = contexts.some((c) => c.toLowerCase().includes('model'))

      let variableName = 'componentName'
      if (isService) {
        variableName = 'serviceName'
      } else if (isModel) {
        variableName = 'modelName'
      }

      for (const context of contexts) {
        addPattern(name, context, variableName, 'component')
      }
    }

    // Detect repeated words in titles (potential feature names)
    const wordCounts = new Map<string, { count: number; contexts: string[] }>()
    const allTexts = [
      plan.issue.title,
      ...plan.phases.map((p) => p.title),
      ...plan.phases.flatMap((p) => p.verification)
    ]

    for (const text of allTexts) {
      // Extract meaningful words (lowercase, 4+ chars)
      const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || []

      for (const word of words) {
        // Skip common words
        if (this.isCommonWord(word)) continue

        const existing = wordCounts.get(word) || { count: 0, contexts: [] }
        existing.count++
        if (!existing.contexts.includes(text)) {
          existing.contexts.push(text)
        }
        wordCounts.set(word, existing)
      }
    }

    // Add repeated word patterns as feature names
    for (const [word, data] of wordCounts) {
      if (data.count >= 3) {
        // Must appear at least 3 times
        addPattern(word, data.contexts[0], 'featureName', 'string')
        for (let i = 1; i < data.contexts.length; i++) {
          addPattern(word, data.contexts[i], 'featureName', 'string')
        }
      }
    }

    // Detect route patterns
    for (const phase of plan.phases) {
      const routeMatches = phase.title.match(/\/api\/[a-z]+/gi) || []
      for (const route of routeMatches) {
        addPattern(route, `phase ${phase.number} title`, 'routePath', 'string')
      }

      for (const v of phase.verification) {
        const vRouteMatches = v.match(/\/api\/[a-z]+/gi) || []
        for (const route of vRouteMatches) {
          addPattern(route, `phase ${phase.number} verification`, 'routePath', 'string')
        }
      }
    }

    return Array.from(patterns.values())
  }

  /**
   * Substitute variables in a template string
   *
   * @param template The template string with ${variableName} placeholders
   * @param variables Map of variable names to values
   * @returns The substituted string
   */
  substituteVariables(template: string, variables: Record<string, string>): string {
    let result = template

    for (const [name, value] of Object.entries(variables)) {
      // Create regex to match ${variableName} or ${variable_name}
      const regex = new RegExp(`\\$\\{${this.escapeRegex(name)}\\}`, 'g')
      result = result.replace(regex, value)
    }

    return result
  }

  /**
   * Suggest a variable name based on value and context
   *
   * @param value The value to name
   * @param context The context where the value appears
   * @returns Suggested variable name
   */
  suggestVariableName(value: string, context: string): string {
    if (!value || value.length === 0) {
      return 'value'
    }

    // Issue number patterns
    if (value.match(/^#\d+$/) || value.match(/^issue-\d+$/i)) {
      return 'issueNumber'
    }

    // PascalCase component names
    if (value.match(/^[A-Z][a-zA-Z0-9]+$/)) {
      const contextLower = context.toLowerCase()

      if (contextLower.includes('service')) {
        return 'serviceName'
      }
      if (contextLower.includes('model')) {
        return 'modelName'
      }
      if (
        contextLower.includes('component') ||
        contextLower.includes('.tsx') ||
        contextLower.includes('src/components')
      ) {
        return 'componentName'
      }

      // Default to componentName for PascalCase
      return 'componentName'
    }

    // Route paths
    if (value.startsWith('/api/') || value.startsWith('/')) {
      return 'routePath'
    }

    // File names
    if (value.includes('.') && !value.includes('/')) {
      return 'fileName'
    }

    // Default to featureName for other strings
    return 'featureName'
  }

  /**
   * Check if a pattern is significant enough to include
   */
  private isSignificantPattern(pattern: DetectedPattern): boolean {
    // Component names are significant even with 1 occurrence
    if (pattern.type === 'component') {
      return true
    }

    // Route paths are significant
    if (pattern.suggestedVariable === 'routePath') {
      return true
    }

    return false
  }

  /**
   * Generate a description for a pattern-based variable
   */
  private generateDescription(pattern: DetectedPattern): string {
    switch (pattern.suggestedVariable) {
      case 'componentName':
        return `The name of the component (e.g., "${pattern.pattern}")`
      case 'modelName':
        return `The name of the model (e.g., "${pattern.pattern}")`
      case 'serviceName':
        return `The name of the service (e.g., "${pattern.pattern}")`
      case 'featureName':
        return `The feature being implemented (e.g., "${pattern.pattern}")`
      case 'routePath':
        return `The API route path (e.g., "${pattern.pattern}")`
      case 'fileName':
        return `The name of the file (e.g., "${pattern.pattern}")`
      default:
        return `Variable value (e.g., "${pattern.pattern}")`
    }
  }

  /**
   * Check if a word is common and should be ignored
   */
  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'this',
      'that',
      'with',
      'from',
      'have',
      'been',
      'will',
      'would',
      'could',
      'should',
      'there',
      'their',
      'what',
      'when',
      'where',
      'which',
      'while',
      'about',
      'after',
      'before',
      'between',
      'through',
      'during',
      'without',
      'within',
      'into',
      'onto',
      'upon',
      'also',
      'just',
      'only',
      'some',
      'such',
      'than',
      'then',
      'these',
      'those',
      'each',
      'every',
      'both',
      'same',
      'other',
      'more',
      'most',
      'very',
      'create',
      'update',
      'delete',
      'implement',
      'phase',
      'step',
      'test',
      'tests',
      'file',
      'files',
      'pass',
      'work',
      'works',
      'done',
      'complete',
      'completed'
    ])

    return commonWords.has(word)
  }

  /**
   * Escape special regex characters in a string
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}

/** Singleton instance */
export const variableExtractor = new VariableExtractor()
