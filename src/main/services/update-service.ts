import { autoUpdater, UpdateInfo } from 'electron-updater'
import { BrowserWindow, app } from 'electron'
import { cleanupAllTerminals, saveTerminalStateImmediate } from './terminal-manager'
import { stopWatching } from './file-watcher'
import { stopAllPolling } from '../ipc/workflow'
import { logger } from './logger'

const log = logger.scoped('AutoUpdater')

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
  log.debug('Initializing...')
  log.debug('Platform:', process.platform)
  log.debug('app.isPackaged:', app.isPackaged)
  log.debug('App version:', app.getVersion())

  // Skip on macOS (requires code signing)
  if (process.platform === 'darwin') {
    log.debug('Skipping on macOS (code signing required)')
    return
  }

  // electron-updater only works in packaged builds
  if (!app.isPackaged) {
    log.debug('Skipping initialization - app is not packaged (dev mode)')
    return
  }

  // Configure auto-updater
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // Enable logging for debugging - use null to disable electron-updater's own logging
  // Our scoped logger handles all logging now
  autoUpdater.logger = null

  log.debug('Configuration complete')

  // Event handlers
  autoUpdater.on('checking-for-update', () => {
    log.debug('Checking for updates...')
    sendStatus({ type: 'checking' })
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    log.info('Update available:', info.version)
    sendStatus({
      type: 'available',
      version: info.version,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined
    })
  })

  autoUpdater.on('update-not-available', () => {
    log.debug('No updates available')
    sendStatus({ type: 'not-available' })
  })

  autoUpdater.on('download-progress', (progress) => {
    log.debug(`Download progress: ${progress.percent.toFixed(1)}%`)
    sendStatus({
      type: 'downloading',
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      total: progress.total,
      transferred: progress.transferred
    })
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    log.info('Update downloaded:', info.version)
    sendStatus({ type: 'downloaded', version: info.version })
  })

  autoUpdater.on('error', (error) => {
    log.error('Error:', error.message)
    sendStatus({ type: 'error', message: error.message })
  })
}

export async function checkForUpdates(): Promise<CheckResult> {
  log.debug('checkForUpdates() called')
  log.debug('app.isPackaged:', app.isPackaged)
  log.debug('Current version:', app.getVersion())

  if (process.platform === 'darwin') {
    const error = 'Auto-updates not available on macOS (requires code signing)'
    sendStatus({ type: 'error', message: error })
    return { success: false, error }
  }

  // electron-updater only works in packaged builds
  if (!app.isPackaged) {
    const error = 'Auto-updates only work in the installed app, not in development mode. Please install the app from a release build.'
    log.debug(error)
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
      log.debug('Check complete: update available', info.version)
      resolve({ success: true, status: 'available', version: info.version })
    }

    const onNotAvailable = (): void => {
      if (resolved) return
      resolved = true
      cleanup()
      log.debug('Check complete: no update available')
      resolve({ success: true, status: 'not-available' })
    }

    const onError = (error: Error): void => {
      if (resolved) return
      resolved = true
      cleanup()
      log.error('Check failed with error:', error.message)
      resolve({ success: false, error: error.message })
    }

    const timeoutId = setTimeout(() => {
      if (resolved) return
      resolved = true
      cleanup()
      const error = 'Update check timed out. Please check your internet connection and try again.'
      log.error('Check timed out after', UPDATE_CHECK_TIMEOUT, 'ms')
      sendStatus({ type: 'error', message: error })
      resolve({ success: false, error })
    }, UPDATE_CHECK_TIMEOUT)

    autoUpdater.once('update-available', onAvailable)
    autoUpdater.once('update-not-available', onNotAvailable)
    autoUpdater.once('error', onError)

    log.debug('Starting update check...')
    log.debug('Feed URL:', autoUpdater.getFeedURL())
    autoUpdater.checkForUpdates().then((result) => {
      log.debug('checkForUpdates() returned:', result?.updateInfo?.version || 'no update info')
    }).catch((error) => {
      if (resolved) return
      resolved = true
      cleanup()
      const message = error instanceof Error ? error.message : 'Unknown error'
      log.error('checkForUpdates() threw:', message)
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

  log.info('Preparing to install update...')

  // Save terminal state first (preserve user's session for after update)
  log.debug('Saving terminal state...')
  saveTerminalStateImmediate()

  // Stop all background processes
  log.debug('Stopping file watcher...')
  stopWatching()

  log.debug('Stopping workflow polling...')
  stopAllPolling()

  // Force cleanup all terminal processes
  // This is critical on Windows where PTY processes may not respond to SIGTERM quickly
  log.debug('Cleaning up terminal processes...')
  cleanupAllTerminals()

  // Brief delay to allow cleanup to complete
  // This gives node-pty time to clean up child processes
  await new Promise((resolve) => setTimeout(resolve, 100))

  log.debug('Calling quitAndInstall...')
  autoUpdater.quitAndInstall(false, true)
}
