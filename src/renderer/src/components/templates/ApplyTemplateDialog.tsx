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

interface AppliedPhase {
  number: number
  title: string
  content: string
  filePatterns: string[]
  verification: string[]
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

const variableTypeLabels: Record<VariableType, string> = {
  string: 'Text',
  file: 'File Path',
  component: 'Component',
  number: 'Number'
}

interface ApplyTemplateDialogProps {
  isOpen: boolean
  onClose: () => void
  template: PlanTemplate
  issueNumber: number
  onApplied?: (phases: AppliedPhase[]) => void
}

export function ApplyTemplateDialog({
  isOpen,
  onClose,
  template,
  issueNumber,
  onApplied
}: ApplyTemplateDialogProps) {
  const activeProject = useTikiStore((state) => state.activeProject)

  // Variable values state
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})

  // UI state
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'variables' | 'preview'>('variables')
  const [previewPhases, setPreviewPhases] = useState<AppliedPhase[]>([])

  // Initialize variable values with defaults
  useEffect(() => {
    if (!isOpen || !template) return

    const initialValues: Record<string, string> = {}
    for (const variable of template.variables) {
      initialValues[variable.name] = variable.defaultValue || ''
    }
    // Auto-set issue number
    initialValues['issueNumber'] = String(issueNumber)
    setVariableValues(initialValues)
  }, [isOpen, template, issueNumber])

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setVariableValues({})
      setError(null)
      setStep('variables')
      setPreviewPhases([])
    }
  }, [isOpen])

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (step === 'preview') {
          setStep('variables')
        } else {
          onClose()
        }
      }
    },
    [onClose, step]
  )

  // Update a variable value
  const handleVariableChange = (name: string, value: string) => {
    setVariableValues((prev) => ({ ...prev, [name]: value }))
  }

  // Check if all required variables are filled
  const isValid = useMemo(() => {
    if (!template) return false

    for (const variable of template.variables) {
      if (variable.required && !variableValues[variable.name]?.trim()) {
        return false
      }
    }
    return true
  }, [template, variableValues])

  // Generate preview by applying template
  const handlePreview = async () => {
    if (!activeProject?.path || !template) {
      setError('No active project or template')
      return
    }

    if (!isValid) {
      setError('Please fill in all required variables')
      return
    }

    setError(null)

    try {
      const result = await window.tikiDesktop.templates.apply(
        activeProject.path,
        template.id,
        variableValues,
        issueNumber
      )

      if (!result) {
        setError('Failed to apply template')
        return
      }

      setPreviewPhases(result.phases)
      setStep('preview')
    } catch (err) {
      logger.error('Failed to preview template:', err)
      setError(err instanceof Error ? err.message : 'Failed to preview template')
    }
  }

  // Apply template
  const handleApply = async () => {
    if (!activeProject?.path || !template || previewPhases.length === 0) {
      setError('No preview available')
      return
    }

    setApplying(true)
    setError(null)

    try {
      // Record usage (template was used)
      await window.tikiDesktop.templates.recordUsage(activeProject.path, template.id, true)

      onApplied?.(previewPhases)
      onClose()
    } catch (err) {
      logger.error('Failed to apply template:', err)
      setError(err instanceof Error ? err.message : 'Failed to apply template')
    } finally {
      setApplying(false)
    }
  }

  // Get success rate
  const successRate = useMemo(() => {
    if (!template) return null
    const total = template.successCount + template.failureCount
    if (total === 0) return null
    return Math.round((template.successCount / total) * 100)
  }, [template])

  if (!isOpen || !template) return null

  // Separate required and optional variables
  const requiredVariables = template.variables.filter((v) => v.required)
  const optionalVariables = template.variables.filter((v) => !v.required)

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
              <h2 className="text-base font-semibold text-slate-100">Apply Template</h2>
              {step === 'preview' && (
                <span className="px-2 py-0.5 text-[10px] bg-green-600 text-white rounded">
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
            {step === 'variables' ? (
              <div className="space-y-4">
                {/* Template info */}
                <div className="p-3 bg-background-tertiary rounded">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-1.5 py-0.5 text-[10px] rounded ${categoryColors[template.category]}`}
                    >
                      {categoryLabels[template.category]}
                    </span>
                    {successRate !== null && (
                      <span
                        className={`px-1.5 py-0.5 text-[10px] rounded ${
                          successRate >= 80
                            ? 'bg-green-600 text-green-100'
                            : successRate >= 50
                              ? 'bg-amber-600 text-amber-100'
                              : 'bg-red-600 text-red-100'
                        }`}
                      >
                        {successRate}% success
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-slate-200">{template.name}</div>
                  <div className="text-xs text-slate-400 mt-1">{template.description}</div>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
                    <span>{template.phases.length} phases</span>
                    {template.variables.length > 0 && (
                      <span>{template.variables.length} variables</span>
                    )}
                  </div>
                </div>

                {/* Target issue */}
                <div className="p-3 bg-amber-900/20 border border-amber-600/30 rounded">
                  <div className="text-[10px] text-amber-400 uppercase mb-1">
                    Applying to Issue
                  </div>
                  <div className="text-sm text-slate-200">#{issueNumber}</div>
                </div>

                {/* Required variables */}
                {requiredVariables.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-slate-300 mb-2">
                      Required Variables
                    </h4>
                    <div className="space-y-3">
                      {requiredVariables.map((variable) => (
                        <div key={variable.name}>
                          <label className="block text-sm text-slate-200 mb-1.5">
                            <code className="text-amber-400 font-mono">
                              ${'{'}
                              {variable.name}
                              {'}'}
                            </code>
                            <span className="text-red-400 ml-1">*</span>
                          </label>
                          <input
                            type={variable.type === 'number' ? 'number' : 'text'}
                            value={variableValues[variable.name] || ''}
                            onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                            placeholder={variable.description}
                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                          />
                          <p className="mt-1 text-xs text-slate-500">{variable.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Optional variables */}
                {optionalVariables.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-slate-300 mb-2">
                      Optional Variables
                    </h4>
                    <div className="space-y-3">
                      {optionalVariables.map((variable) => (
                        <div key={variable.name}>
                          <label className="block text-sm text-slate-200 mb-1.5">
                            <code className="text-amber-400 font-mono">
                              ${'{'}
                              {variable.name}
                              {'}'}
                            </code>
                            <span className="text-[10px] text-slate-500 ml-2">
                              ({variableTypeLabels[variable.type]})
                            </span>
                          </label>
                          <input
                            type={variable.type === 'number' ? 'number' : 'text'}
                            value={variableValues[variable.name] || ''}
                            onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                            placeholder={variable.defaultValue || variable.description}
                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                          />
                          <p className="mt-1 text-xs text-slate-500">
                            {variable.description}
                            {variable.defaultValue && (
                              <span className="text-slate-600">
                                {' '}
                                (default: {variable.defaultValue})
                              </span>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No variables */}
                {template.variables.length === 0 && (
                  <div className="p-4 text-center text-slate-500 text-sm">
                    This template has no variables. Click Preview to see the generated plan.
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
            ) : (
              // Preview step
              <div className="space-y-4">
                {/* Summary */}
                <div className="p-3 bg-green-900/20 border border-green-600/30 rounded">
                  <div className="text-[10px] text-green-400 uppercase mb-1">
                    Generated Plan Preview
                  </div>
                  <div className="text-sm text-slate-200">
                    Issue #{issueNumber} - {previewPhases.length} phases
                  </div>
                </div>

                {/* Variable substitutions */}
                {Object.entries(variableValues).filter(([, value]) => value).length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-slate-300 mb-2">
                      Variable Substitutions
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(variableValues)
                        .filter(([, value]) => value)
                        .map(([name, value]) => (
                          <div
                            key={name}
                            className="px-2 py-1 bg-background-tertiary rounded text-xs"
                          >
                            <code className="text-amber-400">${'{'}
                              {name}
                              {'}'}</code>
                            <span className="text-slate-500 mx-1">=</span>
                            <span className="text-slate-300">{value}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Phases preview */}
                <div>
                  <h4 className="text-xs font-medium text-slate-300 mb-2">Phases</h4>
                  <div className="space-y-3">
                    {previewPhases.map((phase) => (
                      <div
                        key={phase.number}
                        className="p-3 bg-background-tertiary rounded border border-border/50"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-xs font-medium bg-amber-600 text-white rounded">
                            {phase.number}
                          </span>
                          <span className="text-sm font-medium text-slate-200">{phase.title}</span>
                        </div>

                        {phase.content && (
                          <div className="ml-8 text-xs text-slate-400 mb-2">{phase.content}</div>
                        )}

                        {phase.filePatterns.length > 0 && (
                          <div className="ml-8 mb-2">
                            <div className="text-[10px] text-slate-500 mb-1">Files:</div>
                            <div className="flex flex-wrap gap-1">
                              {phase.filePatterns.map((pattern, i) => (
                                <code
                                  key={i}
                                  className="px-1.5 py-0.5 text-[10px] bg-slate-800 text-slate-400 rounded font-mono"
                                >
                                  {pattern}
                                </code>
                              ))}
                            </div>
                          </div>
                        )}

                        {phase.verification.length > 0 && (
                          <div className="ml-8">
                            <div className="text-[10px] text-slate-500 mb-1">Verification:</div>
                            <ul className="text-xs text-slate-400 space-y-0.5">
                              {phase.verification.map((v, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <svg
                                    className="w-3 h-3 text-slate-600 mt-0.5 flex-shrink-0"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <polyline points="9 11 12 14 22 4" />
                                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                                  </svg>
                                  <span>{v}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
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
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-background flex-shrink-0">
            <div className="text-xs text-slate-500">
              {step === 'variables' ? 'Step 1 of 2: Configure Variables' : 'Step 2 of 2: Review'}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={step === 'preview' ? () => setStep('variables') : onClose}
                disabled={applying}
                className="px-3 py-1.5 text-sm text-slate-300 hover:text-slate-100 transition-colors disabled:opacity-50"
              >
                {step === 'preview' ? 'Back' : 'Cancel'}
              </button>
              {step === 'variables' ? (
                <button
                  onClick={handlePreview}
                  disabled={!isValid}
                  className="px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Preview
                </button>
              ) : (
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {applying ? 'Applying...' : 'Apply Template'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
