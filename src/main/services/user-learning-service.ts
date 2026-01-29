/**
 * User Learning Service
 *
 * Tracks learning progress and provides explanations for new users.
 * Part of the guided/learning mode feature for Issue #47.
 */
import { join } from 'path'
import { readFile, writeFile, mkdir, access, constants } from 'fs/promises'

/**
 * Tracks the user's learning progress
 */
export interface LearningProgress {
  /** Whether learning mode is enabled (shows explanations) */
  learningModeEnabled: boolean
  /** Whether expert mode is enabled (hides all explanations) */
  expertModeEnabled: boolean
  /** List of concept IDs that have been seen (can contain duplicates for counting) */
  conceptsSeen: string[]
  /** Total number of phase executions */
  totalExecutions: number
}

/**
 * Explanation for a concept in the application
 */
export interface ConceptExplanation {
  /** Unique identifier for the concept */
  id: string
  /** Display title for the concept */
  title: string
  /** Brief one-line description */
  shortDescription: string
  /** Detailed explanation of the concept */
  fullExplanation: string
  /** IDs of related concepts */
  relatedConcepts: string[]
}

/**
 * Explanation for a specific phase
 */
export interface PhaseExplanation {
  /** Why this phase is necessary */
  whyThisPhase: string
  /** What actions will be performed */
  whatHappens: string[]
  /** Concepts involved in this phase */
  conceptsInvolved: string[]
}

/**
 * Concept explanations for key application concepts
 */
export const CONCEPTS: Record<string, ConceptExplanation> = {
  phases: {
    id: 'phases',
    title: 'Phases',
    shortDescription: 'Individual steps in completing an issue',
    fullExplanation:
      'Phases break down complex tasks into manageable steps. Each phase focuses on a specific part of the work, making it easier to track progress, identify issues, and ensure quality. Phases are executed in order, with each one building on the previous.',
    relatedConcepts: ['execution', 'verification']
  },
  verification: {
    id: 'verification',
    title: 'Verification',
    shortDescription: 'Checks that confirm a phase completed correctly',
    fullExplanation:
      'Each phase has verification steps that ensure the work was done correctly. This includes running tests, checking for errors, and validating that the expected changes were made. Verification helps catch problems early before they compound.',
    relatedConcepts: ['phases', 'testing']
  },
  execution: {
    id: 'execution',
    title: 'Execution',
    shortDescription: 'Running the planned phases to complete work',
    fullExplanation:
      'Execution runs each phase in order, performing the planned actions and verifying the results. During execution, you can monitor progress, see what changes are being made, and intervene if something goes wrong.',
    relatedConcepts: ['phases', 'ship']
  },
  ship: {
    id: 'ship',
    title: 'Ship',
    shortDescription: 'Finalizing and committing completed work',
    fullExplanation:
      'Shipping commits your changes and closes the issue. This is the final step after all phases have been executed and verified. The ship process creates a commit with a descriptive message and optionally creates a pull request.',
    relatedConcepts: ['execution', 'issues']
  },
  issues: {
    id: 'issues',
    title: 'Issues',
    shortDescription: 'GitHub issues that define tasks to complete',
    fullExplanation:
      'Issues from GitHub describe what needs to be done. They contain the requirements, context, and acceptance criteria for a task. Tiki breaks down issues into phases that can be planned and executed systematically.',
    relatedConcepts: ['phases', 'planning']
  },
  planning: {
    id: 'planning',
    title: 'Planning',
    shortDescription: 'Creating an execution plan from an issue',
    fullExplanation:
      'Planning analyzes a GitHub issue and creates a detailed execution plan with phases. The AI reviews the issue requirements, examines the codebase, and determines the best approach to complete the work.',
    relatedConcepts: ['issues', 'phases']
  },
  testing: {
    id: 'testing',
    title: 'Testing',
    shortDescription: 'Running tests to verify code changes',
    fullExplanation:
      'Testing ensures that code changes work as expected and do not break existing functionality. Tests are run automatically during verification phases to catch issues early in the development process.',
    relatedConcepts: ['verification', 'phases']
  }
}

/** Default learning progress state factory */
function getDefaultProgress(): LearningProgress {
  return {
    learningModeEnabled: true,
    expertModeEnabled: false,
    conceptsSeen: [],
    totalExecutions: 0
  }
}

/** Number of times to show a concept before hiding it */
const CONCEPT_SHOW_THRESHOLD = 3

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
 * User Learning Service
 *
 * Tracks user learning progress and provides concept explanations.
 */
export class UserLearningService {
  private basePath: string
  private progressPath: string
  private operationQueue: Promise<void> = Promise.resolve()

  /**
   * Create a new UserLearningService
   * @param basePath Base path for storing learning data (e.g., .tiki-desktop/learning/)
   */
  constructor(basePath: string) {
    this.basePath = basePath
    this.progressPath = join(basePath, 'progress.json')
  }

  /**
   * Get current learning progress
   */
  async getProgress(): Promise<LearningProgress> {
    try {
      if (await pathExists(this.progressPath)) {
        const content = await readFile(this.progressPath, 'utf-8')
        const data = JSON.parse(content) as LearningProgress
        return data
      }
    } catch {
      // Return default on error (corrupted file, etc.)
    }
    return getDefaultProgress()
  }

