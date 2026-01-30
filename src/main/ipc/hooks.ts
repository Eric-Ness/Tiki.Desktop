import { ipcMain } from 'electron'
import {
  listHooks,
  readHook,
  writeHook,
  deleteHook,
  executeHook,
  getExecutionHistory,
  getHookTypes,
  ensureHooksDirectory
} from '../services/hooks-service'

/**
 * Register IPC handlers for hooks management
 */
export function registerHooksHandlers(): void {
  // List all hooks
  ipcMain.handle('hooks:list', async (_, { cwd }: { cwd?: string }) => {
    return listHooks(cwd)
  })

  // Read hook content
  ipcMain.handle('hooks:read', async (_, { name, cwd }: { name: string; cwd?: string }) => {
    return readHook(name, cwd)
  })

  // Write/create hook
  ipcMain.handle(
    'hooks:write',
    async (_, { name, content, cwd }: { name: string; content: string; cwd?: string }) => {
      return writeHook(name, content, cwd)
    }
  )

  // Delete hook
  ipcMain.handle('hooks:delete', async (_, { name, cwd }: { name: string; cwd?: string }) => {
    return deleteHook(name, cwd)
  })

  // Execute hook
  ipcMain.handle(
    'hooks:execute',
    async (
      _,
      {
        name,
        env,
        cwd,
        timeout
      }: { name: string; env?: Record<string, string>; cwd?: string; timeout?: number }
    ) => {
      return executeHook(name, env || {}, cwd, timeout)
    }
  )

  // Get execution history
  ipcMain.handle('hooks:history', async (_, { limit }: { limit?: number }) => {
    return getExecutionHistory(limit)
  })

  // Get available hook types
  ipcMain.handle('hooks:types', async () => {
    return getHookTypes()
  })

  // Ensure hooks directory exists
  ipcMain.handle('hooks:ensure-directory', async (_, { cwd }: { cwd?: string }) => {
    await ensureHooksDirectory(cwd)
    return true
  })
}
