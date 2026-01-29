/**
 * Tests for SearchService
 *
 * TDD: Tests written first, then implementation
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  SearchService,
  SearchResult,
  SearchableContent,
  SearchOptions,
  ContentType
} from '../search-service'

describe('SearchService', () => {
  let searchService: SearchService

  beforeEach(() => {
    searchService = new SearchService()
  })

  describe('updateIndex', () => {
    it('should index issues', () => {
      const issues: SearchableContent[] = [
        {
          type: 'issue',
          id: '1',
          title: 'Fix authentication bug',
          body: 'Users cannot log in with SSO',
          labels: ['bug', 'high-priority']
        }
      ]

      searchService.updateIndex('issue', issues)

      const results = searchService.search('authentication')
      expect(results.length).toBe(1)
      expect(results[0].id).toBe('1')
      expect(results[0].type).toBe('issue')
    })

    it('should index plans', () => {
      const plans: SearchableContent[] = [
        {
          type: 'plan',
          id: '42',
          title: 'Implement user dashboard',
          body: 'Phase 1: Create layout\nPhase 2: Add widgets'
        }
      ]

      searchService.updateIndex('plan', plans)

      const results = searchService.search('dashboard')
      expect(results.length).toBe(1)
      expect(results[0].id).toBe('42')
      expect(results[0].type).toBe('plan')
    })

    it('should index releases', () => {
      const releases: SearchableContent[] = [
        {
          type: 'release',
          id: 'v1.0.0',
          title: 'v1.0.0 - Initial Release',
          body: 'First stable release with core features'
        }
      ]

      searchService.updateIndex('release', releases)

      const results = searchService.search('stable release')
      expect(results.length).toBe(1)
      expect(results[0].id).toBe('v1.0.0')
      expect(results[0].type).toBe('release')
    })

    it('should index knowledge entries', () => {
      const knowledge: SearchableContent[] = [
        {
          type: 'knowledge',
          id: 'abc123',
          title: 'React component patterns',
          body: 'Use composition over inheritance',
          tags: ['react', 'patterns']
        }
      ]

      searchService.updateIndex('knowledge', knowledge)

      const results = searchService.search('composition')
      expect(results.length).toBe(1)
      expect(results[0].id).toBe('abc123')
      expect(results[0].type).toBe('knowledge')
    })

    it('should replace existing index for a content type', () => {
      const oldIssues: SearchableContent[] = [
        { type: 'issue', id: '1', title: 'Old issue', body: '' }
      ]
      const newIssues: SearchableContent[] = [
        { type: 'issue', id: '2', title: 'New issue', body: '' }
      ]

      searchService.updateIndex('issue', oldIssues)
      searchService.updateIndex('issue', newIssues)

      const oldResults = searchService.search('Old')
      const newResults = searchService.search('New')

      expect(oldResults.length).toBe(0)
      expect(newResults.length).toBe(1)
      expect(newResults[0].id).toBe('2')
    })
  })

  describe('search', () => {
    beforeEach(() => {
      // Set up test data across all content types
      searchService.updateIndex('issue', [
        {
          type: 'issue',
          id: '1',
          title: 'Authentication bug fix',
          body: 'SSO login broken for enterprise users',
          labels: ['bug', 'security']
        },
        {
          type: 'issue',
          id: '2',
          title: 'Add dark mode support',
          body: 'Users want a dark theme option',
          labels: ['feature', 'ui']
        }
      ])

      searchService.updateIndex('plan', [
        {
          type: 'plan',
          id: '10',
          title: 'Authentication overhaul plan',
          body: 'Phase 1: Audit current auth flow'
        }
      ])

      searchService.updateIndex('knowledge', [
        {
          type: 'knowledge',
          id: 'k1',
          title: 'Security best practices',
          body: 'Always validate authentication tokens',
          tags: ['security', 'best-practices']
        }
      ])
    })

    it('should return empty results for empty query', () => {
      const results = searchService.search('')
      expect(results).toEqual([])
    })

    it('should return empty results for whitespace-only query', () => {
      const results = searchService.search('   ')
      expect(results).toEqual([])
    })

    it('should perform case-insensitive matching', () => {
      const results1 = searchService.search('AUTHENTICATION')
      const results2 = searchService.search('authentication')
      const results3 = searchService.search('Authentication')

      expect(results1.length).toBeGreaterThan(0)
      expect(results2.length).toBeGreaterThan(0)
      expect(results3.length).toBeGreaterThan(0)
      expect(results1.length).toBe(results2.length)
      expect(results2.length).toBe(results3.length)
    })

    it('should match title field', () => {
      const results = searchService.search('dark mode')
      expect(results.length).toBe(1)
      expect(results[0].id).toBe('2')
    })

    it('should match body field', () => {
      const results = searchService.search('enterprise users')
      expect(results.length).toBe(1)
      expect(results[0].id).toBe('1')
    })

    it('should match labels', () => {
      const results = searchService.search('security')
      // Should match issue with 'security' label and knowledge with 'security' tag
      expect(results.length).toBe(2)
      const ids = results.map((r) => r.id)
      expect(ids).toContain('1')
      expect(ids).toContain('k1')
    })

    it('should match tags for knowledge entries', () => {
      const results = searchService.search('best-practices')
      expect(results.length).toBe(1)
      expect(results[0].id).toBe('k1')
    })

    it('should search across all content types by default', () => {
      const results = searchService.search('authentication')
      expect(results.length).toBe(3) // issue, plan, and knowledge
    })

    it('should filter by content type when specified', () => {
      const options: SearchOptions = { types: ['issue'] }
      const results = searchService.search('authentication', options)

      expect(results.length).toBe(1)
      expect(results[0].type).toBe('issue')
    })

    it('should filter by multiple content types', () => {
      const options: SearchOptions = { types: ['issue', 'plan'] }
      const results = searchService.search('authentication', options)

      expect(results.length).toBe(2)
      const types = results.map((r) => r.type)
      expect(types).toContain('issue')
      expect(types).toContain('plan')
      expect(types).not.toContain('knowledge')
    })

    it('should respect limit option', () => {
      const options: SearchOptions = { limit: 1 }
      const results = searchService.search('authentication', options)

      expect(results.length).toBe(1)
    })

    it('should return results sorted by score descending', () => {
      // Title match should score higher than body match
      const results = searchService.search('authentication')

      // The results should be sorted by score (descending)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
      }
    })
  })

  describe('scoring', () => {
    beforeEach(() => {
      searchService.updateIndex('issue', [
        {
          type: 'issue',
          id: 'title-match',
          title: 'Database optimization',
          body: 'Improve query performance',
          labels: []
        },
        {
          type: 'issue',
          id: 'body-match',
          title: 'Performance improvements',
          body: 'Database queries are slow',
          labels: []
        },
        {
          type: 'issue',
          id: 'both-match',
          title: 'Database migration',
          body: 'Migrate database schema',
          labels: ['database']
        }
      ])
    })

    it('should score title matches higher than body matches', () => {
      const results = searchService.search('database')

      const titleMatchResult = results.find((r) => r.id === 'title-match')
      const bodyMatchResult = results.find((r) => r.id === 'body-match')

      expect(titleMatchResult).toBeDefined()
      expect(bodyMatchResult).toBeDefined()
      expect(titleMatchResult!.score).toBeGreaterThan(bodyMatchResult!.score)
    })

    it('should score multiple field matches higher', () => {
      const results = searchService.search('database')

      const bothMatchResult = results.find((r) => r.id === 'both-match')
      const titleOnlyMatchResult = results.find((r) => r.id === 'title-match')

      expect(bothMatchResult).toBeDefined()
      expect(titleOnlyMatchResult).toBeDefined()
      // both-match has title + body + label match, title-match has only title
      expect(bothMatchResult!.score).toBeGreaterThan(titleOnlyMatchResult!.score)
    })
  })

  describe('SearchResult fields', () => {
    beforeEach(() => {
      searchService.updateIndex('issue', [
        {
          type: 'issue',
          id: '99',
          title: 'Implement search functionality',
          body: 'Add full-text search with highlighting and preview snippets for better UX',
          labels: ['feature']
        }
      ])
    })

    it('should return properly typed SearchResult', () => {
      const results = searchService.search('search')
      expect(results.length).toBe(1)

      const result = results[0]
      expect(result.type).toBe('issue')
      expect(result.id).toBe('99')
      expect(result.title).toBe('Implement search functionality')
      expect(typeof result.score).toBe('number')
      expect(result.score).toBeGreaterThan(0)
    })

    it('should include preview with match context', () => {
      const results = searchService.search('highlighting')
      expect(results.length).toBe(1)

      const result = results[0]
      expect(result.preview).toBeDefined()
      expect(result.preview.length).toBeGreaterThan(0)
      // Preview should contain some context around the match
      expect(result.preview.toLowerCase()).toContain('highlighting')
    })

    it('should include matches array', () => {
      const results = searchService.search('search')
      expect(results.length).toBe(1)

      const result = results[0]
      expect(result.matches).toBeDefined()
      expect(Array.isArray(result.matches)).toBe(true)
      expect(result.matches.length).toBeGreaterThan(0)
      // Should indicate which fields matched
      expect(result.matches).toContain('title')
      expect(result.matches).toContain('body')
    })
  })

  describe('clearIndex', () => {
    it('should clear all indexed content', () => {
      searchService.updateIndex('issue', [
        { type: 'issue', id: '1', title: 'Test issue', body: '' }
      ])
      searchService.updateIndex('plan', [
        { type: 'plan', id: '1', title: 'Test plan', body: '' }
      ])

      const beforeClear = searchService.search('Test')
      expect(beforeClear.length).toBe(2)

      searchService.clearIndex()

      const afterClear = searchService.search('Test')
      expect(afterClear.length).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('should handle items with missing optional body', () => {
      searchService.updateIndex('issue', [
        { type: 'issue', id: '1', title: 'No body issue' }
      ])

      const results = searchService.search('No body')
      expect(results.length).toBe(1)
      expect(results[0].id).toBe('1')
    })

    it('should handle items with empty labels array', () => {
      searchService.updateIndex('issue', [
        { type: 'issue', id: '1', title: 'Test', body: 'content', labels: [] }
      ])

      const results = searchService.search('Test')
      expect(results.length).toBe(1)
    })

    it('should handle items with missing labels', () => {
      searchService.updateIndex('issue', [
        { type: 'issue', id: '1', title: 'Test', body: 'content' }
      ])

      const results = searchService.search('Test')
      expect(results.length).toBe(1)
    })

    it('should handle items with missing tags', () => {
      searchService.updateIndex('knowledge', [
        { type: 'knowledge', id: '1', title: 'Knowledge item', body: 'content' }
      ])

      const results = searchService.search('Knowledge')
      expect(results.length).toBe(1)
    })

    it('should handle special regex characters in query', () => {
      searchService.updateIndex('issue', [
        { type: 'issue', id: '1', title: 'Fix bug (urgent)', body: 'test[1]' }
      ])

      // These should not throw and should match literally
      const results1 = searchService.search('(urgent)')
      const results2 = searchService.search('[1]')

      expect(results1.length).toBe(1)
      expect(results2.length).toBe(1)
    })

    it('should handle undefined content type in options gracefully', () => {
      searchService.updateIndex('issue', [
        { type: 'issue', id: '1', title: 'Test', body: '' }
      ])

      const options: SearchOptions = { types: undefined }
      const results = searchService.search('Test', options)

      expect(results.length).toBe(1)
    })

    it('should handle empty types array as search all', () => {
      searchService.updateIndex('issue', [
        { type: 'issue', id: '1', title: 'Test', body: '' }
      ])
      searchService.updateIndex('plan', [
        { type: 'plan', id: '2', title: 'Test plan', body: '' }
      ])

      const options: SearchOptions = { types: [] }
      const results = searchService.search('Test', options)

      // Empty types array should search all
      expect(results.length).toBe(2)
    })
  })
})
