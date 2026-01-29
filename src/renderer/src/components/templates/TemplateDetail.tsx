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

const variableTypeLabels: Record<TemplateVariable['type'], string> = {
  string: 'Text',
  file: 'File Path',
  component: 'Component',
  number: 'Number'
}

interface TemplateDetailProps {
  template: PlanTemplate
  onEdit?: () => void
  onDelete?: () => void
  onApply?: () => void
  onClose?: () => void
  onExport?: () => void
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

/**
 * Format a date string for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function TemplateDetail({
  template,
  onEdit,
  onDelete,
  onApply,
  onClose,
  onExport
}: TemplateDetailProps) {
  const successRate = getSuccessRate(template)
  const totalUsages = template.successCount + template.failureCount

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border/50">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`px-1.5 py-0.5 text-[10px] rounded ${categoryColors[template.category]}`}>
                {categoryLabels[template.category]}
              </span>
              {successRate !== null && (
                <span className={`px-1.5 py-0.5 text-[10px] rounded ${getSuccessRateColor(successRate)}`}>
                  {successRate}% success
                </span>
              )}
              {template.sourceIssue && (
                <span className="text-[10px] text-slate-500">
                  from #{template.sourceIssue}
                </span>
              )}
            </div>
            <h3 className="text-sm font-medium text-slate-200">{template.name}</h3>
            <p className="text-xs text-slate-400 mt-1">{template.description}</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Tags */}
        {template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {template.tags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 text-[10px] bg-background-tertiary text-slate-400 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Usage Statistics */}
        <div className="p-3 border-b border-border/50">
          <h4 className="text-xs font-medium text-slate-300 mb-2">Usage Statistics</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-background-tertiary rounded p-2">
              <div className="text-lg font-semibold text-slate-200">{totalUsages}</div>
              <div className="text-[10px] text-slate-500">Total Uses</div>
            </div>
            <div className="bg-background-tertiary rounded p-2">
              <div className="text-lg font-semibold text-green-400">{template.successCount}</div>
              <div className="text-[10px] text-slate-500">Successful</div>
            </div>
            <div className="bg-background-tertiary rounded p-2">
              <div className="text-lg font-semibold text-red-400">{template.failureCount}</div>
              <div className="text-[10px] text-slate-500">Failed</div>
            </div>
          </div>
          {template.lastUsed && (
            <div className="text-[10px] text-slate-500 mt-2">
              Last used: {formatDate(template.lastUsed)}
            </div>
          )}
        </div>

        {/* Phases */}
        <div className="p-3 border-b border-border/50">
          <h4 className="text-xs font-medium text-slate-300 mb-2">
            Phases ({template.phases.length})
          </h4>
          <div className="space-y-2">
            {template.phases.map((phase, index) => (
              <div key={index} className="bg-background-tertiary rounded p-2">
                <div className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[10px] font-medium bg-slate-700 text-slate-300 rounded">
                    {index + 1}
                  </span>
                  <span className="text-xs font-medium text-slate-200 truncate">
                    {phase.title}
                  </span>
                </div>
                {phase.filePatterns.length > 0 && (
                  <div className="mt-1.5 ml-7">
                    <div className="text-[10px] text-slate-500 mb-0.5">File patterns:</div>
                    <div className="flex flex-wrap gap-1">
                      {phase.filePatterns.map((pattern, i) => (
                        <code
                          key={i}
                          className="px-1 py-0.5 text-[9px] bg-slate-800 text-slate-400 rounded font-mono"
                        >
                          {pattern}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
                {phase.verification.length > 0 && (
                  <div className="mt-1.5 ml-7">
                    <div className="text-[10px] text-slate-500 mb-0.5">Verification:</div>
                    <ul className="text-[10px] text-slate-400 space-y-0.5">
                      {phase.verification.slice(0, 3).map((v, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-slate-600">-</span>
                          <span className="truncate">{v}</span>
                        </li>
                      ))}
                      {phase.verification.length > 3 && (
                        <li className="text-slate-500">
                          +{phase.verification.length - 3} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Variables */}
        {template.variables.length > 0 && (
          <div className="p-3 border-b border-border/50">
            <h4 className="text-xs font-medium text-slate-300 mb-2">
              Variables ({template.variables.length})
            </h4>
            <div className="space-y-2">
              {template.variables.map((variable) => (
                <div key={variable.name} className="bg-background-tertiary rounded p-2">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-amber-400">
                      ${'{'}
                      {variable.name}
                      {'}'}
                    </code>
                    <span className="text-[10px] text-slate-500">
                      {variableTypeLabels[variable.type]}
                    </span>
                    {variable.required && (
                      <span className="text-[9px] text-red-400">required</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {variable.description}
                  </div>
                  {variable.defaultValue && (
                    <div className="text-[10px] text-slate-500 mt-1">
                      Default: <code className="text-slate-400">{variable.defaultValue}</code>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Match Criteria */}
        {(template.matchCriteria.keywords.length > 0 ||
          template.matchCriteria.labels.length > 0 ||
          template.matchCriteria.filePatterns.length > 0) && (
          <div className="p-3 border-b border-border/50">
            <h4 className="text-xs font-medium text-slate-300 mb-2">Match Criteria</h4>
            <div className="space-y-2">
              {template.matchCriteria.keywords.length > 0 && (
                <div>
                  <div className="text-[10px] text-slate-500 mb-1">Keywords</div>
                  <div className="flex flex-wrap gap-1">
                    {template.matchCriteria.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="px-1.5 py-0.5 text-[10px] bg-blue-900/30 text-blue-300 rounded"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {template.matchCriteria.labels.length > 0 && (
                <div>
                  <div className="text-[10px] text-slate-500 mb-1">Labels</div>
                  <div className="flex flex-wrap gap-1">
                    {template.matchCriteria.labels.map((label) => (
                      <span
                        key={label}
                        className="px-1.5 py-0.5 text-[10px] bg-purple-900/30 text-purple-300 rounded"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {template.matchCriteria.filePatterns.length > 0 && (
                <div>
                  <div className="text-[10px] text-slate-500 mb-1">File Patterns</div>
                  <div className="flex flex-wrap gap-1">
                    {template.matchCriteria.filePatterns.map((pattern) => (
                      <code
                        key={pattern}
                        className="px-1 py-0.5 text-[9px] bg-slate-800 text-slate-400 rounded font-mono"
                      >
                        {pattern}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="p-3">
          <div className="text-[10px] text-slate-500 space-y-1">
            <div>Created: {formatDate(template.createdAt)}</div>
            <div>Updated: {formatDate(template.updatedAt)}</div>
            <div className="font-mono text-slate-600 truncate">ID: {template.id}</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onDelete && (
            <button
              onClick={onDelete}
              className="px-2 py-1 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Delete
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Edit
            </button>
          )}
          {onExport && (
            <button
              onClick={onExport}
              className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </button>
          )}
        </div>
        {onApply && (
          <button
            onClick={onApply}
            className="px-3 py-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors"
          >
            Apply Template
          </button>
        )}
      </div>
    </div>
  )
}
