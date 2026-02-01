import { Notification, BrowserWindow, nativeImage } from 'electron'
import { join } from 'path'
import { getSettings } from './settings-store'
import { logger } from './logger'

let mainWindow: BrowserWindow | null = null

export function setMainWindow(window: BrowserWindow): void {
  mainWindow = window
}

export type NotificationEvent =
  | 'phase-completed'
  | 'phase-failed'
  | 'issue-planned'
  | 'issue-shipped'
  | 'execution-paused'
  | 'error'
  | 'workflow-failed'
  | 'workflow-recovered'

interface NotificationOptions {
  event: NotificationEvent
  title: string
  body: string
  context?: {
    issueNumber?: number
    phaseNumber?: number
    planFile?: string
    runUrl?: string
  }
}

/**
 * Check if notifications are enabled for the given event
 */
function isNotificationEnabled(event: NotificationEvent): boolean {
  const settings = getSettings('notifications')

  if (!settings.enabled) {
    return false
  }

  switch (event) {
    case 'phase-completed':
      return settings.phaseComplete
    case 'phase-failed':
    case 'error':
      return settings.errors
    case 'issue-planned':
      return settings.issuePlanned
    case 'issue-shipped':
      return settings.issueShipped
    case 'workflow-failed':
    case 'workflow-recovered':
      return settings.workflowFailed
    default:
      return settings.enabled
  }
}

/**
 * Get the icon for a notification event
 */
function getNotificationIcon(event: NotificationEvent): string | undefined {
  // For now, we'll use the app icon
  // In production, you could have different icons for different events
  try {
    // This would be the path to the app icon
    return join(__dirname, '../../resources/icon.png')
  } catch {
    return undefined
  }
}

/**
 * Show a desktop notification
 */
export function showNotification(options: NotificationOptions): void {
  const { event, title, body, context } = options

  // Check if this notification type is enabled
  if (!isNotificationEnabled(event)) {
    return
  }

  // Check if Notification is supported
  if (!Notification.isSupported()) {
    logger.warn('Desktop notifications are not supported on this system')
    return
  }

  const notification = new Notification({
    title,
    body,
    icon: getNotificationIcon(event),
    urgency: event === 'phase-failed' || event === 'error' || event === 'workflow-failed' ? 'critical' : 'normal'
  })

  // Handle notification click
  notification.on('click', () => {
    // Focus the main window
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.focus()

      // Send navigation context to renderer
      if (context) {
        mainWindow.webContents.send('notification:clicked', {
          event,
          context
        })
      }
    }
  })

  notification.show()

  // Play sound if enabled
  const settings = getSettings('notifications')
  if (settings.sound) {
    // Electron doesn't have built-in sound support for notifications
    // Sound would need to be played through the renderer or a native module
    // For now, we rely on the system notification sound
  }
}

/**
 * Notification helper for phase completion
 */
export function notifyPhaseCompleted(
  phaseNumber: number,
  phaseTitle: string,
  issueNumber: number
): void {
  showNotification({
    event: 'phase-completed',
    title: `Phase ${phaseNumber} Completed`,
    body: `${phaseTitle} - Issue #${issueNumber}`,
    context: { issueNumber, phaseNumber }
  })
}

/**
 * Notification helper for phase failure
 */
export function notifyPhaseFailed(
  phaseNumber: number,
  phaseTitle: string,
  issueNumber: number,
  error?: string
): void {
  showNotification({
    event: 'phase-failed',
    title: `Phase ${phaseNumber} Failed`,
    body: error ? `${phaseTitle}: ${error}` : `${phaseTitle} - Click to view error`,
    context: { issueNumber, phaseNumber }
  })
}

/**
 * Notification helper for issue planned
 */
export function notifyIssuePlanned(issueNumber: number, issueTitle: string): void {
  showNotification({
    event: 'issue-planned',
    title: 'Issue Plan Created',
    body: `Issue #${issueNumber}: ${issueTitle}`,
    context: { issueNumber }
  })
}

/**
 * Notification helper for issue shipped
 */
export function notifyIssueShipped(issueNumber: number, issueTitle: string): void {
  showNotification({
    event: 'issue-shipped',
    title: 'Issue Shipped',
    body: `Issue #${issueNumber}: ${issueTitle}`,
    context: { issueNumber }
  })
}

/**
 * Notification helper for execution paused
 */
export function notifyExecutionPaused(issueNumber: number, reason?: string): void {
  showNotification({
    event: 'execution-paused',
    title: 'Execution Paused',
    body: reason || `Issue #${issueNumber} is waiting for input`,
    context: { issueNumber }
  })
}

/**
 * Notification helper for errors
 */
export function notifyError(title: string, message: string): void {
  showNotification({
    event: 'error',
    title,
    body: message
  })
}

/**
 * Notification helper for workflow failures
 */
export function notifyWorkflowFailed(workflowName: string, runUrl: string): void {
  showNotification({
    event: 'workflow-failed',
    title: 'CI Workflow Failed',
    body: workflowName,
    context: { runUrl }
  })
}

/**
 * Notification helper for workflow recovery
 */
export function notifyWorkflowRecovered(workflowName: string): void {
  showNotification({
    event: 'workflow-recovered',
    title: 'CI Workflow Recovered',
    body: `${workflowName} is now passing`
  })
}
