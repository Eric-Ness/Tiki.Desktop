import { useEffect, useCallback, useRef } from 'react'
import { useTikiStore, TikiState, ExecutionPlan, Release, Project, Execution } from '../stores/tiki-store'

/**
 * Raw execution format from state file (activeExecutions array items).
 * Has different property names than the store's Execution interface.
 */
interface RawExecution {
  id: string
  type?: 'release' | 'issue'  // Release executions have type: "release"
  issue?: number
  issueNumber?: number  // Some formats use this
  currentIssue?: number  // Release executions use this instead of issue/issueNumber
  issueTitle?: string
  currentPhase?: number | null
  totalPhases?: number | null
  status: string
  completedPhases?: number[]
  errorMessage?: string | null
  autoFixAttempt?: number | null
  autoFixMaxAttempts?: number | null
  activeHook?: string | null
  startedAt?: string | null
}

/**
 * Maps raw state from file to TikiState interface.
 * Handles field name differences (activeExecutions -> executions, issue -> issueNumber).
 */
function mapRawStateToTikiState(rawState: unknown): TikiState | null {
  if (!rawState || typeof rawState !== 'object') return null

  const state = rawState as Record<string, unknown>

  // Map activeExecutions to executions with correct property names
  let executions: Execution[] | undefined
  const rawExecutions = state.activeExecutions as RawExecution[] | undefined
  if (rawExecutions && Array.isArray(rawExecutions)) {
    executions = rawExecutions
      // Include release executions (have currentIssue) and issue executions (have issue/issueNumber)
      .filter((exec) => exec.issue !== undefined || exec.issueNumber !== undefined || exec.currentIssue !== undefined)
      .map((exec) => ({
        issueNumber: exec.issue ?? exec.issueNumber ?? exec.currentIssue ?? 0,
        status: exec.status as Execution['status'],
        currentPhase: exec.currentPhase ?? null,
        totalPhases: exec.totalPhases ?? null,
        completedPhases: exec.completedPhases ?? [],
        autoFixAttempt: exec.autoFixAttempt,
        maxAutoFixAttempts: exec.autoFixMaxAttempts ?? undefined,
        hookName: exec.activeHook,
        errorMessage: exec.errorMessage,
        startedAt: exec.startedAt
      }))
  }

  return {
    activeIssue: state.activeIssue as number | null,
    currentPhase: state.currentPhase as number | null,
    status: (state.status as TikiState['status']) || 'idle',
    completedPhases: (state.completedPhases as number[]) || [],
    lastActivity: state.lastActivity as string | null,
    autoFixAttempt: state.autoFixAttempt as number | null | undefined,
    maxAutoFixAttempts: state.maxAutoFixAttempts as number | undefined,
    hookName: state.hookName as string | null | undefined,
    errorMessage: state.errorMessage as string | null | undefined,
    executions
  }
}

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

  // Track whether initial data has been loaded for the current project
  const initialLoadDoneRef = useRef<string | null>(null)

  // Function to load all initial data from the file watcher
  const loadInitialData = useCallback(async () => {
    const [rawState, releases, queue] = await Promise.all([
      window.tikiDesktop.tiki.getState(),
      window.tikiDesktop.tiki.getReleases(),
      window.tikiDesktop.tiki.getQueue()
    ])
    const mappedState = mapRawStateToTikiState(rawState)
    setTikiState(mappedState)
    setReleases(releases as Release[])
    setQueue((queue as unknown[]) || [])

    // Load plan for active issue so phases display immediately
    if (mappedState?.activeIssue) {
      const planData = await window.tikiDesktop.tiki.getPlan(mappedState.activeIssue)
      if (planData && typeof planData === 'object' && 'plan' in planData) {
        const plan = (planData as { plan: ExecutionPlan }).plan
        if (plan?.issue?.number) {
          setPlan(plan.issue.number, plan)
          setCurrentPlan(plan)
        }
      }
    }
  }, [setTikiState, setReleases, setQueue, setPlan, setCurrentPlan])

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
    const cleanupState = window.tikiDesktop.tiki.onStateChange((rawState) => {
      setTikiState(mapRawStateToTikiState(rawState))
    })

    // Listen for plan changes
    const cleanupPlan = window.tikiDesktop.tiki.onPlanChange((data) => {
      if (data && data.plan) {
        const plan = data.plan as ExecutionPlan
        if (plan.issue?.number) {
          setPlan(plan.issue.number, plan)

          // Get plan execution status to check for active work
          const planStatus = getPlanExecutionStatus(plan)

          // IMPORTANT: Get fresh state from store, not from closure (stale closure fix)
          // The tikiState from useEffect closure may be stale when this callback fires
          const currentState = useTikiStore.getState().tikiState

          // If this is the active issue in state, update currentPlan
          if (currentState?.activeIssue === plan.issue.number) {
            setCurrentPlan(plan)

            // Check if plan shows more progress than state - update state if so
            const stateCompletedCount = currentState.completedPhases?.length || 0
            if (planStatus.completedPhases.length > stateCompletedCount) {
              // Plan is ahead of state - update state with plan data
              setTikiState({
                ...currentState,
                currentPhase: planStatus.currentPhase,
                completedPhases: planStatus.completedPhases,
                status: planStatus.status,
                lastActivity: new Date().toISOString()
              })
            }
          } else if (!currentState?.activeIssue && planStatus.isActive) {
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
          // Note: If currentState has a DIFFERENT activeIssue, we don't override it
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
  }, [activeProject, setTikiState, setPlan, setCurrentPlan, setQueue, setReleases, updateRelease, loadInitialData])

  return null
}
