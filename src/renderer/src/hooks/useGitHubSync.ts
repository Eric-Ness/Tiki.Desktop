import { useEffect, useCallback, useRef } from 'react'
import { useTikiStore, GitHubIssue, Project } from '../stores/tiki-store'

// Minimum time between auto-refreshes (prevent excessive API calls)
const AUTO_REFRESH_THROTTLE_MS = 30000

/**
 * Hook that syncs GitHub issues with the Zustand store.
 * Loads issues on mount, listens for updates, and auto-refreshes on window focus.
 * @param activeProject - The currently active project, or null if no project is selected
 */
export function useGitHubSync(activeProject: Project | null) {
  const setIssues = useTikiStore((state) => state.setIssues)
  const setGithubLoading = useTikiStore((state) => state.setGithubLoading)
  const setGithubError = useTikiStore((state) => state.setGithubError)
  const lastRefreshRef = useRef<number>(0)

  const loadIssues = useCallback(async (force = false, projectPath?: string) => {
    // Use provided projectPath or fall back to activeProject.path
    const cwd = projectPath ?? activeProject?.path
    if (!cwd) return

    // Throttle auto-refresh (unless forced)
    if (!force) {
      const now = Date.now()
      if (now - lastRefreshRef.current < AUTO_REFRESH_THROTTLE_MS) {
        return
      }
      lastRefreshRef.current = now
    }

    setGithubLoading(true)
    setGithubError(null)

    try {
      // First check if gh CLI is available
      const cliStatus = await window.tikiDesktop.github.checkCli()
      if (!cliStatus.available || !cliStatus.authenticated) {
        setGithubError(cliStatus.error || 'GitHub CLI not available')
        setGithubLoading(false)
        return
      }

      // Fetch all issues (filter in UI)
      const issues = (await window.tikiDesktop.github.getIssues('all', cwd)) as GitHubIssue[]
      setIssues(issues)
      lastRefreshRef.current = Date.now()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load issues'
      setGithubError(message)
    } finally {
      setGithubLoading(false)
    }
  }, [activeProject?.path, setIssues, setGithubLoading, setGithubError])

  useEffect(() => {
    // If no active project, clear issues and don't set up listeners
    if (!activeProject) {
      setIssues([])
      return
    }

    // Load issues on mount/project change (forced), passing path explicitly to avoid stale closure
    loadIssues(true, activeProject.path)

    // Listen for issue updates from main process
    const cleanupUpdates = window.tikiDesktop.github.onIssuesUpdated((issues) => {
      setIssues(issues as GitHubIssue[])
    })

    // Listen for errors
    const cleanupErrors = window.tikiDesktop.github.onError((error) => {
      setGithubError(error.error)
    })

    // Auto-refresh on window focus
    const handleFocus = () => {
      loadIssues(false) // throttled
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      cleanupUpdates()
      cleanupErrors()
      window.removeEventListener('focus', handleFocus)
    }
  }, [activeProject, loadIssues, setIssues, setGithubError])

  // Return refresh function for manual refresh (forced)
  return { refresh: () => loadIssues(true) }
}
