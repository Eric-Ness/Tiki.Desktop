import { ipcMain } from 'electron'
import {
  readConfig,
  writeConfig,
  validateConfig,
  resetConfig,
  type TikiConfig
} from '../services/config-service'

export function registerConfigHandlers(): void {
  // Read config from project
  ipcMain.handle('config:read', async (_, { projectPath }: { projectPath: string }) => {
    return readConfig(projectPath)
  })

  // Write config to project
  ipcMain.handle(
    'config:write',
    async (_, { projectPath, config }: { projectPath: string; config: TikiConfig }) => {
      return writeConfig(projectPath, config)
    }
  )

  // Validate config
  ipcMain.handle('config:validate', async (_, { config }: { config: unknown }) => {
    return validateConfig(config)
  })

  // Reset config to defaults
  ipcMain.handle('config:reset', async (_, { projectPath }: { projectPath: string }) => {
    return resetConfig(projectPath)
  })
}
