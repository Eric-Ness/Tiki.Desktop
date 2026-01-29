/**
 * Tests for TemplateService
 *
 * TDD: Tests written first, then implementation
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { mkdir, rm, readFile, writeFile, readdir } from 'fs/promises'
import { tmpdir } from 'os'
import {
  TemplateService,
  PlanTemplate,
  PhaseTemplate,
  TemplateVariable,
  TemplateFilter,
  templateService
} from '../template-service'

describe('TemplateService', () => {
  let service: TemplateService
  let testProjectPath: string

  beforeEach(async () => {
    // Create a unique temp directory for each test
    testProjectPath = join(
      tmpdir(),
      `tiki-template-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    )
    await mkdir(testProjectPath, { recursive: true })
    service = new TemplateService()
  })

  afterEach(async () => {
    // Clean up temp directory
    try {
      await rm(testProjectPath, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('PlanTemplate interface', () => {
    it('should have all required properties when creating a template', async () => {
      const template = await service.createTemplate(testProjectPath, {
        name: 'Test Template',
        description: 'A test template',
        category: 'custom',
        tags: ['test', 'example'],
        phases: [
          {
            title: 'Phase 1: ${component}',
            content: 'Implement ${component} feature',
            filePatterns: ['src/**/*.ts'],
            verification: ['Unit tests pass']
          }
        ],
        variables: [
          {
            name: 'component',
            description: 'The component name',
            type: 'string',
            required: true
          }
        ],
        matchCriteria: {
          keywords: ['feature', 'implement'],
          labels: ['enhancement'],
          filePatterns: ['src/**/*.ts']
        }
      })

      // Check all required properties
      expect(template).toHaveProperty('id')
      expect(template).toHaveProperty('name')
      expect(template).toHaveProperty('description')
      expect(template).toHaveProperty('category')
      expect(template).toHaveProperty('tags')
      expect(template).toHaveProperty('phases')
      expect(template).toHaveProperty('variables')
      expect(template).toHaveProperty('matchCriteria')
      expect(template).toHaveProperty('successCount')
      expect(template).toHaveProperty('failureCount')
      expect(template).toHaveProperty('createdAt')
      expect(template).toHaveProperty('updatedAt')

      // Validate types
      expect(typeof template.id).toBe('string')
      expect(typeof template.name).toBe('string')
      expect(typeof template.description).toBe('string')
      expect(['issue_type', 'component', 'workflow', 'custom']).toContain(template.category)
      expect(Array.isArray(template.tags)).toBe(true)
      expect(Array.isArray(template.phases)).toBe(true)
      expect(Array.isArray(template.variables)).toBe(true)
      expect(typeof template.matchCriteria).toBe('object')
      expect(typeof template.successCount).toBe('number')
      expect(typeof template.failureCount).toBe('number')
      expect(typeof template.createdAt).toBe('string')
      expect(typeof template.updatedAt).toBe('string')

      // Default values
      expect(template.successCount).toBe(0)
      expect(template.failureCount).toBe(0)
    })

    it('should support optional sourceIssue and lastUsed fields', async () => {
      const template = await service.createTemplate(testProjectPath, {
        name: 'Template with source',
        description: 'From issue',
        category: 'issue_type',
        tags: [],
        phases: [],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] },
        sourceIssue: 42
      })

      expect(template.sourceIssue).toBe(42)
      expect(template.lastUsed).toBeUndefined()
    })
  })

  describe('PhaseTemplate interface', () => {
    it('should have all required properties', async () => {
      const phaseTemplate: PhaseTemplate = {
        title: 'Phase ${number}: Setup',
        content: 'Set up the ${component} structure',
        filePatterns: ['src/${component}/**/*.ts'],
        verification: ['Files created', 'No TypeScript errors']
      }

      expect(phaseTemplate).toHaveProperty('title')
      expect(phaseTemplate).toHaveProperty('content')
      expect(phaseTemplate).toHaveProperty('filePatterns')
      expect(phaseTemplate).toHaveProperty('verification')

      expect(typeof phaseTemplate.title).toBe('string')
      expect(typeof phaseTemplate.content).toBe('string')
      expect(Array.isArray(phaseTemplate.filePatterns)).toBe(true)
      expect(Array.isArray(phaseTemplate.verification)).toBe(true)
    })
  })

  describe('TemplateVariable interface', () => {
    it('should have all required properties', async () => {
      const variable: TemplateVariable = {
        name: 'componentName',
        description: 'Name of the component',
        type: 'component',
        required: true
      }

      expect(variable).toHaveProperty('name')
      expect(variable).toHaveProperty('description')
      expect(variable).toHaveProperty('type')
      expect(variable).toHaveProperty('required')

      expect(typeof variable.name).toBe('string')
      expect(typeof variable.description).toBe('string')
      expect(['string', 'file', 'component', 'number']).toContain(variable.type)
      expect(typeof variable.required).toBe('boolean')
    })

    it('should support optional defaultValue', () => {
      const variableWithDefault: TemplateVariable = {
        name: 'count',
        description: 'Number of items',
        type: 'number',
        defaultValue: '10',
        required: false
      }

      expect(variableWithDefault.defaultValue).toBe('10')
    })
  })

  describe('createTemplate', () => {
    it('should persist template to file', async () => {
      const template = await service.createTemplate(testProjectPath, {
        name: 'Persisted Template',
        description: 'Test persistence',
        category: 'workflow',
        tags: ['persistence'],
        phases: [],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      // Verify file exists and contains the template
      const filePath = join(testProjectPath, '.tiki', 'templates', `${template.id}.json`)
      const content = await readFile(filePath, 'utf-8')
      const data = JSON.parse(content)

      expect(data.id).toBe(template.id)
      expect(data.name).toBe('Persisted Template')
    })

    it('should generate unique IDs for each template', async () => {
      const template1 = await service.createTemplate(testProjectPath, {
        name: 'Template 1',
        description: 'First',
        category: 'custom',
        tags: [],
        phases: [],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      const template2 = await service.createTemplate(testProjectPath, {
        name: 'Template 2',
        description: 'Second',
        category: 'custom',
        tags: [],
        phases: [],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      expect(template1.id).not.toBe(template2.id)
    })

    it('should create directory if it does not exist', async () => {
      const newPath = join(testProjectPath, 'new-project')
      await mkdir(newPath, { recursive: true })

      const template = await service.createTemplate(newPath, {
        name: 'New Project Template',
        description: 'Test',
        category: 'custom',
        tags: [],
        phases: [],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      expect(template.id).toBeDefined()
    })

    it('should set createdAt and updatedAt to current time', async () => {
      const before = new Date().toISOString()

      const template = await service.createTemplate(testProjectPath, {
        name: 'Timestamped',
        description: 'Test',
        category: 'custom',
        tags: [],
        phases: [],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      const after = new Date().toISOString()

      expect(template.createdAt >= before).toBe(true)
      expect(template.createdAt <= after).toBe(true)
      expect(template.updatedAt).toBe(template.createdAt)
    })
  })

  describe('getTemplate', () => {
    it('should retrieve a template by ID', async () => {
      const created = await service.createTemplate(testProjectPath, {
        name: 'Get Test',
        description: 'Test retrieval',
        category: 'component',
        tags: ['test'],
        phases: [
          {
            title: 'Setup',
            content: 'Do setup',
            filePatterns: [],
            verification: []
          }
        ],
        variables: [],
        matchCriteria: { keywords: ['test'], labels: [], filePatterns: [] }
      })

      const retrieved = await service.getTemplate(testProjectPath, created.id)

      expect(retrieved).not.toBeNull()
      expect(retrieved!.id).toBe(created.id)
      expect(retrieved!.name).toBe('Get Test')
      expect(retrieved!.phases.length).toBe(1)
    })

    it('should return null for non-existent template', async () => {
      const result = await service.getTemplate(testProjectPath, 'non-existent-id')
      expect(result).toBeNull()
    })

    it('should handle corrupted file gracefully', async () => {
      // Create templates directory
      const templatesPath = join(testProjectPath, '.tiki', 'templates')
      await mkdir(templatesPath, { recursive: true })

      // Create corrupted file
      await writeFile(join(templatesPath, 'corrupted.json'), 'not valid json', 'utf-8')

      const result = await service.getTemplate(testProjectPath, 'corrupted')
      expect(result).toBeNull()
    })
  })

  describe('listTemplates', () => {
    it('should list all templates', async () => {
      await service.createTemplate(testProjectPath, {
        name: 'Template A',
        description: 'First',
        category: 'custom',
        tags: [],
        phases: [],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      await service.createTemplate(testProjectPath, {
        name: 'Template B',
        description: 'Second',
        category: 'workflow',
        tags: [],
        phases: [],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      const templates = await service.listTemplates(testProjectPath)
      expect(templates.length).toBe(2)
    })

    it('should return empty array when no templates exist', async () => {
      const templates = await service.listTemplates(testProjectPath)
      expect(templates).toEqual([])
    })

    it('should filter by category', async () => {
      await service.createTemplate(testProjectPath, {
        name: 'Custom Template',
        description: 'A custom one',
        category: 'custom',
        tags: [],
        phases: [],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      await service.createTemplate(testProjectPath, {
        name: 'Workflow Template',
        description: 'A workflow one',
        category: 'workflow',
        tags: [],
        phases: [],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      const customTemplates = await service.listTemplates(testProjectPath, { category: 'custom' })
      expect(customTemplates.length).toBe(1)
      expect(customTemplates[0].name).toBe('Custom Template')

      const workflowTemplates = await service.listTemplates(testProjectPath, { category: 'workflow' })
      expect(workflowTemplates.length).toBe(1)
      expect(workflowTemplates[0].name).toBe('Workflow Template')
    })

    it('should filter by tags', async () => {
      await service.createTemplate(testProjectPath, {
        name: 'Tagged Template',
        description: 'Has tags',
        category: 'custom',
        tags: ['react', 'frontend'],
        phases: [],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      await service.createTemplate(testProjectPath, {
        name: 'Other Template',
        description: 'Different tags',
        category: 'custom',
        tags: ['backend', 'api'],
        phases: [],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      const reactTemplates = await service.listTemplates(testProjectPath, { tags: ['react'] })
      expect(reactTemplates.length).toBe(1)
      expect(reactTemplates[0].name).toBe('Tagged Template')
    })

    it('should sort by updatedAt descending', async () => {
      const t1 = await service.createTemplate(testProjectPath, {
        name: 'First',
        description: 'Created first',
        category: 'custom',
        tags: [],
        phases: [],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10))

      await service.createTemplate(testProjectPath, {
        name: 'Second',
        description: 'Created second',
        category: 'custom',
        tags: [],
        phases: [],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      const templates = await service.listTemplates(testProjectPath)
      expect(templates[0].name).toBe('Second')
      expect(templates[1].name).toBe('First')
    })

    it('should skip corrupted files', async () => {
      // Create a valid template
      await service.createTemplate(testProjectPath, {
        name: 'Valid',
        description: 'A valid template',
        category: 'custom',
        tags: [],
        phases: [],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      // Create a corrupted file
      const templatesPath = join(testProjectPath, '.tiki', 'templates')
      await writeFile(join(templatesPath, 'corrupted.json'), 'invalid json', 'utf-8')

      const templates = await service.listTemplates(testProjectPath)
      expect(templates.length).toBe(1)
      expect(templates[0].name).toBe('Valid')
    })
  })

  describe('updateTemplate', () => {
    it('should update template properties', async () => {
      const created = await service.createTemplate(testProjectPath, {
        name: 'Original Name',
        description: 'Original description',
        category: 'custom',
        tags: ['original'],
        phases: [],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      const updated = await service.updateTemplate(testProjectPath, created.id, {
        name: 'Updated Name',
        description: 'Updated description'
      })

      expect(updated).not.toBeNull()
      expect(updated!.name).toBe('Updated Name')
      expect(updated!.description).toBe('Updated description')
      expect(updated!.category).toBe('custom') // Unchanged
    })

    it('should update updatedAt timestamp', async () => {
      const created = await service.createTemplate(testProjectPath, {
        name: 'Timestamp Test',
        description: 'Test',
        category: 'custom',
        tags: [],
        phases: [],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      // Small delay
      await new Promise((resolve) => setTimeout(resolve, 10))

      const updated = await service.updateTemplate(testProjectPath, created.id, {
        name: 'New Name'
      })

      expect(updated!.updatedAt > created.updatedAt).toBe(true)
      expect(updated!.createdAt).toBe(created.createdAt) // Should not change
    })

    it('should return null for non-existent template', async () => {
      const result = await service.updateTemplate(testProjectPath, 'non-existent', {
        name: 'New Name'
      })
      expect(result).toBeNull()
    })

    it('should persist updates to file', async () => {
      const created = await service.createTemplate(testProjectPath, {
        name: 'Persist Update',
        description: 'Test',
        category: 'custom',
        tags: [],
        phases: [],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      await service.updateTemplate(testProjectPath, created.id, {
        name: 'Updated in File'
      })

      // Read directly from file
      const filePath = join(testProjectPath, '.tiki', 'templates', `${created.id}.json`)
      const content = await readFile(filePath, 'utf-8')
      const data = JSON.parse(content)

      expect(data.name).toBe('Updated in File')
    })

    it('should update phases and variables', async () => {
      const created = await service.createTemplate(testProjectPath, {
        name: 'Complex Update',
        description: 'Test',
        category: 'custom',
        tags: [],
        phases: [{ title: 'Old', content: 'Old content', filePatterns: [], verification: [] }],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      const updated = await service.updateTemplate(testProjectPath, created.id, {
        phases: [
          { title: 'New Phase 1', content: 'Content 1', filePatterns: [], verification: [] },
          { title: 'New Phase 2', content: 'Content 2', filePatterns: [], verification: [] }
        ],
        variables: [
          { name: 'newVar', description: 'A new variable', type: 'string', required: true }
        ]
      })

      expect(updated!.phases.length).toBe(2)
      expect(updated!.phases[0].title).toBe('New Phase 1')
      expect(updated!.variables.length).toBe(1)
      expect(updated!.variables[0].name).toBe('newVar')
    })
  })

  describe('deleteTemplate', () => {
    it('should delete an existing template', async () => {
      const created = await service.createTemplate(testProjectPath, {
        name: 'To Delete',
        description: 'Will be deleted',
        category: 'custom',
        tags: [],
        phases: [],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      const result = await service.deleteTemplate(testProjectPath, created.id)
      expect(result).toBe(true)

      // Verify template is gone
      const retrieved = await service.getTemplate(testProjectPath, created.id)
      expect(retrieved).toBeNull()
    })

    it('should return false for non-existent template', async () => {
      const result = await service.deleteTemplate(testProjectPath, 'non-existent')
      expect(result).toBe(false)
    })

    it('should remove file from disk', async () => {
      const created = await service.createTemplate(testProjectPath, {
        name: 'File Delete Test',
        description: 'Test',
        category: 'custom',
        tags: [],
        phases: [],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      const templatesPath = join(testProjectPath, '.tiki', 'templates')
      let files = await readdir(templatesPath)
      expect(files).toContain(`${created.id}.json`)

      await service.deleteTemplate(testProjectPath, created.id)

      files = await readdir(templatesPath)
      expect(files).not.toContain(`${created.id}.json`)
    })
  })

  describe('recordUsage', () => {
    it('should increment successCount on success', async () => {
      const created = await service.createTemplate(testProjectPath, {
        name: 'Usage Test',
        description: 'Test',
        category: 'custom',
        tags: [],
        phases: [],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      expect(created.successCount).toBe(0)

      await service.recordUsage(testProjectPath, created.id, true)

      const updated = await service.getTemplate(testProjectPath, created.id)
      expect(updated!.successCount).toBe(1)
      expect(updated!.failureCount).toBe(0)
    })

    it('should increment failureCount on failure', async () => {
      const created = await service.createTemplate(testProjectPath, {
        name: 'Failure Test',
        description: 'Test',
        category: 'custom',
        tags: [],
        phases: [],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      await service.recordUsage(testProjectPath, created.id, false)

      const updated = await service.getTemplate(testProjectPath, created.id)
      expect(updated!.successCount).toBe(0)
      expect(updated!.failureCount).toBe(1)
    })

    it('should update lastUsed timestamp', async () => {
      const created = await service.createTemplate(testProjectPath, {
        name: 'Last Used Test',
        description: 'Test',
        category: 'custom',
        tags: [],
        phases: [],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      expect(created.lastUsed).toBeUndefined()

      const before = new Date().toISOString()
      await service.recordUsage(testProjectPath, created.id, true)
      const after = new Date().toISOString()

      const updated = await service.getTemplate(testProjectPath, created.id)
      expect(updated!.lastUsed).toBeDefined()
      expect(updated!.lastUsed! >= before).toBe(true)
      expect(updated!.lastUsed! <= after).toBe(true)
    })

    it('should handle multiple usages', async () => {
      const created = await service.createTemplate(testProjectPath, {
        name: 'Multiple Usage',
        description: 'Test',
        category: 'custom',
        tags: [],
        phases: [],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      await service.recordUsage(testProjectPath, created.id, true)
      await service.recordUsage(testProjectPath, created.id, true)
      await service.recordUsage(testProjectPath, created.id, false)

      const updated = await service.getTemplate(testProjectPath, created.id)
      expect(updated!.successCount).toBe(2)
      expect(updated!.failureCount).toBe(1)
    })

    it('should not throw for non-existent template', async () => {
      // Should silently fail or handle gracefully
      await expect(
        service.recordUsage(testProjectPath, 'non-existent', true)
      ).resolves.not.toThrow()
    })
  })

  describe('searchTemplates', () => {
    beforeEach(async () => {
      // Create test templates for search
      await service.createTemplate(testProjectPath, {
        name: 'React Component',
        description: 'Create a new React component with TypeScript',
        category: 'component',
        tags: ['react', 'typescript', 'frontend'],
        phases: [
          {
            title: 'Create component file',
            content: 'Create the component',
            filePatterns: ['src/components/**/*.tsx'],
            verification: []
          }
        ],
        variables: [],
        matchCriteria: {
          keywords: ['react', 'component', 'ui'],
          labels: ['frontend'],
          filePatterns: ['*.tsx']
        }
      })

      await service.createTemplate(testProjectPath, {
        name: 'API Endpoint',
        description: 'Create a new REST API endpoint',
        category: 'workflow',
        tags: ['api', 'backend', 'rest'],
        phases: [
          {
            title: 'Create handler',
            content: 'Create API handler',
            filePatterns: ['src/api/**/*.ts'],
            verification: []
          }
        ],
        variables: [],
        matchCriteria: {
          keywords: ['api', 'endpoint', 'rest', 'backend'],
          labels: ['backend'],
          filePatterns: ['*.ts']
        }
      })

      await service.createTemplate(testProjectPath, {
        name: 'Bug Fix',
        description: 'Standard bug fix workflow',
        category: 'issue_type',
        tags: ['bugfix', 'maintenance'],
        phases: [],
        variables: [],
        matchCriteria: {
          keywords: ['bug', 'fix', 'error', 'issue'],
          labels: ['bug'],
          filePatterns: []
        }
      })
    })

    it('should search by name', async () => {
      const results = await service.searchTemplates(testProjectPath, 'react')
      expect(results.length).toBe(1)
      expect(results[0].name).toBe('React Component')
    })

    it('should search by description', async () => {
      const results = await service.searchTemplates(testProjectPath, 'REST API')
      expect(results.length).toBe(1)
      expect(results[0].name).toBe('API Endpoint')
    })

    it('should search by tags', async () => {
      const results = await service.searchTemplates(testProjectPath, 'frontend')
      expect(results.length).toBe(1)
      expect(results[0].name).toBe('React Component')
    })

    it('should search by keywords in matchCriteria', async () => {
      const results = await service.searchTemplates(testProjectPath, 'endpoint')
      expect(results.length).toBe(1)
      expect(results[0].name).toBe('API Endpoint')
    })

    it('should be case-insensitive', async () => {
      const results = await service.searchTemplates(testProjectPath, 'REACT')
      expect(results.length).toBe(1)
      expect(results[0].name).toBe('React Component')
    })

    it('should return empty array for no matches', async () => {
      const results = await service.searchTemplates(testProjectPath, 'nonexistent')
      expect(results).toEqual([])
    })

    it('should return all templates for empty query', async () => {
      const results = await service.searchTemplates(testProjectPath, '')
      expect(results.length).toBe(3)
    })

    it('should match partial words', async () => {
      const results = await service.searchTemplates(testProjectPath, 'bug')
      expect(results.length).toBe(1)
      expect(results[0].name).toBe('Bug Fix')
    })
  })

  describe('file persistence', () => {
    it('should persist data across service instances', async () => {
      // Create with first instance
      const created = await service.createTemplate(testProjectPath, {
        name: 'Persistence Test',
        description: 'Test persistence',
        category: 'custom',
        tags: ['test'],
        phases: [],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      // Read with new instance
      const newService = new TemplateService()
      const retrieved = await newService.getTemplate(testProjectPath, created.id)

      expect(retrieved).not.toBeNull()
      expect(retrieved!.name).toBe('Persistence Test')
    })

    it('should store templates in .tiki/templates directory', async () => {
      const created = await service.createTemplate(testProjectPath, {
        name: 'Directory Test',
        description: 'Test',
        category: 'custom',
        tags: [],
        phases: [],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      const expectedPath = join(testProjectPath, '.tiki', 'templates', `${created.id}.json`)
      const content = await readFile(expectedPath, 'utf-8')
      const data = JSON.parse(content)

      expect(data.id).toBe(created.id)
    })
  })

  describe('edge cases', () => {
    it('should handle special characters in template name', async () => {
      const template = await service.createTemplate(testProjectPath, {
        name: 'Template with "quotes" and <tags>',
        description: 'Special chars: & < > " \'',
        category: 'custom',
        tags: ['special/chars', 'test:value'],
        phases: [],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      const retrieved = await service.getTemplate(testProjectPath, template.id)
      expect(retrieved!.name).toBe('Template with "quotes" and <tags>')
    })

    it('should handle empty phases and variables', async () => {
      const template = await service.createTemplate(testProjectPath, {
        name: 'Empty Arrays',
        description: 'Test',
        category: 'custom',
        tags: [],
        phases: [],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      expect(template.phases).toEqual([])
      expect(template.variables).toEqual([])
    })

    it('should handle large content', async () => {
      const largeContent = 'x'.repeat(100000)
      const template = await service.createTemplate(testProjectPath, {
        name: 'Large Content',
        description: largeContent,
        category: 'custom',
        tags: [],
        phases: [
          {
            title: 'Large Phase',
            content: largeContent,
            filePatterns: [],
            verification: []
          }
        ],
        variables: [],
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      const retrieved = await service.getTemplate(testProjectPath, template.id)
      expect(retrieved!.description.length).toBe(100000)
    })

    it('should handle all category types', async () => {
      const categories: Array<'issue_type' | 'component' | 'workflow' | 'custom'> = [
        'issue_type',
        'component',
        'workflow',
        'custom'
      ]

      for (const category of categories) {
        const template = await service.createTemplate(testProjectPath, {
          name: `${category} Template`,
          description: 'Test',
          category,
          tags: [],
          phases: [],
          variables: [],
          matchCriteria: { keywords: [], labels: [], filePatterns: [] }
        })

        expect(template.category).toBe(category)
      }
    })

    it('should handle all variable types', async () => {
      const variableTypes: Array<'string' | 'file' | 'component' | 'number'> = [
        'string',
        'file',
        'component',
        'number'
      ]

      const variables: TemplateVariable[] = variableTypes.map((type, i) => ({
        name: `var${i}`,
        description: `Variable of type ${type}`,
        type,
        required: true
      }))

      const template = await service.createTemplate(testProjectPath, {
        name: 'All Variable Types',
        description: 'Test',
        category: 'custom',
        tags: [],
        phases: [],
        variables,
        matchCriteria: { keywords: [], labels: [], filePatterns: [] }
      })

      expect(template.variables.length).toBe(4)
      expect(template.variables.map((v) => v.type)).toEqual(variableTypes)
    })
  })

  describe('singleton export', () => {
    it('should export a singleton instance', () => {
      expect(templateService).toBeInstanceOf(TemplateService)
    })
  })
})
