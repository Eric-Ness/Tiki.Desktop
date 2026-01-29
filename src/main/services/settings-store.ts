import Store from 'electron-store'
import { BrowserWindow, dialog, app } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import {
  EXPORT_VERSION,
  type ExportData,
  type ExportProject,
  type ExportLayout,
  type ImportPreview,
  type ImportMode,
  type ImportResult,
  type SettingsCategoryChange
} from '../../shared/types/export'

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
 * App data passed from renderer for full export
 */
export interface ExportAppData {
  projects: ExportProject[]
  layout: ExportLayout
  recentCommands: string[]
  recentSearches: string[]
}

/**
 * Export settings to a JSON file
 * When appData is provided, exports full backup with all app data.
 * Otherwise, exports settings only (legacy behavior).
 */
export async function exportSettings(
  appData?: ExportAppData
): Promise<{ success: boolean; path?: string; error?: string }> {
  if (!mainWindow) {
    return { success: false, error: 'No main window available' }
  }

  // Generate default filename with date
  const dateStr = new Date().toISOString().split('T')[0]
  const defaultFilename = appData
    ? `tiki-desktop-backup-${dateStr}.json`
    : 'tiki-desktop-settings.json'

  const result = await dialog.showSaveDialog(mainWindow, {
    title: appData ? 'Export Backup' : 'Export Settings',
    defaultPath: defaultFilename,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })

  if (result.canceled || !result.filePath) {
    return { success: false, error: 'Export cancelled' }
  }

  try {
    let dataToExport: ExportData | SettingsSchema

    if (appData) {
      // Full export with all app data
      const exportData: ExportData = {
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        appVersion: app.getVersion(),
        data: {
          settings: store.store,
          projects: appData.projects,
          layout: appData.layout,
          recentCommands: appData.recentCommands,
          recentSearches: appData.recentSearches
        }
      }
      dataToExport = exportData
    } else {
      // Legacy: settings only
      dataToExport = store.store
    }

    const json = JSON.stringify(dataToExport, null, 2)
    await writeFile(result.filePath, json, 'utf-8')
    return { success: true, path: result.filePath }
  } catch (err) {
    return { success: false, error: `Failed to export: ${err}` }
  }
}

/**
 * Supported export versions for import
 */
const SUPPORTED_VERSIONS = ['1.0']

/**
 * Valid top-level fields in export data
 */
const VALID_TOP_LEVEL_FIELDS = ['version', 'exportedAt', 'appVersion', 'data']

/**
 * Valid fields in the data section
 */
const VALID_DATA_FIELDS = ['settings', 'projects', 'layout', 'recentCommands', 'recentSearches']

/**
 * Count fields that differ between two objects
 */
function countChangedFields(current: Record<string, unknown>, imported: Record<string, unknown>): number {
  let count = 0
  const allKeys = Array.from(new Set([...Object.keys(current), ...Object.keys(imported)]))

  for (const key of allKeys) {
    if (JSON.stringify(current[key]) !== JSON.stringify(imported[key])) {
      count++
    }
  }

  return count
}

/**
 * Compare settings and return category-level changes
 */
function compareSettings(
  current: SettingsSchema,
  imported: SettingsSchema
): SettingsCategoryChange[] {
  const changes: SettingsCategoryChange[] = []
  const categories = Object.keys(defaultSettings) as Array<keyof SettingsSchema>

  for (const category of categories) {
    const currentCat = current[category] as unknown as Record<string, unknown>
    const importedCat = imported[category] as unknown as Record<string, unknown>

    if (importedCat) {
      const fieldsChanged = countChangedFields(currentCat, importedCat)
      if (fieldsChanged > 0) {
        changes.push({ category, fieldsChanged })
      }
    }
  }

  return changes
}

/**
 * Compare projects and return counts
 */
