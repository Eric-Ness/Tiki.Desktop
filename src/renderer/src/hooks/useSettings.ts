import { useState, useEffect, useCallback } from 'react'

// Settings type definitions (mirrored from main process for type safety)
// These must be kept in sync with src/main/services/settings-store.ts

export interface AppearanceSettings {
  theme: 'dark' | 'light' | 'system'
  fontSize: number
  fontFamily: string
  accentColor: string
}

export interface TerminalSettings {
  fontSize: number
  fontFamily: string
  cursorStyle: 'block' | 'underline' | 'bar'
  cursorBlink: boolean
  scrollback: number
  copyOnSelect: boolean
  shell: string
}

export interface NotificationsSettings {
  enabled: boolean
  sound: boolean
  phaseComplete: boolean
  issuePlanned: boolean
  issueShipped: boolean
  errors: boolean
  workflowFailed: boolean
}

export interface KeyboardShortcutsSettings {
  toggleSidebar: string
  toggleDetailPanel: string
  commandPalette: string
  openSettings: string
  newTerminal: string
  closeTerminal: string
}

export interface GitHubSettings {
  autoRefresh: boolean
  refreshInterval: number
  defaultIssueState: 'open' | 'closed' | 'all'
}

export interface DataPrivacySettings {
  telemetry: boolean
  crashReports: boolean
  clearDataOnExit: boolean
}

export interface SettingsSchema {
  appearance: AppearanceSettings
  terminal: TerminalSettings
  notifications: NotificationsSettings
  keyboardShortcuts: KeyboardShortcutsSettings
  github: GitHubSettings
  dataPrivacy: DataPrivacySettings
}

export type SettingsCategory = keyof SettingsSchema

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

interface UseSettingsReturn {
  settings: SettingsSchema | null
  loading: boolean
  error: string | null
  updateSettings: (settings: DeepPartial<SettingsSchema>) => Promise<void>
  resetSettings: (category?: SettingsCategory) => Promise<void>
  exportSettings: () => Promise<{ success: boolean; path?: string; error?: string }>
  importSettings: () => Promise<{ success: boolean; error?: string }>
  refresh: () => Promise<void>
}

/**
 * Hook that provides access to application settings.
 * Loads settings on mount, listens for changes from main process,
 * and provides update/reset functions.
 *
 * Settings are managed by the main process using electron-store,
 * so this hook uses local React state rather than Zustand.
 */
export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<SettingsSchema | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load settings from main process
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await window.tikiDesktop.settings.get()
      setSettings(result as SettingsSchema)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load settings'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Update settings (partial update)
  const updateSettings = useCallback(async (newSettings: DeepPartial<SettingsSchema>) => {
    try {
      setError(null)
      // Cast to any to handle the preload type mismatch - the types are structurally identical
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updated = await window.tikiDesktop.settings.set(newSettings as any)
      setSettings(updated as SettingsSchema)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update settings'
      setError(message)
      throw err
    }
  }, [])

  // Reset settings to defaults
  const resetSettings = useCallback(async (category?: SettingsCategory) => {
    try {
      setError(null)
      // Cast to any to handle the preload type mismatch - the types are structurally identical
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await window.tikiDesktop.settings.reset(category as any)
      setSettings(result as SettingsSchema)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reset settings'
      setError(message)
      throw err
    }
  }, [])

  // Export settings to file
  const exportSettings = useCallback(async () => {
    try {
      setError(null)
      return await window.tikiDesktop.settings.export()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export settings'
      setError(message)
      return { success: false, error: message }
    }
  }, [])

  // Import settings from file
  const importSettings = useCallback(async () => {
    try {
      setError(null)
      const result = await window.tikiDesktop.settings.import()
      if (result.success) {
        // Reload settings after successful import
        await loadSettings()
      }
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import settings'
      setError(message)
      return { success: false, error: message }
    }
  }, [loadSettings])

  useEffect(() => {
    // Load settings on mount
    loadSettings()

    // Listen for settings changes from main process
    const cleanup = window.tikiDesktop.settings.onChange((newSettings) => {
      setSettings(newSettings as SettingsSchema)
    })

    return cleanup
  }, [loadSettings])

  return {
    settings,
    loading,
    error,
    updateSettings,
    resetSettings,
    exportSettings,
    importSettings,
    refresh: loadSettings
  }
}

/**
 * Hook that provides access to a specific settings category.
 * Provides a more focused API for components that only need one category.
 */
export function useSettingsCategory<K extends SettingsCategory>(category: K) {
  const { settings, loading, error, updateSettings, resetSettings } = useSettings()

  const categorySettings = settings?.[category] ?? null

  const updateCategory = useCallback(
    async (newSettings: DeepPartial<SettingsSchema[K]>) => {
      await updateSettings({ [category]: newSettings } as DeepPartial<SettingsSchema>)
    },
    [category, updateSettings]
  )

  const resetCategory = useCallback(async () => {
    await resetSettings(category)
  }, [category, resetSettings])

  return {
    settings: categorySettings,
    loading,
    error,
    update: updateCategory,
    reset: resetCategory
  }
}
