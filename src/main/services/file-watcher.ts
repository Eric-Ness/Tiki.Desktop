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
  debounce(`plan-${filename}`, async () => {
    const data = await safeReadJson(filePath) as PlanState | null
    if (data) {
      // Check for state changes to trigger notifications
      const previousState = previousPlanStates.get(filename)

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
  }
}

export function startWatching(path: string): void {
  if (watcher) {
    stopWatching()
  }

  projectPath = path
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
      join(tikiPath, 'releases', '*.json')
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

export async function getReleases(): Promise<unknown[]> {
  if (!projectPath) return []
  const releasesPath = join(projectPath, '.tiki', 'releases')

  if (!existsSync(releasesPath)) return []

  try {
    const files = await readdir(releasesPath)
    const releases: unknown[] = []

    for (const file of files) {
      if (file.endsWith('.json') && !file.startsWith('.')) {
        const filePath = join(releasesPath, file)
        const release = await safeReadJson(filePath)
        if (release) {
          releases.push(release)
        }
      }
    }

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
