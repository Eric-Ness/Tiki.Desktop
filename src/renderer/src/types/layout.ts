/**
 * Layout Mode Types for Tiki.Desktop
 *
 * Layout modes control the overall UI structure, not just panel sizes.
 * This is a layer ABOVE the existing preset system.
 */

// ============================================================================
// LAYOUT MODES
// ============================================================================

/**
 * Available layout modes.
 * - workflow: Current Tiki workflow UI (default)
 * - development: VS Code-like file browser + editor
 */
export type LayoutMode = 'workflow' | 'development'

// ============================================================================
// SIDEBAR CONTENT MODES
// ============================================================================

/**
 * What content the sidebar displays.
 * Different layout modes use different sidebar content.
 */
export type SidebarContentMode = 'tiki-sections' | 'file-explorer'

// ============================================================================
// MAIN CONTENT TABS
// ============================================================================

/**
 * Tabs available in Workflow mode.
 * These already exist in the codebase but are not typed consistently.
 */
export type WorkflowMainTab =
  | 'terminal'
  | 'workflow'
  | 'timeline'
  | 'dependencies'
  | 'heatmap'
  | 'analytics'
  | 'config'
  | 'activity'

/**
 * Tabs available in Development mode.
 * Editor is primary, terminal is always available.
 */
export type DevelopmentMainTab =
  | 'editor' // Monaco code editor
  | 'terminal' // Same terminal as workflow mode
  | 'diff' // Git diff viewer (future)

// ============================================================================
// DETAIL PANEL MODES
// ============================================================================

/**
 * What the right detail panel shows in each mode.
 */
export type WorkflowDetailMode = 'context' // Phase/issue/release/etc details

export type DevelopmentDetailMode =
  | 'outline' // File symbols/structure
  | 'preview' // Markdown/image preview
  | 'git-changes' // Changed files list

// ============================================================================
// MODE STATE INTERFACES
// ============================================================================

/**
 * State specific to Development mode.
 * Stored separately to avoid polluting workflow state.
 */
export interface DevelopmentModeState {
  /** Currently active tab in development mode */
  activeTab: DevelopmentMainTab

  /** What the detail panel is showing */
  detailMode: DevelopmentDetailMode

  /** Whether to show the minimap in editor */
  showMinimap: boolean

  /** Whether to show breadcrumb navigation */
  showBreadcrumbs: boolean

  /** Whether integrated terminal is collapsed */
  terminalCollapsed: boolean

  /** Height of integrated terminal panel (percentage) */
  terminalHeight: number
}

/**
 * Default values for development mode state.
 * Used when entering development mode for the first time.
 */
export const DEFAULT_DEVELOPMENT_STATE: DevelopmentModeState = {
  activeTab: 'editor',
  detailMode: 'outline',
  showMinimap: true,
  showBreadcrumbs: true,
  terminalCollapsed: false,
  terminalHeight: 30
}

// ============================================================================
// LAYOUT MODE CONFIGURATION
// ============================================================================

/**
 * Full configuration for a layout mode.
 * Used when switching modes to restore previous state.
 */
export interface LayoutModeConfig {
  mode: LayoutMode

  /** Panel sizes as percentages */
  panelSizes: {
    sidebar: number
    main: number
    detail: number
  }

  /** Panel collapse states */
  sidebarCollapsed: boolean
  detailPanelCollapsed: boolean
}

/**
 * Default configurations for each mode.
 */
export const MODE_DEFAULTS: Record<LayoutMode, LayoutModeConfig> = {
  workflow: {
    mode: 'workflow',
    panelSizes: { sidebar: 20, main: 55, detail: 25 },
    sidebarCollapsed: false,
    detailPanelCollapsed: false
  },
  development: {
    mode: 'development',
    panelSizes: { sidebar: 20, main: 60, detail: 20 },
    sidebarCollapsed: false,
    detailPanelCollapsed: false
  }
}
