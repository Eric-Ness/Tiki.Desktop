import * as chokidar from 'chokidar'
import { BrowserWindow } from 'electron'
import { readFile, readdir, mkdir, writeFile, unlink } from 'fs/promises'
import { join, basename } from 'path'
import { existsSync } from 'fs'
import {
  notifyPhaseCompleted,
  notifyPhaseFailed,
  notifyIssuePlanned,
  notifyIssueShipped
} from './notification-service'
import { logger } from './logger'

const log = logger.scoped('FileWatcher')

let watcher: chokidar.FSWatcher | null = null
let mainWindow: BrowserWindow | null = null
let projectPath: string | null = null

// Flag to skip notifications during initial file scan
let isInitialScan = true

// State tracking for notifications
interface PlanState {
  status: string
  phases: Array<{
    number: number
    title: string
    status: string
  }>
  issue?: {
    number: number
    title: string
  }
}

const previousPlanStates: Map<string, PlanState> = new Map()

// Debounce timers
const debounceTimers: Map<string, NodeJS.Timeout> = new Map()
const DEBOUNCE_MS = 100

export function setFileWatcherWindow(window: BrowserWindow): void {
  mainWindow = window
}

function debounce(key: string, fn: () => void): void {
  const existing = debounceTimers.get(key)
  if (existing) {
    clearTimeout(existing)
  }
  debounceTimers.set(
    key,
    setTimeout(() => {
      debounceTimers.delete(key)
      fn()
    }, DEBOUNCE_MS)
  )
}

async function safeReadJson(filePath: string): Promise<unknown | null> {
  try {
    const content = await readFile(filePath, 'utf-8')
    return JSON.parse(content)
  } catch {
    // File doesn't exist or invalid JSON
    return null
  }
}

function sendToRenderer(channel: string, data: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}

async function handleStateChange(filePath: string): Promise<void> {
  debounce('state', async () => {
    const data = await safeReadJson(filePath)
    sendToRenderer('tiki:state-changed', data)
  })
}

async function handlePlanChange(filePath: string): Promise<void> {
  const filename = basename(filePath)
  // Capture the flag now, before debounce delays execution
  const wasInitialScan = isInitialScan
  debounce(`plan-${filename}`, async () => {
    const data = await safeReadJson(filePath) as PlanState | null
    if (data) {
      // Check for state changes to trigger notifications
      const previousState = previousPlanStates.get(filename)

      // Only send notifications if this wasn't part of the initial scan
      if (!wasInitialScan) {
        if (previousState && data.issue) {
          // Check for phase completions/failures
          for (const phase of data.phases || []) {
            const prevPhase = previousState.phases?.find((p) => p.number === phase.number)

            if (prevPhase && prevPhase.status !== phase.status) {
              if (phase.status === 'completed' && prevPhase.status !== 'completed') {
                notifyPhaseCompleted(phase.number, phase.title, data.issue.number)
              } else if (phase.status === 'failed' && prevPhase.status !== 'failed') {
                notifyPhaseFailed(phase.number, phase.title, data.issue.number)
              }
            }
          }

          // Check for plan status changes
          if (previousState.status !== data.status) {
            if (data.status === 'shipped') {
              notifyIssueShipped(data.issue.number, data.issue.title)
            }
          }
        } else if (!previousState && data.issue) {
          // New plan created - but only notify if it's not already shipped/completed
          // This prevents duplicate alerts when the app restarts or watcher reinitializes
          // (shipped/completed plans are historical, not new)
          if (data.status !== 'shipped' && data.status !== 'completed') {
            notifyIssuePlanned(data.issue.number, data.issue.title)
          }
        }
      }

      // Store current state for comparison
      previousPlanStates.set(filename, {
        status: data.status || '',
        phases: (data.phases || []).map((p) => ({
          number: p.number,
          title: p.title,
          status: p.status
        })),
        issue: data.issue
      })

      sendToRenderer('tiki:plan-changed', {
        filename,
        plan: data
      })
    }
  })
}