  /**
   * Save progress to file
   */
  private async saveProgress(progress: LearningProgress): Promise<void> {
    if (!(await pathExists(this.basePath))) {
      await mkdir(this.basePath, { recursive: true })
    }
    await writeFile(this.progressPath, JSON.stringify(progress, null, 2), 'utf-8')
  }

  /**
   * Execute an operation with proper sequencing to prevent race conditions
   */
  private async executeSequentially<T>(operation: () => Promise<T>): Promise<T> {
    const previousOperation = this.operationQueue
    let result: T
    this.operationQueue = previousOperation.then(async () => {
      result = await operation()
    })
    await this.operationQueue
    return result!
  }

  /**
   * Mark a concept as seen
   * @param conceptId The ID of the concept that was shown
   */
  async markConceptSeen(conceptId: string): Promise<void> {
    return this.executeSequentially(async () => {
      const progress = await this.getProgress()
      progress.conceptsSeen.push(conceptId)
      await this.saveProgress(progress)
    })
  }

  /**
   * Toggle learning mode on or off
   * @param enabled Whether learning mode should be enabled
   */
  async setLearningMode(enabled: boolean): Promise<void> {
    return this.executeSequentially(async () => {
      const progress = await this.getProgress()
      progress.learningModeEnabled = enabled
      await this.saveProgress(progress)
    })
  }

  /**
   * Toggle expert mode on or off
   * @param enabled Whether expert mode should be enabled
   */
  async setExpertMode(enabled: boolean): Promise<void> {
    return this.executeSequentially(async () => {
      const progress = await this.getProgress()
      progress.expertModeEnabled = enabled
      await this.saveProgress(progress)
    })
  }

  /**
   * Increment the execution count
   */
  async incrementExecutions(): Promise<void> {
    return this.executeSequentially(async () => {
      const progress = await this.getProgress()
      progress.totalExecutions++
      await this.saveProgress(progress)
    })
  }

  /**
   * Check if an explanation should be shown for a concept
   * @param conceptId The concept to check
   * @param progress The current learning progress
   * @returns true if the explanation should be shown
   */
  shouldShowExplanation(conceptId: string, progress: LearningProgress): boolean {
    // Never show explanations in expert mode
    if (progress.expertModeEnabled) {
      return false
    }

    // Only show explanations if learning mode is enabled
    if (!progress.learningModeEnabled) {
      return false
    }

    // Count how many times this concept has been seen
    const seenCount = progress.conceptsSeen.filter((c) => c === conceptId).length

    // Show if seen less than threshold times
    return seenCount < CONCEPT_SHOW_THRESHOLD
  }

  /**
   * Get explanation for a concept
   * @param conceptId The concept ID to look up
   * @returns The concept explanation or null if not found
   */
  getConceptExplanation(conceptId: string): ConceptExplanation | null {
    return CONCEPTS[conceptId] || null
  }

  /**
   * Generate an explanation for a specific phase
   * @param phase The phase to explain
   * @returns A phase explanation
   */
  getPhaseExplanation(phase: { title: string; files: string[] }): PhaseExplanation {
    const whatHappens: string[] = []
    const conceptsInvolved: string[] = ['phases']

    // Generate what happens based on phase title and files
    whatHappens.push(`Execute "${phase.title}"`)

    if (phase.files.length > 0) {
      if (phase.files.length === 1) {
        whatHappens.push(`Modify file: ${phase.files[0]}`)
      } else {
        whatHappens.push(`Modify ${phase.files.length} files`)
      }

      // Detect test files
      if (phase.files.some((f) => f.includes('.test.') || f.includes('.spec.'))) {
        conceptsInvolved.push('testing')
        whatHappens.push('Run and verify tests')
      }
    }

    whatHappens.push('Verify phase completion')
    conceptsInvolved.push('verification')

    // Generate why this phase based on title
    let whyThisPhase = `This phase "${phase.title}" is part of the execution plan.`

    const titleLower = phase.title.toLowerCase()
    if (titleLower.includes('setup') || titleLower.includes('initialize')) {
      whyThisPhase = `This phase sets up the foundation for subsequent work by ${phase.title.toLowerCase()}.`
    } else if (titleLower.includes('test')) {
      whyThisPhase = `This phase ensures code quality by ${phase.title.toLowerCase()}.`
      if (!conceptsInvolved.includes('testing')) {
        conceptsInvolved.push('testing')
      }
    } else if (titleLower.includes('create') || titleLower.includes('add')) {
      whyThisPhase = `This phase adds new functionality by ${phase.title.toLowerCase()}.`
    } else if (titleLower.includes('update') || titleLower.includes('modify')) {
      whyThisPhase = `This phase improves existing code by ${phase.title.toLowerCase()}.`
    } else if (titleLower.includes('fix')) {
      whyThisPhase = `This phase corrects an issue by ${phase.title.toLowerCase()}.`
    }

    return {
      whyThisPhase,
      whatHappens,
      conceptsInvolved: [...new Set(conceptsInvolved)]
    }
  }
}

/** Singleton instance - use this for app-wide learning tracking */
let _singletonInstance: UserLearningService | null = null

export function getUserLearningService(): UserLearningService {
  if (!_singletonInstance) {
    _singletonInstance = new UserLearningService(join(process.cwd(), '.tiki-desktop', 'learning'))
  }
  return _singletonInstance
}

// For backwards compatibility
export const userLearningService = new UserLearningService(
  join(process.cwd(), '.tiki-desktop', 'learning')
)
