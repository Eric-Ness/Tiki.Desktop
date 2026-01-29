import { ipcMain } from 'electron'
import {
  templateService,
  PlanTemplate,
  TemplateFilter,
  CreateTemplateInput,
  UpdateTemplateInput,
  PhaseTemplate,
  TemplateVariable,
  MatchCriteria,
  TemplateCategory
} from '../services/template-service'
import { variableExtractor, ExecutionPlan } from '../services/variable-extractor'

/**
 * Template suggestion result
 */
export interface TemplateSuggestion {
  template: PlanTemplate
  matchScore: number
  matchReasons: string[]
}

/**
 * Applied template result (a generated plan)
 */
export interface AppliedTemplate {
  issueNumber: number
  phases: Array<{
    number: number
    title: string
    content: string
    filePatterns: string[]
    verification: string[]
  }>
  sourceTemplateId: string
  variablesUsed: Record<string, string>
}

/**
 * Register IPC handlers for template operations
 */
export function registerTemplateHandlers(): void {
  // List templates with optional filter
  ipcMain.handle(
    'templates:list',
    async (
      _,
      { projectPath, filter }: { projectPath: string; filter?: TemplateFilter }
    ): Promise<PlanTemplate[]> => {
      return templateService.listTemplates(projectPath, filter)
    }
  )

  // Get template by ID
  ipcMain.handle(
    'templates:get',
    async (
      _,
      { projectPath, id }: { projectPath: string; id: string }
    ): Promise<PlanTemplate | null> => {
      return templateService.getTemplate(projectPath, id)
    }
  )

  // Create new template
  ipcMain.handle(
    'templates:create',
    async (
      _,
      { projectPath, input }: { projectPath: string; input: CreateTemplateInput }
    ): Promise<PlanTemplate> => {
      return templateService.createTemplate(projectPath, input)
    }
  )

  // Create template from existing plan
  ipcMain.handle(
    'templates:create-from-plan',
    async (
      _,
      {
        projectPath,
        plan,
        name,
        description,
        category,
        tags
      }: {
        projectPath: string
        plan: ExecutionPlan
        name: string
        description: string
        category: TemplateCategory
        tags: string[]
      }
    ): Promise<PlanTemplate> => {
      // Extract variables from the plan
      const variables = variableExtractor.extractVariables(plan)

      // Convert plan phases to phase templates
      const phaseTemplates: PhaseTemplate[] = plan.phases.map((phase) => ({
        title: phase.title,
        content: phase.summary || '',
        filePatterns: phase.files,
        verification: phase.verification
      }))

      // Build match criteria from plan content
      const matchCriteria: MatchCriteria = {
        keywords: extractKeywords(plan),
        labels: [],
        filePatterns: plan.phases.flatMap((p) => p.files)
      }

      const input: CreateTemplateInput = {
        name,
        description,
        category,
        tags,
        phases: phaseTemplates,
        variables,
        matchCriteria,
        sourceIssue: plan.issue.number
      }

      return templateService.createTemplate(projectPath, input)
    }
  )

  // Update template
  ipcMain.handle(
    'templates:update',
    async (
      _,
      {
        projectPath,
        id,
        updates
      }: { projectPath: string; id: string; updates: UpdateTemplateInput }
    ): Promise<PlanTemplate | null> => {
      return templateService.updateTemplate(projectPath, id, updates)
    }
  )

  // Delete template
  ipcMain.handle(
    'templates:delete',
    async (_, { projectPath, id }: { projectPath: string; id: string }): Promise<boolean> => {
      return templateService.deleteTemplate(projectPath, id)
    }
  )

  // Apply template with variables to create plan
  ipcMain.handle(
    'templates:apply',
    async (
      _,
      {
        projectPath,
        templateId,
        variables,
        issueNumber
      }: {
        projectPath: string
        templateId: string
        variables: Record<string, string>
        issueNumber: number
      }
    ): Promise<AppliedTemplate | null> => {
      const template = await templateService.getTemplate(projectPath, templateId)
      if (!template) {
        return null
      }

      // Apply variable substitution to all template fields
      const appliedPhases = template.phases.map((phase, index) => ({
        number: index + 1,
        title: variableExtractor.substituteVariables(phase.title, variables),
        content: variableExtractor.substituteVariables(phase.content, variables),
        filePatterns: phase.filePatterns.map((p) =>
          variableExtractor.substituteVariables(p, variables)
        ),
        verification: phase.verification.map((v) =>
          variableExtractor.substituteVariables(v, variables)
        )
      }))

      return {
        issueNumber,
        phases: appliedPhases,
        sourceTemplateId: templateId,
        variablesUsed: variables
      }
    }
  )

  // Get template suggestions for an issue
  ipcMain.handle(
    'templates:suggest',
    async (
      _,
      {
        projectPath,
        issueTitle,
        issueBody,
        issueLabels
      }: {
        projectPath: string
        issueTitle: string
        issueBody?: string
        issueLabels?: string[]
      }
    ): Promise<TemplateSuggestion[]> => {
      const templates = await templateService.listTemplates(projectPath)
      const suggestions: TemplateSuggestion[] = []

      const issueText = `${issueTitle} ${issueBody || ''}`.toLowerCase()
      const labels = issueLabels || []

      for (const template of templates) {
        let matchScore = 0
        const matchReasons: string[] = []

        // Check keyword matches
        for (const keyword of template.matchCriteria.keywords) {
          if (issueText.includes(keyword.toLowerCase())) {
            matchScore += 10
            matchReasons.push(`Keyword match: "${keyword}"`)
          }
        }

        // Check label matches
        for (const label of template.matchCriteria.labels) {
          if (labels.some((l) => l.toLowerCase() === label.toLowerCase())) {
            matchScore += 15
            matchReasons.push(`Label match: "${label}"`)
          }
        }

        // Check tag matches against labels
        for (const tag of template.tags) {
          if (labels.some((l) => l.toLowerCase() === tag.toLowerCase())) {
            matchScore += 8
            matchReasons.push(`Tag match: "${tag}"`)
          }
        }

        // Boost score based on success rate
        if (template.successCount > 0) {
          const successRate =
            template.successCount / (template.successCount + template.failureCount)
          if (successRate >= 0.8) {
            matchScore += 10
            matchReasons.push(`High success rate: ${Math.round(successRate * 100)}%`)
          }
        }

        // Boost recently used templates
        if (template.lastUsed) {
          const daysSinceLastUse =
            (Date.now() - new Date(template.lastUsed).getTime()) / (1000 * 60 * 60 * 24)
          if (daysSinceLastUse < 7) {
            matchScore += 5
            matchReasons.push('Recently used')
          }
        }

        if (matchScore > 0) {
          suggestions.push({
            template,
            matchScore,
            matchReasons
          })
        }
      }

      // Sort by match score descending
      suggestions.sort((a, b) => b.matchScore - a.matchScore)

      return suggestions
    }
  )

  // Record template usage success/failure
  ipcMain.handle(
    'templates:record-usage',
    async (
      _,
      { projectPath, id, success }: { projectPath: string; id: string; success: boolean }
    ): Promise<void> => {
      return templateService.recordUsage(projectPath, id, success)
    }
  )

  // Export template as JSON
  ipcMain.handle(
    'templates:export',
    async (
      _,
      { projectPath, id }: { projectPath: string; id: string }
    ): Promise<{ json: string; template: PlanTemplate } | null> => {
      const template = await templateService.getTemplate(projectPath, id)
      if (!template) {
        return null
      }

      // Create a clean export version without usage stats
      const exportTemplate = {
        ...template,
        id: undefined, // Will be regenerated on import
        successCount: 0,
        failureCount: 0,
        lastUsed: undefined,
        createdAt: undefined,
        updatedAt: undefined
      }

      return {
        json: JSON.stringify(exportTemplate, null, 2),
        template
      }
    }
  )

  // Import template from JSON
  ipcMain.handle(
    'templates:import',
    async (
      _,
      { projectPath, json }: { projectPath: string; json: string }
    ): Promise<{ success: boolean; template?: PlanTemplate; error?: string }> => {
      try {
        const imported = JSON.parse(json)

        // Validate required fields
        if (!imported.name || !imported.phases || !Array.isArray(imported.phases)) {
          return { success: false, error: 'Invalid template format: missing name or phases' }
        }

        // Create input from imported data
        const input: CreateTemplateInput = {
          name: imported.name,
          description: imported.description || '',
          category: imported.category || 'custom',
          tags: imported.tags || [],
          phases: imported.phases,
          variables: imported.variables || [],
          matchCriteria: imported.matchCriteria || { keywords: [], labels: [], filePatterns: [] },
          sourceIssue: imported.sourceIssue
        }

        const template = await templateService.createTemplate(projectPath, input)
        return { success: true, template }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to parse template JSON'
        }
      }
    }
  )

  // Extract variables from a plan
  ipcMain.handle(
    'templates:extract-variables',
    async (_, { plan }: { plan: ExecutionPlan }): Promise<TemplateVariable[]> => {
      return variableExtractor.extractVariables(plan)
    }
  )
}

/**
 * Extract keywords from a plan for match criteria
 */
function extractKeywords(plan: ExecutionPlan): string[] {
  const keywords = new Set<string>()

  // Extract from issue title
  const titleWords = plan.issue.title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4)

  for (const word of titleWords) {
    if (!isCommonWord(word)) {
      keywords.add(word)
    }
  }

  // Extract from phase titles
  for (const phase of plan.phases) {
    const phaseWords = phase.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4)

    for (const word of phaseWords) {
      if (!isCommonWord(word)) {
        keywords.add(word)
      }
    }
  }

  return Array.from(keywords).slice(0, 10) // Limit to 10 keywords
}

/**
 * Check if a word is common and should be excluded from keywords
 */
function isCommonWord(word: string): boolean {
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