function compareProjects(
  current: ExportProject[],
  imported: ExportProject[]
): { added: number; removed: number; unchanged: number } {
  const currentIds = new Set(current.map(p => p.id))
  const importedIds = new Set(imported.map(p => p.id))

  let added = 0
  let unchanged = 0

  for (const importedProject of imported) {
    if (!currentIds.has(importedProject.id)) {
      added++
    } else {
      // Check if the project data is the same
      const currentProject = current.find(p => p.id === importedProject.id)
      if (currentProject &&
          currentProject.name === importedProject.name &&
          currentProject.path === importedProject.path) {
        unchanged++
      }
    }
  }

  // Projects in current but not in imported will be removed on replace
  const removed = current.filter(p => !importedIds.has(p.id)).length

  return { added, removed, unchanged }
}

/**
 * Validate the structure of settings categories
 */
function validateSettingsSchema(settings: unknown): string[] {
  const errors: string[] = []

  if (typeof settings !== 'object' || settings === null) {
    errors.push('Settings must be an object')
    return errors
  }

  const settingsObj = settings as Record<string, unknown>
  const validCategories = Object.keys(defaultSettings)

  // Check for invalid categories
  for (const key of Object.keys(settingsObj)) {
    if (!validCategories.includes(key)) {
      errors.push(`Unknown settings category: ${key}`)
    }
  }

  // Validate each category has correct structure
  for (const category of validCategories) {
    const categoryData = settingsObj[category]
    if (categoryData !== undefined) {
      if (typeof categoryData !== 'object' || categoryData === null) {
        errors.push(`Settings category '${category}' must be an object`)
      }
    }
  }

  return errors
}

/**
 * Preview import by opening file dialog, validating, and returning changes summary
 */
