/**
 * Tests for UserLearningService
 *
 * TDD: Tests written first, then implementation
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { mkdir, rm, readFile, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import {
  UserLearningService,
  LearningProgress,
  ConceptExplanation,
  PhaseExplanation,
  CONCEPTS
} from '../user-learning-service'

describe('UserLearningService', () => {
  let service: UserLearningService
  let testBasePath: string

  beforeEach(async () => {
    // Create a unique temp directory for each test
    testBasePath = join(
      tmpdir(),
      `tiki-user-learning-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    )
    await mkdir(testBasePath, { recursive: true })
    service = new UserLearningService(testBasePath)
  })

  afterEach(async () => {
    // Clean up temp directory
    try {
      await rm(testBasePath, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('LearningProgress interface', () => {
    it('should have all required properties', async () => {
      const progress = await service.getProgress()

      expect(progress).toHaveProperty('learningModeEnabled')
      expect(progress).toHaveProperty('expertModeEnabled')
      expect(progress).toHaveProperty('conceptsSeen')
      expect(progress).toHaveProperty('totalExecutions')

      expect(typeof progress.learningModeEnabled).toBe('boolean')
      expect(typeof progress.expertModeEnabled).toBe('boolean')
      expect(Array.isArray(progress.conceptsSeen)).toBe(true)
      expect(typeof progress.totalExecutions).toBe('number')
    })

    it('should have correct default values', async () => {
      const progress = await service.getProgress()

      expect(progress.learningModeEnabled).toBe(true)
      expect(progress.expertModeEnabled).toBe(false)
      expect(progress.conceptsSeen).toEqual([])
      expect(progress.totalExecutions).toBe(0)
    })
  })

  describe('getProgress', () => {
    it('should return current learning state', async () => {
      const progress = await service.getProgress()

      expect(progress).toBeDefined()
      expect(progress.learningModeEnabled).toBe(true)
    })

    it('should persist progress to file', async () => {
      await service.markConceptSeen('phases')

      const filePath = join(testBasePath, 'progress.json')
      const content = await readFile(filePath, 'utf-8')
      const data = JSON.parse(content)

      expect(data.conceptsSeen).toContain('phases')
    })

    it('should load existing progress from file', async () => {
      // Create a progress file with existing data
      const existingProgress: LearningProgress = {
        learningModeEnabled: false,
        expertModeEnabled: true,
        conceptsSeen: ['phases', 'verification'],
        totalExecutions: 5
      }
      await mkdir(testBasePath, { recursive: true })
      await writeFile(join(testBasePath, 'progress.json'), JSON.stringify(existingProgress), 'utf-8')

      // Create new service instance that should load the existing data
      const newService = new UserLearningService(testBasePath)
      const progress = await newService.getProgress()

      expect(progress.learningModeEnabled).toBe(false)
      expect(progress.expertModeEnabled).toBe(true)
      expect(progress.conceptsSeen).toContain('phases')
      expect(progress.conceptsSeen).toContain('verification')
      expect(progress.totalExecutions).toBe(5)
    })

    it('should handle corrupted file gracefully', async () => {
      await mkdir(testBasePath, { recursive: true })
      await writeFile(join(testBasePath, 'progress.json'), 'invalid json {{{', 'utf-8')

      const newService = new UserLearningService(testBasePath)
      const progress = await newService.getProgress()

      // Should return default values
      expect(progress.learningModeEnabled).toBe(true)
      expect(progress.expertModeEnabled).toBe(false)
    })
  })

  describe('markConceptSeen', () => {
    it('should track seen concepts', async () => {
      await service.markConceptSeen('phases')

      const progress = await service.getProgress()
      expect(progress.conceptsSeen).toContain('phases')
    })

    it('should add concept to conceptsSeen list', async () => {
      await service.markConceptSeen('phases')
      await service.markConceptSeen('verification')

      const progress = await service.getProgress()
      expect(progress.conceptsSeen).toContain('phases')
      expect(progress.conceptsSeen).toContain('verification')
      expect(progress.conceptsSeen.length).toBe(2)
    })

    it('should track same concept multiple times (for frequency counting)', async () => {
      await service.markConceptSeen('phases')
      await service.markConceptSeen('phases')
      await service.markConceptSeen('phases')

      const progress = await service.getProgress()
      const phasesCount = progress.conceptsSeen.filter((c) => c === 'phases').length
      expect(phasesCount).toBe(3)
    })

    it('should persist across service instances', async () => {
      await service.markConceptSeen('execution')

      const newService = new UserLearningService(testBasePath)
      const progress = await newService.getProgress()

      expect(progress.conceptsSeen).toContain('execution')
    })
  })

  describe('setLearningMode', () => {
    it('should enable learning mode', async () => {
      await service.setLearningMode(true)
      const progress = await service.getProgress()

      expect(progress.learningModeEnabled).toBe(true)
    })

    it('should disable learning mode', async () => {
      await service.setLearningMode(false)
      const progress = await service.getProgress()

      expect(progress.learningModeEnabled).toBe(false)
    })

    it('should toggle learning mode correctly', async () => {
      await service.setLearningMode(false)
      let progress = await service.getProgress()
      expect(progress.learningModeEnabled).toBe(false)

      await service.setLearningMode(true)
      progress = await service.getProgress()
      expect(progress.learningModeEnabled).toBe(true)
    })

    it('should persist across service instances', async () => {
      await service.setLearningMode(false)

      const newService = new UserLearningService(testBasePath)
      const progress = await newService.getProgress()

      expect(progress.learningModeEnabled).toBe(false)
    })
  })

  describe('setExpertMode', () => {
    it('should enable expert mode', async () => {
      await service.setExpertMode(true)
      const progress = await service.getProgress()

      expect(progress.expertModeEnabled).toBe(true)
    })

    it('should disable expert mode', async () => {
      await service.setExpertMode(false)
      const progress = await service.getProgress()

      expect(progress.expertModeEnabled).toBe(false)
    })

    it('should update state correctly', async () => {
      await service.setExpertMode(true)
      let progress = await service.getProgress()
      expect(progress.expertModeEnabled).toBe(true)

      await service.setExpertMode(false)
      progress = await service.getProgress()
      expect(progress.expertModeEnabled).toBe(false)
    })

    it('should persist across service instances', async () => {
      await service.setExpertMode(true)

      const newService = new UserLearningService(testBasePath)
      const progress = await newService.getProgress()

      expect(progress.expertModeEnabled).toBe(true)
    })
  })

  describe('incrementExecutions', () => {
    it('should increment execution count', async () => {
      await service.incrementExecutions()
      const progress = await service.getProgress()

      expect(progress.totalExecutions).toBe(1)
    })

    it('should increment correctly multiple times', async () => {
      await service.incrementExecutions()
      await service.incrementExecutions()
      await service.incrementExecutions()

      const progress = await service.getProgress()
      expect(progress.totalExecutions).toBe(3)
    })

    it('should persist across service instances', async () => {
      await service.incrementExecutions()
      await service.incrementExecutions()

      const newService = new UserLearningService(testBasePath)
      const progress = await newService.getProgress()

      expect(progress.totalExecutions).toBe(2)
    })
  })

  describe('shouldShowExplanation', () => {
    it('should return false if expertModeEnabled', async () => {
      const progress: LearningProgress = {
        learningModeEnabled: true,
        expertModeEnabled: true,
        conceptsSeen: [],
        totalExecutions: 0
      }

      const result = service.shouldShowExplanation('phases', progress)
      expect(result).toBe(false)
    })

    it('should return false if learningModeEnabled is false', async () => {
      const progress: LearningProgress = {
        learningModeEnabled: false,
        expertModeEnabled: false,
        conceptsSeen: [],
        totalExecutions: 0
      }

      const result = service.shouldShowExplanation('phases', progress)
      expect(result).toBe(false)
    })

    it('should return true if concept seen less than 3 times', async () => {
      const progress: LearningProgress = {
        learningModeEnabled: true,
        expertModeEnabled: false,
        conceptsSeen: ['phases', 'phases'],
        totalExecutions: 0
      }

      const result = service.shouldShowExplanation('phases', progress)
      expect(result).toBe(true)
    })

    it('should return false if concept seen 3 or more times', async () => {
      const progress: LearningProgress = {
        learningModeEnabled: true,
        expertModeEnabled: false,
        conceptsSeen: ['phases', 'phases', 'phases'],
        totalExecutions: 0
      }

      const result = service.shouldShowExplanation('phases', progress)
      expect(result).toBe(false)
    })

    it('should return true for never-seen concept in learning mode', async () => {
      const progress: LearningProgress = {
        learningModeEnabled: true,
        expertModeEnabled: false,
        conceptsSeen: [],
        totalExecutions: 0
      }

      const result = service.shouldShowExplanation('phases', progress)
      expect(result).toBe(true)
    })

    it('should count only specific concept occurrences', async () => {
      const progress: LearningProgress = {
        learningModeEnabled: true,
        expertModeEnabled: false,
        conceptsSeen: [
          'phases',
          'verification',
          'phases',
          'execution',
          'phases',
          'verification'
        ],
        totalExecutions: 0
      }

      // phases seen 3 times - should not show
      expect(service.shouldShowExplanation('phases', progress)).toBe(false)

      // verification seen 2 times - should show
      expect(service.shouldShowExplanation('verification', progress)).toBe(true)

      // execution seen 1 time - should show
      expect(service.shouldShowExplanation('execution', progress)).toBe(true)
    })
  })

  describe('getConceptExplanation', () => {
    it('should return explanation for known concept', () => {
      const explanation = service.getConceptExplanation('phases')

      expect(explanation).not.toBeNull()
      expect(explanation?.id).toBe('phases')
      expect(explanation?.title).toBeDefined()
      expect(explanation?.shortDescription).toBeDefined()
      expect(explanation?.fullExplanation).toBeDefined()
      expect(explanation?.relatedConcepts).toBeDefined()
    })

    it('should return null for unknown concept', () => {
      const explanation = service.getConceptExplanation('unknown-concept')

      expect(explanation).toBeNull()
    })

    it('should return explanation with all required properties', () => {
      const explanation = service.getConceptExplanation('verification')

      expect(explanation).toHaveProperty('id')
      expect(explanation).toHaveProperty('title')
      expect(explanation).toHaveProperty('shortDescription')
      expect(explanation).toHaveProperty('fullExplanation')
      expect(explanation).toHaveProperty('relatedConcepts')

      expect(typeof explanation?.id).toBe('string')
      expect(typeof explanation?.title).toBe('string')
      expect(typeof explanation?.shortDescription).toBe('string')
      expect(typeof explanation?.fullExplanation).toBe('string')
      expect(Array.isArray(explanation?.relatedConcepts)).toBe(true)
    })
  })

  describe('getPhaseExplanation', () => {
    it('should generate phase explanation', () => {
      const phase = {
        title: 'Setup authentication',
        files: ['src/auth/login.ts', 'src/auth/middleware.ts']
      }

      const explanation = service.getPhaseExplanation(phase)

      expect(explanation).toHaveProperty('whyThisPhase')
      expect(explanation).toHaveProperty('whatHappens')
      expect(explanation).toHaveProperty('conceptsInvolved')

      expect(typeof explanation.whyThisPhase).toBe('string')
      expect(Array.isArray(explanation.whatHappens)).toBe(true)
      expect(Array.isArray(explanation.conceptsInvolved)).toBe(true)
    })

    it('should include file information in whatHappens', () => {
      const phase = {
        title: 'Create user service',
        files: ['src/services/user.ts']
      }

      const explanation = service.getPhaseExplanation(phase)

      expect(explanation.whatHappens.length).toBeGreaterThan(0)
    })

    it('should generate relevant concepts', () => {
      const phase = {
        title: 'Run tests',
        files: ['src/tests/auth.test.ts']
      }

      const explanation = service.getPhaseExplanation(phase)

      expect(explanation.conceptsInvolved.length).toBeGreaterThan(0)
    })

    it('should handle empty files array', () => {
      const phase = {
        title: 'Verify deployment',
        files: []
      }

      const explanation = service.getPhaseExplanation(phase)

      expect(explanation).toBeDefined()
      expect(explanation.whyThisPhase).toBeDefined()
    })
  })

  describe('CONCEPTS constant', () => {
    it('should have at least 5 concept explanations', () => {
      const conceptKeys = Object.keys(CONCEPTS)
      expect(conceptKeys.length).toBeGreaterThanOrEqual(5)
    })

    it('should include required concepts', () => {
      expect(CONCEPTS).toHaveProperty('phases')
      expect(CONCEPTS).toHaveProperty('verification')
      expect(CONCEPTS).toHaveProperty('execution')
      expect(CONCEPTS).toHaveProperty('ship')
      expect(CONCEPTS).toHaveProperty('issues')
    })

    it('should have valid structure for each concept', () => {
      for (const [key, concept] of Object.entries(CONCEPTS)) {
        expect(concept.id).toBe(key)
        expect(typeof concept.title).toBe('string')
        expect(typeof concept.shortDescription).toBe('string')
        expect(typeof concept.fullExplanation).toBe('string')
        expect(Array.isArray(concept.relatedConcepts)).toBe(true)

        // Related concepts should reference valid concept IDs
        for (const related of concept.relatedConcepts) {
          expect(CONCEPTS).toHaveProperty(related)
        }
      }
    })

    it('should have meaningful descriptions', () => {
      for (const concept of Object.values(CONCEPTS)) {
        expect(concept.title.length).toBeGreaterThan(0)
        expect(concept.shortDescription.length).toBeGreaterThan(10)
        expect(concept.fullExplanation.length).toBeGreaterThan(20)
      }
    })
  })

  describe('ConceptExplanation interface', () => {
    it('should match the interface structure', () => {
      const concept = CONCEPTS.phases

      const expectedShape: ConceptExplanation = {
        id: expect.any(String),
        title: expect.any(String),
        shortDescription: expect.any(String),
        fullExplanation: expect.any(String),
        relatedConcepts: expect.any(Array)
      }

      expect(concept).toMatchObject(expectedShape)
    })
  })

  describe('PhaseExplanation interface', () => {
    it('should match the interface structure', () => {
      const explanation = service.getPhaseExplanation({
        title: 'Test phase',
        files: ['test.ts']
      })

      const expectedShape: PhaseExplanation = {
        whyThisPhase: expect.any(String),
        whatHappens: expect.any(Array),
        conceptsInvolved: expect.any(Array)
      }

      expect(explanation).toMatchObject(expectedShape)
    })
  })

  describe('file persistence', () => {
    it('should create directory if it does not exist', async () => {
      const newPath = join(testBasePath, 'nested', 'path')
      const newService = new UserLearningService(newPath)

      await newService.markConceptSeen('test')

      const progress = await newService.getProgress()
      expect(progress.conceptsSeen).toContain('test')
    })

    it('should store progress at correct path', async () => {
      await service.markConceptSeen('phases')

      const expectedPath = join(testBasePath, 'progress.json')
      const content = await readFile(expectedPath, 'utf-8')
      const data = JSON.parse(content)

      expect(data).toHaveProperty('conceptsSeen')
      expect(data.conceptsSeen).toContain('phases')
    })
  })

  describe('edge cases', () => {
    it('should handle special characters in concept IDs', async () => {
      await service.markConceptSeen('concept-with-dash')
      await service.markConceptSeen('concept_with_underscore')

      const progress = await service.getProgress()
      expect(progress.conceptsSeen).toContain('concept-with-dash')
      expect(progress.conceptsSeen).toContain('concept_with_underscore')
    })

    it('should handle rapid successive calls', async () => {
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(service.markConceptSeen(`concept-${i}`))
      }
      await Promise.all(promises)

      const progress = await service.getProgress()
      expect(progress.conceptsSeen.length).toBe(10)
    })

    it('should handle concurrent mode changes', async () => {
      await Promise.all([
        service.setLearningMode(true),
        service.setExpertMode(false),
        service.incrementExecutions()
      ])

      const progress = await service.getProgress()
      expect(progress.learningModeEnabled).toBe(true)
      expect(progress.expertModeEnabled).toBe(false)
      expect(progress.totalExecutions).toBe(1)
    })
  })
})
