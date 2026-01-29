/**
 * Tests for Feature Extractor Service
 *
 * Tests feature extraction from GitHub issues and execution record storage.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { mkdir, rm, readFile, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import {
  IssueFeatures,
  ExecutionRecord,
  GitHubIssue,
  extractFeatures,
  parseAcceptanceCriteria,
  estimateAffectedFiles,
  detectTestRequirements,
  classifyIssueType,
  calculateLabelComplexity,
  extractCodeKeywords,
  loadExecutionHistory,
  saveExecutionRecord,
  getRecentExecutions
} from '../feature-extractor'

describe('FeatureExtractor', () => {
  let testProjectPath: string

  beforeEach(async () => {
    // Create a unique temp directory for each test
    testProjectPath = join(
      tmpdir(),
      `tiki-feature-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    )
    await mkdir(testProjectPath, { recursive: true })
  })

  afterEach(async () => {
    // Clean up temp directory
    try {
      await rm(testProjectPath, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('IssueFeatures interface', () => {
    it('should have all required properties when extracting features', () => {
      const issue: GitHubIssue = {
        number: 42,
        title: 'feat: Add new feature',
        body: 'This is a test body with some content.\n- [ ] First item\n- [ ] Second item',
        labels: [{ name: 'enhancement' }, { name: 'feature' }]
      }

      const features = extractFeatures(issue)

      expect(features).toHaveProperty('bodyLength')
      expect(features).toHaveProperty('criteriaCount')
      expect(features).toHaveProperty('estimatedFiles')
      expect(features).toHaveProperty('hasTests')
      expect(features).toHaveProperty('issueType')
      expect(features).toHaveProperty('labelComplexity')
      expect(features).toHaveProperty('codeKeywords')

      // Validate types
      expect(typeof features.bodyLength).toBe('number')
      expect(typeof features.criteriaCount).toBe('number')
      expect(typeof features.estimatedFiles).toBe('number')
      expect(typeof features.hasTests).toBe('boolean')
      expect(typeof features.issueType).toBe('string')
      expect(typeof features.labelComplexity).toBe('number')
      expect(Array.isArray(features.codeKeywords)).toBe(true)
    })

    it('should handle minimal issue input', () => {
      const issue: GitHubIssue = {
        number: 1,
        title: 'Simple issue'
      }

      const features = extractFeatures(issue)

      expect(features.bodyLength).toBe(0)
      expect(features.criteriaCount).toBe(0)
      expect(features.estimatedFiles).toBe(1)
      expect(features.hasTests).toBe(false)
      expect(features.issueType).toBe('other')
      expect(features.labelComplexity).toBe(0)
      expect(features.codeKeywords).toEqual([])
    })
  })

  describe('parseAcceptanceCriteria', () => {
    it('should count markdown checkbox items', () => {
      const body = `
## Acceptance Criteria
- [ ] First item
- [ ] Second item
- [x] Completed item
- [ ] Fourth item
`
      expect(parseAcceptanceCriteria(body)).toBe(4)
    })

    it('should handle asterisk checkboxes', () => {
      const body = `
* [ ] Item one
* [x] Item two
`
      expect(parseAcceptanceCriteria(body)).toBe(2)
    })

    it('should return 0 for empty body', () => {
      expect(parseAcceptanceCriteria('')).toBe(0)
    })

    it('should return 0 when no checkboxes exist', () => {
      const body = 'This is a description without any checkboxes.'
      expect(parseAcceptanceCriteria(body)).toBe(0)
    })

    it('should handle mixed checkbox styles', () => {
      const body = `
- [ ] Dash unchecked
- [x] Dash checked
* [ ] Asterisk unchecked
* [X] Asterisk checked uppercase
`
      expect(parseAcceptanceCriteria(body)).toBe(4)
    })

    it('should handle indented checkboxes', () => {
      const body = `
  - [ ] Indented item 1
    - [ ] Deeply indented item 2
`
      expect(parseAcceptanceCriteria(body)).toBe(2)
    })
  })

  describe('estimateAffectedFiles', () => {
    it('should return 1 for empty body', () => {
      expect(estimateAffectedFiles('')).toBe(1)
    })

    it('should detect file mentions', () => {
      const body = `
We need to modify:
- component.tsx
- service.ts
- styles.css
`
      expect(estimateAffectedFiles(body)).toBeGreaterThanOrEqual(3)
    })

    it('should detect directory mentions', () => {
      const body = `
Changes needed in:
- src/components/
- src/services/
- src/utils/
`
      expect(estimateAffectedFiles(body)).toBeGreaterThanOrEqual(2)
    })

    it('should increase estimate for refactor keyword', () => {
      const body = 'We need to refactor the authentication module.'
      expect(estimateAffectedFiles(body)).toBeGreaterThanOrEqual(3)
    })

    it('should increase estimate for migration keyword', () => {
      const body = 'This involves a database migration.'
      expect(estimateAffectedFiles(body)).toBeGreaterThanOrEqual(5)
    })

    it('should cap at maximum of 20', () => {
      const body = `
file1.ts file2.ts file3.ts file4.ts file5.ts
file6.ts file7.ts file8.ts file9.ts file10.ts
file11.ts file12.ts file13.ts file14.ts file15.ts
file16.ts file17.ts file18.ts file19.ts file20.ts
file21.ts file22.ts file23.ts file24.ts file25.ts
`
      expect(estimateAffectedFiles(body)).toBeLessThanOrEqual(20)
    })
  })

  describe('detectTestRequirements', () => {
    it('should detect test label', () => {
      expect(detectTestRequirements('', ['test'])).toBe(true)
      expect(detectTestRequirements('', ['testing'])).toBe(true)
      expect(detectTestRequirements('', ['tests'])).toBe(true)
    })

    it('should detect test keywords in body', () => {
      expect(detectTestRequirements('We need to add tests for this feature', [])).toBe(true)
      expect(detectTestRequirements('Write unit tests', [])).toBe(true)
      expect(detectTestRequirements('Add integration test', [])).toBe(true)
      expect(detectTestRequirements('Improve test coverage', [])).toBe(true)
    })

    it('should detect test framework mentions', () => {
      expect(detectTestRequirements('Use vitest for testing', [])).toBe(true)
      expect(detectTestRequirements('Update jest config', [])).toBe(true)
    })

    it('should detect test file patterns', () => {
      expect(detectTestRequirements('Create service.test.ts file', [])).toBe(true)
      expect(detectTestRequirements('Add component.spec.tsx', [])).toBe(true)
    })

    it('should return false when no test indicators', () => {
      expect(detectTestRequirements('Simple feature implementation', [])).toBe(false)
      expect(detectTestRequirements('', [])).toBe(false)
    })
  })

  describe('classifyIssueType', () => {
    describe('from labels', () => {
      it('should classify as bug from label', () => {
        expect(classifyIssueType('Something broke', ['bug'])).toBe('bug')
        expect(classifyIssueType('Fix issue', ['bugfix'])).toBe('bug')
      })

      it('should classify as feature from label', () => {
        expect(classifyIssueType('Add thing', ['feature'])).toBe('feature')
        expect(classifyIssueType('New thing', ['enhancement'])).toBe('feature')
        expect(classifyIssueType('Add thing', ['feat'])).toBe('feature')
      })

      it('should classify as refactor from label', () => {
        expect(classifyIssueType('Improve code', ['refactor'])).toBe('refactor')
        expect(classifyIssueType('Clean up', ['refactoring'])).toBe('refactor')
      })

      it('should classify as docs from label', () => {
        expect(classifyIssueType('Update readme', ['documentation'])).toBe('docs')
        expect(classifyIssueType('Add docs', ['docs'])).toBe('docs')
      })
    })

    describe('from title', () => {
      it('should classify as bug from title prefix', () => {
        expect(classifyIssueType('fix: resolve crash', [])).toBe('bug')
        expect(classifyIssueType('fix(auth): login bug', [])).toBe('bug')
      })

      it('should classify as feature from title prefix', () => {
        expect(classifyIssueType('feat: add new button', [])).toBe('feature')
        expect(classifyIssueType('feat(ui): new modal', [])).toBe('feature')
      })

      it('should classify as refactor from title prefix', () => {
        expect(classifyIssueType('refactor: clean up code', [])).toBe('refactor')
        expect(classifyIssueType('refactor(api): improve structure', [])).toBe('refactor')
      })

      it('should classify as docs from title prefix', () => {
        expect(classifyIssueType('docs: update api docs', [])).toBe('docs')
        expect(classifyIssueType('docs(readme): add examples', [])).toBe('docs')
      })

      it('should classify from keywords in title', () => {
        expect(classifyIssueType('There is a bug in the system', [])).toBe('bug')
        expect(classifyIssueType('Add new authentication', [])).toBe('feature')
        expect(classifyIssueType('Implement dark mode', [])).toBe('feature')
        expect(classifyIssueType('Refactor the service layer', [])).toBe('refactor')
        expect(classifyIssueType('Document the API', [])).toBe('docs')
      })

      it('should return other for unclassifiable issues', () => {
        expect(classifyIssueType('Mysterious issue', [])).toBe('other')
        expect(classifyIssueType('Something', [])).toBe('other')
      })
    })

    it('should prioritize labels over title', () => {
      // Label says bug but title says feat
      expect(classifyIssueType('feat: something', ['bug'])).toBe('bug')
    })
  })

  describe('calculateLabelComplexity', () => {
    it('should return 0 for no labels', () => {
      expect(calculateLabelComplexity([])).toBe(0)
    })

    it('should calculate high complexity for breaking changes', () => {
      expect(calculateLabelComplexity(['breaking'])).toBe(3)
      expect(calculateLabelComplexity(['breaking-change'])).toBe(3)
      expect(calculateLabelComplexity(['major'])).toBe(3)
    })

    it('should calculate medium complexity', () => {
      expect(calculateLabelComplexity(['enhancement'])).toBe(2)
      expect(calculateLabelComplexity(['feature'])).toBe(2)
      expect(calculateLabelComplexity(['refactor'])).toBe(2)
    })

    it('should calculate low complexity', () => {
      expect(calculateLabelComplexity(['bug'])).toBe(1)
      expect(calculateLabelComplexity(['fix'])).toBe(1)
      expect(calculateLabelComplexity(['docs'])).toBe(1)
    })

    it('should sum multiple labels', () => {
      // breaking (3) + enhancement (2) + bug (1) = 6
      expect(calculateLabelComplexity(['breaking', 'enhancement', 'bug'])).toBe(6)
    })

    it('should cap at 10', () => {
      // Many high-complexity labels
      const labels = ['breaking', 'major', 'security', 'architecture', 'migration']
      expect(calculateLabelComplexity(labels)).toBe(10)
    })

    it('should handle case insensitivity', () => {
      expect(calculateLabelComplexity(['BUG'])).toBe(1)
      expect(calculateLabelComplexity(['BREAKING'])).toBe(3)
    })

    it('should handle partial matches', () => {
      expect(calculateLabelComplexity(['some-bug-label'])).toBe(1)
      expect(calculateLabelComplexity(['has-breaking-in-it'])).toBe(3)
    })
  })

  describe('extractCodeKeywords', () => {
    it('should return empty array for empty body', () => {
      expect(extractCodeKeywords('')).toEqual([])
    })

    it('should extract technical keywords', () => {
      const body = 'We need to update the API endpoint and add a TypeScript interface.'
      const keywords = extractCodeKeywords(body)

      expect(keywords).toContain('api')
      expect(keywords).toContain('typescript')
      expect(keywords).toContain('interface')
      expect(keywords).toContain('endpoint')
    })

    it('should handle React-related keywords', () => {
      const body = 'Add a new React component with a hook and state management.'
      const keywords = extractCodeKeywords(body)

      expect(keywords).toContain('react')
      expect(keywords).toContain('component')
      expect(keywords).toContain('hook')
      expect(keywords).toContain('state')
    })

    it('should handle database keywords', () => {
      const body = 'Create a database migration for the new schema.'
      const keywords = extractCodeKeywords(body)

      expect(keywords).toContain('database')
      expect(keywords).toContain('migration')
      expect(keywords).toContain('schema')
    })

    it('should handle test-related keywords', () => {
      const body = 'Write a unit test with async promise handling.'
      const keywords = extractCodeKeywords(body)

      expect(keywords).toContain('test')
      expect(keywords).toContain('async')
      expect(keywords).toContain('promise')
    })

    it('should not duplicate keywords', () => {
      const body = 'API api API api endpoint'
      const keywords = extractCodeKeywords(body)

      const apiCount = keywords.filter((k) => k === 'api').length
      expect(apiCount).toBe(1)
    })

    it('should use word boundary matching', () => {
      // "test" should match but not partial word matches like "contest"
      const body = 'This is a test, not a contest.'
      const keywords = extractCodeKeywords(body)

      expect(keywords).toContain('test')
      // "contest" should not match "test" due to word boundary
      expect(keywords.length).toBe(1)
    })
  })

  describe('extractFeatures (integration)', () => {
    it('should extract all features from a complex issue', () => {
      const issue: GitHubIssue = {
        number: 123,
        title: 'feat: Add user authentication with OAuth',
        body: `
## Description
Implement OAuth 2.0 authentication flow using the authentication API.

## Changes
- Update auth-service.ts
- Create oauth-provider.tsx component
- Add migration for user tokens

## Acceptance Criteria
- [ ] Users can login with Google
- [ ] Users can login with GitHub
- [x] Session management works
- [ ] Add unit tests for auth service

## Technical Notes
Uses React hook and async/await patterns.
`,
        labels: [{ name: 'feature' }, { name: 'security' }, { name: 'enhancement' }]
      }

      const features = extractFeatures(issue)

      expect(features.bodyLength).toBeGreaterThan(0)
      expect(features.criteriaCount).toBe(4)
      expect(features.estimatedFiles).toBeGreaterThanOrEqual(3)
      expect(features.hasTests).toBe(true) // "Add unit tests" in body
      expect(features.issueType).toBe('feature')
      expect(features.labelComplexity).toBeGreaterThan(0)
      expect(features.codeKeywords).toContain('api')
      expect(features.codeKeywords).toContain('react')
      expect(features.codeKeywords).toContain('hook')
      expect(features.codeKeywords).toContain('async')
    })

    it('should handle a simple bug fix issue', () => {
      const issue: GitHubIssue = {
        number: 456,
        title: 'fix: Button click not working',
        body: 'The submit button does not respond to clicks. Need to fix the handler.',
        labels: [{ name: 'bug' }]
      }

      const features = extractFeatures(issue)

      expect(features.issueType).toBe('bug')
      expect(features.criteriaCount).toBe(0)
      expect(features.labelComplexity).toBe(1)
    })

    it('should handle documentation issue', () => {
      const issue: GitHubIssue = {
        number: 789,
        title: 'docs: Update README with installation instructions',
        body: 'Add npm install command and document the API.',
        labels: [{ name: 'documentation' }]
      }

      const features = extractFeatures(issue)

      expect(features.issueType).toBe('docs')
      expect(features.codeKeywords).toContain('npm')
      expect(features.codeKeywords).toContain('api')
    })
  })

  describe('ExecutionRecord interface', () => {
    it('should have all required properties when saving a record', async () => {
      const record: ExecutionRecord = {
        issueNumber: 42,
        issueTitle: 'Test issue',
        features: {
          bodyLength: 100,
          criteriaCount: 3,
          estimatedFiles: 2,
          hasTests: true,
          issueType: 'feature',
          labelComplexity: 5,
          codeKeywords: ['api', 'typescript']
        },
        actualInputTokens: 5000,
        actualOutputTokens: 1500,
        actualCost: 0.05,
        phases: 3,
        durationMs: 120000,
        retries: 1,
        success: true,
        executedAt: new Date().toISOString()
      }

      await saveExecutionRecord(testProjectPath, record)
      const records = await loadExecutionHistory(testProjectPath)

      expect(records.length).toBe(1)
      const saved = records[0]

      expect(saved).toHaveProperty('issueNumber')
      expect(saved).toHaveProperty('issueTitle')
      expect(saved).toHaveProperty('features')
      expect(saved).toHaveProperty('actualInputTokens')
      expect(saved).toHaveProperty('actualOutputTokens')
      expect(saved).toHaveProperty('actualCost')
      expect(saved).toHaveProperty('phases')
      expect(saved).toHaveProperty('durationMs')
      expect(saved).toHaveProperty('retries')
      expect(saved).toHaveProperty('success')
      expect(saved).toHaveProperty('executedAt')

      // Verify values
      expect(saved.issueNumber).toBe(42)
      expect(saved.actualCost).toBe(0.05)
      expect(saved.features.issueType).toBe('feature')
    })
  })

  describe('loadExecutionHistory', () => {
    it('should return empty array when no file exists', async () => {
      const records = await loadExecutionHistory(testProjectPath)
      expect(records).toEqual([])
    })

    it('should load existing records', async () => {
      // Create test data
      const analyticsPath = join(testProjectPath, '.tiki', 'analytics')
      await mkdir(analyticsPath, { recursive: true })

      const data = {
        records: [
          {
            issueNumber: 1,
            issueTitle: 'Test',
            features: {
              bodyLength: 50,
              criteriaCount: 1,
              estimatedFiles: 1,
              hasTests: false,
              issueType: 'bug' as const,
              labelComplexity: 1,
              codeKeywords: []
            },
            actualInputTokens: 1000,
            actualOutputTokens: 500,
            actualCost: 0.01,
            phases: 1,
            durationMs: 30000,
            retries: 0,
            success: true,
            executedAt: '2024-01-15T10:00:00.000Z'
          }
        ],
        version: 1
      }

      await writeFile(join(analyticsPath, 'executions.json'), JSON.stringify(data), 'utf-8')

      const records = await loadExecutionHistory(testProjectPath)
      expect(records.length).toBe(1)
      expect(records[0].issueNumber).toBe(1)
    })

    it('should handle corrupted file gracefully', async () => {
      const analyticsPath = join(testProjectPath, '.tiki', 'analytics')
      await mkdir(analyticsPath, { recursive: true })
      await writeFile(join(analyticsPath, 'executions.json'), 'not valid json', 'utf-8')

      const records = await loadExecutionHistory(testProjectPath)
      expect(records).toEqual([])
    })
  })

  describe('saveExecutionRecord', () => {
    it('should create directory and file if not exists', async () => {
      const record: ExecutionRecord = {
        issueNumber: 1,
        issueTitle: 'Test',
        features: {
          bodyLength: 50,
          criteriaCount: 1,
          estimatedFiles: 1,
          hasTests: false,
          issueType: 'bug',
          labelComplexity: 1,
          codeKeywords: []
        },
        actualInputTokens: 1000,
        actualOutputTokens: 500,
        actualCost: 0.01,
        phases: 1,
        durationMs: 30000,
        retries: 0,
        success: true,
        executedAt: new Date().toISOString()
      }

      await saveExecutionRecord(testProjectPath, record)

      const filePath = join(testProjectPath, '.tiki', 'analytics', 'executions.json')
      const content = await readFile(filePath, 'utf-8')
      const data = JSON.parse(content)

      expect(data.records.length).toBe(1)
    })

    it('should append to existing records', async () => {
      const record1: ExecutionRecord = {
        issueNumber: 1,
        issueTitle: 'First',
        features: {
          bodyLength: 50,
          criteriaCount: 1,
          estimatedFiles: 1,
          hasTests: false,
          issueType: 'bug',
          labelComplexity: 1,
          codeKeywords: []
        },
        actualInputTokens: 1000,
        actualOutputTokens: 500,
        actualCost: 0.01,
        phases: 1,
        durationMs: 30000,
        retries: 0,
        success: true,
        executedAt: '2024-01-15T10:00:00.000Z'
      }

      const record2: ExecutionRecord = {
        issueNumber: 2,
        issueTitle: 'Second',
        features: {
          bodyLength: 100,
          criteriaCount: 2,
          estimatedFiles: 2,
          hasTests: true,
          issueType: 'feature',
          labelComplexity: 3,
          codeKeywords: ['api']
        },
        actualInputTokens: 2000,
        actualOutputTokens: 1000,
        actualCost: 0.02,
        phases: 2,
        durationMs: 60000,
        retries: 1,
        success: false,
        executedAt: '2024-01-15T11:00:00.000Z'
      }

      await saveExecutionRecord(testProjectPath, record1)
      await saveExecutionRecord(testProjectPath, record2)

      const records = await loadExecutionHistory(testProjectPath)
      expect(records.length).toBe(2)
      expect(records[0].issueNumber).toBe(1)
      expect(records[1].issueNumber).toBe(2)
    })

    it('should preserve existing data on corrupted file', async () => {
      const analyticsPath = join(testProjectPath, '.tiki', 'analytics')
      await mkdir(analyticsPath, { recursive: true })
      await writeFile(join(analyticsPath, 'executions.json'), 'corrupted', 'utf-8')

      const record: ExecutionRecord = {
        issueNumber: 1,
        issueTitle: 'Test',
        features: {
          bodyLength: 50,
          criteriaCount: 1,
          estimatedFiles: 1,
          hasTests: false,
          issueType: 'bug',
          labelComplexity: 1,
          codeKeywords: []
        },
        actualInputTokens: 1000,
        actualOutputTokens: 500,
        actualCost: 0.01,
        phases: 1,
        durationMs: 30000,
        retries: 0,
        success: true,
        executedAt: new Date().toISOString()
      }

      await saveExecutionRecord(testProjectPath, record)

      const records = await loadExecutionHistory(testProjectPath)
      expect(records.length).toBe(1)
    })
  })

  describe('getRecentExecutions', () => {
    it('should return records sorted by date descending', async () => {
      const records: ExecutionRecord[] = [
        {
          issueNumber: 1,
          issueTitle: 'Old',
          features: {
            bodyLength: 50,
            criteriaCount: 1,
            estimatedFiles: 1,
            hasTests: false,
            issueType: 'bug',
            labelComplexity: 1,
            codeKeywords: []
          },
          actualInputTokens: 1000,
          actualOutputTokens: 500,
          actualCost: 0.01,
          phases: 1,
          durationMs: 30000,
          retries: 0,
          success: true,
          executedAt: '2024-01-10T10:00:00.000Z'
        },
        {
          issueNumber: 2,
          issueTitle: 'Middle',
          features: {
            bodyLength: 50,
            criteriaCount: 1,
            estimatedFiles: 1,
            hasTests: false,
            issueType: 'bug',
            labelComplexity: 1,
            codeKeywords: []
          },
          actualInputTokens: 1000,
          actualOutputTokens: 500,
          actualCost: 0.01,
          phases: 1,
          durationMs: 30000,
          retries: 0,
          success: true,
          executedAt: '2024-01-15T10:00:00.000Z'
        },
        {
          issueNumber: 3,
          issueTitle: 'New',
          features: {
            bodyLength: 50,
            criteriaCount: 1,
            estimatedFiles: 1,
            hasTests: false,
            issueType: 'bug',
            labelComplexity: 1,
            codeKeywords: []
          },
          actualInputTokens: 1000,
          actualOutputTokens: 500,
          actualCost: 0.01,
          phases: 1,
          durationMs: 30000,
          retries: 0,
          success: true,
          executedAt: '2024-01-20T10:00:00.000Z'
        }
      ]

      for (const record of records) {
        await saveExecutionRecord(testProjectPath, record)
      }

      const recent = await getRecentExecutions(testProjectPath)

      expect(recent[0].issueNumber).toBe(3) // Newest first
      expect(recent[1].issueNumber).toBe(2)
      expect(recent[2].issueNumber).toBe(1) // Oldest last
    })

    it('should respect the limit parameter', async () => {
      // Save 5 records
      for (let i = 1; i <= 5; i++) {
        const record: ExecutionRecord = {
          issueNumber: i,
          issueTitle: `Issue ${i}`,
          features: {
            bodyLength: 50,
            criteriaCount: 1,
            estimatedFiles: 1,
            hasTests: false,
            issueType: 'bug',
            labelComplexity: 1,
            codeKeywords: []
          },
          actualInputTokens: 1000,
          actualOutputTokens: 500,
          actualCost: 0.01,
          phases: 1,
          durationMs: 30000,
          retries: 0,
          success: true,
          executedAt: new Date(2024, 0, i).toISOString()
        }
        await saveExecutionRecord(testProjectPath, record)
      }

      const recent = await getRecentExecutions(testProjectPath, 3)
      expect(recent.length).toBe(3)
    })

    it('should return empty array when no records', async () => {
      const recent = await getRecentExecutions(testProjectPath)
      expect(recent).toEqual([])
    })

    it('should default to 50 records limit', async () => {
      // Save 60 records
      for (let i = 1; i <= 60; i++) {
        const record: ExecutionRecord = {
          issueNumber: i,
          issueTitle: `Issue ${i}`,
          features: {
            bodyLength: 50,
            criteriaCount: 1,
            estimatedFiles: 1,
            hasTests: false,
            issueType: 'bug',
            labelComplexity: 1,
            codeKeywords: []
          },
          actualInputTokens: 1000,
          actualOutputTokens: 500,
          actualCost: 0.01,
          phases: 1,
          durationMs: 30000,
          retries: 0,
          success: true,
          executedAt: new Date(2024, 0, i).toISOString()
        }
        await saveExecutionRecord(testProjectPath, record)
      }

      const recent = await getRecentExecutions(testProjectPath)
      expect(recent.length).toBe(50)
    })
  })

  describe('file persistence', () => {
    it('should persist data correctly as JSON', async () => {
      const record: ExecutionRecord = {
        issueNumber: 42,
        issueTitle: 'Test with "quotes" and special chars: <>&',
        features: {
          bodyLength: 100,
          criteriaCount: 3,
          estimatedFiles: 2,
          hasTests: true,
          issueType: 'feature',
          labelComplexity: 5,
          codeKeywords: ['api', 'typescript']
        },
        actualInputTokens: 5000,
        actualOutputTokens: 1500,
        actualCost: 0.05123456,
        phases: 3,
        durationMs: 120000,
        retries: 1,
        success: true,
        executedAt: '2024-01-15T10:30:00.000Z'
      }

      await saveExecutionRecord(testProjectPath, record)

      const filePath = join(testProjectPath, '.tiki', 'analytics', 'executions.json')
      const content = await readFile(filePath, 'utf-8')
      const data = JSON.parse(content)

      expect(data.version).toBe(1)
      expect(data.records[0].issueTitle).toBe('Test with "quotes" and special chars: <>&')
      expect(data.records[0].actualCost).toBe(0.05123456)
    })

    it('should handle empty features arrays', async () => {
      const record: ExecutionRecord = {
        issueNumber: 1,
        issueTitle: 'Minimal',
        features: {
          bodyLength: 0,
          criteriaCount: 0,
          estimatedFiles: 1,
          hasTests: false,
          issueType: 'other',
          labelComplexity: 0,
          codeKeywords: []
        },
        actualInputTokens: 100,
        actualOutputTokens: 50,
        actualCost: 0.001,
        phases: 1,
        durationMs: 5000,
        retries: 0,
        success: true,
        executedAt: new Date().toISOString()
      }

      await saveExecutionRecord(testProjectPath, record)
      const records = await loadExecutionHistory(testProjectPath)

      expect(records[0].features.codeKeywords).toEqual([])
    })
  })

  describe('edge cases', () => {
    it('should handle very long issue bodies', () => {
      const longBody = 'a'.repeat(50000)
      const issue: GitHubIssue = {
        number: 1,
        title: 'Long body issue',
        body: longBody
      }

      const features = extractFeatures(issue)
      expect(features.bodyLength).toBe(50000)
    })

    it('should handle unicode in issue content', () => {
      const issue: GitHubIssue = {
        number: 1,
        title: 'feat: Support emojis and unicode',
        body: 'Support Unicode: cafe, resume, naive, role, koln. Symbols: '
      }

      const features = extractFeatures(issue)
      expect(features.bodyLength).toBeGreaterThan(0)
    })

    it('should handle null body gracefully', () => {
      const issue: GitHubIssue = {
        number: 1,
        title: 'No body',
        body: undefined
      }

      const features = extractFeatures(issue)
      expect(features.bodyLength).toBe(0)
      expect(features.criteriaCount).toBe(0)
    })

    it('should handle empty labels array', () => {
      const issue: GitHubIssue = {
        number: 1,
        title: 'feat: Something',
        body: 'Description',
        labels: []
      }

      const features = extractFeatures(issue)
      expect(features.labelComplexity).toBe(0)
      expect(features.issueType).toBe('feature') // From title
    })

    it('should handle undefined labels', () => {
      const issue: GitHubIssue = {
        number: 1,
        title: 'Something',
        body: 'Description',
        labels: undefined
      }

      const features = extractFeatures(issue)
      expect(features.labelComplexity).toBe(0)
    })
  })
})
