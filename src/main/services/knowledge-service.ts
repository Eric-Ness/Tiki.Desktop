import { join } from 'path'
import { readFile, writeFile, readdir, unlink, mkdir, access, constants } from 'fs/promises'
import { randomUUID } from 'crypto'
import { logger } from './logger'

export type KnowledgeCategory = 'pattern' | 'gotcha' | 'decision' | 'learning'

export interface KnowledgeEntry {
  id: string
  title: string
  category: KnowledgeCategory
  content: string
  tags: string[]
  sourceIssue?: number
  createdAt: string
  updatedAt: string
}

/**
 * Normalize category from stored format to UI format
 * Maps plural/alternative categories to the expected UI categories
 * Falls back to 'learning' for missing or unknown categories
 */
function normalizeCategory(category: string | undefined): KnowledgeCategory {
  if (!category) {
    return 'learning' // Default for missing category
  }
  const categoryMap: Record<string, KnowledgeCategory> = {
    patterns: 'pattern',
    architecture: 'pattern',
    troubleshooting: 'gotcha'
  }
  const normalized = categoryMap[category]
  if (normalized) {
    return normalized
  }
  // Check if it's already a valid category
  const validCategories: KnowledgeCategory[] = ['pattern', 'gotcha', 'decision', 'learning']
  if (validCategories.includes(category as KnowledgeCategory)) {
    return category as KnowledgeCategory
  }
  return 'learning' // Default fallback for unknown categories
}

/**
 * Get the knowledge directory path
 */
function getKnowledgePath(projectPath: string): string {
  return join(projectPath, '.tiki', 'knowledge', 'entries')
}

/**
 * Check if a directory exists
 */
async function dirExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Ensure the knowledge directory exists
 */
async function ensureKnowledgeDir(projectPath: string): Promise<void> {
  const knowledgePath = getKnowledgePath(projectPath)
  if (!(await dirExists(knowledgePath))) {
    await mkdir(knowledgePath, { recursive: true })
  }
}

/**
 * List all knowledge entries
 */
export async function listKnowledgeEntries(
  projectPath: string,
  options?: {
    category?: KnowledgeCategory
    search?: string
  }
): Promise<KnowledgeEntry[]> {
  const knowledgePath = getKnowledgePath(projectPath)

  if (!(await dirExists(knowledgePath))) {
    return []
  }

  try {
    const files = await readdir(knowledgePath)
    const entries: KnowledgeEntry[] = []

    for (const file of files) {
      if (file.endsWith('.json') && !file.startsWith('.')) {
        try {
          const filePath = join(knowledgePath, file)
          const content = await readFile(filePath, 'utf-8')
          const rawEntry = JSON.parse(content)
          // Normalize the entry to expected format
          const entry: KnowledgeEntry = {
            ...rawEntry,
            category: normalizeCategory(rawEntry.category),
            // Ensure content is a string (some entries have object content)
            content: typeof rawEntry.content === 'object'
              ? JSON.stringify(rawEntry.content, null, 2)
              : rawEntry.content || '',
            // Ensure tags is an array
            tags: Array.isArray(rawEntry.tags) ? rawEntry.tags : [],
            // Fallback for missing updatedAt
            updatedAt: rawEntry.updatedAt || rawEntry.createdAt || new Date().toISOString()
          }

          // Apply category filter (after normalization)
          if (options?.category && entry.category !== options.category) {
            continue
          }

          // Apply search filter
          if (options?.search) {
            const searchLower = options.search.toLowerCase()
            const matchesTitle = entry.title.toLowerCase().includes(searchLower)
            const matchesContent = entry.content.toLowerCase().includes(searchLower)
            const matchesTags = entry.tags.some((t) => t.toLowerCase().includes(searchLower))
            if (!matchesTitle && !matchesContent && !matchesTags) {
              continue
            }
          }

          entries.push(entry)
        } catch {
          // Skip invalid files
        }
      }
    }

    // Sort by updatedAt descending
    entries.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )

    return entries
  } catch (error) {
    logger.error('Error listing knowledge entries:', error)
    return []
  }
}

/**
 * Get a single knowledge entry by ID
 */
export async function getKnowledgeEntry(
  projectPath: string,
  id: string
): Promise<KnowledgeEntry | null> {
  const filePath = join(getKnowledgePath(projectPath), `${id}.json`)

  try {
    const content = await readFile(filePath, 'utf-8')
    const rawEntry = JSON.parse(content)
    // Normalize the entry to expected format
    return {
      ...rawEntry,
      category: normalizeCategory(rawEntry.category),
      // Ensure content is a string (some entries have object content)
      content: typeof rawEntry.content === 'object'
        ? JSON.stringify(rawEntry.content, null, 2)
        : rawEntry.content || '',
      // Ensure tags is an array
      tags: Array.isArray(rawEntry.tags) ? rawEntry.tags : [],
      // Fallback for missing updatedAt
      updatedAt: rawEntry.updatedAt || rawEntry.createdAt || new Date().toISOString()
    } as KnowledgeEntry
  } catch {
    return null
  }
}

/**
 * Create a new knowledge entry
 */
export async function createKnowledgeEntry(
  projectPath: string,
  data: {
    title: string
    category: KnowledgeCategory
    content: string
    tags?: string[]
    sourceIssue?: number
  }
): Promise<KnowledgeEntry> {
  await ensureKnowledgeDir(projectPath)

  const now = new Date().toISOString()
  const entry: KnowledgeEntry = {
    id: randomUUID(),
    title: data.title,
    category: data.category,
    content: data.content,
    tags: data.tags || [],
    sourceIssue: data.sourceIssue,
    createdAt: now,
    updatedAt: now
  }

  const filePath = join(getKnowledgePath(projectPath), `${entry.id}.json`)
  await writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8')

  return entry
}

/**
 * Update an existing knowledge entry
 */
export async function updateKnowledgeEntry(
  projectPath: string,
  id: string,
  data: Partial<{
    title: string
    category: KnowledgeCategory
    content: string
    tags: string[]
    sourceIssue: number | null
  }>
): Promise<KnowledgeEntry | null> {
  const existing = await getKnowledgeEntry(projectPath, id)
  if (!existing) {
    return null
  }

  const updated: KnowledgeEntry = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString()
  }

  // Handle null sourceIssue (removal)
  if (data.sourceIssue === null) {
    delete updated.sourceIssue
  }

  const filePath = join(getKnowledgePath(projectPath), `${id}.json`)
  await writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8')

  return updated
}

/**
 * Delete a knowledge entry
 */
export async function deleteKnowledgeEntry(
  projectPath: string,
  id: string
): Promise<boolean> {
  const filePath = join(getKnowledgePath(projectPath), `${id}.json`)

  try {
    await unlink(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Get all unique tags from knowledge entries
 */
export async function getKnowledgeTags(projectPath: string): Promise<string[]> {
  const entries = await listKnowledgeEntries(projectPath)
  const tagSet = new Set<string>()

  for (const entry of entries) {
    for (const tag of entry.tags) {
      tagSet.add(tag)
    }
  }

  return Array.from(tagSet).sort()
}
