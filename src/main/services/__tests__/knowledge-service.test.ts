/**
 * Tests for KnowledgeService
 *
 * TDD: Tests written first, then implementation
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { mkdir, rm, writeFile, readdir } from 'fs/promises'
import { tmpdir } from 'os'
import {
  listKnowledgeEntries,
  getKnowledgeEntry,
  createKnowledgeEntry,
  KnowledgeCategory
} from '../knowledge-service'

describe('KnowledgeService', () => {
  let testProjectPath: string

  beforeEach(async () => {
    // Create a unique temp directory for each test
    testProjectPath = join(
      tmpdir(),
      `tiki-knowledge-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
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

  describe('getKnowledgePath - entries subdirectory', () => {
    it('should read from .tiki/knowledge/entries/ directory', async () => {
      // Create the entries subdirectory with a test file
      const entriesPath = join(testProjectPath, '.tiki', 'knowledge', 'entries')
      await mkdir(entriesPath, { recursive: true })

      const testEntry = {
        id: 'test-entry',
        title: 'Test Entry',
        category: 'pattern',
        content: 'Test content',
        tags: ['test'],
        createdAt: '2026-01-28T00:00:00.000Z',
        updatedAt: '2026-01-28T00:00:00.000Z'
      }

      await writeFile(
        join(entriesPath, 'test-entry.json'),
        JSON.stringify(testEntry),
        'utf-8'
      )

      // Call listKnowledgeEntries and verify it finds the entry
      const entries = await listKnowledgeEntries(testProjectPath)

      expect(entries.length).toBe(1)
      expect(entries[0].id).toBe('test-entry')
      expect(entries[0].title).toBe('Test Entry')
    })

    it('should NOT read from .tiki/knowledge/ directory (without entries subdirectory)', async () => {
      // Create the knowledge directory without entries subdirectory
      const knowledgePath = join(testProjectPath, '.tiki', 'knowledge')
      await mkdir(knowledgePath, { recursive: true })

      const testEntry = {
        id: 'wrong-location',
        title: 'Wrong Location Entry',
        category: 'pattern',
        content: 'This should NOT be found',
        tags: [],
        createdAt: '2026-01-28T00:00:00.000Z',
        updatedAt: '2026-01-28T00:00:00.000Z'
      }

      // Put file in wrong location (directly in knowledge, not in entries)
      await writeFile(
        join(knowledgePath, 'wrong-location.json'),
        JSON.stringify(testEntry),
        'utf-8'
      )

      // Call listKnowledgeEntries - should return empty because it looks in entries/
      const entries = await listKnowledgeEntries(testProjectPath)

      expect(entries.length).toBe(0)
    })
  })

  describe('normalizeCategory', () => {
    beforeEach(async () => {
      // Create the entries subdirectory
      const entriesPath = join(testProjectPath, '.tiki', 'knowledge', 'entries')
      await mkdir(entriesPath, { recursive: true })
    })

    it('should normalize "patterns" to "pattern"', async () => {
      const entriesPath = join(testProjectPath, '.tiki', 'knowledge', 'entries')
      const testEntry = {
        id: 'patterns-entry',
        title: 'Patterns Entry',
        category: 'patterns', // plural - should normalize
        content: 'Content',
        tags: [],
        createdAt: '2026-01-28T00:00:00.000Z',
        updatedAt: '2026-01-28T00:00:00.000Z'
      }

      await writeFile(
        join(entriesPath, 'patterns-entry.json'),
        JSON.stringify(testEntry),
        'utf-8'
      )

      const entries = await listKnowledgeEntries(testProjectPath)

      expect(entries.length).toBe(1)
      expect(entries[0].category).toBe('pattern') // normalized to singular
    })

    it('should normalize "architecture" to "pattern"', async () => {
      const entriesPath = join(testProjectPath, '.tiki', 'knowledge', 'entries')
      const testEntry = {
        id: 'architecture-entry',
        title: 'Architecture Entry',
        category: 'architecture', // should normalize to pattern
        content: 'Content',
        tags: [],
        createdAt: '2026-01-28T00:00:00.000Z',
        updatedAt: '2026-01-28T00:00:00.000Z'
      }

      await writeFile(
        join(entriesPath, 'architecture-entry.json'),
        JSON.stringify(testEntry),
        'utf-8'
      )

      const entries = await listKnowledgeEntries(testProjectPath)

      expect(entries.length).toBe(1)
      expect(entries[0].category).toBe('pattern') // normalized
    })

    it('should normalize "troubleshooting" to "gotcha"', async () => {
      const entriesPath = join(testProjectPath, '.tiki', 'knowledge', 'entries')
      const testEntry = {
        id: 'troubleshooting-entry',
        title: 'Troubleshooting Entry',
        category: 'troubleshooting', // should normalize to gotcha
        content: 'Content',
        tags: [],
        createdAt: '2026-01-28T00:00:00.000Z',
        updatedAt: '2026-01-28T00:00:00.000Z'
      }

      await writeFile(
        join(entriesPath, 'troubleshooting-entry.json'),
        JSON.stringify(testEntry),
        'utf-8'
      )

      const entries = await listKnowledgeEntries(testProjectPath)

      expect(entries.length).toBe(1)
      expect(entries[0].category).toBe('gotcha') // normalized
    })

    it('should keep valid categories as-is', async () => {
      const entriesPath = join(testProjectPath, '.tiki', 'knowledge', 'entries')
      const testEntry = {
        id: 'decision-entry',
        title: 'Decision Entry',
        category: 'decision', // already valid
        content: 'Content',
        tags: [],
        createdAt: '2026-01-28T00:00:00.000Z',
        updatedAt: '2026-01-28T00:00:00.000Z'
      }

      await writeFile(
        join(entriesPath, 'decision-entry.json'),
        JSON.stringify(testEntry),
        'utf-8'
      )

      const entries = await listKnowledgeEntries(testProjectPath)

      expect(entries.length).toBe(1)
      expect(entries[0].category).toBe('decision') // unchanged
    })

    it('should fallback unknown categories to the original value', async () => {
      const entriesPath = join(testProjectPath, '.tiki', 'knowledge', 'entries')
      const testEntry = {
        id: 'unknown-entry',
        title: 'Unknown Entry',
        category: 'unknown-category', // unknown
        content: 'Content',
        tags: [],
        createdAt: '2026-01-28T00:00:00.000Z',
        updatedAt: '2026-01-28T00:00:00.000Z'
      }

      await writeFile(
        join(entriesPath, 'unknown-entry.json'),
        JSON.stringify(testEntry),
        'utf-8'
      )

      const entries = await listKnowledgeEntries(testProjectPath)

      expect(entries.length).toBe(1)
      expect(entries[0].category).toBe('learning') // unknown categories default to 'learning'
    })
  })

  describe('getKnowledgeEntry - category normalization', () => {
    beforeEach(async () => {
      const entriesPath = join(testProjectPath, '.tiki', 'knowledge', 'entries')
      await mkdir(entriesPath, { recursive: true })
    })

    it('should normalize category when getting a single entry', async () => {
      const entriesPath = join(testProjectPath, '.tiki', 'knowledge', 'entries')
      const testEntry = {
        id: 'test-entry',
        title: 'Test Entry',
        category: 'patterns', // plural
        content: 'Content',
        tags: [],
        createdAt: '2026-01-28T00:00:00.000Z',
        updatedAt: '2026-01-28T00:00:00.000Z'
      }

      await writeFile(
        join(entriesPath, 'test-entry.json'),
        JSON.stringify(testEntry),
        'utf-8'
      )

      const entry = await getKnowledgeEntry(testProjectPath, 'test-entry')

      expect(entry).not.toBeNull()
      expect(entry!.category).toBe('pattern') // normalized
    })

    it('should normalize architecture to pattern for single entry', async () => {
      const entriesPath = join(testProjectPath, '.tiki', 'knowledge', 'entries')
      const testEntry = {
        id: 'arch-entry',
        title: 'Architecture Entry',
        category: 'architecture',
        content: 'Content',
        tags: [],
        createdAt: '2026-01-28T00:00:00.000Z',
        updatedAt: '2026-01-28T00:00:00.000Z'
      }

      await writeFile(
        join(entriesPath, 'arch-entry.json'),
        JSON.stringify(testEntry),
        'utf-8'
      )

      const entry = await getKnowledgeEntry(testProjectPath, 'arch-entry')

      expect(entry).not.toBeNull()
      expect(entry!.category).toBe('pattern') // normalized
    })

    it('should read single entry from entries subdirectory', async () => {
      const entriesPath = join(testProjectPath, '.tiki', 'knowledge', 'entries')
      const testEntry = {
        id: 'single-entry',
        title: 'Single Entry',
        category: 'learning',
        content: 'Detailed content here',
        tags: ['tag1', 'tag2'],
        createdAt: '2026-01-28T00:00:00.000Z',
        updatedAt: '2026-01-28T00:00:00.000Z'
      }

      await writeFile(
        join(entriesPath, 'single-entry.json'),
        JSON.stringify(testEntry),
        'utf-8'
      )

      const entry = await getKnowledgeEntry(testProjectPath, 'single-entry')

      expect(entry).not.toBeNull()
      expect(entry!.id).toBe('single-entry')
      expect(entry!.title).toBe('Single Entry')
      expect(entry!.content).toBe('Detailed content here')
    })

    it('should return null for non-existent entry', async () => {
      const entry = await getKnowledgeEntry(testProjectPath, 'non-existent')
      expect(entry).toBeNull()
    })
  })

  describe('listKnowledgeEntries - filtering with normalized categories', () => {
    beforeEach(async () => {
      const entriesPath = join(testProjectPath, '.tiki', 'knowledge', 'entries')
      await mkdir(entriesPath, { recursive: true })

      // Create entries with various categories
      const entries = [
        {
          id: 'entry1',
          title: 'Pattern Entry 1',
          category: 'patterns', // Will normalize to 'pattern'
          content: 'Content 1',
          tags: [],
          createdAt: '2026-01-28T00:00:00.000Z',
          updatedAt: '2026-01-28T00:00:00.000Z'
        },
        {
          id: 'entry2',
          title: 'Architecture Entry',
          category: 'architecture', // Will normalize to 'pattern'
          content: 'Content 2',
          tags: [],
          createdAt: '2026-01-28T01:00:00.000Z',
          updatedAt: '2026-01-28T01:00:00.000Z'
        },
        {
          id: 'entry3',
          title: 'Decision Entry',
          category: 'decision',
          content: 'Content 3',
          tags: [],
          createdAt: '2026-01-28T02:00:00.000Z',
          updatedAt: '2026-01-28T02:00:00.000Z'
        }
      ]

      for (const entry of entries) {
        await writeFile(
          join(entriesPath, `${entry.id}.json`),
          JSON.stringify(entry),
          'utf-8'
        )
      }
    })

    it('should filter by normalized category', async () => {
      const entries = await listKnowledgeEntries(testProjectPath, { category: 'pattern' })

      // Should return both 'patterns' and 'architecture' entries (both normalize to 'pattern')
      expect(entries.length).toBe(2)
      expect(entries.every((e) => e.category === 'pattern')).toBe(true)
    })

    it('should filter by non-normalized category', async () => {
      const entries = await listKnowledgeEntries(testProjectPath, { category: 'decision' })

      expect(entries.length).toBe(1)
      expect(entries[0].id).toBe('entry3')
      expect(entries[0].category).toBe('decision')
    })
  })

  describe('listKnowledgeEntries - handles edge cases', () => {
    beforeEach(async () => {
      const entriesPath = join(testProjectPath, '.tiki', 'knowledge', 'entries')
      await mkdir(entriesPath, { recursive: true })
    })

    it('should default missing category to learning', async () => {
      const entriesPath = join(testProjectPath, '.tiki', 'knowledge', 'entries')
      const testEntry = {
        id: 'no-category',
        title: 'No Category Entry',
        // category is missing
        content: 'Content',
        tags: [],
        createdAt: '2026-01-28T00:00:00.000Z'
      }

      await writeFile(
        join(entriesPath, 'no-category.json'),
        JSON.stringify(testEntry),
        'utf-8'
      )

      const entries = await listKnowledgeEntries(testProjectPath)

      expect(entries.length).toBe(1)
      expect(entries[0].category).toBe('learning')
    })

    it('should convert object content to JSON string', async () => {
      const entriesPath = join(testProjectPath, '.tiki', 'knowledge', 'entries')
      const testEntry = {
        id: 'object-content',
        title: 'Object Content Entry',
        category: 'pattern',
        content: { problem: 'Some problem', solution: 'Some solution' },
        tags: [],
        createdAt: '2026-01-28T00:00:00.000Z'
      }

      await writeFile(
        join(entriesPath, 'object-content.json'),
        JSON.stringify(testEntry),
        'utf-8'
      )

      const entries = await listKnowledgeEntries(testProjectPath)

      expect(entries.length).toBe(1)
      expect(typeof entries[0].content).toBe('string')
      expect(entries[0].content).toContain('problem')
      expect(entries[0].content).toContain('solution')
    })

    it('should fallback to createdAt when updatedAt is missing', async () => {
      const entriesPath = join(testProjectPath, '.tiki', 'knowledge', 'entries')
      const testEntry = {
        id: 'no-updated',
        title: 'No UpdatedAt Entry',
        category: 'pattern',
        content: 'Content',
        tags: [],
        createdAt: '2026-01-28T12:00:00.000Z'
        // updatedAt is missing
      }

      await writeFile(
        join(entriesPath, 'no-updated.json'),
        JSON.stringify(testEntry),
        'utf-8'
      )

      const entries = await listKnowledgeEntries(testProjectPath)

      expect(entries.length).toBe(1)
      expect(entries[0].updatedAt).toBe('2026-01-28T12:00:00.000Z')
    })

    it('should handle missing tags by defaulting to empty array', async () => {
      const entriesPath = join(testProjectPath, '.tiki', 'knowledge', 'entries')
      const testEntry = {
        id: 'no-tags',
        title: 'No Tags Entry',
        category: 'pattern',
        content: 'Content',
        // tags is missing
        createdAt: '2026-01-28T00:00:00.000Z'
      }

      await writeFile(
        join(entriesPath, 'no-tags.json'),
        JSON.stringify(testEntry),
        'utf-8'
      )

      const entries = await listKnowledgeEntries(testProjectPath)

      expect(entries.length).toBe(1)
      expect(Array.isArray(entries[0].tags)).toBe(true)
      expect(entries[0].tags.length).toBe(0)
    })
  })

  describe('createKnowledgeEntry - writes to entries subdirectory', () => {
    it('should create entry in entries subdirectory', async () => {
      const entry = await createKnowledgeEntry(testProjectPath, {
        title: 'New Entry',
        category: 'learning',
        content: 'New content',
        tags: ['new']
      })

      expect(entry.id).toBeDefined()
      expect(entry.title).toBe('New Entry')
      expect(entry.category).toBe('learning')

      // Verify file was created in entries subdirectory
      const entriesPath = join(testProjectPath, '.tiki', 'knowledge', 'entries')
      const files = await readdir(entriesPath)
      expect(files.some((f) => f.includes(entry.id))).toBe(true)
    })
  })
})
