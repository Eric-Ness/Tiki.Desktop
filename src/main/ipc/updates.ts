import { ipcMain } from 'electron'
import { checkForUpdates, downloadUpdate, installUpdate } from '../services/update-service'

export function registerUpdateHandlers(): void {
  // Check for updates
  ipcMain.handle('app:check-updates', async () => {
    await checkForUpdates()
  })

  // Download update
  ipcMain.handle('app:download-update', async () => {
    await downloadUpdate()
  })

  // Install update (quit and install)
  ipcMain.handle('app:install-update', async () => {
    installUpdate()
  })
}
