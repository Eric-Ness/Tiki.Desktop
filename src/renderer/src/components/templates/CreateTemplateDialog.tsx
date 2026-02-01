import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTikiStore } from '../../stores/tiki-store'
import { logger } from '../../lib/logger'

type TemplateCategory = 'issue_type' | 'component' | 'workflow' | 'custom'
type VariableType = 'string' | 'file' | 'component' | 'number'

interface TemplateVariable {
  name: string
  description: string
  type: VariableType
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

interface ExecutionPlan {
  issue: {
    number: number
    title: string
  }
  status: string
  phases: Array<{
    number: number
    title: string
    status: string
    files: string[]
    verification: string[]
    summary?: string
    error?: string
  }>
}

const categoryLabels: Record<TemplateCategory, string> = {
  issue_type: 'Issue Type',
  component: 'Component',
  workflow: 'Workflow',
  custom: 'Custom'
}

const categoryDescriptions: Record<TemplateCategory, string> = {
  issue_type: 'Templates for specific issue types (bug fix, feature, etc.)',
  component: 'Templates for specific components or modules',
  workflow: 'Templates for workflows (release, migration, etc.)',
  custom: 'Custom templates for your unique patterns'
}

const variableTypeLabels: Record<VariableType, string> = {
  string: 'Text',
  file: 'File Path',
  component: 'Component',
  number: 'Number'
}

interface CreateTemplateDialogProps {
  isOpen?: boolean
  onClose: () => void
  planPath?: string
  issueNumber?: number
  onCreated?: () => void
}

export function CreateTemplateDialog({
  isOpen = true,
  onClose,
  planPath: _planPath,
  issueNumber,
  onCreated
}: CreateTemplateDialogProps) {
  const activeProject = useTikiStore((state) => state.activeProject)
  const plans = useTikiStore((state) => state.plans)
  const [selectedIssueNumber, setSelectedIssueNumber] = useState<number | undefined>(issueNumber)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TemplateCategory>('custom')
  const [tagsInput, setTagsInput] = useState('')
  const [variables, setVariables] = useState<TemplateVariable[]>([])
  const [matchCriteria, setMatchCriteria] = useState<MatchCriteria>({
    keywords: [],
    labels: [],
    filePatterns: []
  })
  const [keywordsInput, setKeywordsInput] = useState('')
  const [labelsInput, setLabelsInput] = useState('')
  const [filePatternsInput, setFilePatternsInput] = useState('')

  // UI state
  const [loading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'form' | 'preview'>('form')
  const [editingVariable, setEditingVariable] = useState<number | null>(null)

  // Get plan from store
  const plan = useMemo(() => {
    if (!selectedIssueNumber) return undefined
    return plans.get(selectedIssueNumber) as ExecutionPlan | undefined
  }, [plans, selectedIssueNumber])

  // Get available plans for selection
  const availablePlans = useMemo(() => {
    const result: Array<{ number: number; title: string }> = []
    plans.forEach((plan, num) => {
      const p = plan as ExecutionPlan
      if (p?.issue?.title) {
        result.push({ number: num, title: p.issue.title })
      }
    })
    return result.sort((a, b) => b.number - a.number)
  }, [plans])

  // Extract variables from plan when dialog opens or plan selection changes
  useEffect(() => {
    if (!isOpen || !plan || !activeProject?.path || !selectedIssueNumber) return

    const extractVariables = async () => {
      setExtracting(true)
      try {
        const extracted = await window.tikiDesktop.templates.extractVariables({
          issue: plan.issue,
          status: plan.status,
          phases: plan.phases
        })
        setVariables(extracted)

        // Auto-populate name and description from plan
        if (!name) {
          setName(`Template from #${selectedIssueNumber}`)
        }
        if (!description) {
          setDescription(plan.issue.title)
        }
      } catch (err) {
        logger.error('Failed to extract variables:', err)
      } finally {
        setExtracting(false)
      }
    }

    extractVariables()
  }, [isOpen, plan, activeProject?.path, selectedIssueNumber, name, description])

  // Update selectedIssueNumber when issueNumber prop changes
  useEffect(() => {
    setSelectedIssueNumber(issueNumber)
  }, [issueNumber])

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setName('')
      setDescription('')
      setCategory('custom')
      setTagsInput('')
      setVariables([])
      setMatchCriteria({ keywords: [], labels: [], filePatterns: [] })
      setKeywordsInput('')
      setLabelsInput('')
      setFilePatternsInput('')
      setError(null)
      setStep('form')
      setEditingVariable(null)
      // Only reset selection if no initial issueNumber was provided
      if (!issueNumber) {
        setSelectedIssueNumber(undefined)
      }
    }
  }, [isOpen, issueNumber])

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (step === 'preview') {
          setStep('form')
        } else {
          onClose()
        }
      }
    },
    [onClose, step]
  )

  // Parse tags from input
  const tags = useMemo(() => {
    return tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
  }, [tagsInput])

  // Convert phases to template phases
  const phaseTemplates = useMemo((): PhaseTemplate[] => {
    if (!plan) return []

    return plan.phases.map((phase) => ({
      title: phase.title,
      content: phase.summary || '',
      filePatterns: phase.files,
      verification: phase.verification
    }))
  }, [plan])

  // Add a new variable
  const handleAddVariable = () => {
    const newVariable: TemplateVariable = {
      name: `variable${variables.length + 1}`,
      description: 'New variable',
      type: 'string',
      required: false
    }
    setVariables([...variables, newVariable])
    setEditingVariable(variables.length)
  }

  // Update a variable
  const handleUpdateVariable = (index: number, updates: Partial<TemplateVariable>) => {
    setVariables((prev) => prev.map((v, i) => (i === index ? { ...v, ...updates } : v)))
  }

  // Remove a variable
  const handleRemoveVariable = (index: number) => {
    setVariables((prev) => prev.filter((_, i) => i !== index))
    setEditingVariable(null)
  }

  // Validate form
  const isValid = useMemo(() => {
    return name.trim().length > 0 && description.trim().length > 0 && phaseTemplates.length > 0
  }, [name, description, phaseTemplates])

  // Handle next step
  const handleNext = () => {
    if (!isValid) {
      setError('Please fill in all required fields')
      return
    }

    // Parse match criteria
    setMatchCriteria({
      keywords: keywordsInput
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0),
      labels: labelsInput
        .split(',')
        .map((l) => l.trim())
        .filter((l) => l.length > 0),
      filePatterns: filePatternsInput
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
    })

    setStep('preview')
  }

  // Handle save
  const handleSave = async () => {
    if (!activeProject?.path || !plan) {
      setError('No active project or plan')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await window.tikiDesktop.templates.createFromPlan(
        activeProject.path,
        {
          issue: plan.issue,
          status: plan.status,
          phases: plan.phases
        },
        name,
        description,
        category,
        tags
      )

      onCreated?.()
      onClose()
    } catch (err) {
      logger.error('Failed to create template:', err)
      setError(err instanceof Error ? err.message : 'Failed to create template')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50" onKeyDown={handleKeyDown}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl bg-background-secondary border border-border rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-slate-100">Create Template</h2>
              {step === 'preview' && (
                <span className="px-2 py-0.5 text-[10px] bg-amber-600 text-white rounded">
                  Preview
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-background-tertiary transition-colors"
              aria-label="Close"
            >
              <svg
                className="w-4 h-4 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading || extracting ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3 text-slate-400">
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span className="text-sm">
                    {extracting ? 'Extracting variables...' : 'Loading...'}
                  </span>
                </div>
              </div>
            ) : step === 'form' ? (
              <div className="space-y-4">
                {/* Source plan selection or info */}
                <div className="p-3 bg-background-tertiary rounded">
                  <div className="text-[10px] text-slate-500 uppercase mb-1">Source Plan</div>
                  {issueNumber ? (
                    // Fixed issue number from props
                    <>
                      <div className="text-sm text-slate-200">
                        #{selectedIssueNumber}: {plan?.issue.title || 'Unknown'}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {phaseTemplates.length} phases
                      </div>
                    </>
                  ) : availablePlans.length > 0 ? (
                    // Plan selection dropdown
                    <select
                      value={selectedIssueNumber || ''}
                      onChange={(e) => {
                        const num = parseInt(e.target.value, 10)
                        setSelectedIssueNumber(isNaN(num) ? undefined : num)
                        // Clear extracted data when selection changes
                        setName('')
                        setDescription('')
                        setVariables([])
                      }}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="">Select a plan...</option>
                      {availablePlans.map((p) => (
                        <option key={p.number} value={p.number}>
                          #{p.number}: {p.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    // No plans available
                    <div className="text-sm text-slate-400">
                      No execution plans available. Create a plan first by planning an issue.
                    </div>
                  )}
                  {selectedIssueNumber && plan && (
                    <div className="text-xs text-slate-500 mt-1">
                      {phaseTemplates.length} phases
                    </div>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1.5">
                    Template Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Feature Implementation Template"
                    autoFocus
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1.5">
                    Description <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this template is for..."
                    rows={2}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TemplateCategory)}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    {(Object.keys(categoryLabels) as TemplateCategory[]).map((cat) => (
                      <option key={cat} value={cat}>
                        {categoryLabels[cat]}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">{categoryDescriptions[category]}</p>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1.5">Tags</label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="react, typescript, feature (comma-separated)"
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 text-[10px] bg-slate-700 text-slate-300 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Variables */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-slate-200">Variables</label>
                    <button
                      onClick={handleAddVariable}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      <svg
                        className="w-3 h-3"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Add Variable
                    </button>
                  </div>

                  {variables.length === 0 ? (
                    <div className="p-3 text-center text-slate-500 text-xs bg-background-tertiary rounded">
                      No variables detected. Add variables to make this template reusable.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {variables.map((variable, index) => (
                        <div
                          key={index}
                          className="p-2 bg-background-tertiary rounded border border-border/50"
                        >
                          {editingVariable === index ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  value={variable.name}
                                  onChange={(e) =>
                                    handleUpdateVariable(index, { name: e.target.value })
                                  }
                                  placeholder="Variable name"
                                  className="px-2 py-1 text-xs bg-background border border-border rounded text-slate-200 focus:outline-none focus:border-amber-500"
                                />
                                <select
                                  value={variable.type}
                                  onChange={(e) =>
                                    handleUpdateVariable(index, {
                                      type: e.target.value as VariableType
                                    })
                                  }
                                  className="px-2 py-1 text-xs bg-background border border-border rounded text-slate-200 focus:outline-none focus:border-amber-500"
                                >
                                  {(Object.keys(variableTypeLabels) as VariableType[]).map(
                                    (type) => (
                                      <option key={type} value={type}>
                                        {variableTypeLabels[type]}
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>
                              <input
                                type="text"
                                value={variable.description}
                                onChange={(e) =>
                                  handleUpdateVariable(index, { description: e.target.value })
                                }
                                placeholder="Description"
                                className="w-full px-2 py-1 text-xs bg-background border border-border rounded text-slate-200 focus:outline-none focus:border-amber-500"
                              />
                              <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-xs text-slate-400">
                                  <input
                                    type="checkbox"
                                    checked={variable.required}
                                    onChange={(e) =>
                                      handleUpdateVariable(index, { required: e.target.checked })
                                    }
                                    className="rounded"
                                  />
                                  Required
                                </label>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleRemoveVariable(index)}
                                    className="text-xs text-red-400 hover:text-red-300"
                                  >
                                    Remove
                                  </button>
                                  <button
                                    onClick={() => setEditingVariable(null)}
                                    className="text-xs text-slate-400 hover:text-slate-200"
                                  >
                                    Done
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="flex items-center justify-between cursor-pointer"
                              onClick={() => setEditingVariable(index)}
                            >
                              <div>
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
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {variable.description}
                                </div>
                              </div>
                              <svg
                                className="w-4 h-4 text-slate-500"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Match Criteria */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-200">
                    Match Criteria
                  </label>
                  <p className="text-xs text-slate-500 -mt-2">
                    Define when this template should be suggested for new issues
                  </p>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Keywords</label>
                    <input
                      type="text"
                      value={keywordsInput}
                      onChange={(e) => setKeywordsInput(e.target.value)}
                      placeholder="feature, component, add (comma-separated)"
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Labels</label>
                    <input
                      type="text"
                      value={labelsInput}
                      onChange={(e) => setLabelsInput(e.target.value)}
                      placeholder="enhancement, feature (comma-separated)"
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">File Patterns</label>
                    <input
                      type="text"
                      value={filePatternsInput}
                      onChange={(e) => setFilePatternsInput(e.target.value)}
                      placeholder="src/components/*, *.tsx (comma-separated)"
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-red-400 flex-shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M15 9l-6 6M9 9l6 6" />
                      </svg>
                      <span className="text-sm text-red-400">{error}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Preview step
              <div className="space-y-4">
                {/* Template summary */}
                <div className="p-3 bg-background-tertiary rounded">
                  <div className="text-sm font-medium text-slate-200">{name}</div>
                  <div className="text-xs text-slate-400 mt-1">{description}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-1.5 py-0.5 text-[10px] bg-blue-600 text-blue-100 rounded">
                      {categoryLabels[category]}
                    </span>
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 text-[10px] bg-slate-700 text-slate-300 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Phases preview */}
                <div>
                  <h4 className="text-xs font-medium text-slate-300 mb-2">
                    Phases ({phaseTemplates.length})
                  </h4>
                  <div className="space-y-2">
                    {phaseTemplates.map((phase, index) => (
                      <div key={index} className="p-2 bg-background-tertiary rounded">
                        <div className="flex items-center gap-2">
                          <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[10px] font-medium bg-slate-700 text-slate-300 rounded">
                            {index + 1}
                          </span>
                          <span className="text-xs text-slate-200">{phase.title}</span>
                        </div>
                        {phase.filePatterns.length > 0 && (
                          <div className="mt-1.5 ml-7 flex flex-wrap gap-1">
                            {phase.filePatterns.slice(0, 3).map((pattern, i) => (
                              <code
                                key={i}
                                className="px-1 py-0.5 text-[9px] bg-slate-800 text-slate-400 rounded font-mono"
                              >
                                {pattern}
                              </code>
                            ))}
                            {phase.filePatterns.length > 3 && (
                              <span className="text-[9px] text-slate-500">
                                +{phase.filePatterns.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Variables preview */}
                {variables.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-slate-300 mb-2">
                      Variables ({variables.length})
                    </h4>
                    <div className="space-y-1">
                      {variables.map((variable) => (
                        <div
                          key={variable.name}
                          className="flex items-center gap-2 p-2 bg-background-tertiary rounded"
                        >
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
                      ))}
                    </div>
                  </div>
                )}

                {/* Match criteria preview */}
                {(matchCriteria.keywords.length > 0 ||
                  matchCriteria.labels.length > 0 ||
                  matchCriteria.filePatterns.length > 0) && (
                  <div>
                    <h4 className="text-xs font-medium text-slate-300 mb-2">Match Criteria</h4>
                    <div className="p-2 bg-background-tertiary rounded space-y-2">
                      {matchCriteria.keywords.length > 0 && (
                        <div>
                          <div className="text-[10px] text-slate-500 mb-1">Keywords</div>
                          <div className="flex flex-wrap gap-1">
                            {matchCriteria.keywords.map((kw) => (
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
                      {matchCriteria.labels.length > 0 && (
                        <div>
                          <div className="text-[10px] text-slate-500 mb-1">Labels</div>
                          <div className="flex flex-wrap gap-1">
                            {matchCriteria.labels.map((label) => (
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
                      {matchCriteria.filePatterns.length > 0 && (
                        <div>
                          <div className="text-[10px] text-slate-500 mb-1">File Patterns</div>
                          <div className="flex flex-wrap gap-1">
                            {matchCriteria.filePatterns.map((pattern) => (
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

                {/* Error */}
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-red-400 flex-shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M15 9l-6 6M9 9l6 6" />
                      </svg>
                      <span className="text-sm text-red-400">{error}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-background flex-shrink-0">
            <div className="text-xs text-slate-500">
              {step === 'form' ? 'Step 1 of 2: Configure' : 'Step 2 of 2: Review'}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={step === 'preview' ? () => setStep('form') : onClose}
                disabled={saving}
                className="px-3 py-1.5 text-sm text-slate-300 hover:text-slate-100 transition-colors disabled:opacity-50"
              >
                {step === 'preview' ? 'Back' : 'Cancel'}
              </button>
              {step === 'form' ? (
                <button
                  onClick={handleNext}
                  disabled={!isValid}
                  className="px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Creating...' : 'Create Template'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
