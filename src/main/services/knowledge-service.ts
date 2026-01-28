import { join } from 'path'
import { readFile, writeFile, readdir, unlink, mkdir, access, constants } from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'

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
 * Get the knowledge directory path
 */
function getKnowledgePath(projectPath: string): string {
  return join(projectPath, '.tiki', 'knowledge')
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
          const entry = JSON.parse(content) as KnowledgeEntry

          // Apply category filter
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
    console.error('Error listing knowledge entries:', error)
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
    return JSON.parse(content) as KnowledgeEntry
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
    id: uuidv4(),
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
