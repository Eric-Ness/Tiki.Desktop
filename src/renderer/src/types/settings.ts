// Settings type definitions for the renderer
// Must match src/main/services/settings-store.ts

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

// Utility type for deep partial
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// Settings category names for type-safe access
export type SettingsCategory = keyof SettingsSchema
