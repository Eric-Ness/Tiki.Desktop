import { useEffect } from 'react'
import { useTikiStore, TikiState, ExecutionPlan, Release, Project } from '../stores/tiki-store'

/**
 * Hook that syncs file watcher events with the Zustand store.
 * Should be called once at the app root level.
 * @param activeProject - The currently active project, or null if no project is selected
 */
export function useTikiSync(activeProject: Project | null) {
  const setTikiState = useTikiStore((state) => state.setTikiState)
  const setPlan = useTikiStore((state) => state.setPlan)
  const setCurrentPlan = useTikiStore((state) => state.setCurrentPlan)
  const setQueue = useTikiStore((state) => state.setQueue)
  const setReleases = useTikiStore((state) => state.setReleases)
  const updateRelease = useTikiStore((state) => state.updateRelease)
  const tikiState = useTikiStore((state) => state.tikiState)

  useEffect(() => {
    // If no active project, clear state and don't set up listeners
    if (!activeProject) {
      setTikiState(null)
      setReleases([])
      setQueue([])
      return
    }

    // Listen for state changes
    const cleanupState = window.tikiDesktop.tiki.onStateChange((state) => {
      setTikiState(state as TikiState | null)
    })

    // Listen for plan changes
    const cleanupPlan = window.tikiDesktop.tiki.onPlanChange((data) => {
      if (data && data.plan) {
        const plan = data.plan as ExecutionPlan
        if (plan.issue?.number) {
          setPlan(plan.issue.number, plan)

          // If this is the active issue, also update currentPlan
          if (tikiState?.activeIssue === plan.issue.number) {
            setCurrentPlan(plan)
          }
        }
      }
    })

    // Listen for queue changes
    const cleanupQueue = window.tikiDesktop.tiki.onQueueChange((queue) => {
      setQueue((queue as unknown[]) || [])
    })

    // Listen for release changes
    const cleanupRelease = window.tikiDesktop.tiki.onReleaseChange((data) => {
      if (data && data.release) {
        const release = data.release as Release
        if (release.version) {
          updateRelease(release.version, release)
        }
      }
    })

    // Load initial state
    window.tikiDesktop.tiki.getState().then((state) => {
      setTikiState(state as TikiState | null)
    })

    // Load initial releases
    window.tikiDesktop.tiki.getReleases().then((releases) => {
      setReleases(releases as Release[])
    })

    return () => {
      cleanupState()
      cleanupPlan()
      cleanupQueue()
      cleanupRelease()
    }
  }, [activeProject, setTikiState, setPlan, setCurrentPlan, setQueue, setReleases, updateRelease, tikiState?.activeIssue])

  return null
}
