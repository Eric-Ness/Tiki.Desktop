import { ipcMain } from 'electron'
import { checkForUpdates, downloadUpdate, installUpdate, CheckResult } from '../services/update-service'

export function registerUpdateHandlers(): void {
  // Check for updates - returns result so renderer knows when check completes
  ipcMain.handle('app:check-updates', async (): Promise<CheckResult> => {
    return await checkForUpdates()
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
