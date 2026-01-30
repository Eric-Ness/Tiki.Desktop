import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { getBranch } from './services/git-branch-service'
import { setMainWindow, cleanupAllTerminals, saveTerminalStateImmediate } from './services/terminal-manager'
import { setFileWatcherWindow, startWatching, stopWatching } from './services/file-watcher'
import { setGitHubWindow } from './services/github-bridge'
import { registerTerminalHandlers } from './ipc/terminal'
import { registerTikiHandlers } from './ipc/tiki'
import { registerGitHubHandlers } from './ipc/github'
import { registerGitHandlers } from './ipc/git'
import { registerBranchHandlers } from './ipc/branch'
import { registerProjectHandlers } from './ipc/projects'
import { registerSettingsHandlers } from './ipc/settings'
import { registerConfigHandlers } from './ipc/config'
import { registerKnowledgeHandlers } from './ipc/knowledge'
import { registerUsageHandlers } from './ipc/usage'
import { registerRollbackHandlers } from './ipc/rollback'
import { registerFailureHandlers } from './ipc/failure'
import { registerTemplateHandlers } from './ipc/templates'
import { registerUpdateHandlers } from './ipc/updates'
import { registerSearchHandlers } from './ipc/search'
import { registerWorkflowHandlers, setWorkflowWindow, stopAllPolling } from './ipc/workflow'
import { registerPredictionHandlers } from './ipc/prediction'
import { registerPatternHandlers } from './ipc/patterns'
import { registerHeatmapHandlers } from './ipc/heatmap'
import { registerCodeHandlers } from './ipc/code'
import { registerAnalyticsHandlers } from './ipc/analytics'
import { registerWorkspaceHandlers } from './ipc/workspace'
import { registerLearningHandlers } from './ipc/learning'
import { registerHooksHandlers } from './ipc/hooks'
import { setMainWindow as setSettingsWindow } from './services/settings-store'
import { setMainWindow as setNotificationWindow } from './services/notification-service'
import { setUpdateWindow, initAutoUpdater, checkForUpdates } from './services/update-service'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  // Determine the correct icon based on platform
  const iconPath = join(
    __dirname,
    '../../resources',
    process.platform === 'win32' ? 'icon.ico' : 'icon.png'
  )

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: '#0f0f0f',
    icon: iconPath,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the renderer
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../../dist/index.html'))
  }
}

// App lifecycle
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.tiki.desktop')

  // Default open or close DevTools by F12 in development
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Register IPC handlers
  registerTerminalHandlers()
  registerTikiHandlers()
  registerGitHubHandlers()
  registerGitHandlers()
  registerBranchHandlers()
  registerSettingsHandlers()
  registerConfigHandlers()
  registerKnowledgeHandlers()
  registerUsageHandlers()
  registerRollbackHandlers()
  registerFailureHandlers()
  registerTemplateHandlers()
  registerUpdateHandlers()
  registerSearchHandlers()
  registerWorkflowHandlers()
  registerPredictionHandlers()
  registerPatternHandlers()
  registerHeatmapHandlers()
  registerCodeHandlers()
  registerAnalyticsHandlers()
  registerWorkspaceHandlers()
  registerLearningHandlers()
  registerHooksHandlers()

  createWindow()

  // Set main window reference for terminal manager, file watcher, github, projects, settings, and notifications
  if (mainWindow) {
    setMainWindow(mainWindow)
    setFileWatcherWindow(mainWindow)
    setGitHubWindow(mainWindow)
    setSettingsWindow(mainWindow)
    setNotificationWindow(mainWindow)
    setUpdateWindow(mainWindow)
    setWorkflowWindow(mainWindow)
    registerProjectHandlers(mainWindow)

    // Start watching the current working directory
    startWatching(process.cwd())

    // Initialize auto-updater and check for updates on startup (Windows/Linux only)
    initAutoUpdater()
    if (process.platform !== 'darwin') {
      // Delay check to let app fully initialize
      setTimeout(() => {
        checkForUpdates()
      }, 3000)
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  // Save terminal state before quitting (for session restoration)
  saveTerminalStateImmediate()
  cleanupAllTerminals()
  stopWatching()
  stopAllPolling()
})

// IPC Handlers - will be expanded in future issues

// Get app version
ipcMain.handle('app:version', () => {
  return app.getVersion()
})

// Get current working directory
ipcMain.handle('app:cwd', () => {
  return process.cwd()
})

// Get git branch for a directory (async with caching)
ipcMain.handle('git:branch', async (_event, cwd?: string) => {
  const workDir = cwd || process.cwd()
  return await getBranch(workDir)
})

// Open external URL in default browser
ipcMain.handle('shell:open-external', async (_event, url: string) => {
  await shell.openExternal(url)
})
