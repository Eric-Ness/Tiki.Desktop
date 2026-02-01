import { useEffect, useCallback, useRef } from 'react'
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

  // Track whether initial data has been loaded for the current project
  const initialLoadDoneRef = useRef<string | null>(null)

  // Function to load all initial data from the file watcher
  const loadInitialData = useCallback(async () => {
    const [state, releases, queue] = await Promise.all([
      window.tikiDesktop.tiki.getState(),
      window.tikiDesktop.tiki.getReleases(),
      window.tikiDesktop.tiki.getQueue()
    ])
    setTikiState(state as TikiState | null)
    setReleases(releases as Release[])
    setQueue((queue as unknown[]) || [])
  }, [setTikiState, setReleases, setQueue])

  useEffect(() => {
    // If no active project, clear state and don't set up listeners
    if (!activeProject) {
      setTikiState(null)
      setReleases([])
      setQueue([])
      initialLoadDoneRef.current = null
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

    // Listen for project switch completion - this is when the file watcher is ready
    const cleanupSwitched = window.tikiDesktop.projects.onSwitched(({ path }) => {
      // Only load if this is for our active project and we haven't loaded yet
      if (path === activeProject.path && initialLoadDoneRef.current !== path) {
        initialLoadDoneRef.current = path
        loadInitialData()
      }
    })

    return () => {
      cleanupState()
      cleanupPlan()
      cleanupQueue()
      cleanupRelease()
      cleanupSwitched()
    }
  }, [activeProject, setTikiState, setPlan, setCurrentPlan, setQueue, setReleases, updateRelease, tikiState?.activeIssue, loadInitialData])

  return null
}
