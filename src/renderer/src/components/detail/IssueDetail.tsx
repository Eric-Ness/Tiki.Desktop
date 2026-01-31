import { useState, useEffect, useMemo, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { GitHubIssue, useTikiStore, CachedPrediction, CachedPatternMatch } from '../../stores/tiki-store'
import { IssueActions } from '../issues'
import { PRPreview } from './PRPreview'
import { AssumptionTracker } from './AssumptionTracker'
import { RollbackDialog } from '../rollback'
import { TemplateSuggestions, CreateTemplateDialog, ApplyTemplateDialog } from '../templates'
import { CostPrediction } from '../prediction'
import { PatternWarning, PreventionSuggestions } from '../patterns'
import type {
  PatternMatchPreload,
  FailurePatternPreload,
  PreventiveMeasurePreload
} from '../../../../preload/index'

// Template type for ApplyTemplateDialog
type TemplateCategory = 'issue_type' | 'component' | 'workflow' | 'custom'

interface PlanTemplate {
  id: string
  name: string
  description: string
  category: TemplateCategory
  tags: string[]
  phases: Array<{
    title: string
    content: string
    filePatterns: string[]
    verification: string[]
  }>
  variables: Array<{
    name: string
    description: string
    type: 'string' | 'file' | 'component' | 'number'
    defaultValue?: string
    required: boolean
  }>
  matchCriteria: {
    keywords: string[]
    labels: string[]
    filePatterns: string[]
  }
  sourceIssue?: number
  successCount: number
  failureCount: number
  lastUsed?: string
  createdAt: string
  updatedAt: string
}

export interface IssueDetailProps {
  issue: GitHubIssue | {
    number: number
    title: string
    body?: string
    labels?: string[] | Array<{ name: string; color: string }>
    state: string
    url?: string
    hasPlan?: boolean
  }
  cwd?: string
}

// State badge styling
const stateBadgeStyles: Record<string, string> = {
  open: 'bg-green-600 text-green-100',
  closed: 'bg-purple-600 text-purple-100'
}

// Convert hex color to tailwind-compatible rgba
function hexToRgba(hex: string, alpha: number = 0.3): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return `rgba(100, 100, 100, ${alpha})`
  return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`
}

// Simple label colors for variety (fallback)
const labelColors = [
  'bg-blue-600 text-blue-100',
  'bg-amber-600 text-amber-100',
  'bg-pink-600 text-pink-100',
  'bg-teal-600 text-teal-100',
  'bg-indigo-600 text-indigo-100',
  'bg-orange-600 text-orange-100'
]

function getLabelColor(index: number): string {
  return labelColors[index % labelColors.length]
}

export function IssueDetail({ issue, cwd }: IssueDetailProps) {
  const { number, title, body, labels, state } = issue
  const hasPlan = 'hasPlan' in issue ? issue.hasPlan : undefined
  const normalizedState = state.toLowerCase()
  const badgeStyle = stateBadgeStyles[normalizedState] || stateBadgeStyles.open

  const activeProject = useTikiStore((state) => state.activeProject)
  const plans = useTikiStore((state) => state.plans)
  const setPrediction = useTikiStore((state) => state.setPrediction)
  const setPatternMatchesInStore = useTikiStore((state) => state.setPatternMatches)
  const getPatternMatchesFromStore = useTikiStore((state) => state.getPatternMatches)
  const setSelectedNode = useTikiStore((state) => state.setSelectedNode)
  const [showRollbackDialog, setShowRollbackDialog] = useState(false)
  const [hasTrackedCommits, setHasTrackedCommits] = useState(false)
  const [showCostPrediction, setShowCostPrediction] = useState(true)

  // Pattern analysis state
  const [patternMatches, setPatternMatches] = useState<PatternMatchPreload[]>([])
  const [checkingPatterns, setCheckingPatterns] = useState(false)
  const [showPatternAnalysis, setShowPatternAnalysis] = useState(true)
  const [patternsDismissed, setPatternsDismissed] = useState(false)

  // Assumption tracker state
  const [showAssumptionTracker, setShowAssumptionTracker] = useState(true)

  // Template dialog state
  const [showCreateTemplateDialog, setShowCreateTemplateDialog] = useState(false)
  const [showApplyTemplateDialog, setShowApplyTemplateDialog] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<PlanTemplate | null>(null)

  // Get the plan for this issue
  const plan = useMemo(() => {
    return plans.get(number) || null
  }, [plans, number])

  // Determine if plan is completed (all phases completed)
  const isPlanCompleted = useMemo(() => {
    if (!plan) return false
    return (
      plan.status === 'completed' ||
      plan.status === 'shipped' ||
      (plan.phases.length > 0 && plan.phases.every((phase) => phase.status === 'completed'))
    )
  }, [plan])

  // Check if we should show template suggestions (no plan yet)
  const shouldShowSuggestions = useMemo(() => {
    return !hasPlan && !plan && normalizedState === 'open'
  }, [hasPlan, plan, normalizedState])

  // Check if the issue has tracked commits for rollback
  useEffect(() => {
    const checkCommits = async () => {
      const projectPath = cwd || activeProject?.path
      if (!projectPath || !number) {
        setHasTrackedCommits(false)
        return
      }
      try {
        const commits = await window.tikiDesktop.rollback.getIssueCommits(projectPath, number)
        setHasTrackedCommits(commits.length > 0)
      } catch (error) {
        console.error('Failed to check issue commits:', error)
        setHasTrackedCommits(false)
      }
    }
    checkCommits()
  }, [cwd, activeProject?.path, number])

  // Check for pattern matches when issue changes
  useEffect(() => {
    const checkPatterns = async () => {
      const projectPath = cwd || activeProject?.path
      if (!projectPath || !number) {
        setPatternMatches([])
        return
      }

      // Reset dismissed state when issue changes
      setPatternsDismissed(false)

      // Check if we have cached matches
      const cachedMatches = getPatternMatchesFromStore(number)
      if (cachedMatches && cachedMatches.length > 0) {
        // We have cached data, but we need to fetch full pattern data
        // since the cache only stores summaries
      }

      setCheckingPatterns(true)
      try {
        const issueForPattern = {
          number,
          title,
          body,
          labels: normalizedLabels
        }

        // Convert plan to pattern format if available
        const planForPattern = plan
          ? {
              phases: plan.phases.map((p) => ({
                number: p.number,
                title: p.title,
                files: p.files,
                verification: p.verification
              }))
            }
          : undefined

        const matches = await window.tikiDesktop.patterns.check(
          projectPath,
          issueForPattern,
          planForPattern
        )
        setPatternMatches(matches)

        // Cache simplified matches in store
        const cachedMatches: CachedPatternMatch[] = matches.map((m) => ({
          patternId: m.pattern.id,
          patternName: m.pattern.name,
          confidence: m.confidence,
          matchedIndicators: m.matchedIndicators,
          suggestedMeasuresCount: m.suggestedMeasures.length
        }))
        setPatternMatchesInStore(number, cachedMatches)
      } catch (error) {
        console.error('Failed to check patterns:', error)
        setPatternMatches([])
      }
      setCheckingPatterns(false)
    }

    checkPatterns()
  }, [cwd, activeProject?.path, number, title, body, plan])

  // Handle apply all prevention measures
  const handleApplyAllPrevention = useCallback(async () => {
    const projectPath = cwd || activeProject?.path
    if (!projectPath || !plan || patternMatches.length === 0) return

    try {
      const planForPattern = {
        phases: plan.phases.map((p) => ({
          number: p.number,
          title: p.title,
          files: p.files,
          verification: p.verification
        }))
      }

      const result = await window.tikiDesktop.patterns.applyPrevention(
        projectPath,
        planForPattern,
        patternMatches
      )

      // Show success notification (you could add a toast here)
      console.log(
        `Applied ${result.appliedMeasures.length} preventive measures`,
        result.appliedMeasures.map((m) => m.description)
      )

      // Optionally dismiss the warning after applying
      setPatternsDismissed(true)
    } catch (error) {
      console.error('Failed to apply prevention measures:', error)
    }
  }, [cwd, activeProject?.path, plan, patternMatches])

  // Handle dismiss pattern warning
  const handleDismissPatterns = useCallback(() => {
    setPatternsDismissed(true)
  }, [])

  // Handle view pattern details (could navigate to pattern dashboard)
  const handleViewPatternDetails = useCallback((pattern: FailurePatternPreload) => {
    // For now, log the pattern - could open a modal or navigate to dashboard
    console.log('View pattern details:', pattern)
  }, [])

  // Get all suggested measures from matches
  const allSuggestedMeasures = useMemo(() => {
    const measuresMap = new Map<string, PreventiveMeasurePreload>()
    for (const match of patternMatches) {
      for (const measure of match.suggestedMeasures) {
        if (!measuresMap.has(measure.id)) {
          measuresMap.set(measure.id, measure)
        }
      }
    }
    return Array.from(measuresMap.values())
  }, [patternMatches])

  // Handle template apply selection
  const handleTemplateApply = useCallback((template: PlanTemplate) => {
    setSelectedTemplate(template)
    setShowApplyTemplateDialog(true)
  }, [])

  // Handle template applied successfully
  const handleTemplateApplied = useCallback(() => {
    setShowApplyTemplateDialog(false)
    setSelectedTemplate(null)
    // The plan will be created/updated through the normal workflow
  }, [])

  // Handle clicking on a phase in the AssumptionTracker
  const handleAssumptionPhaseClick = useCallback(
    (phaseNumber: number) => {
      setSelectedNode(`phase-${phaseNumber}`)
    },
    [setSelectedNode]
  )

  // Handle prediction loaded - cache it in the store
  const handlePredictionLoaded = useCallback(
    (prediction: CachedPrediction) => {
      setPrediction(number, prediction)
    },
    [setPrediction, number]
  )

  const handleOpenInBrowser = async () => {
    if (number) {
      try {
        await window.tikiDesktop.github.openInBrowser(number, cwd)
      } catch (error) {
        console.error('Failed to open issue in browser:', error)
      }
    }
  }

  // Normalize labels to array of objects
  const normalizedLabels = labels
    ? labels.map((label) =>
        typeof label === 'string'
          ? { name: label, color: '' }
          : label
      )
    : []

  return (
    <div className="p-4 space-y-6">
      {/* Header section with cyan accent */}
      <div className="border-l-4 border-cyan-500 pl-3">
        {/* Issue number and title */}
        <div className="flex items-start gap-2">
          <span data-testid="issue-number" className="text-cyan-400 font-semibold">
            #{number}
          </span>
          <h2 data-testid="issue-title" className="text-lg font-semibold text-white flex-1">
            {title}
          </h2>
        </div>

        {/* State and plan badges */}
        <div className="flex items-center gap-2 mt-2">
          <span
            data-testid="state-badge"
            className={`
              inline-block px-2 py-0.5 rounded text-xs font-medium uppercase
              ${badgeStyle}
            `}
          >
            {normalizedState}
          </span>
          {hasPlan && (
            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-cyan-600 text-cyan-100">
              Has Plan
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Quick actions for working with the issue */}
        {'url' in issue && (
          <IssueActions issue={issue as GitHubIssue} />
        )}

        {/* Rollback button - only visible when issue has tracked commits */}
        {hasTrackedCommits && (
          <button
            onClick={() => setShowRollbackDialog(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-500 active:bg-amber-600 text-white rounded transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Rollback
          </button>
        )}

        {/* Save as Template button - only visible when plan is completed */}
        {isPlanCompleted && (
          <button
            onClick={() => setShowCreateTemplateDialog(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-500 active:bg-purple-600 text-white rounded transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
            </svg>
            Save as Template
          </button>
        )}

        {/* Open in GitHub button */}
        <button
          onClick={handleOpenInBrowser}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 active:bg-slate-700 rounded transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          Open in GitHub
        </button>
      </div>

      {/* Rollback Dialog */}
      <RollbackDialog
        isOpen={showRollbackDialog}
        onClose={() => setShowRollbackDialog(false)}
        scope="issue"
        target={{ issueNumber: number }}
        issueNumber={number}
      />

      {/* Template Suggestions - shown when issue has no plan yet */}
      {shouldShowSuggestions && (
        <TemplateSuggestions
          issueNumber={number}
          issueTitle={title}
          issueBody={body}
          issueLabels={normalizedLabels.map((l) => l.name)}
          onApply={handleTemplateApply}
        />
      )}

      {/* Create Template Dialog */}
      <CreateTemplateDialog
        isOpen={showCreateTemplateDialog}
        onClose={() => setShowCreateTemplateDialog(false)}
        planPath="" // Path is derived from active project
        issueNumber={number}
        onCreated={() => setShowCreateTemplateDialog(false)}
      />

      {/* Apply Template Dialog */}
      {selectedTemplate && (
        <ApplyTemplateDialog
          isOpen={showApplyTemplateDialog}
          onClose={() => {
            setShowApplyTemplateDialog(false)
            setSelectedTemplate(null)
          }}
          template={selectedTemplate}
          issueNumber={number}
          onApplied={handleTemplateApplied}
        />
      )}

      {/* Pattern Analysis Section */}
      {(cwd || activeProject?.path) && (
        <div className="border-t border-slate-700/50 pt-4" data-testid="pattern-analysis-section">
          <button
            onClick={() => setShowPatternAnalysis(!showPatternAnalysis)}
            className="flex items-center gap-2 w-full text-left mb-2"
          >
            <svg
              className={`w-3 h-3 text-slate-400 transition-transform ${showPatternAnalysis ? 'rotate-90' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              Pattern Analysis
              {checkingPatterns && (
                <span className="text-xs text-slate-500">(checking...)</span>
              )}
              {!checkingPatterns && patternMatches.length > 0 && !patternsDismissed && (
                <span className="px-1.5 py-0.5 text-xs rounded bg-amber-500/20 text-amber-400">
                  {patternMatches.length} match{patternMatches.length !== 1 ? 'es' : ''}
                </span>
              )}
            </h3>
          </button>

          {showPatternAnalysis && (
            <div className="space-y-3">
              {/* Pattern Warning Banner */}
              {patternMatches.length > 0 && !patternsDismissed && (
                <PatternWarning
                  matches={patternMatches}
                  onApplyAll={plan ? handleApplyAllPrevention : undefined}
                  onDismiss={handleDismissPatterns}
                  onViewDetails={handleViewPatternDetails}
                />
              )}

              {/* Prevention Suggestions (expandable) */}
              {patternMatches.length > 0 && !patternsDismissed && allSuggestedMeasures.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
                  <PreventionSuggestions
                    measures={allSuggestedMeasures}
                    onApply={async (measure) => {
                      // Apply individual measure
                      console.log('Apply measure:', measure)
                    }}
                    onDismiss={(measure) => {
                      // Dismiss individual measure
                      console.log('Dismiss measure:', measure)
                    }}
                  />
                </div>
              )}

              {/* No patterns found message */}
              {!checkingPatterns && patternMatches.length === 0 && (
                <div className="text-sm text-slate-500 bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-green-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    No failure patterns detected for this issue.
                  </div>
                </div>
              )}

              {/* Dismissed message */}
              {patternsDismissed && patternMatches.length > 0 && (
                <div className="text-sm text-slate-500 flex items-center justify-between">
                  <span>Pattern warnings dismissed</span>
                  <button
                    onClick={() => setPatternsDismissed(false)}
                    className="text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    Show again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Assumption Tracker Section */}
      {plan && plan.assumptions && plan.assumptions.length > 0 && (
        <AssumptionTracker
          assumptions={plan.assumptions}
          onPhaseClick={handleAssumptionPhaseClick}
        />
      )}

      {/* Body section */}
      {body && body.trim() !== '' && (
        <div className="flex-1 min-h-0 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Description</h3>
          <div
            data-testid="issue-body"
            className="flex-1 bg-slate-800/50 rounded-lg p-4 overflow-y-auto min-h-[200px] max-h-[500px] border border-slate-700/50 prose prose-sm prose-invert max-w-none
              prose-headings:text-slate-200 prose-headings:font-semibold prose-headings:border-b prose-headings:border-slate-700 prose-headings:pb-2 prose-headings:mb-3
              prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
              prose-p:text-slate-300 prose-p:leading-relaxed prose-p:my-2
              prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-slate-200 prose-em:text-slate-300
              prose-code:text-amber-300 prose-code:bg-slate-900/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700 prose-pre:rounded-lg prose-pre:my-3
              prose-ul:my-2 prose-ol:my-2 prose-li:text-slate-300 prose-li:my-0.5
              prose-blockquote:border-l-cyan-500 prose-blockquote:bg-slate-900/30 prose-blockquote:py-1 prose-blockquote:text-slate-400
              prose-hr:border-slate-700"
          >
            <ReactMarkdown
              components={{
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => {
                    e.preventDefault()
                    if (href) window.tikiDesktop.shell.openExternal(href)
                  }}>
                    {children}
                  </a>
                )
              }}
            >
              {body}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Labels section */}
      {normalizedLabels.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Labels</h3>
          <div data-testid="labels-section" className="flex flex-wrap gap-2">
            {normalizedLabels.map((label, index) => (
              <span
                key={index}
                data-testid="label-badge"
                className={`
                  inline-block px-2 py-0.5 rounded text-xs font-medium
                  ${label.color ? '' : getLabelColor(index)}
                `}
                style={
                  label.color
                    ? {
                        backgroundColor: hexToRgba(label.color, 0.3),
                        color: `#${label.color}`,
                        border: `1px solid ${hexToRgba(label.color, 0.5)}`
                      }
                    : undefined
                }
              >
                {label.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cost Prediction section */}
      {(cwd || activeProject?.path) && (
        <div className="border-t border-slate-700/50 pt-4">
          <button
            onClick={() => setShowCostPrediction(!showCostPrediction)}
            className="flex items-center gap-2 w-full text-left mb-2"
          >
            <svg
              className={`w-3 h-3 text-slate-400 transition-transform ${showCostPrediction ? 'rotate-90' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <h3 className="text-sm font-semibold text-slate-300">Cost Prediction</h3>
          </button>
          {showCostPrediction && (
            <div className="bg-slate-800/50 rounded-lg border border-slate-700/50">
              <CostPrediction
                cwd={(cwd || activeProject?.path)!}
                issue={{
                  number,
                  title,
                  body,
                  labels: normalizedLabels
                }}
                plan={plan ? { phases: plan.phases } : undefined}
                onPredictionLoaded={handlePredictionLoaded}
              />
            </div>
          )}
        </div>
      )}

      {/* PR Preview section */}
      <PRPreview issueNumber={number} />
    </div>
  )
}
