import Store from 'electron-store'
import { BrowserWindow, dialog } from 'electron'
import { readFile, writeFile } from 'fs/promises'

// Settings type definitions
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

// Default settings values
const defaultSettings: SettingsSchema = {
  appearance: {
    theme: 'dark',
    fontSize: 14,
    fontFamily: 'Inter, system-ui, sans-serif',
    accentColor: '#f59e0b' // amber-500
  },
  terminal: {
    fontSize: 13,
    fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace',
    cursorStyle: 'bar',
    cursorBlink: true,
    scrollback: 10000,
    copyOnSelect: false,
    shell: '' // empty means auto-detect
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

// Initialize the store
const store = new Store<SettingsSchema>({
  name: 'settings',
  defaults: defaultSettings
})

let mainWindow: BrowserWindow | null = null

export function setMainWindow(window: BrowserWindow): void {
  mainWindow = window
}

/**
 * Get all settings or a specific category
 */
export function getSettings<K extends keyof SettingsSchema>(
  category?: K
): K extends keyof SettingsSchema ? SettingsSchema[K] : SettingsSchema {
  if (category) {
    return store.get(category) as K extends keyof SettingsSchema ? SettingsSchema[K] : SettingsSchema
  }
  return store.store as K extends keyof SettingsSchema ? SettingsSchema[K] : SettingsSchema
}

/**
 * Update settings with partial data
 */
export function setSettings(settings: DeepPartial<SettingsSchema>): SettingsSchema {
  // Merge each category
  for (const [category, values] of Object.entries(settings)) {
    if (values && typeof values === 'object') {
      const currentValues = store.get(category as keyof SettingsSchema)
      store.set(category as keyof SettingsSchema, { ...currentValues, ...values })
    }
  }

  // Notify renderer of changes
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('settings:changed', store.store)
  }

  return store.store
}

/**
 * Reset settings to defaults (all or specific category)
 */
export function resetSettings(category?: keyof SettingsSchema): SettingsSchema {
  if (category) {
    store.set(category, defaultSettings[category])
  } else {
    store.clear()
    // Re-apply defaults
    for (const [key, value] of Object.entries(defaultSettings)) {
      store.set(key as keyof SettingsSchema, value)
    }
  }

  // Notify renderer
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('settings:changed', store.store)
  }

  return store.store
}

/**
 * Export settings to a JSON file
 */
export async function exportSettings(): Promise<{ success: boolean; path?: string; error?: string }> {
  if (!mainWindow) {
    return { success: false, error: 'No main window available' }
  }

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Settings',
    defaultPath: 'tiki-desktop-settings.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })

  if (result.canceled || !result.filePath) {
    return { success: false, error: 'Export cancelled' }
  }

  try {
    const settingsJson = JSON.stringify(store.store, null, 2)
    await writeFile(result.filePath, settingsJson, 'utf-8')
    return { success: true, path: result.filePath }
  } catch (err) {
    return { success: false, error: `Failed to export: ${err}` }
  }
}

/**
 * Import settings from a JSON file
 */
export async function importSettings(): Promise<{ success: boolean; error?: string }> {
  if (!mainWindow) {
    return { success: false, error: 'No main window available' }
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Settings',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  })

  if (result.canceled || !result.filePaths[0]) {
    return { success: false, error: 'Import cancelled' }
  }

  try {
    const content = await readFile(result.filePaths[0], 'utf-8')
    const imported = JSON.parse(content) as Partial<SettingsSchema>

    // Validate the imported settings structure
    const validCategories = Object.keys(defaultSettings)
    const importedCategories = Object.keys(imported)

    for (const category of importedCategories) {
      if (!validCategories.includes(category)) {
        return { success: false, error: `Invalid settings category: ${category}` }
      }
    }

    // Merge imported settings with defaults (for any missing fields)
    setSettings(imported)
    return { success: true }
  } catch (err) {
    return { success: false, error: `Failed to import: ${err}` }
  }
}

/**
 * Get the default settings
 */
export function getDefaultSettings(): SettingsSchema {
  return { ...defaultSettings }
}

// Utility type for deep partial
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}
