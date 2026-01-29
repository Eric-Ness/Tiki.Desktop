import { shell } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { notifyWorkflowFailed, notifyWorkflowRecovered } from './notification-service'

const execFileAsync = promisify(execFile)

// Cache configuration
export const CACHE_TTL_MS = 60 * 1000 // 1 minute cache
export const POLLING_INTERVAL_MS = 30 * 1000 // 30 seconds for in-progress runs

// TypeScript interfaces
export interface Workflow {
  id: number
  name: string
  state: string
}

export interface WorkflowRun {
  id: number
  name: string
  status: string
  conclusion: string | null
  event: string
  headSha: string
  createdAt: string
  updatedAt: string
  url: string
}

export interface Job {
  name: string
  status: string
  conclusion: string | null
}

export interface RunDetails extends WorkflowRun {
  jobs: Job[]
  logsUrl: string
}

// Internal response types from gh CLI
interface GhWorkflowResponse {
  id: number
  name: string
  state: string
}

interface GhRunResponse {
  databaseId: number
  displayTitle: string
  status: string
  conclusion: string | null
  event: string
  headSha: string
  createdAt: string
  updatedAt: string
  url: string
}

interface GhRunDetailsResponse extends GhRunResponse {
  jobs: Job[]
}

// Cache storage
interface CacheEntry<T> {
  data: T
  timestamp: number
  isInProgress?: boolean
}

let workflowsCache: Map<string, CacheEntry<Workflow[]>> = new Map()
let runsCache: Map<string, CacheEntry<WorkflowRun[]>> = new Map()
let runDetailsCache: Map<string, CacheEntry<RunDetails>> = new Map()

// Status transition tracking for notifications
// Key: cwd:workflowId, Value: { conclusion: string | null, workflowName: string, runUrl: string }
interface WorkflowStatusTrack {
  conclusion: string | null
  workflowName: string
  runUrl: string
}
const workflowStatusTracker: Map<string, WorkflowStatusTrack> = new Map()

/**
 * Clear all workflow caches
 */
export function clearWorkflowCache(): void {
  workflowsCache.clear()
  runsCache.clear()
  runDetailsCache.clear()
  workflowStatusTracker.clear()
}

/**
 * Check for status transitions and emit notifications
 * Call this after fetching new workflow runs
 */
export function checkStatusTransitions(
  workflowId: number,
  cwd: string,
  runs: WorkflowRun[]
): void {
  const key = `${cwd}:${workflowId}`

  // Get the latest completed run (has a conclusion)
  const latestCompletedRun = runs.find((run) => run.conclusion !== null)
  if (!latestCompletedRun) {
    return // No completed runs to check
  }

  const previousStatus = workflowStatusTracker.get(key)
  const currentConclusion = latestCompletedRun.conclusion

  // Update the tracker with the current status
  workflowStatusTracker.set(key, {
    conclusion: currentConclusion,
    workflowName: latestCompletedRun.name,
    runUrl: latestCompletedRun.url
  })

  // If no previous status, this is the first time we're seeing this workflow
  if (!previousStatus) {
    return
  }

  // Check for status transitions
  const wasSuccess = previousStatus.conclusion === 'success'
  const wasFailure = previousStatus.conclusion === 'failure'
  const isSuccess = currentConclusion === 'success'
  const isFailure = currentConclusion === 'failure'

  // Success -> Failure transition
  if (wasSuccess && isFailure) {
    notifyWorkflowFailed(latestCompletedRun.name, latestCompletedRun.url)
  }
  // Failure -> Success transition (recovered)
  else if (wasFailure && isSuccess) {
    notifyWorkflowRecovered(latestCompletedRun.name)
  }
}

/**
 * Check if cache entry is still valid
 */
function isCacheValid<T>(entry: CacheEntry<T> | undefined): boolean {
  if (!entry) return false

  const now = Date.now()
  const ttl = entry.isInProgress ? POLLING_INTERVAL_MS : CACHE_TTL_MS

  return now - entry.timestamp < ttl
}

/**
 * Transform gh CLI workflow response to our interface
 */
function transformWorkflow(ghWorkflow: GhWorkflowResponse): Workflow {
  return {
    id: ghWorkflow.id,
    name: ghWorkflow.name,
    state: ghWorkflow.state
  }
}

