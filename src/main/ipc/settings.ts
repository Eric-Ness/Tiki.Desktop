import { ipcMain } from 'electron'
import {
  getSettings,
  setSettings,
  resetSettings,
  exportSettings,
  importSettings,
  type SettingsSchema
} from '../services/settings-store'

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export function registerSettingsHandlers(): void {
  // Get all settings or specific category
  ipcMain.handle(
    'settings:get',
    async (_, { category }: { category?: keyof SettingsSchema }) => {
      return getSettings(category)
    }
  )

  // Update settings (partial update support)
  ipcMain.handle(
    'settings:set',
    async (_, { settings }: { settings: DeepPartial<SettingsSchema> }) => {
      return setSettings(settings)
    }
  )

  // Reset to defaults (all or specific category)
  ipcMain.handle(
    'settings:reset',
    async (_, { category }: { category?: keyof SettingsSchema }) => {
      return resetSettings(category)
    }
  )

  // Export settings to JSON file
  ipcMain.handle('settings:export', async () => {
    return exportSettings()
  })

  // Import settings from JSON file
  ipcMain.handle('settings:import', async () => {
    return importSettings()
  })
}
