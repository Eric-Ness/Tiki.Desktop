import { useState, useEffect } from 'react'

// Types for PR data
export interface PullRequest {
  number: number
  title: string
  state: 'OPEN' | 'CLOSED' | 'MERGED'
  isDraft: boolean
  headRefName: string
  baseRefName: string
  url: string
  mergeable: string
  reviewDecision: string | null
  statusCheckRollup: {
    state: string
    contexts: { name: string; state: string; conclusion: string }[]
  } | null
}

interface PRPreviewProps {
  issueNumber: number
}

// Status badge component
function StatusBadge({ state, isDraft }: { state: string; isDraft: boolean }) {
  const stateStyles: Record<string, string> = {
    OPEN: 'bg-green-600 text-green-100',
    MERGED: 'bg-purple-600 text-purple-100',
    CLOSED: 'bg-red-600 text-red-100'
  }

  const stateLabels: Record<string, string> = {
    OPEN: 'Open',
    MERGED: 'Merged',
    CLOSED: 'Closed'
  }

  return (
    <div className="flex items-center gap-2">
      <span
        data-testid="pr-status-badge"
        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${stateStyles[state] || stateStyles.OPEN}`}
      >
        {stateLabels[state] || state}
      </span>
      {isDraft && (
        <span
          data-testid="pr-draft-badge"
          className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-600 text-slate-100"
        >
          Draft
        </span>
      )}
    </div>
  )
}

// Check status component
function CheckStatus({ checks }: { checks: { name: string; state: string; conclusion: string }[] | null }) {
  if (!checks || checks.length === 0) return null

  // Determine overall status
  const hasFailure = checks.some(c => c.conclusion === 'FAILURE')
  const allSuccess = checks.every(c => c.conclusion === 'SUCCESS')
  const hasPending = checks.some(c => c.state === 'IN_PROGRESS' || c.state === 'PENDING' || c.conclusion === '')

  const overallStatus = hasFailure ? 'failure' : (allSuccess ? 'success' : (hasPending ? 'pending' : 'success'))

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-1">
        {overallStatus === 'success' && (
          <div data-testid="check-status-success" className="flex items-center gap-1 text-green-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-xs">All checks passing</span>
          </div>
        )}
        {overallStatus === 'failure' && (
          <div data-testid="check-status-failure" className="flex items-center gap-1 text-red-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-xs">Some checks failing</span>
          </div>
        )}
        {overallStatus === 'pending' && (
          <div data-testid="check-status-pending" className="flex items-center gap-1 text-yellow-400">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs">Checks in progress</span>
          </div>
        )}
      </div>

      {/* Individual checks */}
      <div className="space-y-1 ml-5">
        {checks.map((check, index) => (
          <div key={index} className="flex items-center gap-2 text-xs text-slate-400">
            {check.conclusion === 'SUCCESS' && (
              <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {check.conclusion === 'FAILURE' && (
              <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            )}
            {(check.state === 'IN_PROGRESS' || check.conclusion === '') && (
              <svg className="w-3 h-3 text-yellow-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            )}
            <span>{check.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Review status component
function ReviewStatus({ decision }: { decision: string | null }) {
  if (!decision) return null

  const decisionStyles: Record<string, { className: string; label: string; icon: JSX.Element }> = {
    APPROVED: {
      className: 'text-green-400',
      label: 'Approved',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )
    },
    CHANGES_REQUESTED: {
      className: 'text-orange-400',
      label: 'Changes Requested',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )
    },
    REVIEW_REQUIRED: {
      className: 'text-yellow-400',
      label: 'Review Required',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )
    }
  }

  const config = decisionStyles[decision]
  if (!config) return null

  return (
    <div data-testid="review-status" className={`flex items-center gap-1 mt-2 ${config.className}`}>
      {config.icon}
      <span className="text-xs">{config.label}</span>
    </div>
  )
}

export function PRPreview({ issueNumber }: PRPreviewProps) {
  const [pr, setPr] = useState<PullRequest | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    window.tikiDesktop.github.getPRForIssue(issueNumber)
      .then((result) => {
        setPr(result as PullRequest | null)
      })
      .catch((error) => {
        console.error('Failed to fetch PR:', error)
        setPr(null)
      })
      .finally(() => setLoading(false))
  }, [issueNumber])

  if (loading) {
    return (
      <div className="text-sm text-slate-400 py-2">
        Loading PR...
      </div>
    )
  }

  if (!pr) {
    return null // No PR linked to this issue
  }

  const handleViewPR = () => {
    window.tikiDesktop.shell?.openExternal(pr.url)
  }

  return (
    <div className="pr-preview border-t border-slate-700 pt-3 mt-3">
      <h4 className="text-sm font-medium text-slate-300 mb-2">
        Pull Request #{pr.number}
      </h4>

      {/* Status and branch info */}
      <div className="flex flex-col gap-2">
        <StatusBadge state={pr.state} isDraft={pr.isDraft} />

        <div className="flex items-center gap-1 text-xs text-slate-400">
          <span className="font-mono bg-slate-700 px-1.5 py-0.5 rounded">{pr.headRefName}</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          <span className="font-mono bg-slate-700 px-1.5 py-0.5 rounded">{pr.baseRefName}</span>
        </div>
      </div>

      {/* Check status */}
      <CheckStatus checks={pr.statusCheckRollup?.contexts || null} />

      {/* Review status */}
      <ReviewStatus decision={pr.reviewDecision} />

      {/* View PR button */}
      <button
        onClick={handleViewPR}
        className="mt-3 flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 active:bg-slate-700 rounded transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        View PR
      </button>
    </div>
  )
}
