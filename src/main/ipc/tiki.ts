import { ipcMain } from 'electron'
import {
  startWatching,
  stopWatching,
  getCurrentState,
  getPlan,
  getQueue,
  getReleases,
  getBranches,
  createRelease,
  updateRelease,
  deleteRelease,
  UpdateReleaseInput
} from '../services/file-watcher'
import { loadTikiCommands } from '../services/command-loader'
import { recommendIssuesForRelease } from '../services/llm-service'

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

  // Get branch associations
  ipcMain.handle('tiki:get-branches', async () => {
    return getBranches()
  })

  // Get Tiki commands from .claude/commands/tiki/*.md
  ipcMain.handle('tiki:get-commands', async (_, { cwd }: { cwd?: string }) => {
    return loadTikiCommands(cwd)
  })

  // Create a new release
  ipcMain.handle(
    'tiki:create-release',
    async (
      _,
      data: {
        version: string
        issues: Array<{ number: number; title: string }>
      }
    ) => {
      return createRelease(data.version, data.issues)
    }
  )

  // Get LLM recommendations for release issues
  ipcMain.handle(
    'tiki:recommend-release-issues',
    async (
      _,
      data: {
        issues: Array<{ number: number; title: string; body?: string; labels?: string[] }>
        version: string
      }
    ) => {
      return recommendIssuesForRelease(data.issues, data.version)
    }
  )

  // Update an existing release
  ipcMain.handle(
    'tiki:update-release',
    async (
      _,
      data: {
        currentVersion: string
        updates: UpdateReleaseInput
      }
    ) => {
      return updateRelease(data.currentVersion, data.updates)
    }
  )

  // Delete a release
  ipcMain.handle('tiki:delete-release', async (_, { version }: { version: string }) => {
    return deleteRelease(version)
  })
}
