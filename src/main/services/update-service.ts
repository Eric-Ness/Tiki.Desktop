import { autoUpdater, UpdateInfo } from 'electron-updater'
import { BrowserWindow } from 'electron'

export type UpdateStatus =
  | { type: 'checking' }
  | { type: 'available'; version: string; releaseNotes?: string }
  | { type: 'not-available' }
  | { type: 'downloading'; percent: number; bytesPerSecond: number; total: number; transferred: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string }

let mainWindow: BrowserWindow | null = null

export function setUpdateWindow(window: BrowserWindow): void {
  mainWindow = window
}

function sendStatus(status: UpdateStatus): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app:update-status', status)
  }
}

export function initAutoUpdater(): void {
  // Skip on macOS (requires code signing)
  if (process.platform === 'darwin') {
    console.log('[AutoUpdater] Skipping on macOS (code signing required)')
    return
  }

  // Configure auto-updater
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

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

export async function checkForUpdates(): Promise<void> {
  if (process.platform === 'darwin') {
    sendStatus({ type: 'error', message: 'Auto-updates not available on macOS (requires code signing)' })
    return
  }

  try {
    await autoUpdater.checkForUpdates()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    sendStatus({ type: 'error', message })
  }
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

export function installUpdate(): void {
  if (process.platform === 'darwin') {
    return
  }

  autoUpdater.quitAndInstall(false, true)
}
