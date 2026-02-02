import { ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { logger } from '../services/logger'
import {
  startWatching,
  stopWatching,
  getCurrentState,
  getYoloState,
  getPhases,
  getPlan,
  getQueue,
  getReleases,
  getBranches,
  createRelease,
  updateRelease,
  deleteRelease,
  UpdateReleaseInput,
  getWatchedPath
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

  // Get yolo state (release-yolo execution context)
  ipcMain.handle('tiki:get-yolo-state', async () => {
    return getYoloState()
  })

  // Get phases state (for new State panel display)
  ipcMain.handle('tiki:get-phases', async () => {
    return getPhases()
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

  // Get requirements from .tiki/requirements.json
  ipcMain.handle('tiki:get-requirements', async () => {
    const watchedPath = getWatchedPath()
    if (!watchedPath) {
      return []
    }

    const requirementsPath = path.join(watchedPath, '.tiki', 'requirements.json')

    try {
      if (!fs.existsSync(requirementsPath)) {
        return []
      }
      const content = fs.readFileSync(requirementsPath, 'utf-8')
      const data = JSON.parse(content)
      // Return the requirements array (handle both array format and object with requirements property)
      return Array.isArray(data) ? data : (data.requirements || [])
    } catch (error) {
      logger.error('Error reading requirements:', error)
      return []
    }
  })
}