async function handleQueueChange(filePath: string): Promise<void> {
  debounce('queue', async () => {
    const data = await safeReadJson(filePath)
    sendToRenderer('tiki:queue-changed', data)
  })
}

async function handleReleaseChange(filePath: string): Promise<void> {
  const filename = basename(filePath)
  debounce(`release-${filename}`, async () => {
    const data = await safeReadJson(filePath)
    if (data) {
      sendToRenderer('tiki:release-changed', {
        filename,
        release: data
      })
    }
  })
}

async function handleBranchesChange(filePath: string): Promise<void> {
  debounce('branches', async () => {
    const data = await safeReadJson(filePath)
    sendToRenderer('tiki:branches-changed', data)
  })
}

async function handleCheckpointsChange(filePath: string): Promise<void> {
  debounce('checkpoints', async () => {
    const data = await safeReadJson(filePath)
    sendToRenderer('tiki:checkpoints-changed', data)
  })
}

async function handleYoloChange(filePath: string): Promise<void> {
  debounce('yolo', async () => {
    const data = await safeReadJson(filePath)
    sendToRenderer('tiki:yolo-changed', data)
  })
}

async function handlePhasesChange(filePath: string): Promise<void> {
  debounce('phases', async () => {
    const data = await safeReadJson(filePath)
    sendToRenderer('tiki:phases-changed', data)
  })
}

function handleFileChange(filePath: string): void {
  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, '/')

  if (normalizedPath.includes('/state/phases.json')) {
    handlePhasesChange(filePath)
  } else if (normalizedPath.includes('/state/current.json')) {
    handleStateChange(filePath)
  } else if (normalizedPath.includes('/state/yolo.json')) {
    handleYoloChange(filePath)
  } else if (normalizedPath.includes('/plans/') && normalizedPath.endsWith('.json')) {
    // Handle all JSON files in plans directory, not just issue-* pattern
    // This covers: issue-N.json, N.json, N-description.json, etc.
    handlePlanChange(filePath)
  } else if (normalizedPath.includes('/queue/pending.json')) {
    handleQueueChange(filePath)
  } else if (normalizedPath.includes('/releases/') && normalizedPath.endsWith('.json')) {
    handleReleaseChange(filePath)
  } else if (normalizedPath.endsWith('/branches.json')) {
    handleBranchesChange(filePath)
  } else if (normalizedPath.endsWith('/checkpoints.json')) {
    handleCheckpointsChange(filePath)
  }
}

export function startWatching(path: string): void {
  // If already watching the same path, don't restart
  if (watcher && projectPath === path) {
    return
  }

  if (watcher) {
    stopWatching()
  }

  projectPath = path
  isInitialScan = true // Reset for new project
  const tikiPath = join(path, '.tiki')

  if (!existsSync(tikiPath)) {
    log.debug('No .tiki directory found at', tikiPath)
    return
  }

  watcher = chokidar.watch(
    [
      join(tikiPath, 'state', '*.json'),
      join(tikiPath, 'plans', '*.json'),
      join(tikiPath, 'queue', '*.json'),
      join(tikiPath, 'releases', '*.json'),
      join(tikiPath, 'releases', 'archive', '*.json'),
      join(tikiPath, 'branches.json'),
      join(tikiPath, 'checkpoints.json')
    ],
    {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 50,
        pollInterval: 10
      }
    }
  )

  watcher.on('add', handleFileChange)
  watcher.on('change', handleFileChange)
  watcher.on('unlink', (filePath) => {
    const normalizedPath = filePath.replace(/\\/g, '/')
    if (normalizedPath.includes('/state/current.json')) {
      sendToRenderer('tiki:state-changed', null)
    }
  })

  watcher.on('error', (error) => {
    log.error('File watcher error:', error)
  })

  // Mark initial scan complete after watcher is ready
  watcher.on('ready', () => {
    isInitialScan = false
    log.debug('File watcher ready, notifications enabled')
  })

  log.debug('Started watching .tiki directory at', tikiPath)
}

