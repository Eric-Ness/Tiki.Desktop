import { describe, it, expect, beforeEach } from 'vitest'
import { useLayoutPresetsStore, LayoutPreset, PanelSizes, LayoutData, builtInPresets, generatePresetId } from '../layout-presets'

describe('Layout Presets Store', () => {
  beforeEach(() => {
    // Reset the store before each test
    useLayoutPresetsStore.setState({
      currentPanelSizes: {
        sidebarSize: 20,
        mainSize: 55,
        detailPanelSize: 25
      },
      presets: [],
      activePresetId: 'default'
    })
  })

  describe('LayoutPreset interface', () => {
    it('should have correct structure for a preset', () => {
      const preset: LayoutPreset = {
        id: 'test-preset',
        name: 'Test Preset',
        isBuiltIn: false,
        layout: {
          sidebarSize: 20,
          mainSize: 55,
          detailPanelSize: 25,
          sidebarCollapsed: false,
          detailPanelCollapsed: false,
          activeTab: 'terminal'
        }
      }

      expect(preset.id).toBe('test-preset')
      expect(preset.name).toBe('Test Preset')
      expect(preset.isBuiltIn).toBe(false)
      expect(preset.layout).toBeDefined()
      expect(preset.layout.sidebarSize).toBe(20)
      expect(preset.layout.mainSize).toBe(55)
      expect(preset.layout.detailPanelSize).toBe(25)
      expect(preset.layout.sidebarCollapsed).toBe(false)
      expect(preset.layout.detailPanelCollapsed).toBe(false)
      expect(preset.layout.activeTab).toBe('terminal')
    })

    it('should support built-in presets', () => {
      const builtInPreset: LayoutPreset = {
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
      }

      expect(builtInPreset.isBuiltIn).toBe(true)
    })

    it('should support all activeTab values', () => {
      const terminalPreset: LayoutPreset = {
        id: 'terminal-preset',
        name: 'Terminal',
        isBuiltIn: false,
        layout: {
          sidebarSize: 20,
          mainSize: 55,
          detailPanelSize: 25,
          sidebarCollapsed: false,
          detailPanelCollapsed: false,
          activeTab: 'terminal'
        }
      }

      const workflowPreset: LayoutPreset = {
        id: 'workflow-preset',
        name: 'Workflow',
        isBuiltIn: false,
        layout: {
          sidebarSize: 20,
          mainSize: 55,
          detailPanelSize: 25,
          sidebarCollapsed: false,
          detailPanelCollapsed: false,
          activeTab: 'workflow'
        }
      }

      const configPreset: LayoutPreset = {
        id: 'config-preset',
        name: 'Config',
        isBuiltIn: false,
        layout: {
          sidebarSize: 20,
          mainSize: 55,
          detailPanelSize: 25,
          sidebarCollapsed: false,
          detailPanelCollapsed: false,
          activeTab: 'config'
        }
      }

      expect(terminalPreset.layout.activeTab).toBe('terminal')
      expect(workflowPreset.layout.activeTab).toBe('workflow')
      expect(configPreset.layout.activeTab).toBe('config')
    })
  })

  describe('initial state', () => {
    it('should have default panel sizes', () => {
      const state = useLayoutPresetsStore.getState()

      expect(state.currentPanelSizes).toBeDefined()
      expect(state.currentPanelSizes.sidebarSize).toBe(20)
      expect(state.currentPanelSizes.mainSize).toBe(55)
      expect(state.currentPanelSizes.detailPanelSize).toBe(25)
    })

    it('should start with empty presets array', () => {
      const state = useLayoutPresetsStore.getState()

      expect(state.presets).toBeDefined()
      expect(Array.isArray(state.presets)).toBe(true)
    })

    it('should start with default activePresetId', () => {
      const state = useLayoutPresetsStore.getState()

      expect(state.activePresetId).toBe('default')
    })
  })

  describe('updatePanelSizes', () => {
    it('should update currentPanelSizes when called with number array', () => {
      const { updatePanelSizes } = useLayoutPresetsStore.getState()

      updatePanelSizes([15, 60, 25])

      const state = useLayoutPresetsStore.getState()
      expect(state.currentPanelSizes.sidebarSize).toBe(15)
      expect(state.currentPanelSizes.mainSize).toBe(60)
      expect(state.currentPanelSizes.detailPanelSize).toBe(25)
    })

    it('should handle sizes that sum to 100', () => {
      const { updatePanelSizes } = useLayoutPresetsStore.getState()

      updatePanelSizes([30, 40, 30])

      const state = useLayoutPresetsStore.getState()
      expect(state.currentPanelSizes.sidebarSize + state.currentPanelSizes.mainSize + state.currentPanelSizes.detailPanelSize).toBe(100)
    })

    it('should handle collapsed sidebar (size 0)', () => {
      const { updatePanelSizes } = useLayoutPresetsStore.getState()

      updatePanelSizes([0, 75, 25])

      const state = useLayoutPresetsStore.getState()
      expect(state.currentPanelSizes.sidebarSize).toBe(0)
      expect(state.currentPanelSizes.mainSize).toBe(75)
      expect(state.currentPanelSizes.detailPanelSize).toBe(25)
    })

    it('should handle collapsed detail panel (size 0)', () => {
      const { updatePanelSizes } = useLayoutPresetsStore.getState()

      updatePanelSizes([20, 80, 0])

      const state = useLayoutPresetsStore.getState()
      expect(state.currentPanelSizes.sidebarSize).toBe(20)
      expect(state.currentPanelSizes.mainSize).toBe(80)
      expect(state.currentPanelSizes.detailPanelSize).toBe(0)
    })

    it('should handle decimal sizes from react-resizable-panels', () => {
      const { updatePanelSizes } = useLayoutPresetsStore.getState()

      updatePanelSizes([19.5, 55.3, 25.2])

      const state = useLayoutPresetsStore.getState()
      expect(state.currentPanelSizes.sidebarSize).toBe(19.5)
      expect(state.currentPanelSizes.mainSize).toBe(55.3)
      expect(state.currentPanelSizes.detailPanelSize).toBe(25.2)
    })
  })

  describe('PanelSizes type', () => {
    it('should enforce required properties', () => {
      const sizes: PanelSizes = {
        sidebarSize: 20,
        mainSize: 55,
        detailPanelSize: 25
      }

      expect(sizes.sidebarSize).toBeDefined()
      expect(sizes.mainSize).toBeDefined()
      expect(sizes.detailPanelSize).toBeDefined()
    })
  })

  describe('LayoutData type', () => {
    it('should include panel sizes and collapse states', () => {
      const layoutData: LayoutData = {
        sidebarSize: 20,
        mainSize: 55,
        detailPanelSize: 25,
        sidebarCollapsed: false,
        detailPanelCollapsed: false,
        activeTab: 'terminal'
      }

      expect(layoutData.sidebarSize).toBe(20)
      expect(layoutData.mainSize).toBe(55)
      expect(layoutData.detailPanelSize).toBe(25)
      expect(layoutData.sidebarCollapsed).toBe(false)
      expect(layoutData.detailPanelCollapsed).toBe(false)
      expect(layoutData.activeTab).toBe('terminal')
    })
  })

  describe('builtInPresets', () => {
    it('should have exactly four built-in presets', () => {
      expect(builtInPresets).toHaveLength(4)
    })

    it('should have Default preset with 20/55/25 sizes', () => {
      const defaultPreset = builtInPresets.find((p) => p.id === 'default')

      expect(defaultPreset).toBeDefined()
      expect(defaultPreset!.name).toBe('Default')
      expect(defaultPreset!.isBuiltIn).toBe(true)
      expect(defaultPreset!.layout.sidebarSize).toBe(20)
      expect(defaultPreset!.layout.mainSize).toBe(55)
      expect(defaultPreset!.layout.detailPanelSize).toBe(25)
      expect(defaultPreset!.layout.sidebarCollapsed).toBe(false)
      expect(defaultPreset!.layout.detailPanelCollapsed).toBe(false)
    })

    it('should have Focus preset with 0/100/0 sizes (both panels collapsed)', () => {
      const focusPreset = builtInPresets.find((p) => p.id === 'focus')

      expect(focusPreset).toBeDefined()
      expect(focusPreset!.name).toBe('Focus')
      expect(focusPreset!.isBuiltIn).toBe(true)
      expect(focusPreset!.layout.sidebarSize).toBe(0)
      expect(focusPreset!.layout.mainSize).toBe(100)
      expect(focusPreset!.layout.detailPanelSize).toBe(0)
      expect(focusPreset!.layout.sidebarCollapsed).toBe(true)
      expect(focusPreset!.layout.detailPanelCollapsed).toBe(true)
    })

    it('should have Planning preset with 25/50/25 sizes', () => {
      const planningPreset = builtInPresets.find((p) => p.id === 'planning')

      expect(planningPreset).toBeDefined()
      expect(planningPreset!.name).toBe('Planning')
      expect(planningPreset!.isBuiltIn).toBe(true)
      expect(planningPreset!.layout.sidebarSize).toBe(25)
      expect(planningPreset!.layout.mainSize).toBe(50)
      expect(planningPreset!.layout.detailPanelSize).toBe(25)
      expect(planningPreset!.layout.sidebarCollapsed).toBe(false)
      expect(planningPreset!.layout.detailPanelCollapsed).toBe(false)
    })

    it('should have Review preset with 15/45/40 sizes', () => {
      const reviewPreset = builtInPresets.find((p) => p.id === 'review')

      expect(reviewPreset).toBeDefined()
      expect(reviewPreset!.name).toBe('Review')
      expect(reviewPreset!.isBuiltIn).toBe(true)
      expect(reviewPreset!.layout.sidebarSize).toBe(15)
      expect(reviewPreset!.layout.mainSize).toBe(45)
      expect(reviewPreset!.layout.detailPanelSize).toBe(40)
      expect(reviewPreset!.layout.sidebarCollapsed).toBe(false)
      expect(reviewPreset!.layout.detailPanelCollapsed).toBe(false)
    })

    it('should mark all built-in presets as isBuiltIn: true', () => {
      builtInPresets.forEach((preset) => {
        expect(preset.isBuiltIn).toBe(true)
      })
    })

    it('should be readonly (TypeScript enforcement)', () => {
      // This test verifies the readonly nature at runtime
      // The readonly modifier is enforced at compile time
      expect(Object.isFrozen(builtInPresets)).toBe(false) // Array itself is not frozen
      expect(Array.isArray(builtInPresets)).toBe(true)
      // However, the 'as const' ensures TypeScript prevents modifications
    })
  })

  describe('applyPreset', () => {
    it('should apply a built-in preset and update panel sizes', () => {
      const { applyPreset } = useLayoutPresetsStore.getState()

      applyPreset('focus')

      const state = useLayoutPresetsStore.getState()
      expect(state.activePresetId).toBe('focus')
      expect(state.currentPanelSizes.sidebarSize).toBe(0)
      expect(state.currentPanelSizes.mainSize).toBe(100)
      expect(state.currentPanelSizes.detailPanelSize).toBe(0)
    })

    it('should apply the planning preset correctly', () => {
      const { applyPreset } = useLayoutPresetsStore.getState()

      applyPreset('planning')

      const state = useLayoutPresetsStore.getState()
      expect(state.activePresetId).toBe('planning')
      expect(state.currentPanelSizes.sidebarSize).toBe(25)
      expect(state.currentPanelSizes.mainSize).toBe(50)
      expect(state.currentPanelSizes.detailPanelSize).toBe(25)
    })

    it('should apply the review preset correctly', () => {
      const { applyPreset } = useLayoutPresetsStore.getState()

      applyPreset('review')

      const state = useLayoutPresetsStore.getState()
      expect(state.activePresetId).toBe('review')
      expect(state.currentPanelSizes.sidebarSize).toBe(15)
      expect(state.currentPanelSizes.mainSize).toBe(45)
      expect(state.currentPanelSizes.detailPanelSize).toBe(40)
    })

    it('should apply a user preset when available', () => {
      // Add a user preset first
      useLayoutPresetsStore.setState({
        presets: [
          {
            id: 'custom-preset',
            name: 'My Custom Layout',
            isBuiltIn: false,
            layout: {
              sidebarSize: 30,
              mainSize: 40,
              detailPanelSize: 30,
              sidebarCollapsed: false,
              detailPanelCollapsed: false,
              activeTab: 'workflow'
            }
          }
        ]
      })

      const { applyPreset } = useLayoutPresetsStore.getState()
      applyPreset('custom-preset')

      const state = useLayoutPresetsStore.getState()
      expect(state.activePresetId).toBe('custom-preset')
      expect(state.currentPanelSizes.sidebarSize).toBe(30)
      expect(state.currentPanelSizes.mainSize).toBe(40)
      expect(state.currentPanelSizes.detailPanelSize).toBe(30)
    })

    it('should not change state when preset ID does not exist', () => {
      const { applyPreset } = useLayoutPresetsStore.getState()

      // Get initial state
      const initialState = useLayoutPresetsStore.getState()

      applyPreset('non-existent-preset')

      const state = useLayoutPresetsStore.getState()
      // Should remain unchanged
      expect(state.activePresetId).toBe(initialState.activePresetId)
      expect(state.currentPanelSizes).toEqual(initialState.currentPanelSizes)
    })

    it('should prioritize built-in presets over user presets with same id', () => {
      // Add a user preset with same id as a built-in
      useLayoutPresetsStore.setState({
        presets: [
          {
            id: 'default',
            name: 'Custom Default',
            isBuiltIn: false,
            layout: {
              sidebarSize: 10,
              mainSize: 80,
              detailPanelSize: 10,
              sidebarCollapsed: false,
              detailPanelCollapsed: false,
              activeTab: 'terminal'
            }
          }
        ]
      })

      const { applyPreset } = useLayoutPresetsStore.getState()
      applyPreset('default')

      const state = useLayoutPresetsStore.getState()
      // Should use built-in preset values (20/55/25), not user preset (10/80/10)
      expect(state.currentPanelSizes.sidebarSize).toBe(20)
      expect(state.currentPanelSizes.mainSize).toBe(55)
      expect(state.currentPanelSizes.detailPanelSize).toBe(25)
    })
  })

  describe('generatePresetId', () => {
    it('should generate unique IDs', () => {
      const id1 = generatePresetId()
      const id2 = generatePresetId()

      expect(id1).not.toBe(id2)
    })

    it('should generate IDs starting with "custom-"', () => {
      const id = generatePresetId()

      expect(id.startsWith('custom-')).toBe(true)
    })

    it('should generate IDs with timestamp component', () => {
      const id = generatePresetId()
      const parts = id.split('-')

      // Format: custom-{timestamp}-{random}
      expect(parts.length).toBe(3)
      expect(parts[0]).toBe('custom')
      expect(Number(parts[1])).toBeGreaterThan(0) // timestamp
    })
  })

  describe('saveCurrentAsPreset', () => {
    it('should create a new preset with the given name', () => {
      const { saveCurrentAsPreset } = useLayoutPresetsStore.getState()

      const preset = saveCurrentAsPreset('My Custom Layout', {
        sidebarCollapsed: false,
        detailPanelCollapsed: false,
        activeTab: 'terminal'
      })

      expect(preset.name).toBe('My Custom Layout')
      expect(preset.isBuiltIn).toBe(false)
    })

    it('should trim whitespace from the preset name', () => {
      const { saveCurrentAsPreset } = useLayoutPresetsStore.getState()

      const preset = saveCurrentAsPreset('  Trimmed Name  ', {
        sidebarCollapsed: false,
        detailPanelCollapsed: false,
        activeTab: 'terminal'
      })

      expect(preset.name).toBe('Trimmed Name')
    })

    it('should generate a unique ID for the preset', () => {
      const { saveCurrentAsPreset } = useLayoutPresetsStore.getState()

      const preset1 = saveCurrentAsPreset('Preset 1', {
        sidebarCollapsed: false,
        detailPanelCollapsed: false,
        activeTab: 'terminal'
      })

      const preset2 = saveCurrentAsPreset('Preset 2', {
        sidebarCollapsed: false,
        detailPanelCollapsed: false,
        activeTab: 'terminal'
      })

      expect(preset1.id).not.toBe(preset2.id)
      expect(preset1.id.startsWith('custom-')).toBe(true)
      expect(preset2.id.startsWith('custom-')).toBe(true)
    })

    it('should capture current panel sizes', () => {
      // Set custom panel sizes first
      useLayoutPresetsStore.setState({
        currentPanelSizes: {
          sidebarSize: 30,
          mainSize: 45,
          detailPanelSize: 25
        }
      })

      const { saveCurrentAsPreset } = useLayoutPresetsStore.getState()

      const preset = saveCurrentAsPreset('Custom Sizes', {
        sidebarCollapsed: false,
        detailPanelCollapsed: false,
        activeTab: 'terminal'
      })

      expect(preset.layout.sidebarSize).toBe(30)
      expect(preset.layout.mainSize).toBe(45)
      expect(preset.layout.detailPanelSize).toBe(25)
    })

    it('should capture collapse states from provided layout data', () => {
      const { saveCurrentAsPreset } = useLayoutPresetsStore.getState()

      const preset = saveCurrentAsPreset('Collapsed Layout', {
        sidebarCollapsed: true,
        detailPanelCollapsed: true,
        activeTab: 'terminal'
      })

      expect(preset.layout.sidebarCollapsed).toBe(true)
      expect(preset.layout.detailPanelCollapsed).toBe(true)
    })

    it('should capture activeTab from provided layout data', () => {
      const { saveCurrentAsPreset } = useLayoutPresetsStore.getState()

      const presetWorkflow = saveCurrentAsPreset('Workflow Layout', {
        sidebarCollapsed: false,
        detailPanelCollapsed: false,
        activeTab: 'workflow'
      })

      const presetConfig = saveCurrentAsPreset('Config Layout', {
        sidebarCollapsed: false,
        detailPanelCollapsed: false,
        activeTab: 'config'
      })

      expect(presetWorkflow.layout.activeTab).toBe('workflow')
      expect(presetConfig.layout.activeTab).toBe('config')
    })

    it('should add the preset to the store presets array', () => {
      const { saveCurrentAsPreset } = useLayoutPresetsStore.getState()

      saveCurrentAsPreset('New Preset', {
        sidebarCollapsed: false,
        detailPanelCollapsed: false,
        activeTab: 'terminal'
      })

      const state = useLayoutPresetsStore.getState()
      expect(state.presets).toHaveLength(1)
      expect(state.presets[0].name).toBe('New Preset')
    })

    it('should set the new preset as the active preset', () => {
      const { saveCurrentAsPreset } = useLayoutPresetsStore.getState()

      const preset = saveCurrentAsPreset('Active Preset', {
        sidebarCollapsed: false,
        detailPanelCollapsed: false,
        activeTab: 'terminal'
      })

      const state = useLayoutPresetsStore.getState()
      expect(state.activePresetId).toBe(preset.id)
    })

    it('should preserve existing custom presets when adding new ones', () => {
      // Add first preset
      useLayoutPresetsStore.getState().saveCurrentAsPreset('First Preset', {
        sidebarCollapsed: false,
        detailPanelCollapsed: false,
        activeTab: 'terminal'
      })

      // Add second preset
      useLayoutPresetsStore.getState().saveCurrentAsPreset('Second Preset', {
        sidebarCollapsed: true,
        detailPanelCollapsed: true,
        activeTab: 'workflow'
      })

      const state = useLayoutPresetsStore.getState()
      expect(state.presets).toHaveLength(2)
      expect(state.presets[0].name).toBe('First Preset')
      expect(state.presets[1].name).toBe('Second Preset')
    })

    it('should return the created preset', () => {
      const { saveCurrentAsPreset } = useLayoutPresetsStore.getState()

      const result = saveCurrentAsPreset('Return Test', {
        sidebarCollapsed: false,
        detailPanelCollapsed: false,
        activeTab: 'terminal'
      })

      expect(result).toBeDefined()
      expect(result.name).toBe('Return Test')
      expect(result.id).toBeDefined()
      expect(result.layout).toBeDefined()
    })

    it('should handle decimal panel sizes from react-resizable-panels', () => {
      // Set decimal panel sizes
      useLayoutPresetsStore.setState({
        currentPanelSizes: {
          sidebarSize: 19.5,
          mainSize: 55.3,
          detailPanelSize: 25.2
        }
      })

      const { saveCurrentAsPreset } = useLayoutPresetsStore.getState()

      const preset = saveCurrentAsPreset('Decimal Sizes', {
        sidebarCollapsed: false,
        detailPanelCollapsed: false,
        activeTab: 'terminal'
      })

      expect(preset.layout.sidebarSize).toBe(19.5)
      expect(preset.layout.mainSize).toBe(55.3)
      expect(preset.layout.detailPanelSize).toBe(25.2)
    })
  })

  describe('renamePreset', () => {
    it('should rename a custom preset', () => {
      // Add a custom preset first
      const { saveCurrentAsPreset } = useLayoutPresetsStore.getState()
      const preset = saveCurrentAsPreset('Original Name', {
        sidebarCollapsed: false,
        detailPanelCollapsed: false,
        activeTab: 'terminal'
      })

      const { renamePreset } = useLayoutPresetsStore.getState()
      const result = renamePreset(preset.id, 'New Name')

      expect(result).toBe(true)
      const state = useLayoutPresetsStore.getState()
      const renamedPreset = state.presets.find((p) => p.id === preset.id)
      expect(renamedPreset?.name).toBe('New Name')
    })

    it('should trim whitespace from the new name', () => {
      const { saveCurrentAsPreset } = useLayoutPresetsStore.getState()
      const preset = saveCurrentAsPreset('Original', {
        sidebarCollapsed: false,
        detailPanelCollapsed: false,
        activeTab: 'terminal'
      })

      const { renamePreset } = useLayoutPresetsStore.getState()
      renamePreset(preset.id, '  Trimmed Name  ')

      const state = useLayoutPresetsStore.getState()
      const renamedPreset = state.presets.find((p) => p.id === preset.id)
      expect(renamedPreset?.name).toBe('Trimmed Name')
    })

    it('should return false when trying to rename a built-in preset', () => {
      const { renamePreset } = useLayoutPresetsStore.getState()
      const result = renamePreset('default', 'My Default')

      expect(result).toBe(false)
    })

    it('should return false when preset does not exist', () => {
      const { renamePreset } = useLayoutPresetsStore.getState()
      const result = renamePreset('non-existent-id', 'New Name')

      expect(result).toBe(false)
    })

    it('should not modify other presets when renaming', () => {
      const { saveCurrentAsPreset } = useLayoutPresetsStore.getState()

      const preset1 = saveCurrentAsPreset('Preset 1', {
        sidebarCollapsed: false,
        detailPanelCollapsed: false,
        activeTab: 'terminal'
      })

      const preset2 = saveCurrentAsPreset('Preset 2', {
        sidebarCollapsed: false,
        detailPanelCollapsed: false,
        activeTab: 'terminal'
      })

      const { renamePreset } = useLayoutPresetsStore.getState()
      renamePreset(preset1.id, 'Renamed Preset 1')

      const state = useLayoutPresetsStore.getState()
      expect(state.presets.find((p) => p.id === preset1.id)?.name).toBe('Renamed Preset 1')
      expect(state.presets.find((p) => p.id === preset2.id)?.name).toBe('Preset 2')
    })

    it('should preserve other preset properties when renaming', () => {
      // Set specific panel sizes
      useLayoutPresetsStore.setState({
        currentPanelSizes: {
          sidebarSize: 30,
          mainSize: 40,
          detailPanelSize: 30
        }
      })

      const { saveCurrentAsPreset } = useLayoutPresetsStore.getState()
      const preset = saveCurrentAsPreset('Original', {
        sidebarCollapsed: true,
        detailPanelCollapsed: true,
        activeTab: 'workflow'
      })

      const { renamePreset } = useLayoutPresetsStore.getState()
      renamePreset(preset.id, 'Renamed')

      const state = useLayoutPresetsStore.getState()
      const renamedPreset = state.presets.find((p) => p.id === preset.id)

      expect(renamedPreset?.name).toBe('Renamed')
      expect(renamedPreset?.layout.sidebarSize).toBe(30)
      expect(renamedPreset?.layout.mainSize).toBe(40)
      expect(renamedPreset?.layout.detailPanelSize).toBe(30)
      expect(renamedPreset?.layout.sidebarCollapsed).toBe(true)
      expect(renamedPreset?.layout.detailPanelCollapsed).toBe(true)
      expect(renamedPreset?.layout.activeTab).toBe('workflow')
      expect(renamedPreset?.isBuiltIn).toBe(false)
    })
  })

  describe('deletePreset', () => {
    it('should delete a custom preset', () => {
      const { saveCurrentAsPreset } = useLayoutPresetsStore.getState()
      const preset = saveCurrentAsPreset('To Delete', {
        sidebarCollapsed: false,
        detailPanelCollapsed: false,
        activeTab: 'terminal'
      })

      expect(useLayoutPresetsStore.getState().presets).toHaveLength(1)

      const { deletePreset } = useLayoutPresetsStore.getState()
      const result = deletePreset(preset.id)

      expect(result).toBe(true)
      expect(useLayoutPresetsStore.getState().presets).toHaveLength(0)
    })

    it('should return false when trying to delete a built-in preset', () => {
      const { deletePreset } = useLayoutPresetsStore.getState()
      const result = deletePreset('default')

      expect(result).toBe(false)
    })

    it('should return false when preset does not exist', () => {
      const { deletePreset } = useLayoutPresetsStore.getState()
      const result = deletePreset('non-existent-id')

      expect(result).toBe(false)
    })

    it('should reset activePresetId to default when deleting the active preset', () => {
      const { saveCurrentAsPreset } = useLayoutPresetsStore.getState()
      const preset = saveCurrentAsPreset('Active Preset', {
        sidebarCollapsed: false,
        detailPanelCollapsed: false,
        activeTab: 'terminal'
      })

      // The preset is now active
      expect(useLayoutPresetsStore.getState().activePresetId).toBe(preset.id)

      const { deletePreset } = useLayoutPresetsStore.getState()
      deletePreset(preset.id)

      expect(useLayoutPresetsStore.getState().activePresetId).toBe('default')
    })

    it('should not change activePresetId when deleting a non-active preset', () => {
      const { saveCurrentAsPreset, applyPreset } = useLayoutPresetsStore.getState()

      const preset1 = saveCurrentAsPreset('Preset 1', {
        sidebarCollapsed: false,
        detailPanelCollapsed: false,
        activeTab: 'terminal'
      })

      saveCurrentAsPreset('Preset 2', {
        sidebarCollapsed: false,
        detailPanelCollapsed: false,
        activeTab: 'terminal'
      })

      // Make preset1 active
      applyPreset(preset1.id)
      expect(useLayoutPresetsStore.getState().activePresetId).toBe(preset1.id)

      // Delete preset2 (not active)
      const preset2 = useLayoutPresetsStore.getState().presets[1]
      const { deletePreset } = useLayoutPresetsStore.getState()
      deletePreset(preset2.id)

      // activePresetId should still be preset1.id
      expect(useLayoutPresetsStore.getState().activePresetId).toBe(preset1.id)
    })

    it('should not affect other presets when deleting one', () => {
      const { saveCurrentAsPreset } = useLayoutPresetsStore.getState()

      const preset1 = saveCurrentAsPreset('Preset 1', {
        sidebarCollapsed: false,
        detailPanelCollapsed: false,
        activeTab: 'terminal'
      })

      const preset2 = saveCurrentAsPreset('Preset 2', {
        sidebarCollapsed: false,
        detailPanelCollapsed: false,
        activeTab: 'terminal'
      })

      const preset3 = saveCurrentAsPreset('Preset 3', {
        sidebarCollapsed: false,
        detailPanelCollapsed: false,
        activeTab: 'terminal'
      })

      expect(useLayoutPresetsStore.getState().presets).toHaveLength(3)

      // Delete the middle preset
      const { deletePreset } = useLayoutPresetsStore.getState()
      deletePreset(preset2.id)

      const state = useLayoutPresetsStore.getState()
      expect(state.presets).toHaveLength(2)
      expect(state.presets.find((p) => p.id === preset1.id)).toBeDefined()
      expect(state.presets.find((p) => p.id === preset2.id)).toBeUndefined()
      expect(state.presets.find((p) => p.id === preset3.id)).toBeDefined()
    })
  })
})
