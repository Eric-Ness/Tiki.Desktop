import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { SettingsSchema, DeepPartial } from '../types/settings'

// Default settings matching the main process defaults
const defaultSettings: SettingsSchema = {
  appearance: {
    theme: 'dark',
    fontSize: 14,
    fontFamily: 'Inter, system-ui, sans-serif',
    accentColor: '#f59e0b'
  },
  terminal: {
    fontSize: 13,
    fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace',
    cursorStyle: 'bar',
    cursorBlink: true,
    scrollback: 10000,
    copyOnSelect: false,
    shell: ''
  },
  notifications: {
    enabled: true,
    sound: false,
    phaseComplete: true,
    issuePlanned: true,
    issueShipped: true,
    errors: true
  },
  keyboardShortcuts: {
    toggleSidebar: 'Ctrl+Shift+B',
    toggleDetailPanel: 'Ctrl+Shift+D',
    commandPalette: 'Ctrl+K',
    openSettings: 'Ctrl+,',
    newTerminal: 'Ctrl+Shift+`',
    closeTerminal: 'Ctrl+Shift+W'
  },
  github: {
    autoRefresh: true,
    refreshInterval: 5,
    defaultIssueState: 'open'
  },
  dataPrivacy: {
    telemetry: false,
    crashReports: false,
    clearDataOnExit: false
  }
}

interface SettingsContextValue {
  settings: SettingsSchema
  isLoading: boolean
  updateSettings: (partial: DeepPartial<SettingsSchema>) => Promise<void>
  resetSettings: (category?: keyof SettingsSchema) => Promise<void>
  exportSettings: () => Promise<{ success: boolean; path?: string; error?: string }>
  importSettings: () => Promise<{ success: boolean; error?: string }>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

interface SettingsProviderProps {
  children: ReactNode
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<SettingsSchema>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)

  // Load initial settings from main process
  useEffect(() => {
    async function loadSettings() {
      try {
        const loaded = await window.tikiDesktop.settings.get()
        if (loaded) {
          setSettings(loaded as SettingsSchema)
        }
      } catch (err) {
        console.error('Failed to load settings:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  // Listen for settings changes from main process
  useEffect(() => {
    const cleanup = window.tikiDesktop.settings.onChange((newSettings) => {
      setSettings(newSettings as SettingsSchema)
    })
    return cleanup
  }, [])

  // Update settings
  const updateSettings = useCallback(async (partial: DeepPartial<SettingsSchema>) => {
    try {
      const updated = await window.tikiDesktop.settings.set(partial as Record<string, unknown>)
      setSettings(updated as SettingsSchema)
    } catch (err) {
      console.error('Failed to update settings:', err)
      throw err
    }
  }, [])

  // Reset settings
  const resetSettings = useCallback(async (category?: keyof SettingsSchema) => {
    try {
      const reset = await window.tikiDesktop.settings.reset(category)
      setSettings(reset as SettingsSchema)
    } catch (err) {
      console.error('Failed to reset settings:', err)
      throw err
    }
  }, [])

  // Export settings
  const exportSettings = useCallback(async () => {
    return window.tikiDesktop.settings.export()
  }, [])

  // Import settings
  const importSettings = useCallback(async () => {
    const result = await window.tikiDesktop.settings.import()
    if (result.success) {
      // Reload settings after import
      const loaded = await window.tikiDesktop.settings.get()
      if (loaded) {
        setSettings(loaded as SettingsSchema)
      }
    }
    return result
  }, [])

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isLoading,
        updateSettings,
        resetSettings,
        exportSettings,
        importSettings
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

/**
 * Hook to get a specific settings category
 */
export function useSettingsCategory<K extends keyof SettingsSchema>(
  category: K
): SettingsSchema[K] {
  const { settings } = useSettings()
  return settings[category]
}
