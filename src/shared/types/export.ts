/**
 * Export/Import Types for Tiki Desktop
 *
 * This module defines the schema for exporting and importing application data,
 * including settings, projects, layout preferences, and recent commands/searches.
 */

import type {
  SettingsSchema,
  AppearanceSettings,
  TerminalSettings,
  NotificationsSettings,
  KeyboardShortcutsSettings,
  GitHubSettings,
  DataPrivacySettings
} from '../../main/services/settings-store'

// Re-export settings types for convenience
export type {
  SettingsSchema,
  AppearanceSettings,
  TerminalSettings,
  NotificationsSettings,
  KeyboardShortcutsSettings,
  GitHubSettings,
  DataPrivacySettings
}

/**
 * Current export format version.
 * Increment when making breaking changes to the export schema.
 */
export const EXPORT_VERSION = '1.0'

/**
 * Project definition for export
 */
export interface ExportProject {
  id: string
  name: string
  path: string
}

/**
 * Terminal pane layout
 */
export interface ExportTerminalPane {
  id: string
  terminalId: string
  size: number
}

/**
 * Terminal layout configuration
 */
export interface ExportTerminalLayout {
  direction: 'horizontal' | 'vertical' | 'none'
  panes: ExportTerminalPane[]
}

/**
 * Layout state for export
 */
export interface ExportLayout {
  sidebarCollapsed: boolean
  detailPanelCollapsed: boolean
  activeTab: string
  terminalLayout: ExportTerminalLayout
  focusedPaneId: string | null
}

/**
 * Main export data structure
 */
export interface ExportData {
  /** Export format version */
  version: string
  /** ISO timestamp of when the export was created */
  exportedAt: string
  /** Application version that created the export */
  appVersion: string
  /** Exported data */
  data: {
    settings: SettingsSchema
    projects: ExportProject[]
    layout: ExportLayout
    recentCommands: string[]
    recentSearches: string[]
  }
}

/**
 * Import mode determines how data is merged
 * - 'replace': Completely replace existing data with imported data
 * - 'merge': Merge imported data with existing data (keep existing where not in import)
 */
export type ImportMode = 'replace' | 'merge'

/**
 * Settings category change info for import preview
 */
export interface SettingsCategoryChange {
  category: string
  fieldsChanged: number
}

/**
 * Preview of what will change during import
 */
export interface ImportPreview {
  /** Whether the import file is valid */
  valid: boolean
  /** Validation errors that prevent import */
  errors: string[]
  /** Non-blocking warnings about the import */
  warnings: string[]
  /** Version of the export file */
  version: string
  /** Summary of changes that will be made */
  changes: {
    settings: SettingsCategoryChange[]
    projects: { added: number; removed: number; unchanged: number }
    layout: boolean
    recentCommands: boolean
  }
  /** The parsed export data (null if invalid) */
  data: ExportData | null
}

/**
 * Result of import validation
 */
export interface ImportValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  /** Parsed data if valid */
  data?: ExportData
}

/**
 * Result of an import operation
 */
export interface ImportResult {
  success: boolean
  error?: string
  /** What sections were imported */
  imported: {
    settings: boolean
    projects: number
    layout: boolean
    recentCommands: boolean
  }
}
