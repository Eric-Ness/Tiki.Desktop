/**
 * Template Service
 *
 * Manages plan templates for reusable execution patterns.
 * Supports CRUD operations, usage tracking, and template search.
 */
import { join } from 'path'
import { readFile, writeFile, readdir, unlink, mkdir, access, constants } from 'fs/promises'
import { randomUUID } from 'crypto'

/**
 * Template variable type
 */
export type VariableType = 'string' | 'file' | 'component' | 'number'

/**
 * Template category
 */
export type TemplateCategory = 'issue_type' | 'component' | 'workflow' | 'custom'

/**
 * Variable definition for a template
 */
export interface TemplateVariable {
  /** Variable name (used in ${name} placeholders) */
  name: string
  /** Description of what this variable represents */
  description: string
  /** Type of the variable */
  type: VariableType
  /** Default value if not provided */
  defaultValue?: string
  /** Whether this variable must be provided */
  required: boolean
}

/**
 * Phase template within a plan template
 */
export interface PhaseTemplate {
  /** Phase title (can contain ${variables}) */
  title: string
  /** Phase content/instructions */
  content: string
  /** File patterns this phase typically affects */
  filePatterns: string[]
  /** Verification steps for this phase */
  verification: string[]
}

/**
 * Match criteria for suggesting templates
 */
export interface MatchCriteria {
  /** Keywords that suggest this template */
  keywords: string[]
  /** GitHub labels that match this template */
  labels: string[]
  /** File patterns that suggest this template */
  filePatterns: string[]
}

/**
 * Plan template for reusable execution patterns
 */
export interface PlanTemplate {
  /** Unique identifier */
  id: string
  /** Human-readable name */
  name: string
  /** Description of what this template does */
  description: string
  /** Template category */
  category: TemplateCategory
  /** Tags for organization and search */
  tags: string[]
  /** Phase templates */
  phases: PhaseTemplate[]
  /** Variable definitions */
  variables: TemplateVariable[]
  /** Criteria for auto-suggesting this template */
  matchCriteria: MatchCriteria
  /** Issue this template was derived from (if any) */
  sourceIssue?: number
  /** Number of successful executions */
  successCount: number
  /** Number of failed executions */
  failureCount: number
  /** Last time this template was used */
  lastUsed?: string
  /** When the template was created */
  createdAt: string
  /** When the template was last modified */
  updatedAt: string
}

/**
 * Filter options for listing templates
 */
export interface TemplateFilter {
  /** Filter by category */
  category?: TemplateCategory
  /** Filter by tags (any match) */
  tags?: string[]
}

/**
 * Input for creating a new template
 */
export interface CreateTemplateInput {
  name: string
  description: string
  category: TemplateCategory
  tags: string[]
  phases: PhaseTemplate[]
  variables: TemplateVariable[]
  matchCriteria: MatchCriteria
  sourceIssue?: number
}

/**
 * Input for updating a template
 */
export interface UpdateTemplateInput {
  name?: string
  description?: string
  category?: TemplateCategory
  tags?: string[]
  phases?: PhaseTemplate[]
  variables?: TemplateVariable[]
  matchCriteria?: MatchCriteria
  sourceIssue?: number | null
}

/**
 * Get the templates directory path
 */
function getTemplatesPath(projectPath: string): string {
  return join(projectPath, '.tiki', 'templates')
}

/**
 * Get the file path for a specific template
 */
function getTemplateFilePath(projectPath: string, id: string): string {
  return join(getTemplatesPath(projectPath), `${id}.json`)
}

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
 * Ensure the templates directory exists
 */
async function ensureTemplatesDir(projectPath: string): Promise<void> {
  const templatesPath = getTemplatesPath(projectPath)
  if (!(await pathExists(templatesPath))) {
    await mkdir(templatesPath, { recursive: true })
  }
}

/**
 * Template Service
 *
 * Provides CRUD operations for plan templates, usage tracking,
 * and search functionality.
 */
export class TemplateService {
  /**
   * Create a new template
   *
   * @param projectPath The project path
   * @param input Template data
   * @returns The created template
   */
  async createTemplate(projectPath: string, input: CreateTemplateInput): Promise<PlanTemplate> {
    await ensureTemplatesDir(projectPath)

    const now = new Date().toISOString()
    const template: PlanTemplate = {
      id: randomUUID(),
      name: input.name,
      description: input.description,
      category: input.category,
      tags: input.tags,
      phases: input.phases,
      variables: input.variables,
      matchCriteria: input.matchCriteria,
      sourceIssue: input.sourceIssue,
      successCount: 0,
      failureCount: 0,
      createdAt: now,
      updatedAt: now
    }

    const filePath = getTemplateFilePath(projectPath, template.id)
    await writeFile(filePath, JSON.stringify(template, null, 2), 'utf-8')

    return template
  }

