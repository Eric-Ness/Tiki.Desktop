import { ipcMain, BrowserWindow } from 'electron'
import { logger } from '../services/logger'
import {
  getWorkflows,
  getWorkflowRuns,
  getRunDetails,
  openRunInBrowser,
  checkStatusTransitions,
  POLLING_INTERVAL_MS
} from '../services/workflow-service'

// Store for active polling subscriptions
interface PollingSubscription {
  workflowId: number
  cwd: string
  intervalId: NodeJS.Timeout | null // null when paused
}

const activeSubscriptions: Map<string, PollingSubscription> = new Map()
let mainWindow: BrowserWindow | null = null
let windowFocused = true

/**
 * Check if window is currently focused (for testing)
 */
export function isWindowFocused(): boolean {
  return windowFocused
}

/**
 * Get the number of active subscriptions (for testing)
 */
export function getActiveSubscriptionCount(): number {
  return activeSubscriptions.size
}

/**
 * Reset workflow polling state (for testing only)
 */
export function resetWorkflowPollingForTesting(): void {
  stopAllPolling()
  mainWindow = null
  windowFocused = true
}

/**
 * Set the main window reference for sending updates
 */
export function setWorkflowWindow(window: BrowserWindow): void {
  mainWindow = window

  // Track focus state
  window.on('focus', () => {
    windowFocused = true
    resumeAllPolling()
  })

  window.on('blur', () => {
    windowFocused = false
    pauseAllPolling()
  })
}

/**
 * Generate a unique subscription key
 */
function getSubscriptionKey(workflowId: number, cwd: string): string {
  return `${cwd}:${workflowId}`
}

/**
 * Poll for workflow run updates
 */
async function poll(workflowId: number, cwd: string): Promise<void> {
  try {
    const runs = await getWorkflowRuns(workflowId, cwd)

    // Check for status transitions and emit notifications
    checkStatusTransitions(workflowId, cwd, runs)

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('workflow:runs-updated', {
        workflowId,
        cwd,
        runs
      })
    }
  } catch (error) {
    // Log error but continue polling
    logger.error('Workflow polling error:', error)
  }
}

/**
 * Pause all polling subscriptions (called when window loses focus)
 */
function pauseAllPolling(): void {
  Array.from(activeSubscriptions.values()).forEach((sub) => {
    if (sub.intervalId !== null) {
      clearInterval(sub.intervalId)
      sub.intervalId = null // Mark as paused
    }
  })
}

/**
 * Resume all polling subscriptions (called when window regains focus)
 */
function resumeAllPolling(): void {
  Array.from(activeSubscriptions.values()).forEach((sub) => {
    if (sub.intervalId === null) {
      // Fetch immediately on resume, then restart interval
      poll(sub.workflowId, sub.cwd)
      sub.intervalId = setInterval(() => poll(sub.workflowId, sub.cwd), POLLING_INTERVAL_MS)
    }
  })
}

/**
 * Start polling for workflow run updates
 */
function startPolling(workflowId: number, cwd: string): void {
  const key = getSubscriptionKey(workflowId, cwd)

  // Don't create duplicate subscriptions
  if (activeSubscriptions.has(key)) {
    return
  }

  // If window is focused, start polling immediately
  // Otherwise, just register the subscription (polling will start when focus returns)
  if (windowFocused) {
    // Fetch immediately, then start interval
    poll(workflowId, cwd)

    const intervalId = setInterval(() => poll(workflowId, cwd), POLLING_INTERVAL_MS)

    activeSubscriptions.set(key, {
      workflowId,
      cwd,
      intervalId
    })
  } else {
    // Register subscription but don't start interval (window not focused)
    activeSubscriptions.set(key, {
      workflowId,
      cwd,
      intervalId: null
    })
  }
}

/**
 * Expose startPolling for testing
 */
export function startPollingForTesting(workflowId: number, cwd: string): void {
  startPolling(workflowId, cwd)
}

/**
 * Stop polling for a specific subscription
 */
function stopPolling(workflowId: number, cwd: string): void {
  const key = getSubscriptionKey(workflowId, cwd)
  const subscription = activeSubscriptions.get(key)

  if (subscription) {
    if (subscription.intervalId !== null) {
      clearInterval(subscription.intervalId)
    }
    activeSubscriptions.delete(key)
  }
}

/**
 * Stop all active polling subscriptions
 */
export function stopAllPolling(): void {
  Array.from(activeSubscriptions.values()).forEach((subscription) => {
    if (subscription.intervalId !== null) {
      clearInterval(subscription.intervalId)
    }
  })
  activeSubscriptions.clear()
}

/**
 * Register all workflow-related IPC handlers
 */
export function registerWorkflowHandlers(): void {
  // Get list of workflows for the repository
  ipcMain.handle('workflow:list', async (_, { cwd }: { cwd?: string }) => {
    return getWorkflows(cwd)
  })

  // Get recent runs for a specific workflow
  ipcMain.handle(
    'workflow:runs',
    async (_, { workflowId, cwd }: { workflowId: number; cwd?: string }) => {
      return getWorkflowRuns(workflowId, cwd)
    }
  )

  // Get detailed information for a specific run
  ipcMain.handle('workflow:run-details', async (_, { runId, cwd }: { runId: number; cwd?: string }) => {
    return getRunDetails(runId, cwd)
  })

  // Open a workflow run in the default browser
  ipcMain.handle('workflow:open-in-browser', async (_, { url }: { url: string }) => {
    return openRunInBrowser(url)
  })

  // Subscribe to real-time updates for a workflow
  ipcMain.handle(
    'workflow:subscribe',
    async (_, { workflowId, cwd }: { workflowId: number; cwd?: string }) => {
      const workDir = cwd || process.cwd()
      startPolling(workflowId, workDir)
      return { subscribed: true, workflowId, cwd: workDir }
    }
  )

  // Unsubscribe from real-time updates for a workflow
  ipcMain.handle(
    'workflow:unsubscribe',
    async (_, { workflowId, cwd }: { workflowId: number; cwd?: string }) => {
      const workDir = cwd || process.cwd()
      stopPolling(workflowId, workDir)
      return { unsubscribed: true, workflowId, cwd: workDir }
    }
  )
}