export function stopWatching(): void {
  if (watcher) {
    watcher.close()
    watcher = null
  }

  // Clear all debounce timers
  for (const timer of debounceTimers.values()) {
    clearTimeout(timer)
  }
  debounceTimers.clear()

  // Clear previous plan states so they're fresh on next watch
  previousPlanStates.clear()

  projectPath = null
}

export function getWatchedPath(): string | null {
  return projectPath
}

export async function getCurrentState(): Promise<unknown | null> {
  if (!projectPath) return null
  const statePath = join(projectPath, '.tiki', 'state', 'current.json')
  return safeReadJson(statePath)
}

export async function getYoloState(): Promise<unknown | null> {
  if (!projectPath) return null
  const yoloPath = join(projectPath, '.tiki', 'state', 'yolo.json')
  return safeReadJson(yoloPath)
}

export async function getPhases(): Promise<unknown | null> {
  if (!projectPath) return null
  const phasesPath = join(projectPath, '.tiki', 'state', 'phases.json')
  return safeReadJson(phasesPath)
}

export async function getPlan(issueNumber: number): Promise<unknown | null> {
  if (!projectPath) return null
  const planPath = join(projectPath, '.tiki', 'plans', `issue-${issueNumber}.json`)
  return safeReadJson(planPath)
}

export async function getQueue(): Promise<unknown | null> {
  if (!projectPath) return null
  const queuePath = join(projectPath, '.tiki', 'queue', 'pending.json')
  return safeReadJson(queuePath)
}

export async function getBranches(): Promise<unknown | null> {
  if (!projectPath) return null
  const branchesPath = join(projectPath, '.tiki', 'branches.json')
  return safeReadJson(branchesPath)
}

export async function getCheckpoints(): Promise<unknown | null> {
  if (!projectPath) return null
  const checkpointsPath = join(projectPath, '.tiki', 'checkpoints.json')
  return safeReadJson(checkpointsPath)
}

export async function getReleases(): Promise<unknown[]> {
  if (!projectPath) return []
  const releasesPath = join(projectPath, '.tiki', 'releases')
  const archivePath = join(releasesPath, 'archive')

  if (!existsSync(releasesPath)) return []

  try {
    // Use a Map to deduplicate by version (archive takes precedence)
    const releaseMap = new Map<string, unknown>()

    // Read releases from main folder first
    const files = await readdir(releasesPath)
    for (const file of files) {
      if (file.endsWith('.json') && !file.startsWith('.')) {
        const filePath = join(releasesPath, file)
        const release = await safeReadJson(filePath)
        if (release) {
          const version = (release as { version: string }).version
          releaseMap.set(version, release)
        }
      }
    }

    // Read releases from archive folder (overwrites main folder duplicates)
    if (existsSync(archivePath)) {
      const archiveFiles = await readdir(archivePath)
      for (const file of archiveFiles) {
        if (file.endsWith('.json') && !file.startsWith('.')) {
          const filePath = join(archivePath, file)
          const release = await safeReadJson(filePath)
          if (release) {
            const version = (release as { version: string }).version
            releaseMap.set(version, release)
          }
        }
      }
    }

    const releases = Array.from(releaseMap.values())

    // Sort: active first, then by version descending
    releases.sort((a: unknown, b: unknown) => {
      const releaseA = a as { status: string; version: string }
      const releaseB = b as { status: string; version: string }
      if (releaseA.status === 'active' && releaseB.status !== 'active') return -1
      if (releaseB.status === 'active' && releaseA.status !== 'active') return 1
      return releaseB.version.localeCompare(releaseA.version)
    })

    return releases
  } catch (error) {
    log.error('Error reading releases:', error)
    return []
  }
}

export interface CreateReleaseInput {
  version: string
  issues: Array<{ number: number; title: string }>
}

export interface CreateReleaseResult {
  success: boolean
  error?: string
}

export interface UpdateReleaseResult {
  success: boolean
  error?: string
}

export interface ReleaseIssueInput {
  number: number
  title: string
  status?: string
  requirements?: string[]
  currentPhase?: number | null
  totalPhases?: number | null
  completedAt?: string | null
}

