import { useEffect, useRef, useCallback } from 'react'
import { useTikiStore, GitHubIssue, ExecutionPlan, Release } from '../stores/tiki-store'

/**
 * Debounce delay for index updates (ms)
 */
const INDEX_UPDATE_DEBOUNCE_MS = 500

/**
 * Transform GitHub issues to searchable content format
 */
function transformIssuesToSearchable(issues: GitHubIssue[]) {
  return issues.map((issue) => ({
    type: 'issue' as const,
    id: String(issue.number),
    title: issue.title,
    body: issue.body || '',
    labels: issue.labels.map((l) => l.name)
  }))
}

/**
 * Transform execution plans to searchable content format
 */
function transformPlansToSearchable(plans: Map<number, ExecutionPlan>) {
  const items: Array<{
    type: 'plan'
    id: string
    title: string
    body: string
    labels?: string[]
  }> = []

  plans.forEach((plan, issueNumber) => {
    // Combine phase titles and content into body for searchability
    const phaseContent = plan.phases
      .map((phase) => `Phase ${phase.number}: ${phase.title}\n${phase.summary || ''}`)
      .join('\n\n')

    items.push({
      type: 'plan',
      id: String(issueNumber),
      title: `Plan for #${issueNumber}: ${plan.issue.title}`,
      body: phaseContent
    })
  })

  return items
}

/**
 * Transform releases to searchable content format
 */
function transformReleasesToSearchable(releases: Release[]) {
  return releases.map((release) => {
    // Combine issue titles into body for searchability
    const issueContent = release.issues
      .map((issue) => `#${issue.number}: ${issue.title}`)
      .join('\n')

    return {
      type: 'release' as const,
      id: release.version,
      title: `Release ${release.version}`,
      body: issueContent,
      labels: [release.status]
    }
  })
}

/**
 * Hook that syncs tiki-store data to the search index when data changes.
 * Uses debouncing (500ms) to avoid excessive index updates.
 * Should be called once at the app root level.
 */
export function useSearchIndexSync() {
  const issues = useTikiStore((state) => state.issues)
  const plans = useTikiStore((state) => state.plans)
  const releases = useTikiStore((state) => state.releases)

  // Refs for debounce timers
  const issuesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const plansTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const releasesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced index update for issues
  const updateIssuesIndex = useCallback((issuesList: GitHubIssue[]) => {
    if (issuesTimerRef.current) {
      clearTimeout(issuesTimerRef.current)
    }
    issuesTimerRef.current = setTimeout(() => {
      const searchableItems = transformIssuesToSearchable(issuesList)
      window.tikiDesktop.search.updateIndex('issue', searchableItems)
    }, INDEX_UPDATE_DEBOUNCE_MS)
  }, [])

  // Debounced index update for plans
  const updatePlansIndex = useCallback((plansMap: Map<number, ExecutionPlan>) => {
    if (plansTimerRef.current) {
      clearTimeout(plansTimerRef.current)
    }
    plansTimerRef.current = setTimeout(() => {
      const searchableItems = transformPlansToSearchable(plansMap)
      window.tikiDesktop.search.updateIndex('plan', searchableItems)
    }, INDEX_UPDATE_DEBOUNCE_MS)
  }, [])

  // Debounced index update for releases
  const updateReleasesIndex = useCallback((releasesList: Release[]) => {
    if (releasesTimerRef.current) {
      clearTimeout(releasesTimerRef.current)
    }
    releasesTimerRef.current = setTimeout(() => {
      const searchableItems = transformReleasesToSearchable(releasesList)
      window.tikiDesktop.search.updateIndex('release', searchableItems)
    }, INDEX_UPDATE_DEBOUNCE_MS)
  }, [])

  // Sync issues to search index when they change
  useEffect(() => {
    updateIssuesIndex(issues)
  }, [issues, updateIssuesIndex])

  // Sync plans to search index when they change
  useEffect(() => {
    updatePlansIndex(plans)
  }, [plans, updatePlansIndex])

  // Sync releases to search index when they change
  useEffect(() => {
    updateReleasesIndex(releases)
  }, [releases, updateReleasesIndex])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (issuesTimerRef.current) {
        clearTimeout(issuesTimerRef.current)
      }
      if (plansTimerRef.current) {
        clearTimeout(plansTimerRef.current)
      }
      if (releasesTimerRef.current) {
        clearTimeout(releasesTimerRef.current)
      }
    }
  }, [])

  return null
}
