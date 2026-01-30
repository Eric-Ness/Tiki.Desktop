import { ipcMain } from 'electron'
import {
  listCommands,
  readCommand,
  writeCommand,
  deleteCommand,
  getNamespaces,
  ensureCommandsDirectory
} from '../services/commands-service'

/**
 * Register IPC handlers for custom commands management
 */
export function registerCommandsHandlers(): void {
  // List all commands
  ipcMain.handle('commands:list', async (_, { cwd }: { cwd?: string }) => {
    return listCommands(cwd)
  })

  // Read command content
  ipcMain.handle('commands:read', async (_, { name, cwd }: { name: string; cwd?: string }) => {
    return readCommand(name, cwd)
  })

  // Write/create command
  ipcMain.handle(
    'commands:write',
    async (_, { name, content, cwd }: { name: string; content: string; cwd?: string }) => {
      return writeCommand(name, content, cwd)
    }
  )

  // Delete command
  ipcMain.handle('commands:delete', async (_, { name, cwd }: { name: string; cwd?: string }) => {
    return deleteCommand(name, cwd)
  })

  // Get available namespaces
  ipcMain.handle('commands:namespaces', async (_, { cwd }: { cwd?: string }) => {
    return getNamespaces(cwd)
  })

  // Ensure commands directory exists
  ipcMain.handle('commands:ensure-directory', async (_, { cwd }: { cwd?: string }) => {
    await ensureCommandsDirectory(cwd)
    return true
  })
}
