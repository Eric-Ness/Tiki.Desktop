import { autoUpdater, UpdateInfo } from 'electron-updater'
import { BrowserWindow, app } from 'electron'
import { cleanupAllTerminals, saveTerminalStateImmediate } from './terminal-manager'
import { stopWatching } from './file-watcher'
import { stopAllPolling } from '../ipc/workflow'

export type UpdateStatus =
  | { type: 'checking' }
  | { type: 'available'; version: string; releaseNotes?: string }
  | { type: 'not-available' }
  | { type: 'downloading'; percent: number; bytesPerSecond: number; total: number; transferred: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string }

export type CheckResult =
  | { success: true; status: 'available' | 'not-available'; version?: string }
  | { success: false; error: string }

let mainWindow: BrowserWindow | null = null
const UPDATE_CHECK_TIMEOUT = 30000 // 30 seconds

export function setUpdateWindow(window: BrowserWindow): void {
  mainWindow = window
}

function sendStatus(status: UpdateStatus): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app:update-status', status)
  }
}

export function initAutoUpdater(): void {
  console.log('[AutoUpdater] Initializing...')
  console.log('[AutoUpdater] Platform:', process.platform)
  console.log('[AutoUpdater] app.isPackaged:', app.isPackaged)
  console.log('[AutoUpdater] App version:', app.getVersion())

  // Skip on macOS (requires code signing)
  if (process.platform === 'darwin') {
    console.log('[AutoUpdater] Skipping on macOS (code signing required)')
    return
  }

  // electron-updater only works in packaged builds
  if (!app.isPackaged) {
    console.log('[AutoUpdater] Skipping initialization - app is not packaged (dev mode)')
    return
  }

  // Configure auto-updater
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // Enable logging for debugging
  autoUpdater.logger = console

  console.log('[AutoUpdater] Configuration complete')

  // Event handlers
  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking for updates...')
    sendStatus({ type: 'checking' })
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    console.log('[AutoUpdater] Update available:', info.version)
    sendStatus({
      type: 'available',
      version: info.version,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined
    })
  })

  autoUpdater.on('update-not-available', () => {
    console.log('[AutoUpdater] No updates available')
    sendStatus({ type: 'not-available' })
  })

  autoUpdater.on('download-progress', (progress) => {
    console.log(`[AutoUpdater] Download progress: ${progress.percent.toFixed(1)}%`)
    sendStatus({
      type: 'downloading',
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      total: progress.total,
      transferred: progress.transferred
    })
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    console.log('[AutoUpdater] Update downloaded:', info.version)
    sendStatus({ type: 'downloaded', version: info.version })
  })

  autoUpdater.on('error', (error) => {
    console.error('[AutoUpdater] Error:', error.message)
    sendStatus({ type: 'error', message: error.message })
  })
}

export async function checkForUpdates(): Promise<CheckResult> {
  console.log('[AutoUpdater] checkForUpdates() called')
  console.log('[AutoUpdater] app.isPackaged:', app.isPackaged)
  console.log('[AutoUpdater] Current version:', app.getVersion())

  if (process.platform === 'darwin') {
    const error = 'Auto-updates not available on macOS (requires code signing)'
    sendStatus({ type: 'error', message: error })
    return { success: false, error }
  }

  // electron-updater only works in packaged builds
  if (!app.isPackaged) {
    const error = 'Auto-updates only work in the installed app, not in development mode. Please install the app from a release build.'
    console.log('[AutoUpdater]', error)
    sendStatus({ type: 'error', message: error })
    return { success: false, error }
  }

  sendStatus({ type: 'checking' })

  return new Promise((resolve) => {
    let resolved = false

    const cleanup = (): void => {
      autoUpdater.removeListener('update-available', onAvailable)
      autoUpdater.removeListener('update-not-available', onNotAvailable)
      autoUpdater.removeListener('error', onError)
      clearTimeout(timeoutId)
    }

    const onAvailable = (info: UpdateInfo): void => {
      if (resolved) return
      resolved = true
      cleanup()
      console.log('[AutoUpdater] Check complete: update available', info.version)
      resolve({ success: true, status: 'available', version: info.version })
    }

    const onNotAvailable = (): void => {
      if (resolved) return
      resolved = true
      cleanup()
      console.log('[AutoUpdater] Check complete: no update available')
      resolve({ success: true, status: 'not-available' })
    }

    const onError = (error: Error): void => {
      if (resolved) return
      resolved = true
      cleanup()
      console.error('[AutoUpdater] Check failed with error:', error.message)
      resolve({ success: false, error: error.message })
    }

    const timeoutId = setTimeout(() => {
      if (resolved) return
      resolved = true
      cleanup()
      const error = 'Update check timed out. Please check your internet connection and try again.'
      console.error('[AutoUpdater] Check timed out after', UPDATE_CHECK_TIMEOUT, 'ms')
      sendStatus({ type: 'error', message: error })
      resolve({ success: false, error })
    }, UPDATE_CHECK_TIMEOUT)

    autoUpdater.once('update-available', onAvailable)
    autoUpdater.once('update-not-available', onNotAvailable)
    autoUpdater.once('error', onError)

    console.log('[AutoUpdater] Starting update check...')
    console.log('[AutoUpdater] Feed URL:', autoUpdater.getFeedURL())
    autoUpdater.checkForUpdates().then((result) => {
      console.log('[AutoUpdater] checkForUpdates() returned:', result?.updateInfo?.version || 'no update info')
    }).catch((error) => {
      if (resolved) return
      resolved = true
      cleanup()
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('[AutoUpdater] checkForUpdates() threw:', message)
      sendStatus({ type: 'error', message })
      resolve({ success: false, error: message })
    })
  })
}

export async function downloadUpdate(): Promise<void> {
  if (process.platform === 'darwin') {
    return
  }

  try {
    await autoUpdater.downloadUpdate()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Download failed'
    sendStatus({ type: 'error', message })
  }
}

export async function installUpdate(): Promise<void> {
  if (process.platform === 'darwin') {
    return
  }

  console.log('[AutoUpdater] Preparing to install update...')

  // Save terminal state first (preserve user's session for after update)
  console.log('[AutoUpdater] Saving terminal state...')
  saveTerminalStateImmediate()

  // Stop all background processes
  console.log('[AutoUpdater] Stopping file watcher...')
  stopWatching()

  console.log('[AutoUpdater] Stopping workflow polling...')
  stopAllPolling()

  // Force cleanup all terminal processes
  // This is critical on Windows where PTY processes may not respond to SIGTERM quickly
  console.log('[AutoUpdater] Cleaning up terminal processes...')
  cleanupAllTerminals()

  // Brief delay to allow cleanup to complete
  // This gives node-pty time to clean up child processes
  await new Promise((resolve) => setTimeout(resolve, 100))

  console.log('[AutoUpdater] Calling quitAndInstall...')
  autoUpdater.quitAndInstall(false, true)
}