/**
 * Transform gh CLI run response to our interface
 */
function transformRun(ghRun: GhRunResponse): WorkflowRun {
  return {
    id: ghRun.databaseId,
    name: ghRun.displayTitle,
    status: ghRun.status,
    conclusion: ghRun.conclusion,
    event: ghRun.event,
    headSha: ghRun.headSha,
    createdAt: ghRun.createdAt,
    updatedAt: ghRun.updatedAt,
    url: ghRun.url
  }
}

/**
 * Transform gh CLI run details response to our interface
 */
function transformRunDetails(ghRun: GhRunDetailsResponse): RunDetails {
  return {
    id: ghRun.databaseId,
    name: ghRun.displayTitle,
    status: ghRun.status,
    conclusion: ghRun.conclusion,
    event: ghRun.event,
    headSha: ghRun.headSha,
    createdAt: ghRun.createdAt,
    updatedAt: ghRun.updatedAt,
    url: ghRun.url,
    jobs: ghRun.jobs || [],
    logsUrl: `${ghRun.url}/logs`
  }
}

/**
 * Get list of workflows for the repository
 */
export async function getWorkflows(cwd?: string): Promise<Workflow[]> {
  const workDir = cwd || process.cwd()
  const cacheKey = workDir

  // Check cache
  const cached = workflowsCache.get(cacheKey)
  if (isCacheValid(cached)) {
    return cached!.data
  }

  try {
    const { stdout } = await execFileAsync(
      'gh',
      ['workflow', 'list', '--json', 'id,name,state'],
      { cwd: workDir, timeout: 10000 }
    )

    const workflows: GhWorkflowResponse[] = JSON.parse(stdout)
    const result = workflows.map(transformWorkflow)

    // Update cache
    workflowsCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    })

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to fetch workflows: ${errorMessage}`)
  }
}

/**
 * Get recent runs for a specific workflow
 */
export async function getWorkflowRuns(workflowId: number, cwd?: string): Promise<WorkflowRun[]> {
  const workDir = cwd || process.cwd()
  const cacheKey = `${workDir}:${workflowId}`

  // Check cache
  const cached = runsCache.get(cacheKey)
  if (isCacheValid(cached)) {
    return cached!.data
  }

  try {
    const { stdout } = await execFileAsync(
      'gh',
      [
        'run',
        'list',
        '--workflow',
        String(workflowId),
        '--json',
        'databaseId,displayTitle,status,conclusion,event,headSha,createdAt,updatedAt,url'
      ],
      { cwd: workDir, timeout: 10000 }
    )

    const runs: GhRunResponse[] = JSON.parse(stdout)
    const result = runs.map(transformRun)

    // Check if any runs are in progress for cache TTL
    const hasInProgress = result.some((run) => run.status === 'in_progress')

    // Update cache
    runsCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      isInProgress: hasInProgress
    })

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to fetch workflow runs: ${errorMessage}`)
  }
}

/**
 * Get detailed information for a specific run
 */
export async function getRunDetails(runId: number, cwd?: string): Promise<RunDetails> {
  const workDir = cwd || process.cwd()
  const cacheKey = `${workDir}:${runId}`

  // Check cache
  const cached = runDetailsCache.get(cacheKey)
  if (isCacheValid(cached)) {
    return cached!.data
  }

  try {
    const { stdout } = await execFileAsync(
      'gh',
      [
        'run',
        'view',
        String(runId),
        '--json',
        'databaseId,displayTitle,status,conclusion,event,headSha,createdAt,updatedAt,url,jobs'
      ],
      { cwd: workDir, timeout: 10000 }
    )

    const runDetails: GhRunDetailsResponse = JSON.parse(stdout)
    const result = transformRunDetails(runDetails)

    // Use shorter polling interval for in-progress runs
    const isInProgress = result.status === 'in_progress'

    // Update cache
    runDetailsCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      isInProgress
    })

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to fetch run details: ${errorMessage}`)
  }
}

/**
 * Open a workflow run in the default browser
 */
export async function openRunInBrowser(url: string): Promise<void> {
  try {
    await shell.openExternal(url)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to open run in browser: ${errorMessage}`)
  }
}
