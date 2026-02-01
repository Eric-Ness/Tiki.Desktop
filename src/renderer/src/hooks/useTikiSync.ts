import { useEffect, useCallback, useRef } from 'react'
import { useTikiStore, TikiState, ExecutionPlan, Release, Project } from '../stores/tiki-store'

/**
 * Determines if a plan has active execution (in_progress or failed phase).
 * Used as a fallback when state.json is stale.
 */
function getPlanExecutionStatus(plan: ExecutionPlan): {
  isActive: boolean
  currentPhase: number | null
  completedPhases: number[]
  status: 'executing' | 'failed' | 'idle'
  errorMessage: string | null
} {
  const phases = plan.phases || []
  const inProgressPhase = phases.find((p) => p.status === 'in_progress')
  const failedPhase = phases.find((p) => p.status === 'failed')
  const completedPhases = phases.filter((p) => p.status === 'completed').map((p) => p.number)

  if (inProgressPhase) {
    return {
      isActive: true,
      currentPhase: inProgressPhase.number,
      completedPhases,
      status: 'executing',
      errorMessage: null
    }
  }

  if (failedPhase) {
    return {
      isActive: true,
      currentPhase: failedPhase.number,
      completedPhases,
      status: 'failed',
      errorMessage: failedPhase.error || null
    }
  }

  return {
    isActive: false,
    currentPhase: null,
    completedPhases,
    status: 'idle',
    errorMessage: null
  }
}

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

          // Get plan execution status to check for active work
          const planStatus = getPlanExecutionStatus(plan)

          // If this is the active issue in state, update currentPlan
          if (tikiState?.activeIssue === plan.issue.number) {
            setCurrentPlan(plan)

            // Check if plan shows more progress than state - update state if so
            const stateCompletedCount = tikiState.completedPhases?.length || 0
            if (planStatus.completedPhases.length > stateCompletedCount) {
              // Plan is ahead of state - update state with plan data
              setTikiState({
                ...tikiState,
                currentPhase: planStatus.currentPhase,
                completedPhases: planStatus.completedPhases,
                status: planStatus.status,
                lastActivity: new Date().toISOString()
              })
            }
          } else if (!tikiState?.activeIssue && planStatus.isActive) {
            // Fallback: State shows no active issue, but plan shows active execution
            // This handles the case where Tiki commands don't update state.json
            setCurrentPlan(plan)

            // Derive state from plan - this syncs the UI even when state.json lags
            const derivedState: TikiState = {
              activeIssue: plan.issue.number,
              currentPhase: planStatus.currentPhase,
              status: planStatus.status,
              completedPhases: planStatus.completedPhases,
              lastActivity: new Date().toISOString(),
              errorMessage: planStatus.errorMessage
            }
            setTikiState(derivedState)
          }
          // Note: If tikiState has a DIFFERENT activeIssue, we don't override it
          // The state file is authoritative when it has an active issue
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
