import { useState, useEffect, useCallback, useRef } from 'react'
import { useTikiStore } from '../../stores/tiki-store'

type TemplateCategory = 'issue_type' | 'component' | 'workflow' | 'custom'

interface TemplateVariable {
  name: string
  description: string
  type: 'string' | 'file' | 'component' | 'number'
  defaultValue?: string
  required: boolean
}

interface PhaseTemplate {
  title: string
  content: string
  filePatterns: string[]
  verification: string[]
}

interface MatchCriteria {
  keywords: string[]
  labels: string[]
  filePatterns: string[]
}

interface PlanTemplate {
  id: string
  name: string
  description: string
  category: TemplateCategory
  tags: string[]
  phases: PhaseTemplate[]
  variables: TemplateVariable[]
  matchCriteria: MatchCriteria
  sourceIssue?: number
  successCount: number
  failureCount: number
  lastUsed?: string
  createdAt: string
  updatedAt: string
}

const categoryColors: Record<TemplateCategory, string> = {
  issue_type: 'bg-blue-600 text-blue-100',
  component: 'bg-green-600 text-green-100',
  workflow: 'bg-purple-600 text-purple-100',
  custom: 'bg-amber-600 text-amber-100'
}

const categoryLabels: Record<TemplateCategory, string> = {
  issue_type: 'Issue Type',
  component: 'Component',
  workflow: 'Workflow',
  custom: 'Custom'
}

interface TemplateListProps {
  onSelect: (template: PlanTemplate) => void
  onCreateNew?: () => void
  onImport?: (template: PlanTemplate) => void
}

/**
 * Calculate success rate percentage
 */
function getSuccessRate(template: PlanTemplate): number | null {
  const total = template.successCount + template.failureCount
  if (total === 0) return null
  return Math.round((template.successCount / total) * 100)
}

/**
 * Get color class for success rate badge
 */
function getSuccessRateColor(rate: number | null): string {
  if (rate === null) return 'bg-slate-600 text-slate-300'
  if (rate >= 80) return 'bg-green-600 text-green-100'
  if (rate >= 50) return 'bg-amber-600 text-amber-100'
  return 'bg-red-600 text-red-100'
}

