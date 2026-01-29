import * as chokidar from 'chokidar'
import { BrowserWindow } from 'electron'
import { readFile, readdir } from 'fs/promises'
import { join, basename } from 'path'
import { existsSync } from 'fs'
import {
  notifyPhaseCompleted,
  notifyPhaseFailed,
  notifyIssuePlanned,
  notifyIssueShipped
} from './notification-service'

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
          // New plan created
          notifyIssuePlanned(data.issue.number, data.issue.title)
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

function handleFileChange(filePath: string): void {
  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, '/')

  if (normalizedPath.includes('/state/current.json')) {
    handleStateChange(filePath)
  } else if (normalizedPath.includes('/plans/issue-')) {
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
    console.log('No .tiki directory found at', tikiPath)
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
    console.error('File watcher error:', error)
  })

  // Mark initial scan complete after watcher is ready
  watcher.on('ready', () => {
    isInitialScan = false
    console.log('File watcher ready, notifications enabled')
  })

  console.log('Started watching .tiki directory at', tikiPath)
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

export async function getCurrentState(): Promise<unknown | null> {
  if (!projectPath) return null
  const statePath = join(projectPath, '.tiki', 'state', 'current.json')
  return safeReadJson(statePath)
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
    console.error('Error reading releases:', error)
    return []
  }
}