export async function previewImport(
  currentAppData?: ExportAppData
): Promise<ImportPreview> {
  // Default response for invalid/cancelled imports
  const invalidPreview = (errors: string[], warnings: string[] = []): ImportPreview => ({
    valid: false,
    errors,
    warnings,
    version: '',
    changes: {
      settings: [],
      projects: { added: 0, removed: 0, unchanged: 0 },
      layout: false,
      recentCommands: false
    },
    data: null
  })

  if (!mainWindow) {
    return invalidPreview(['No main window available'])
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Backup',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  })

  if (result.canceled || !result.filePaths[0]) {
    return invalidPreview(['Import cancelled'])
  }

  let content: string
  try {
    content = await readFile(result.filePaths[0], 'utf-8')
  } catch (err) {
    return invalidPreview([`Failed to read file: ${err}`])
  }

  // Parse JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    return invalidPreview(['Invalid JSON format. The file must be a valid JSON file.'])
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return invalidPreview(['Invalid file format. Expected a JSON object.'])
  }

  const data = parsed as Record<string, unknown>
  const errors: string[] = []
  const warnings: string[] = []

  // Check for version field
  if (!('version' in data)) {
    return invalidPreview(['Missing version field. This may not be a Tiki Desktop export file.'])
  }

  const version = String(data.version)

  // Check version compatibility
  if (!SUPPORTED_VERSIONS.includes(version)) {
    warnings.push(
      `Unknown export version '${version}'. Current supported versions: ${SUPPORTED_VERSIONS.join(', ')}. ` +
      `Import may not work correctly. Consider exporting from a compatible version of Tiki Desktop.`
    )
  }

  // Check for unexpected top-level fields
  for (const key of Object.keys(data)) {
    if (!VALID_TOP_LEVEL_FIELDS.includes(key)) {
      warnings.push(`Unexpected field '${key}' will be ignored`)
    }
  }

  // Check for required data section
  if (!('data' in data)) {
    return invalidPreview(['Missing data section. The export file appears to be malformed.'])
  }

  const dataSection = data.data
  if (typeof dataSection !== 'object' || dataSection === null) {
    return invalidPreview(['Invalid data section. Expected an object.'])
  }

  const dataSectionObj = dataSection as Record<string, unknown>

  // Check for unexpected data fields
  for (const key of Object.keys(dataSectionObj)) {
    if (!VALID_DATA_FIELDS.includes(key)) {
      warnings.push(`Unexpected data field '${key}' will be ignored`)
    }
  }

  // Check for settings (required at minimum)
  if (!('settings' in dataSectionObj)) {
    return invalidPreview(['Missing settings in data section. Settings are required.'])
  }

  // Validate settings schema
  const settingsErrors = validateSettingsSchema(dataSectionObj.settings)
  errors.push(...settingsErrors)

  // If there are errors, return invalid preview
  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      warnings,
      version,
      changes: {
        settings: [],
        projects: { added: 0, removed: 0, unchanged: 0 },
        layout: false,
        recentCommands: false
      },
      data: null
    }
  }

  // Build the ExportData object for return
  const exportData: ExportData = {
    version,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
    appVersion: typeof data.appVersion === 'string' ? data.appVersion : 'unknown',
    data: {
      settings: dataSectionObj.settings as SettingsSchema,
      projects: Array.isArray(dataSectionObj.projects) ? dataSectionObj.projects as ExportProject[] : [],
      layout: typeof dataSectionObj.layout === 'object' && dataSectionObj.layout !== null
        ? dataSectionObj.layout as ExportLayout
        : {
            sidebarCollapsed: false,
            detailPanelCollapsed: false,
            activeTab: 'issues',
            terminalLayout: { direction: 'none', panes: [] },
            focusedPaneId: null
          },
      recentCommands: Array.isArray(dataSectionObj.recentCommands) ? dataSectionObj.recentCommands as string[] : [],
      recentSearches: Array.isArray(dataSectionObj.recentSearches) ? dataSectionObj.recentSearches as string[] : []
    }
  }

  // Compare with current data to build changes summary
  const currentSettings = store.store
  const settingsChanges = compareSettings(currentSettings, exportData.data.settings)

  const currentProjects = currentAppData?.projects ?? []
  const projectChanges = compareProjects(currentProjects, exportData.data.projects)

  // Check if layout differs
  const currentLayout = currentAppData?.layout
  const layoutChanged = currentLayout
    ? JSON.stringify(currentLayout) !== JSON.stringify(exportData.data.layout)
    : exportData.data.layout !== undefined

  // Check if recent commands differ
  const currentCommands = currentAppData?.recentCommands ?? []
  const recentCommandsChanged = JSON.stringify(currentCommands) !== JSON.stringify(exportData.data.recentCommands)

  return {
    valid: true,
    errors: [],
    warnings,
    version,
    changes: {
      settings: settingsChanges,
      projects: projectChanges,
      layout: layoutChanged,
      recentCommands: recentCommandsChanged
    },
    data: exportData
  }
}

/**
 * Deep merge two objects, with source values taking precedence
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target }

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key]
    const targetValue = target[key]

    if (
      sourceValue !== undefined &&
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      // Recursively merge nested objects
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      ) as T[keyof T]
    } else if (sourceValue !== undefined) {
      // Use source value for primitives, arrays, or when target is not an object
      result[key] = sourceValue as T[keyof T]
    }
  }

  return result
}

/**
 * Merge projects: add new projects, keep existing ones
 */
function mergeProjects(
  current: ExportProject[],
  imported: ExportProject[]
): { merged: ExportProject[]; count: number } {
  const currentByPath = new Map(current.map(p => [p.path, p]))
  let newCount = 0

  for (const project of imported) {
    if (!currentByPath.has(project.path)) {
      currentByPath.set(project.path, project)
      newCount++
    }
  }

  return {
    merged: Array.from(currentByPath.values()),
    count: newCount
  }
}

/**
 * Merge recent commands: union, deduped, limited to 10
 */
function mergeRecentCommands(current: string[], imported: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  // Add imported first (they take precedence as more recent)
  for (const cmd of imported) {
    if (!seen.has(cmd) && result.length < 10) {
      seen.add(cmd)
      result.push(cmd)
    }
  }

  // Then add current commands that aren't already included
  for (const cmd of current) {
    if (!seen.has(cmd) && result.length < 10) {
      seen.add(cmd)
      result.push(cmd)
    }
  }

  return result
}