  /**
   * Get a template by ID
   *
   * @param projectPath The project path
   * @param id Template ID
   * @returns The template or null if not found
   */
  async getTemplate(projectPath: string, id: string): Promise<PlanTemplate | null> {
    const filePath = getTemplateFilePath(projectPath, id)

    try {
      if (!(await pathExists(filePath))) {
        return null
      }
      const content = await readFile(filePath, 'utf-8')
      return JSON.parse(content) as PlanTemplate
    } catch {
      return null
    }
  }

  /**
   * List all templates with optional filtering
   *
   * @param projectPath The project path
   * @param filter Optional filter criteria
   * @returns Array of templates
   */
  async listTemplates(projectPath: string, filter?: TemplateFilter): Promise<PlanTemplate[]> {
    const templatesPath = getTemplatesPath(projectPath)

    if (!(await pathExists(templatesPath))) {
      return []
    }

    try {
      const files = await readdir(templatesPath)
      const templates: PlanTemplate[] = []

      for (const file of files) {
        if (file.endsWith('.json') && !file.startsWith('.')) {
          try {
            const filePath = join(templatesPath, file)
            const content = await readFile(filePath, 'utf-8')
            const template = JSON.parse(content) as PlanTemplate

            // Apply category filter
            if (filter?.category && template.category !== filter.category) {
              continue
            }

            // Apply tags filter (any match)
            if (filter?.tags && filter.tags.length > 0) {
              const hasMatchingTag = filter.tags.some((tag) =>
                template.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
              )
              if (!hasMatchingTag) {
                continue
              }
            }

            templates.push(template)
          } catch {
            // Skip invalid files
          }
        }
      }

      // Sort by updatedAt descending
      templates.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )

      return templates
    } catch {
      return []
    }
  }

  /**
   * Update an existing template
   *
   * @param projectPath The project path
   * @param id Template ID
   * @param updates Partial updates to apply
   * @returns The updated template or null if not found
   */
  async updateTemplate(
    projectPath: string,
    id: string,
    updates: UpdateTemplateInput
  ): Promise<PlanTemplate | null> {
    const existing = await this.getTemplate(projectPath, id)
    if (!existing) {
      return null
    }

    const updated: PlanTemplate = {
      ...existing,
      ...updates,
      id: existing.id, // Ensure ID cannot be changed
      createdAt: existing.createdAt, // Ensure createdAt cannot be changed
      updatedAt: new Date().toISOString()
    }

    // Handle null sourceIssue (removal)
    if (updates.sourceIssue === null) {
      delete updated.sourceIssue
    }

    const filePath = getTemplateFilePath(projectPath, id)
    await writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8')

    return updated
  }

  /**
   * Delete a template
   *
   * @param projectPath The project path
   * @param id Template ID
   * @returns True if deleted, false if not found
   */
  async deleteTemplate(projectPath: string, id: string): Promise<boolean> {
    const filePath = getTemplateFilePath(projectPath, id)

    try {
      if (!(await pathExists(filePath))) {
        return false
      }
      await unlink(filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Record template usage (success or failure)
   *
   * @param projectPath The project path
   * @param id Template ID
   * @param success Whether the execution was successful
   */
  async recordUsage(projectPath: string, id: string, success: boolean): Promise<void> {
    const template = await this.getTemplate(projectPath, id)
    if (!template) {
      return
    }

    if (success) {
      template.successCount++
    } else {
      template.failureCount++
    }
    template.lastUsed = new Date().toISOString()
    template.updatedAt = template.lastUsed

    const filePath = getTemplateFilePath(projectPath, id)
    await writeFile(filePath, JSON.stringify(template, null, 2), 'utf-8')
  }

  /**
   * Search templates by query string
   *
   * Searches across name, description, tags, and match criteria keywords
   *
   * @param projectPath The project path
   * @param query Search query
   * @returns Matching templates
   */
  async searchTemplates(projectPath: string, query: string): Promise<PlanTemplate[]> {
    const templates = await this.listTemplates(projectPath)

    if (!query || query.trim() === '') {
      return templates
    }

    const queryLower = query.toLowerCase()

    return templates.filter((template) => {
      // Search in name
      if (template.name.toLowerCase().includes(queryLower)) {
        return true
      }

      // Search in description
      if (template.description.toLowerCase().includes(queryLower)) {
        return true
      }

      // Search in tags
      if (template.tags.some((tag) => tag.toLowerCase().includes(queryLower))) {
        return true
      }

      // Search in match criteria keywords
      if (template.matchCriteria.keywords.some((kw) => kw.toLowerCase().includes(queryLower))) {
        return true
      }

      return false
    })
  }
}

/** Singleton instance */
export const templateService = new TemplateService()
