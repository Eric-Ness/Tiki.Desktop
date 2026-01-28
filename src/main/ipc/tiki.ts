import { ipcMain } from 'electron'
import {
  startWatching,
  stopWatching,
  getCurrentState,
  getPlan,
  getQueue,
  getReleases
} from '../services/file-watcher'
import { loadTikiCommands } from '../services/command-loader'

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

  // Get all releases
  ipcMain.handle('tiki:get-releases', async () => {
    return getReleases()
  })

  // Get Tiki commands from .claude/commands/tiki/*.md
  ipcMain.handle('tiki:get-commands', async (_, { cwd }: { cwd?: string }) => {
    return loadTikiCommands(cwd)
  })
}
