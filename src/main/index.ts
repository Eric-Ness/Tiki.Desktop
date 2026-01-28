import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { setMainWindow, cleanupAllTerminals } from './services/terminal-manager'
import { setFileWatcherWindow, startWatching, stopWatching } from './services/file-watcher'
import { registerTerminalHandlers } from './ipc/terminal'
import { registerTikiHandlers } from './ipc/tiki'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: '#0f0f0f',
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

  createWindow()

  // Set main window reference for terminal manager and file watcher
  if (mainWindow) {
    setMainWindow(mainWindow)
    setFileWatcherWindow(mainWindow)

    // Start watching the current working directory
    startWatching(process.cwd())
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
  cleanupAllTerminals()
  stopWatching()
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
