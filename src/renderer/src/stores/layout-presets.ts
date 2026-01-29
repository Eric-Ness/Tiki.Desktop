import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'

// Types for panel sizes
export interface PanelSizes {
  sidebarSize: number
  mainSize: number
  detailPanelSize: number
}

// Active tab type (matching tiki-store)
export type ActiveTab = 'terminal' | 'workflow' | 'config'

// Full layout data including collapse states and active tab
export interface LayoutData {
  sidebarSize: number
  mainSize: number
  detailPanelSize: number
  sidebarCollapsed: boolean
  detailPanelCollapsed: boolean
  activeTab: ActiveTab
}

// Layout preset interface
export interface LayoutPreset {
  id: string
  name: string
  isBuiltIn: boolean
  layout: LayoutData
}

// Built-in presets - these are readonly and cannot be modified
export const builtInPresets: readonly LayoutPreset[] = [
  {
    id: 'default',
    name: 'Default',
    isBuiltIn: true,
    layout: {
      sidebarSize: 20,
      mainSize: 55,
      detailPanelSize: 25,
      sidebarCollapsed: false,
      detailPanelCollapsed: false,
      activeTab: 'terminal'
    }
  },
  {
    id: 'focus',
    name: 'Focus',
    isBuiltIn: true,
    layout: {
      sidebarSize: 0,
      mainSize: 100,
      detailPanelSize: 0,
      sidebarCollapsed: true,
      detailPanelCollapsed: true,
      activeTab: 'terminal'
    }
  },
  {
    id: 'planning',
    name: 'Planning',
    isBuiltIn: true,
    layout: {
      sidebarSize: 25,
      mainSize: 50,
      detailPanelSize: 25,
      sidebarCollapsed: false,
      detailPanelCollapsed: false,
      activeTab: 'terminal'
    }
  },
  {
    id: 'review',
    name: 'Review',
    isBuiltIn: true,
    layout: {
      sidebarSize: 15,
      mainSize: 45,
      detailPanelSize: 40,
      sidebarCollapsed: false,
      detailPanelCollapsed: false,
      activeTab: 'terminal'
    }
  }
] as const

// Function to generate unique ID for custom presets
export function generatePresetId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Store state interface
interface LayoutPresetsState {
  // Current panel sizes (tracked via onLayout callback)
  currentPanelSizes: PanelSizes

  // User-created presets (built-in presets are separate)
  presets: LayoutPreset[]

  // Currently active preset ID (null if custom layout)
  activePresetId: string | null

  // Actions
  updatePanelSizes: (sizes: number[]) => void
  applyPreset: (presetId: string) => void
  saveCurrentAsPreset: (
    name: string,
    currentLayout: { sidebarCollapsed: boolean; detailPanelCollapsed: boolean; activeTab: ActiveTab }
  ) => LayoutPreset
  renamePreset: (id: string, newName: string) => boolean
  deletePreset: (id: string) => boolean
}

// Default panel sizes matching App.tsx defaults
const DEFAULT_PANEL_SIZES: PanelSizes = {
  sidebarSize: 20,
  mainSize: 55,
  detailPanelSize: 25
}

export const useLayoutPresetsStore = create<LayoutPresetsState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentPanelSizes: DEFAULT_PANEL_SIZES,
        presets: [],
        activePresetId: 'default',

      // Update panel sizes from react-resizable-panels onLayout callback
      // sizes array format: [sidebarSize, mainSize, detailPanelSize]
      updatePanelSizes: (sizes: number[]) => {
        set({
          currentPanelSizes: {
            sidebarSize: sizes[0],
            mainSize: sizes[1],
            detailPanelSize: sizes[2]
          }
        })
      },

      // Apply a preset by ID - updates currentPanelSizes and activePresetId
      applyPreset: (presetId: string) => {
        // First check built-in presets
        const builtIn = builtInPresets.find((p) => p.id === presetId)
        if (builtIn) {
          set({
            currentPanelSizes: {
              sidebarSize: builtIn.layout.sidebarSize,
              mainSize: builtIn.layout.mainSize,
              detailPanelSize: builtIn.layout.detailPanelSize
            },
            activePresetId: presetId
          })
          return
        }

        // Then check user presets
        const userPreset = get().presets.find((p) => p.id === presetId)
        if (userPreset) {
          set({
            currentPanelSizes: {
              sidebarSize: userPreset.layout.sidebarSize,
              mainSize: userPreset.layout.mainSize,
              detailPanelSize: userPreset.layout.detailPanelSize
            },
            activePresetId: presetId
          })
        }
      },

      // Save current layout as a custom preset
      saveCurrentAsPreset: (
        name: string,
        currentLayout: { sidebarCollapsed: boolean; detailPanelCollapsed: boolean; activeTab: ActiveTab }
      ) => {
        const { currentPanelSizes } = get()
        const newPreset: LayoutPreset = {
          id: generatePresetId(),
          name: name.trim(),
          isBuiltIn: false,
          layout: {
            sidebarSize: currentPanelSizes.sidebarSize,
            mainSize: currentPanelSizes.mainSize,
            detailPanelSize: currentPanelSizes.detailPanelSize,
            sidebarCollapsed: currentLayout.sidebarCollapsed,
            detailPanelCollapsed: currentLayout.detailPanelCollapsed,
            activeTab: currentLayout.activeTab
          }
        }

        set((state) => ({
          presets: [...state.presets, newPreset],
          activePresetId: newPreset.id
        }))

        return newPreset
      },

      // Rename a custom preset (returns false if preset not found or is built-in)
      renamePreset: (id: string, newName: string) => {
        // Check if it's a built-in preset (cannot rename)
        const isBuiltIn = builtInPresets.some((p) => p.id === id)
        if (isBuiltIn) {
          return false
        }

        // Find and update the preset
        const preset = get().presets.find((p) => p.id === id)
        if (!preset) {
          return false
        }

        set((state) => ({
          presets: state.presets.map((p) => (p.id === id ? { ...p, name: newName.trim() } : p))
        }))

        return true
      },

      // Delete a custom preset (returns false if preset not found or is built-in)
      deletePreset: (id: string) => {
        // Check if it's a built-in preset (cannot delete)
        const isBuiltIn = builtInPresets.some((p) => p.id === id)
        if (isBuiltIn) {
          return false
        }

        // Find the preset
        const preset = get().presets.find((p) => p.id === id)
        if (!preset) {
          return false
        }

        set((state) => ({
          presets: state.presets.filter((p) => p.id !== id),
          // If deleting the active preset, reset to default
          activePresetId: state.activePresetId === id ? 'default' : state.activePresetId
        }))

        return true
      }
      }),
      {
        name: 'tiki-layout-presets',
        // Only persist custom presets and active preset ID
        partialize: (state) => ({
          presets: state.presets,
          activePresetId: state.activePresetId
        })
      }
    ),
    { name: 'LayoutPresetsStore' }
  )
)
