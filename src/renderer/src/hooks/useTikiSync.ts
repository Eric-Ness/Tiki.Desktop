import { useEffect, useCallback, useRef } from 'react'
import { useTikiStore, TikiState, ExecutionPlan, Release, Project, Execution, YoloState, PhasesDisplayState } from '../stores/tiki-store'

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
export function mapRawStateToTikiState(rawState: unknown): TikiState | null {
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
    // Simplified state format fields (v3)
    startedAt: state.startedAt as string | null | undefined,
    lastCompletedIssue: state.lastCompletedIssue as number | null | undefined,
    lastCompletedAt: state.lastCompletedAt as string | null | undefined,
    totalPhases: state.totalPhases as number | null | undefined,
    activeIssueTitle: state.activeIssueTitle as string | null | undefined,
    // Multi-execution support (v2 format, will be undefined in simplified format)
    executions
  }
}

/**
 * Maps raw yolo state from file to YoloState interface.
 */
function mapRawYoloStateToYoloState(rawState: unknown): YoloState | null {
  if (!rawState || typeof rawState !== 'object') return null

  const state = rawState as Record<string, unknown>

  return {
    release: (state.release as string) || '',
    status: (state.status as YoloState['status']) || 'idle',
    startedAt: (state.startedAt as string) || null,
    lastActivity: (state.lastActivity as string) || null,
    currentIssue: (state.currentIssue as number) || null,
    issueOrder: (state.issueOrder as number[]) || [],
    completedIssues: (state.completedIssues as number[]) || [],
    skippedIssues: (state.skippedIssues as number[]) || [],
    failedIssues: (state.failedIssues as number[]) || []
  }
}

/**
 * Validates raw phases data from phases.json.
 * Returns typed PhasesDisplayState if valid, null otherwise.
 */
export function validatePhasesState(data: unknown): PhasesDisplayState | null {
  if (!data || typeof data !== 'object') return null

  const phases = data as Record<string, unknown>

  // Check schema version
  if (typeof phases.schemaVersion !== 'number') {
    console.warn('[useTikiSync] phases.json missing schemaVersion')
    return null
  }

  // Future: handle schema migrations
  if (phases.schemaVersion > 1) {
    console.warn(`[useTikiSync] phases.json schemaVersion ${phases.schemaVersion} not supported`)
    // Attempt to read what we understand
  }

  // Validate required structure
  if (!Array.isArray(phases.executions)) {
    console.warn('[useTikiSync] phases.json missing executions array')
    return null
  }

  // Validate each execution has required fields
  for (const exec of phases.executions as unknown[]) {
    if (!exec || typeof exec !== 'object') {
      console.warn('[useTikiSync] phases.json has invalid execution entry')
      return null
    }
    const e = exec as Record<string, unknown>
    if (typeof e.issueNumber !== 'number' || !Array.isArray(e.phases)) {
      console.warn('[useTikiSync] phases.json execution missing issueNumber or phases')
      return null
    }
  }

  return data as PhasesDisplayState
}

/**
 * Bootstraps PhasesDisplayState from legacy state files.
 * Used during migration when phases.json doesn't exist yet.
 */
export async function bootstrapPhasesFromLegacy(): Promise<PhasesDisplayState | null> {
  const state = await window.tikiDesktop.tiki.getState()
  const rawState = mapRawStateToTikiState(state)

  // No active work - return minimal state
  if (!rawState?.activeIssue) {
    return {
      schemaVersion: 1,
      executions: [],
      releaseContext: null,
      lastUpdated: new Date().toISOString(),
      lastCompleted: rawState?.lastCompletedIssue ? {
        issueNumber: rawState.lastCompletedIssue,
        issueTitle: rawState.activeIssueTitle ?? `Issue #${rawState.lastCompletedIssue}`,
        completedAt: rawState.lastCompletedAt ?? new Date().toISOString()
      } : null
    }
  }

  // Active execution exists - bootstrap from current.json + plan
  const planData = await window.tikiDesktop.tiki.getPlan(rawState.activeIssue)
  let plan: ExecutionPlan | null = null
  if (planData && typeof planData === 'object' && 'plan' in planData) {
    plan = (planData as { plan: ExecutionPlan }).plan
  }

  if (!plan?.phases) {
    // Can't bootstrap without plan, show degraded state
    return {
      schemaVersion: 1,
      executions: [{
        id: `exec-${rawState.activeIssue}-bootstrap`,
        issueNumber: rawState.activeIssue,
        issueTitle: rawState.activeIssueTitle ?? `Issue #${rawState.activeIssue}`,
        issueUrl: '',
        status: rawState.status === 'failed' ? 'failed' : 'executing',
        currentPhase: rawState.currentPhase ?? 1,
        phases: [], // Unknown - plan not available
        completedCount: (rawState.currentPhase ?? 1) - 1,
        totalCount: rawState.totalPhases ?? 0,
        startedAt: rawState.startedAt ?? new Date().toISOString(),
        lastActivity: rawState.lastActivity ?? new Date().toISOString(),
        errorMessage: rawState.errorMessage ?? null,
        autoFix: null
      }],
      releaseContext: null,
      lastUpdated: new Date().toISOString(),
      lastCompleted: null
    }
  }

  // Full bootstrap from plan
  return {
    schemaVersion: 1,
    executions: [{
      id: `exec-${rawState.activeIssue}-bootstrap`,
      issueNumber: plan.issue.number,
      issueTitle: plan.issue.title,
      issueUrl: '',
      status: rawState.status === 'failed' ? 'failed' : 'executing',
      currentPhase: rawState.currentPhase ?? 1,
      phases: plan.phases.map(p => ({
        number: p.number,
        title: p.title,
        status: p.status as 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped',
        startedAt: null,
        completedAt: null
      })),
      completedCount: plan.phases.filter(p => p.status === 'completed').length,
      totalCount: plan.phases.length,
      startedAt: rawState.startedAt ?? new Date().toISOString(),
      lastActivity: rawState.lastActivity ?? new Date().toISOString(),
      errorMessage: rawState.errorMessage ?? null,
      autoFix: null
    }],
    releaseContext: null,
    lastUpdated: new Date().toISOString(),
    lastCompleted: null
  }
}

