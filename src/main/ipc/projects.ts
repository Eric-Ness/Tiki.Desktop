import { ipcMain, dialog, BrowserWindow } from 'electron'
import { existsSync, statSync } from 'fs'
import { basename } from 'path'
import { startWatching, stopWatching } from '../services/file-watcher'

/**
 * Register IPC handlers for project management operations
 */
export function registerProjectHandlers(mainWindow: BrowserWindow | null): void {
  // Open folder dialog to add a new project
  ipcMain.handle('projects:pick-folder', async () => {
    if (!mainWindow) return null

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Project Folder'
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const path = result.filePaths[0]
    const name = basename(path)

    return {
      id: `project-${Date.now()}`,
      name,
      path
    }
  })

  // Validate a project path exists
  ipcMain.handle('projects:validate-path', async (_, { path }: { path: string }) => {
    try {
      if (!existsSync(path)) {
        return { valid: false, error: 'Path does not exist' }
      }
      const stat = statSync(path)
      if (!stat.isDirectory()) {
        return { valid: false, error: 'Path is not a directory' }
      }
      return { valid: true }
    } catch (error) {
      return { valid: false, error: 'Failed to validate path' }
    }
  })

  // Switch to a different project (updates file watcher)
  ipcMain.handle('projects:switch', async (_, { path }: { path: string }) => {
    try {
      // Stop current file watcher
      stopWatching()

      // Start watching new project path
      startWatching(path)

      // Notify renderer of project switch
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('projects:switched', { path })
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Failed to switch project' }
    }
  })
}
