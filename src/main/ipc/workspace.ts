import { ipcMain } from 'electron'
import { join } from 'path'
import { homedir } from 'os'
import { WorkspaceService, WorkspaceSnapshot, TerminalSnapshot, LayoutSnapshot } from '../services/workspace-service'

let workspaceService: WorkspaceService | null = null

function getService(): WorkspaceService {
  if (!workspaceService) {
    const basePath = join(homedir(), '.tiki-desktop', 'workspaces')
    workspaceService = new WorkspaceService(basePath)
  }
  return workspaceService
}

export function registerWorkspaceHandlers(): void {
  // workspace:save - Save current workspace
  ipcMain.handle('workspace:save', async (_, { snapshot }) => {
    const service = getService()
    return service.saveSnapshot(snapshot)
  })

  // workspace:get - Get snapshot by ID
  ipcMain.handle('workspace:get', async (_, { id }) => {
    const service = getService()
    return service.getSnapshot(id)
  })

  // workspace:list - List all snapshots
  ipcMain.handle('workspace:list', async () => {
    const service = getService()
    return service.listSnapshots()
  })

  // workspace:delete - Delete snapshot
  ipcMain.handle('workspace:delete', async (_, { id }) => {
    const service = getService()
    return service.deleteSnapshot(id)
  })

  // workspace:rename - Rename snapshot
  ipcMain.handle('workspace:rename', async (_, { id, name }) => {
    const service = getService()
    return service.renameSnapshot(id, name)
  })

  // workspace:get-storage - Get storage info
  ipcMain.handle('workspace:get-storage', async () => {
    const service = getService()
    return service.getStorageInfo()
  })
}

// Re-export types for use in other modules
export type { WorkspaceSnapshot, TerminalSnapshot, LayoutSnapshot }
