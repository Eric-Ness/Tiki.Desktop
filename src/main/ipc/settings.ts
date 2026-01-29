import { ipcMain } from 'electron'
import {
  getSettings,
  setSettings,
  resetSettings,
  exportSettings,
  importSettings,
  getMergedImportData,
  previewImport,
  type SettingsSchema,
  type ExportAppData
} from '../services/settings-store'
import type { ExportData, ImportMode } from '../../shared/types/export'

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

  // Export settings to JSON file (with optional app data for full backup)
  ipcMain.handle('settings:export', async (_, { appData }: { appData?: ExportAppData } = {}) => {
    return exportSettings(appData)
  })

  // Import settings from JSON file (with mode and pre-validated data)
  ipcMain.handle(
    'settings:import',
    async (
      _,
      {
        mode,
        data,
        currentAppData
      }: {
        mode: ImportMode
        data: ExportData
        currentAppData?: ExportAppData
      }
    ) => {
      const result = await importSettings(mode, data, currentAppData)

      // Also return the merged data for the renderer to apply
      if (result.success) {
        const mergedData = getMergedImportData(mode, data, currentAppData)
        return {
          ...result,
          mergedData
        }
      }

      return result
    }
  )

  // Preview import from JSON file (validate and show changes)
  ipcMain.handle(
    'settings:preview-import',
    async (_, { appData }: { appData?: ExportAppData } = {}) => {
      return previewImport(appData)
    }
  )
}
