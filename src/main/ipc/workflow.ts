import { ipcMain, BrowserWindow } from 'electron'
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
  intervalId: NodeJS.Timeout
}

const activeSubscriptions: Map<string, PollingSubscription> = new Map()
let mainWindow: BrowserWindow | null = null

/**
 * Set the main window reference for sending updates
 */
export function setWorkflowWindow(window: BrowserWindow): void {
  mainWindow = window
}

/**
 * Generate a unique subscription key
 */
function getSubscriptionKey(workflowId: number, cwd: string): string {
  return `${cwd}:${workflowId}`
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

  const poll = async (): Promise<void> => {
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
      console.error('Workflow polling error:', error)
    }
  }

  // Fetch immediately, then start interval
  poll()

  const intervalId = setInterval(poll, POLLING_INTERVAL_MS)

  activeSubscriptions.set(key, {
    workflowId,
    cwd,
    intervalId
  })
}

/**
 * Stop polling for a specific subscription
 */
function stopPolling(workflowId: number, cwd: string): void {
  const key = getSubscriptionKey(workflowId, cwd)
  const subscription = activeSubscriptions.get(key)

  if (subscription) {
    clearInterval(subscription.intervalId)
    activeSubscriptions.delete(key)
  }
}

/**
 * Stop all active polling subscriptions
 */
export function stopAllPolling(): void {
  Array.from(activeSubscriptions.values()).forEach((subscription) => {
    clearInterval(subscription.intervalId)
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