/**
 * Hook that syncs file watcher events with the Zustand store.
 * Should be called once at the app root level.
 * @param activeProject - The currently active project, or null if no project is selected
 */
export function useTikiSync(activeProject: Project | null) {
  const setTikiState = useTikiStore((state) => state.setTikiState)
  const setYoloState = useTikiStore((state) => state.setYoloState)
  const setPlan = useTikiStore((state) => state.setPlan)
  const setCurrentPlan = useTikiStore((state) => state.setCurrentPlan)
  const setQueue = useTikiStore((state) => state.setQueue)
  const setReleases = useTikiStore((state) => state.setReleases)
  const updateRelease = useTikiStore((state) => state.updateRelease)
  const setPhasesDisplay = useTikiStore((state) => state.setPhasesDisplay)

  // Track whether initial data has been loaded for the current project
  const initialLoadDoneRef = useRef<string | null>(null)

  // Function to load all initial data from the file watcher
  const loadInitialData = useCallback(async () => {
    const [rawState, rawYoloState, releases, queue, rawPhases] = await Promise.all([
      window.tikiDesktop.tiki.getState(),
      window.tikiDesktop.tiki.getYoloState(),
      window.tikiDesktop.tiki.getReleases(),
      window.tikiDesktop.tiki.getQueue(),
      window.tikiDesktop.tiki.getPhases()  // Load phases.json for new state panel
    ])
    const mappedState = mapRawStateToTikiState(rawState)
    const mappedYoloState = mapRawYoloStateToYoloState(rawYoloState)
    setTikiState(mappedState)
    setYoloState(mappedYoloState)
    setReleases(releases as Release[])
    setQueue((queue as unknown[]) || [])

    // Handle phases display state (new state panel system)
    const validatedPhases = validatePhasesState(rawPhases)
    if (validatedPhases) {
      setPhasesDisplay(validatedPhases)
    } else {
      // Fallback: bootstrap from legacy files when phases.json doesn't exist
      const bootstrapped = await bootstrapPhasesFromLegacy()
      setPhasesDisplay(bootstrapped)
    }

    // Load plan for active issue so phases display immediately
    // Check both tikiState.activeIssue and yoloState.currentIssue
    const activeIssue = mappedState?.activeIssue ?? mappedYoloState?.currentIssue
    if (activeIssue) {
      const planData = await window.tikiDesktop.tiki.getPlan(activeIssue)
      if (planData && typeof planData === 'object' && 'plan' in planData) {
        const plan = (planData as { plan: ExecutionPlan }).plan
        if (plan?.issue?.number) {
          setPlan(plan.issue.number, plan)
          setCurrentPlan(plan)
        }
      }
    }
  }, [setTikiState, setYoloState, setReleases, setQueue, setPlan, setCurrentPlan, setPhasesDisplay])

  useEffect(() => {
    // If no active project, clear state and don't set up listeners
    if (!activeProject) {
      setTikiState(null)
      setYoloState(null)
      setPhasesDisplay(null)
      setReleases([])
      setQueue([])
      initialLoadDoneRef.current = null
      return
    }

    // Listen for state changes
    const cleanupState = window.tikiDesktop.tiki.onStateChange((rawState) => {
      setTikiState(mapRawStateToTikiState(rawState))
    })

    // Listen for yolo state changes
    const cleanupYolo = window.tikiDesktop.tiki.onYoloChange((rawYoloState) => {
      setYoloState(mapRawYoloStateToYoloState(rawYoloState))
    })

    // Listen for plan changes
    // Note: State panel now uses phases.json as the authoritative source for display.
    // This handler only caches plans for detail view and issue lookup.
    const cleanupPlan = window.tikiDesktop.tiki.onPlanChange((data) => {
      if (data && data.plan) {
        const plan = data.plan as ExecutionPlan
        if (plan.issue?.number) {
          // Cache the plan
          setPlan(plan.issue.number, plan)

          // Get fresh state to check if this is the active issue
          const storeState = useTikiStore.getState()
          const currentState = storeState.tikiState
          const currentYoloState = storeState.yoloState

          // Set as current plan if this issue is active
          const isActiveViaState = currentState?.activeIssue === plan.issue.number
          const isActiveViaYolo = currentYoloState?.currentIssue === plan.issue.number

          if (isActiveViaState || isActiveViaYolo) {
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

    // Listen for phases changes - simple and direct (new state panel system)
    const cleanupPhases = window.tikiDesktop.tiki.onPhasesChange((data) => {
      const validated = validatePhasesState(data)
      if (validated) {
        setPhasesDisplay(validated)
      }
      // If validation fails, keep existing state (don't clear on bad data)
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
      cleanupYolo()
      cleanupPlan()
      cleanupQueue()
      cleanupRelease()
      cleanupPhases()
      cleanupSwitched()
    }
  }, [activeProject, setTikiState, setYoloState, setPlan, setCurrentPlan, setQueue, setReleases, updateRelease, setPhasesDisplay, loadInitialData])

  return null
}