/**
 * Import data with support for replace and merge modes.
 * Accepts pre-validated ExportData from preview.
 */
export async function importSettings(
  mode: ImportMode,
  data: ExportData,
  currentAppData?: ExportAppData
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    imported: {
      settings: false,
      projects: 0,
      layout: false,
      recentCommands: false
    }
  }

  try {
    // Handle settings
    if (data.data.settings) {
      if (mode === 'replace') {
        // Replace mode: overwrite all settings
        store.clear()
        for (const [category, values] of Object.entries(data.data.settings)) {
          if (values && typeof values === 'object') {
            store.set(category as keyof SettingsSchema, values)
          }
        }
      } else {
        // Merge mode: deep merge each category
        const currentSettings = store.store
        for (const category of Object.keys(defaultSettings) as Array<keyof SettingsSchema>) {
          const importedCategory = data.data.settings[category]
          if (importedCategory) {
            const currentCategory = currentSettings[category] as unknown as Record<string, unknown>
            const merged = deepMerge(currentCategory, importedCategory as unknown as Record<string, unknown>)
            store.set(category, merged)
          }
        }
      }
      result.imported.settings = true
    }

    // Handle projects
    if (data.data.projects && data.data.projects.length > 0) {
      if (mode === 'replace') {
        // Replace mode: the renderer will handle replacing the entire projects list
        result.imported.projects = data.data.projects.length
      } else {
        // Merge mode: merge with current projects
        const currentProjects = currentAppData?.projects ?? []
        const { count } = mergeProjects(currentProjects, data.data.projects)
        result.imported.projects = count
      }
    }

    // Handle layout
    if (data.data.layout) {
      // Layout is always replaced (merge doesn't make sense for layout)
      result.imported.layout = true
    }

    // Handle recent commands
    if (data.data.recentCommands && data.data.recentCommands.length > 0) {
      if (mode === 'replace') {
        // Replace mode: the renderer will handle this
        result.imported.recentCommands = true
      } else {
        // Merge mode: union deduped
        const currentCommands = currentAppData?.recentCommands ?? []
        const merged = mergeRecentCommands(currentCommands, data.data.recentCommands)
        // If any new commands were added
        result.imported.recentCommands = merged.length > currentCommands.length ||
          merged.some(cmd => !currentCommands.includes(cmd))
      }
    }

    // Notify renderer of settings changes
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('settings:changed', store.store)
    }

    return result
  } catch (err) {
    return {
      success: false,
      error: `Failed to import: ${err}`,
      imported: {
        settings: false,
        projects: 0,
        layout: false,
        recentCommands: false
      }
    }
  }
}

/**
 * Get merged data for the renderer to apply (used by IPC handler)
 */
export function getMergedImportData(
  mode: ImportMode,
  data: ExportData,
  currentAppData?: ExportAppData
): {
  projects: ExportProject[]
  layout: ExportLayout
  recentCommands: string[]
  recentSearches: string[]
} {
  if (mode === 'replace') {
    return {
      projects: data.data.projects,
      layout: data.data.layout,
      recentCommands: data.data.recentCommands,
      recentSearches: data.data.recentSearches
    }
  }

  // Merge mode
  const currentProjects = currentAppData?.projects ?? []
  const { merged: mergedProjects } = mergeProjects(currentProjects, data.data.projects)

  const currentCommands = currentAppData?.recentCommands ?? []
  const mergedCommands = mergeRecentCommands(currentCommands, data.data.recentCommands)

  const currentSearches = currentAppData?.recentSearches ?? []
  const mergedSearches = mergeRecentCommands(currentSearches, data.data.recentSearches)

  return {
    projects: mergedProjects,
    layout: data.data.layout, // Layout is always replaced
    recentCommands: mergedCommands,
    recentSearches: mergedSearches
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