export interface UpdateReleaseInput {
  version: string
  status?: 'active' | 'shipped' | 'completed' | 'not_planned'
  requirementsEnabled?: boolean
  issues?: ReleaseIssueInput[]
}

export async function createRelease(
  version: string,
  issues: Array<{ number: number; title: string }>
): Promise<CreateReleaseResult> {
  if (!projectPath) {
    return { success: false, error: 'No project path' }
  }

  const releasesPath = join(projectPath, '.tiki', 'releases')

  // Ensure the releases directory exists
  await mkdir(releasesPath, { recursive: true })

  const releaseFile = join(releasesPath, `${version}.json`)

  // Check if release already exists
  if (existsSync(releaseFile)) {
    return { success: false, error: 'Release already exists' }
  }

  // Create the release structure matching existing releases
  const release = {
    version,
    createdAt: new Date().toISOString(),
    status: 'active',
    requirementsEnabled: false,
    githubMilestone: null,
    issues: issues.map((i) => ({
      number: i.number,
      title: i.title,
      status: 'not_planned',
      requirements: [],
      currentPhase: null,
      totalPhases: null,
      completedAt: null
    })),
    requirements: {
      total: 0,
      implemented: 0,
      verified: 0
    }
  }

  try {
    await writeFile(releaseFile, JSON.stringify(release, null, 2))
    return { success: true }
  } catch (error) {
    log.error('Error creating release:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create release'
    }
  }
}

export async function updateRelease(
  currentVersion: string,
  updates: UpdateReleaseInput
): Promise<UpdateReleaseResult> {
  if (!projectPath) {
    return { success: false, error: 'No project path' }
  }

  const releasesPath = join(projectPath, '.tiki', 'releases')
  const currentFile = join(releasesPath, `${currentVersion}.json`)

  // Check if release exists
  if (!existsSync(currentFile)) {
    return { success: false, error: 'Release not found' }
  }

  try {
    // Read current release
    const content = await readFile(currentFile, 'utf-8')
    const release = JSON.parse(content)

    // Apply updates
    if (updates.status !== undefined) {
      release.status = updates.status
    }
    if (updates.requirementsEnabled !== undefined) {
      release.requirementsEnabled = updates.requirementsEnabled
    }
    if (updates.issues !== undefined) {
      release.issues = updates.issues
    }

    // Handle version rename
    if (updates.version && updates.version !== currentVersion) {
      const newFile = join(releasesPath, `${updates.version}.json`)

      // Check if new version already exists
      if (existsSync(newFile)) {
        return { success: false, error: 'A release with that version already exists' }
      }

      release.version = updates.version

      // Write to new file and delete old
      await writeFile(newFile, JSON.stringify(release, null, 2))
      await unlink(currentFile)
    } else {
      // Just update in place
      await writeFile(currentFile, JSON.stringify(release, null, 2))
    }

    return { success: true }
  } catch (error) {
    log.error('Error updating release:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update release'
    }
  }
}

export interface DeleteReleaseResult {
  success: boolean
  error?: string
}

export async function deleteRelease(version: string): Promise<DeleteReleaseResult> {
  if (!projectPath) {
    return { success: false, error: 'No project path' }
  }

  const releasesPath = join(projectPath, '.tiki', 'releases')
  const archivePath = join(releasesPath, 'archive')
  const releaseFile = join(releasesPath, `${version}.json`)
  const archiveFile = join(archivePath, `${version}.json`)

  try {
    let deleted = false

    // Try to delete from main releases folder
    if (existsSync(releaseFile)) {
      await unlink(releaseFile)
      deleted = true
    }

    // Also try to delete from archive folder
    if (existsSync(archiveFile)) {
      await unlink(archiveFile)
      deleted = true
    }

    if (!deleted) {
      return { success: false, error: 'Release not found' }
    }

    return { success: true }
  } catch (error) {
    log.error('Error deleting release:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete release'
    }
  }
}
