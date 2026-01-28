import { ipcMain } from 'electron'
import {
  startWatching,
  stopWatching,
  getCurrentState,
  getPlan,
  getQueue
} from '../services/file-watcher'

export function registerTikiHandlers(): void {
  // Start watching a project directory
  ipcMain.handle('tiki:watch', (_, { path }: { path: string }) => {
    startWatching(path)
    return true
  })

  // Stop watching
  ipcMain.handle('tiki:unwatch', () => {
    stopWatching()
    return true
  })

  // Get current state
  ipcMain.handle('tiki:get-state', async () => {
    return getCurrentState()
  })

  // Get a specific plan
  ipcMain.handle('tiki:get-plan', async (_, issueNumber: number) => {
    return getPlan(issueNumber)
  })

  // Get the queue
  ipcMain.handle('tiki:get-queue', async () => {
    return getQueue()
  })
}