export function TemplateList({ onSelect, onCreateNew, onImport }: TemplateListProps) {
  const activeProject = useTikiStore((state) => state.activeProject)
  const [templates, setTemplates] = useState<PlanTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>('all')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load templates
  const loadTemplates = useCallback(async () => {
    if (!activeProject?.path) {
      setTemplates([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const filter = categoryFilter !== 'all' ? { category: categoryFilter } : undefined
      const loaded = await window.tikiDesktop.templates.list(activeProject.path, filter)

      // Filter by search term locally
      const filtered = search
        ? loaded.filter((t) =>
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.description.toLowerCase().includes(search.toLowerCase()) ||
            t.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
          )
        : loaded

      setTemplates(filtered)
    } catch (err) {
      console.error('Failed to load templates:', err)
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [activeProject?.path, categoryFilter, search])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const handleSelectTemplate = (template: PlanTemplate) => {
    setSelectedTemplateId(template.id)
    onSelect(template)
  }

  // Handle file import
  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !activeProject?.path) return

    setImportError(null)

    try {
      const json = await file.text()
      const result = await window.tikiDesktop.templates.import(activeProject.path, json)

      if (result.success && result.template) {
        // Refresh the list
        loadTemplates()
        // Notify parent if callback provided
        onImport?.(result.template)
      } else {
        setImportError(result.error || 'Failed to import template')
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to read file')
    }

    // Reset the input so the same file can be selected again
    event.target.value = ''
  }

  // Group templates by category
  const groupedTemplates = templates.reduce<Record<TemplateCategory, PlanTemplate[]>>(
    (acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = []
      }
      acc[template.category].push(template)
      return acc
    },
    {} as Record<TemplateCategory, PlanTemplate[]>
  )

  // No project
  if (!activeProject) {
    return (
      <div className="p-3 text-center text-slate-500 text-xs">
        No project selected
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search and filters */}
      <div className="p-2 border-b border-border/50 space-y-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates..."
          className="w-full px-2 py-1 text-xs bg-background-tertiary border border-border rounded outline-none focus:border-amber-500 text-slate-200 placeholder-slate-500"
        />
        <div className="flex flex-wrap gap-1">
          <FilterButton
            active={categoryFilter === 'all'}
            onClick={() => setCategoryFilter('all')}
          >
            All
          </FilterButton>
          {(Object.keys(categoryLabels) as TemplateCategory[]).map((cat) => (
            <FilterButton
              key={cat}
              active={categoryFilter === cat}
              onClick={() => setCategoryFilter(cat)}
            >
              {categoryLabels[cat]}
            </FilterButton>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="p-2 border-b border-border/50 space-y-2">
        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Template
          </button>
        )}
        <button
          onClick={handleImportClick}
          className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-background-tertiary hover:bg-slate-600 text-slate-300 rounded transition-colors border border-border/50"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Import Template
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
        {importError && (
          <div className="text-[10px] text-red-400 px-1">
            {importError}
          </div>
        )}
      </div>

      {/* Template list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 text-center text-slate-500 text-xs">
            Loading...
          </div>
        ) : templates.length === 0 ? (
          <div className="p-4 text-center">
            <div className="text-slate-500 text-xs mb-2">
              {search || categoryFilter !== 'all'
                ? 'No matching templates'
                : 'No templates yet'}
            </div>
            {!search && categoryFilter === 'all' && (
              <p className="text-slate-600 text-[10px]">
                Create templates from successful execution plans to reuse patterns.
              </p>
            )}
          </div>
        ) : categoryFilter !== 'all' ? (
          // Show flat list when filtering by category
          <div className="divide-y divide-border/30">
            {templates.map((template) => (
              <TemplateListItem
                key={template.id}
                template={template}
                selected={selectedTemplateId === template.id}
                onSelect={handleSelectTemplate}
              />
            ))}
          </div>
        ) : (
          // Show grouped by category when showing all
          <div className="divide-y divide-border/50">
            {(Object.keys(categoryLabels) as TemplateCategory[]).map((category) => {
              const categoryTemplates = groupedTemplates[category]
              if (!categoryTemplates || categoryTemplates.length === 0) return null

              return (
                <div key={category}>
                  <div className="px-2 py-1.5 bg-background-secondary/50 text-xs font-medium text-slate-400 sticky top-0">
                    {categoryLabels[category]}
                    <span className="ml-1 text-slate-500">
                      ({categoryTemplates.length})
                    </span>
                  </div>
                  <div className="divide-y divide-border/30">
                    {categoryTemplates.map((template) => (
                      <TemplateListItem
                        key={template.id}
                        template={template}
                        selected={selectedTemplateId === template.id}
                        onSelect={handleSelectTemplate}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Template count */}
      {templates.length > 0 && (
        <div className="p-2 border-t border-border/50 text-center text-xs text-slate-500">
          {templates.length} {templates.length === 1 ? 'template' : 'templates'}
        </div>
      )}
    </div>
  )
}

interface TemplateListItemProps {
  template: PlanTemplate
  selected: boolean
  onSelect: (template: PlanTemplate) => void
}

function TemplateListItem({ template, selected, onSelect }: TemplateListItemProps) {
  const successRate = getSuccessRate(template)

  return (
    <button
      onClick={() => onSelect(template)}
      className={`w-full p-2 text-left hover:bg-background-tertiary transition-colors ${
        selected ? 'bg-background-tertiary' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`flex-shrink-0 px-1.5 py-0.5 text-[10px] rounded ${categoryColors[template.category]}`}
            >
              {categoryLabels[template.category]}
            </span>
            {successRate !== null && (
              <span
                className={`flex-shrink-0 px-1.5 py-0.5 text-[10px] rounded ${getSuccessRateColor(successRate)}`}
              >
                {successRate}%
              </span>
            )}
          </div>
          <div className="text-xs font-medium text-slate-200 truncate">
            {template.name}
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            {template.description}
          </div>
          {template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {template.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-1 py-0.5 text-[9px] bg-background-tertiary text-slate-400 rounded"
                >
                  {tag}
                </span>
              ))}
              {template.tags.length > 3 && (
                <span className="text-[9px] text-slate-500">
                  +{template.tags.length - 3}
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-500">
            <span>{template.phases.length} phases</span>
            {template.variables.length > 0 && (
              <span>{template.variables.length} variables</span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

function FilterButton({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
        active
          ? 'bg-amber-600 text-white'
          : 'bg-background-tertiary text-slate-400 hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  )
}
